from datetime import date, datetime
from pydantic import BaseModel, Field


class TravelPlanSpotCreate(BaseModel):
    plan_date: date | None = None
    order: int = 0
    name: str
    description: str | None = None
    category: str | None = None
    address: str | None = None
    latitude: float
    longitude: float
    source: str | None = None
    source_id: str | None = None


class TravelPlanSpotUpdate(BaseModel):
    plan_date: date | None = None
    order: int | None = None
    name: str | None = None
    description: str | None = None
    category: str | None = None
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class TravelPlanSpotResponse(BaseModel):
    id: int
    plan_date: date | None = None
    order: int
    name: str
    description: str | None = None
    category: str | None = None
    address: str | None = None
    latitude: float
    longitude: float
    source: str | None = None
    source_id: str | None = None

    class Config:
        from_attributes = True


class TravelPlanCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    start_date: date
    end_date: date


class TravelPlanUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    start_date: date | None = None
    end_date: date | None = None


class LayerWeatherEntry(BaseModel):
    plan_date: date
    weather_spot_id: int | None = None

    class Config:
        from_attributes = True


class TravelPlanResponse(BaseModel):
    id: int
    user_id: int
    title: str
    description: str | None = None
    start_date: date
    end_date: date
    created_at: datetime
    updated_at: datetime
    spots: list[TravelPlanSpotResponse] = []
    layer_weather: list[LayerWeatherEntry] = []

    class Config:
        from_attributes = True


class LayerWeatherSet(BaseModel):
    weather_spot_id: int | None = None


class TravelPlanListItem(BaseModel):
    id: int
    title: str
    description: str | None = None
    start_date: date
    end_date: date
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
