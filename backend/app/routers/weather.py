from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.weather import WeatherForecast, RestAreaWeather
from app.schemas.weather import WeatherForecastResponse, RestAreaWeatherResponse
from app.services.weather_service import (
    fetch_weather_forecast,
    save_weather_forecasts,
    fetch_rest_area_weather,
    save_rest_area_weather,
)

router = APIRouter(prefix="/api/weather", tags=["weather"])


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
