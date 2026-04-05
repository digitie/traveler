from datetime import date, datetime
from pydantic import BaseModel


class TravelPlanSpotCreate(BaseModel):
    plan_date: date
    order: int = 0
    name: str
    description: str | None = None
    category: str | None = None
    address: str | None = None
    latitude: float
    longitude: float
    source: str | None = None
    source_id: str | None = None


class TravelPlanSpotResponse(BaseModel):
    id: int
    plan_date: date
    order: int
    name: str
    description: str | None = None
    category: str | None = None
    address: str | None = None
    latitude: float
    longitude: float
    source: str | None = None

    class Config:
        from_attributes = True


class TravelPlanCreate(BaseModel):
    title: str
    description: str | None = None
    start_date: date
    end_date: date


class TravelPlanUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    start_date: date | None = None
    end_date: date | None = None


class TravelPlanResponse(BaseModel):
    id: int
    title: str
    description: str | None = None
    start_date: date
    end_date: date
    created_at: datetime
    updated_at: datetime
    spots: list[TravelPlanSpotResponse] = []

    class Config:
        from_attributes = True
