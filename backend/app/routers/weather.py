import asyncio
import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.data.weather_points import WEATHER_POINTS
from app.database import get_db
from app.models.weather import WeatherForecast, RestAreaWeather
from app.schemas.weather import WeatherForecastResponse, RestAreaWeatherResponse
from app.services.weather_service import (
    fetch_rest_area_weather,
    fetch_ultra_srt_fcst,
    fetch_ultra_srt_ncst,
    fetch_weather_forecast,
    latlng_to_grid,
    parse_ncst,
    parse_ultra_fcst,
    parse_vilage_fcst,
    save_rest_area_weather,
    save_weather_forecasts,
)

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/weather", tags=["weather"])

# 단순 인메모리 캐시 (점 단위 30분 TTL)
_POINT_CACHE: dict[tuple[int, int], tuple[datetime, dict]] = {}
_POINT_CACHE_TTL = timedelta(minutes=30)


@router.get("/forecast", response_model=list[WeatherForecastResponse])
async def get_weather_forecast(
    nx: int = Query(..., description="격자 X좌표"),
    ny: int = Query(..., description="격자 Y좌표"),
    base_date: str | None = Query(None, description="발표일자 (YYYYMMDD)"),
    base_time: str | None = Query(None, description="발표시각 (HHMM)"),
    db: AsyncSession = Depends(get_db),
):
    """기상청 단기예보 조회 (API에서 실시간 조회 후 DB 저장)"""
    items = await fetch_weather_forecast(nx, ny, base_date, base_time)
    if items:
        await save_weather_forecasts(db, items)
    return [
        WeatherForecastResponse(
            id=0,
            base_date=item.get("baseDate", ""),
            base_time=item.get("baseTime", ""),
            fcst_date=item.get("fcstDate", ""),
            fcst_time=item.get("fcstTime", ""),
            nx=int(item.get("nx", 0)),
            ny=int(item.get("ny", 0)),
            category=item.get("category", ""),
            fcst_value=str(item.get("fcstValue", "")),
        )
        for item in items
    ]


