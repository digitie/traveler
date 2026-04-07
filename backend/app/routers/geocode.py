"""좌표 ↔ 주소 변환 (VWorld 지오코더 API) + 네이버 지역 검색.

데이터:
- 국토교통부_(VWorld) 지오코더 2.0 (data.go.kr → api.vworld.kr).
- 네이버 검색 API > 지역 (openapi.naver.com).

좌표계: 카카오맵의 latLng 는 WGS84 (EPSG:4326) 이므로 동일하게 EPSG:4326 으로
요청한다. 별도 좌표계 변환 없이 그대로 전달.
"""

import logging
import re

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.config import settings

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/geocode", tags=["geocode"])

VWORLD_ADDRESS_URL = "https://api.vworld.kr/req/address"
NAVER_LOCAL_SEARCH_URL = "https://openapi.naver.com/v1/search/local.json"

_HTML_TAG_RE = re.compile(r"<[^>]+>")


def _strip_html(value: str | None) -> str | None:
    if value is None:
        return None
    return _HTML_TAG_RE.sub("", value)


async def _naver_local_search(query: str, display: int = 5) -> list[dict]:
    """네이버 지역 검색 (정확도순 = sort=random, 기본값).

    네이버 지역 검색 API 의 display 최대값은 5 이며, 결과는 sort=random 일 때
    "정확도순 내림차순" 으로 정렬된다 (공식 문서 상 random 이 정확도순 기본).
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
        # mapx/mapy: WGS84 * 1e7 (네이버 지역 검색 좌표계).
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
                "title": _strip_html(it.get("title")),
                "category": it.get("category") or None,
                "description": _strip_html(it.get("description")) or None,
                "telephone": it.get("telephone") or None,
                "address": it.get("address") or None,
                "road_address": it.get("roadAddress") or None,
                "link": it.get("link") or None,
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
    """위경도 → 한국 주소 변환 + 해당 주소로 네이버 지역 검색 결과(최대 5).

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

    # 네이버 지역검색: 도로명 주소를 우선으로 검색, 없으면 지번
    query = road_address or jibun_address or ""
    local_results = await _naver_local_search(query, display=5)

    return {
        "lat": lat,
        "lng": lng,
        "road_address": road_address,
        "jibun_address": jibun_address,
        "zipcode": zipcode,
        "local_query": query or None,
        "local_results": local_results,
    }
