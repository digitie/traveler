from pydantic import BaseModel


class TouristSpotResponse(BaseModel):
    id: int
    spot_name: str
    category: str | None = None
    sido: str | None = None
    sigungu: str | None = None
    road_address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    phone: str | None = None
    description: str | None = None
    operating_hours: str | None = None

    class Config:
        from_attributes = True


class TouristRestaurantResponse(BaseModel):
    id: int
    restaurant_name: str
    category: str | None = None
    sido: str | None = None
    sigungu: str | None = None
    road_address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    phone: str | None = None
    main_menu: str | None = None
    operating_hours: str | None = None

    class Config:
        from_attributes = True


class TouristAccommodationResponse(BaseModel):
    id: int
    accommodation_name: str
    category: str | None = None
    sido: str | None = None
    sigungu: str | None = None
    road_address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    phone: str | None = None
    room_count: str | None = None

    class Config:
        from_attributes = True


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    per_page: int
