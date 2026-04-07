"""좌표 ↔ 주소 변환 + 다중 지도 서비스 지역 검색 결합.

데이터:
- 국토교통부_(VWorld) 지오코더 2.0 (data.go.kr → api.vworld.kr).
- 네이버 검색 API > 지역 (openapi.naver.com).
- 카카오 로컬 키워드 검색 (dapi.kakao.com).
- Google Places API (Text Search, places.googleapis.com).

좌표계: 카카오맵의 latLng 는 WGS84 (EPSG:4326) 이므로 동일하게 EPSG:4326 으로
요청한다. 별도 좌표계 변환 없이 그대로 전달.
"""

import asyncio
import logging
import re

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.config import settings

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/geocode", tags=["geocode"])

VWORLD_ADDRESS_URL = "https://api.vworld.kr/req/address"
NAVER_LOCAL_SEARCH_URL = "https://openapi.naver.com/v1/search/local.json"
KAKAO_LOCAL_KEYWORD_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"
GOOGLE_PLACES_TEXT_SEARCH_URL = (
    "https://places.googleapis.com/v1/places:searchText"
)

_HTML_TAG_RE = re.compile(r"<[^>]+>")


def _strip_html(value: str | None) -> str | None:
    if value is None:
        return None
    return _HTML_TAG_RE.sub("", value)


