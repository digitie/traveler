from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import String, Float, Integer, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class WeatherForecast(Base):
    """기상청 단기예보 데이터"""

    __tablename__ = "weather_forecasts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    base_date: Mapped[str] = mapped_column(String(8), index=True)
    base_time: Mapped[str] = mapped_column(String(4))
    fcst_date: Mapped[str] = mapped_column(String(8), index=True)
    fcst_time: Mapped[str] = mapped_column(String(4))
    nx: Mapped[int] = mapped_column(Integer)
    ny: Mapped[int] = mapped_column(Integer)
    category: Mapped[str] = mapped_column(String(10))
    fcst_value: Mapped[str] = mapped_column(String(50))
    location = mapped_column(Geometry("POINT", srid=4326), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RestAreaWeather(Base):
    """한국도로공사 휴게소별 날씨정보"""

    __tablename__ = "rest_area_weather"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    unit_code: Mapped[str] = mapped_column(String(20), index=True)
    unit_name: Mapped[str] = mapped_column(String(100))
    route_name: Mapped[str] = mapped_column(String(100), nullable=True)
    direction: Mapped[str] = mapped_column(String(20), nullable=True)
    weather: Mapped[str] = mapped_column(String(50), nullable=True)
    temperature: Mapped[float] = mapped_column(Float, nullable=True)
    wind_speed: Mapped[float] = mapped_column(Float, nullable=True)
    wind_direction: Mapped[str] = mapped_column(String(20), nullable=True)
    humidity: Mapped[float] = mapped_column(Float, nullable=True)
    rain_type: Mapped[str] = mapped_column(String(20), nullable=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=True)
    longitude: Mapped[float] = mapped_column(Float, nullable=True)
    location = mapped_column(Geometry("POINT", srid=4326), nullable=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
