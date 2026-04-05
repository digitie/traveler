"""기상청 단기예보 및 한국도로공사 휴게소 날씨 데이터 서비스"""

from datetime import datetime

import httpx
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.weather import WeatherForecast, RestAreaWeather

# 기상청 단기예보 API
VILAGE_FCST_URL = (
    "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst"
)
ULTRA_SRT_NCST_URL = (
    "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst"
)

# 한국도로공사 휴게소 날씨
REST_AREA_WEATHER_URL = "https://data.ex.co.kr/openapi/restinfo/restWeatherList"


async def fetch_weather_forecast(
    nx: int, ny: int, base_date: str | None = None, base_time: str | None = None
) -> list[dict]:
    """기상청 단기예보 조회"""
    now = datetime.now()
    if base_date is None:
        base_date = now.strftime("%Y%m%d")
    if base_time is None:
        # 단기예보 발표 시각: 0200, 0500, 0800, 1100, 1400, 1700, 2000, 2300
        hour = now.hour
        base_times = [2, 5, 8, 11, 14, 17, 20, 23]
        chosen = 23
        for bt in reversed(base_times):
            if hour >= bt:
                chosen = bt
                break
        base_time = f"{chosen:02d}00"

    params = {
        "serviceKey": settings.data_go_kr_api_key,
        "numOfRows": "1000",
        "pageNo": "1",
        "dataType": "JSON",
        "base_date": base_date,
        "base_time": base_time,
        "nx": str(nx),
        "ny": str(ny),
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(VILAGE_FCST_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    items = (
        data.get("response", {}).get("body", {}).get("items", {}).get("item", [])
    )
    return items


async def fetch_ultra_srt_ncst(
    nx: int, ny: int, base_date: str | None = None, base_time: str | None = None
) -> list[dict]:
    """기상청 초단기실황 조회"""
    now = datetime.now()
    if base_date is None:
        base_date = now.strftime("%Y%m%d")
    if base_time is None:
        base_time = f"{now.hour:02d}00"

    params = {
        "serviceKey": settings.data_go_kr_api_key,
        "numOfRows": "100",
        "pageNo": "1",
        "dataType": "JSON",
        "base_date": base_date,
        "base_time": base_time,
        "nx": str(nx),
        "ny": str(ny),
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(ULTRA_SRT_NCST_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    items = (
        data.get("response", {}).get("body", {}).get("items", {}).get("item", [])
    )
    return items


async def save_weather_forecasts(db: AsyncSession, items: list[dict]) -> int:
    """단기예보 데이터 DB 저장"""
    count = 0
    for item in items:
        forecast = WeatherForecast(
            base_date=item.get("baseDate", ""),
            base_time=item.get("baseTime", ""),
            fcst_date=item.get("fcstDate", ""),
            fcst_time=item.get("fcstTime", ""),
            nx=int(item.get("nx", 0)),
            ny=int(item.get("ny", 0)),
            category=item.get("category", ""),
            fcst_value=str(item.get("fcstValue", "")),
        )
        db.add(forecast)
        count += 1
    await db.commit()
    return count


async def fetch_rest_area_weather() -> list[dict]:
    """한국도로공사 휴게소별 날씨정보 조회"""
    params = {
        "key": settings.data_ex_api_key,
        "type": "json",
        "numOfRows": "200",
        "pageNo": "1",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(REST_AREA_WEATHER_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    items = data.get("list", [])
    return items


async def save_rest_area_weather(db: AsyncSession, items: list[dict]) -> int:
    """휴게소 날씨 데이터 DB 저장 (기존 데이터 교체)"""
    await db.execute(delete(RestAreaWeather))

    count = 0
    for item in items:
        lat = _safe_float(item.get("latitude"))
        lng = _safe_float(item.get("longitude"))

        weather = RestAreaWeather(
            unit_code=item.get("unitCode", ""),
            unit_name=item.get("unitName", ""),
            route_name=item.get("routeName"),
            direction=item.get("direction"),
            weather=item.get("weatherContents"),
            temperature=_safe_float(item.get("temperature")),
            wind_speed=_safe_float(item.get("windSpeed")),
            wind_direction=item.get("windDirection"),
            humidity=_safe_float(item.get("humidity")),
            rain_type=item.get("rainType"),
            latitude=lat,
            longitude=lng,
            location=f"SRID=4326;POINT({lng} {lat})" if lat and lng else None,
        )
        db.add(weather)
        count += 1
    await db.commit()
    return count


def _safe_float(val) -> float | None:
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None
