"""좌표 ↔ 주소 변환 (VWorld 지오코더 API).

데이터: 국토교통부_(VWorld) 지오코더 2.0 (data.go.kr → api.vworld.kr).
좌표계: 카카오맵의 latLng 는 WGS84 (EPSG:4326) 이므로 동일하게 EPSG:4326 으로
요청한다. 별도 좌표계 변환 없이 그대로 전달.
"""

import logging

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.config import settings

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/geocode", tags=["geocode"])

VWORLD_ADDRESS_URL = "https://api.vworld.kr/req/address"


@router.get("/reverse")
async def reverse_geocode(
    lat: float = Query(..., description="WGS84 위도 (카카오맵 getLat)"),
    lng: float = Query(..., description="WGS84 경도 (카카오맵 getLng)"),
):
    """위경도 → 한국 주소 변환.

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

    if status == "NOT_FOUND":
        return {
            "lat": lat,
            "lng": lng,
            "road_address": None,
            "jibun_address": None,
            "zipcode": None,
        }
    if status != "OK":
        log.warning("vworld reverse geocode non-ok status: %s", status)
        return {
            "lat": lat,
            "lng": lng,
            "road_address": None,
            "jibun_address": None,
            "zipcode": None,
        }

    road_address: str | None = None
    jibun_address: str | None = None
    zipcode: str | None = None

    for item in response.get("result", []):
        text = item.get("text")
        kind = item.get("type")
        if kind == "road" and road_address is None:
            road_address = text
            zipcode = zipcode or item.get("zipcode")
        elif kind == "parcel" and jibun_address is None:
            jibun_address = text
            zipcode = zipcode or item.get("zipcode")

    return {
        "lat": lat,
        "lng": lng,
        "road_address": road_address,
        "jibun_address": jibun_address,
        "zipcode": zipcode,
    }