async def _naver_local_search(query: str, display: int = 5) -> list[dict]:
    """네이버 지역 검색 (sort=random = 정확도순 내림차순, 기본값).

    `display` 최대값은 5.
    """
    if not (settings.naver_client_id and settings.naver_client_secret):
        return []
    if not query:
        return []

    headers = {
        "X-Naver-Client-Id": settings.naver_client_id,
        "X-Naver-Client-Secret": settings.naver_client_secret,
    }
    params = {
        "query": query,
        "display": max(1, min(display, 5)),
        "start": 1,
        "sort": "random",
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                NAVER_LOCAL_SEARCH_URL, params=params, headers=headers
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError as e:
        log.warning("naver local search http error: %s", e)
        return []

    items = data.get("items", []) or []
    out: list[dict] = []
    for it in items:
        mx = it.get("mapx")
        my = it.get("mapy")
        try:
            lng_v = float(mx) / 1e7 if mx not in (None, "") else None
            lat_v = float(my) / 1e7 if my not in (None, "") else None
        except (TypeError, ValueError):
            lng_v = None
            lat_v = None
        out.append(
            {
                "source": "naver",
                "title": _strip_html(it.get("title")) or "",
                "category": it.get("category") or None,
                "description": _strip_html(it.get("description")) or None,
                "telephone": it.get("telephone") or None,
                "address": it.get("address") or None,
                "road_address": it.get("roadAddress") or None,
                "source_link": it.get("link") or None,
                "lat": lat_v,
                "lng": lng_v,
            }
        )
    return out


async def _kakao_local_search(query: str, size: int = 5) -> list[dict]:
    """카카오 로컬 키워드 검색 (정확도순 = sort=accuracy, 기본값)."""
    if not settings.kakao_rest_api_key:
        return []
    if not query:
        return []

    headers = {"Authorization": f"KakaoAK {settings.kakao_rest_api_key}"}
    params = {
        "query": query,
        "size": max(1, min(size, 15)),
        "page": 1,
        "sort": "accuracy",
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                KAKAO_LOCAL_KEYWORD_URL, params=params, headers=headers
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError as e:
        log.warning("kakao local search http error: %s", e)
        return []

    docs = data.get("documents", []) or []
    out: list[dict] = []
    for it in docs[:size]:
        try:
            lng_v = float(it.get("x")) if it.get("x") else None
            lat_v = float(it.get("y")) if it.get("y") else None
        except (TypeError, ValueError):
            lng_v = None
            lat_v = None
        out.append(
            {
                "source": "kakao",
                "title": it.get("place_name") or "",
                "category": it.get("category_name") or None,
                "description": None,
                "telephone": it.get("phone") or None,
                "address": it.get("address_name") or None,
                "road_address": it.get("road_address_name") or None,
                "source_link": it.get("place_url") or None,
                "lat": lat_v,
                "lng": lng_v,
            }
        )
    return out


async def _google_places_search(query: str, max_results: int = 5) -> list[dict]:
    """Google Places API (Text Search, v1).

    가장 관련성 높은 결과 순서로 반환되며 (relevance), `maxResultCount` 로
    상위 N개를 제한한다. KR 지역으로 한정해 검색.
    """
    if not settings.google_places_api_key:
        return []
    if not query:
        return []

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": settings.google_places_api_key,
        "X-Goog-FieldMask": ",".join(
            [
                "places.id",
                "places.displayName",
                "places.formattedAddress",
                "places.shortFormattedAddress",
                "places.location",
                "places.types",
                "places.nationalPhoneNumber",
                "places.googleMapsUri",
                "places.primaryTypeDisplayName",
            ]
        ),
    }
    body = {
        "textQuery": query,
        "languageCode": "ko",
        "regionCode": "KR",
        "maxResultCount": max(1, min(max_results, 20)),
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                GOOGLE_PLACES_TEXT_SEARCH_URL, json=body, headers=headers
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError as e:
        log.warning("google places text search http error: %s", e)
        return []

    places = data.get("places", []) or []
    out: list[dict] = []
    for it in places[:max_results]:
        loc = it.get("location") or {}
        lat_v = loc.get("latitude")
        lng_v = loc.get("longitude")
        display_name = (it.get("displayName") or {}).get("text") or ""
        primary_type = (it.get("primaryTypeDisplayName") or {}).get("text")
        types = it.get("types") or []
        category = primary_type or (", ".join(types[:2]) if types else None)
        out.append(
            {
                "source": "google",
                "title": display_name,
                "category": category,
                "description": None,
                "telephone": it.get("nationalPhoneNumber") or None,
                "address": it.get("formattedAddress") or None,
                "road_address": None,
                "source_link": it.get("googleMapsUri") or None,
                "lat": lat_v,
                "lng": lng_v,
            }
        )
    return out


@router.get("/reverse")
async def reverse_geocode(
    lat: float = Query(..., description="WGS84 위도 (카카오맵 getLat)"),
    lng: float = Query(..., description="WGS84 경도 (카카오맵 getLng)"),
):
    """위경도 → 한국 주소 변환 + 네이버/카카오/구글 지역 검색 결과(각 최대 5).

    카카오맵 `mouseEvent.latLng.getLat()/getLng()` 결과를 그대로 전달하면 된다.
    VWorld 의 `point` 파라미터는 `x,y` (= `lng,lat`) 순서이며 `crs=EPSG:4326`
    으로 명시해 WGS84 임을 보장한다.
    """
    if not settings.vworld_api_key:
        raise HTTPException(500, "VWORLD_API_KEY is not configured")

    params = {
        "service": "address",
        "request": "getAddress",
        "version": "2.0",
        "crs": "EPSG:4326",
        "point": f"{lng},{lat}",
        "format": "json",
        "type": "both",
        "zipcode": "true",
        "simple": "false",
        "key": settings.vworld_api_key,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(VWORLD_ADDRESS_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError as e:
        log.warning("vworld reverse geocode http error: %s", e)
        raise HTTPException(502, "geocoding service error")

    response = data.get("response", {})
    status = response.get("status")

    road_address: str | None = None
    jibun_address: str | None = None
    zipcode: str | None = None

    if status == "OK":
        for item in response.get("result", []):
            text = item.get("text")
            kind = item.get("type")
            if kind == "road" and road_address is None:
                road_address = text
                zipcode = zipcode or item.get("zipcode")
            elif kind == "parcel" and jibun_address is None:
                jibun_address = text
                zipcode = zipcode or item.get("zipcode")
    elif status != "NOT_FOUND":
        log.warning("vworld reverse geocode non-ok status: %s", status)

    # 도로명 주소 우선, 없으면 지번 주소로 세 서비스 동시 검색
    query = road_address or jibun_address or ""

    naver_results, kakao_results, google_results = await asyncio.gather(
        _naver_local_search(query, display=5),
        _kakao_local_search(query, size=5),
        _google_places_search(query, max_results=5),
    )

    return {
        "lat": lat,
        "lng": lng,
        "road_address": road_address,
        "jibun_address": jibun_address,
        "zipcode": zipcode,
        "local_query": query or None,
        "naver_results": naver_results,
        "kakao_results": kakao_results,
        "google_results": google_results,
    }
