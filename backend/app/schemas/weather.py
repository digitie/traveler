from datetime import datetime
from pydantic import BaseModel


class WeatherForecastResponse(BaseModel):
    id: int
    base_date: str
    base_time: str
    fcst_date: str
    fcst_time: str
    nx: int
    ny: int
    category: str
    fcst_value: str

    class Config:
        from_attributes = True


class WeatherGridRequest(BaseModel):
    nx: int
    ny: int
    base_date: str | None = None
    base_time: str | None = None


class RestAreaWeatherResponse(BaseModel):
    id: int
    unit_code: str
    unit_name: str
    route_name: str | None = None
    direction: str | None = None
    weather: str | None = None
    temperature: float | None = None
    wind_speed: float | None = None
    humidity: float | None = None
    latitude: float | None = None
    longitude: float | None = None
    fetched_at: datetime

    class Config:
        from_attributes = True