@router.get("/forecast/cached", response_model=list[WeatherForecastResponse])
async def get_cached_forecast(
    nx: int = Query(...),
    ny: int = Query(...),
    fcst_date: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """DB에 캐싱된 단기예보 조회"""
    stmt = select(WeatherForecast).where(
        WeatherForecast.nx == nx, WeatherForecast.ny == ny
    )
    if fcst_date:
        stmt = stmt.where(WeatherForecast.fcst_date == fcst_date)
    stmt = stmt.order_by(WeatherForecast.fcst_date, WeatherForecast.fcst_time)
    result = await db.execute(stmt)
    return result.scalars().all()


async def _load_point_summary(point: dict) -> dict:
    nx, ny = point["nx"], point["ny"]
    cached = _POINT_CACHE.get((nx, ny))
    if cached and datetime.utcnow() - cached[0] < _POINT_CACHE_TTL:
        return cached[1]

    summary: dict = {
        "name": point["name"],
        "lat": point["lat"],
        "lng": point["lng"],
        "nx": nx,
        "ny": ny,
        "current": None,
        "next_hours": [],
        "fetched_at": datetime.utcnow().isoformat(),
    }
    try:
        ncst_items = await fetch_ultra_srt_ncst(nx, ny)
        summary["current"] = parse_ncst(ncst_items)
    except Exception as e:
        log.warning("ncst fetch failed for %s: %s", point["name"], e)

    try:
        fcst_items = await fetch_ultra_srt_fcst(nx, ny)
        parsed = parse_ultra_fcst(fcst_items)
        summary["next_hours"] = parsed[:6]
        # current 의 sky 는 ncst 에 없으므로 가장 가까운 fcst 의 sky 를 채워준다
        if summary.get("current") is not None and parsed:
            summary["current"]["sky"] = parsed[0].get("sky")
            summary["current"]["sky_label"] = parsed[0].get("sky_label")
    except Exception as e:
        log.warning("ultra-fcst fetch failed for %s: %s", point["name"], e)

    _POINT_CACHE[(nx, ny)] = (datetime.utcnow(), summary)
    return summary


@router.get("/points")
async def get_weather_points():
    """주요 도시 날씨 마커 목록 (현재 + 6시간 초단기 예보)."""
    results = await asyncio.gather(
        *[_load_point_summary(p) for p in WEATHER_POINTS]
    )
    return results


@router.get("/points/{nx}/{ny}/detail")
async def get_weather_point_detail(nx: int, ny: int):
    """특정 격자점의 단기예보 상세 (3일치)."""
    point = next(
        (p for p in WEATHER_POINTS if p["nx"] == nx and p["ny"] == ny), None
    )
    if not point:
        raise HTTPException(404, "Unknown weather point")

    try:
        ncst_items = await fetch_ultra_srt_ncst(nx, ny)
        current = parse_ncst(ncst_items)
    except Exception as e:
        log.warning("detail ncst fetch failed: %s", e)
        current = {}

    try:
        ultra_items = await fetch_ultra_srt_fcst(nx, ny)
        ultra = parse_ultra_fcst(ultra_items)
    except Exception as e:
        log.warning("detail ultra-fcst fetch failed: %s", e)
        ultra = []

    try:
        vilage_items = await fetch_weather_forecast(nx, ny)
        vilage = parse_vilage_fcst(vilage_items)
    except Exception as e:
        log.warning("detail vilage-fcst fetch failed: %s", e)
        vilage = []

    if current and ultra:
        current.setdefault("sky", ultra[0].get("sky"))
        current.setdefault("sky_label", ultra[0].get("sky_label"))

    return {
        "name": point["name"],
        "lat": point["lat"],
        "lng": point["lng"],
        "nx": nx,
        "ny": ny,
        "current": current,
        "ultra_short_forecast": ultra,
        "short_forecast": vilage,
        "fetched_at": datetime.utcnow().isoformat(),
    }


@router.get("/by-coord")
async def get_weather_by_coord(
    lat: float = Query(...),
    lng: float = Query(...),
    date: str = Query(..., description="YYYY-MM-DD"),
):
    """좌표 + 날짜로 6시간 단위(00/06/12/18) 단기예보 반환."""
    nx, ny = latlng_to_grid(lat, lng)
    try:
        items = await fetch_weather_forecast(nx, ny)
    except Exception as e:
        log.warning("by-coord vilage fetch failed: %s", e)
        items = []
    parsed = parse_vilage_fcst(items)
    target = date.replace("-", "")
    target_buckets = ["0000", "0600", "1200", "1800"]
    out: list[dict] = []
    by_time = {h["fcst_time"]: h for h in parsed if h["fcst_date"] == target}
    for t in target_buckets:
        h = by_time.get(t) or {}
        out.append(
            {
                "time": t,
                "label": f"{int(t[:2]):02d}시",
                "temperature": h.get("temperature"),
                "sky": h.get("sky"),
                "sky_label": h.get("sky_label"),
                "pty": h.get("pty"),
                "pty_label": h.get("pty_label"),
                "rain_prob": h.get("rain_prob"),
                "humidity": h.get("humidity"),
                "wind_speed": h.get("wind_speed"),
            }
        )
    # 일 최저/최고
    temp_min = next(
        (
            h.get("temp_min")
            for h in parsed
            if h["fcst_date"] == target and h.get("temp_min") is not None
        ),
        None,
    )
    temp_max = next(
        (
            h.get("temp_max")
            for h in parsed
            if h["fcst_date"] == target and h.get("temp_max") is not None
        ),
        None,
    )
    return {
        "lat": lat,
        "lng": lng,
        "nx": nx,
        "ny": ny,
        "date": date,
        "temp_min": temp_min,
        "temp_max": temp_max,
        "buckets": out,
    }


@router.get("/rest-area", response_model=list[RestAreaWeatherResponse])
async def get_rest_area_weather(db: AsyncSession = Depends(get_db)):
    """휴게소별 날씨정보 조회 (API에서 실시간 조회 후 DB 저장)"""
    items = await fetch_rest_area_weather()
    if items:
        await save_rest_area_weather(db, items)
    result = await db.execute(select(RestAreaWeather))
    return result.scalars().all()


@router.get("/rest-area/cached", response_model=list[RestAreaWeatherResponse])
async def get_cached_rest_area_weather(db: AsyncSession = Depends(get_db)):
    """DB에 캐싱된 휴게소 날씨 조회"""
    result = await db.execute(select(RestAreaWeather))
    return result.scalars().all()
