from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.tourism import TouristSpot, TouristRestaurant, TouristAccommodation
from app.schemas.tourism import (
    TouristSpotResponse,
    TouristRestaurantResponse,
    TouristAccommodationResponse,
)

router = APIRouter(prefix="/api/tourism", tags=["tourism"])


@router.get("/spots", response_model=list[TouristSpotResponse])
async def list_tourist_spots(
    sido: str | None = Query(None),
    keyword: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(TouristSpot)
    if sido:
        stmt = stmt.where(TouristSpot.sido == sido)
    if keyword:
        stmt = stmt.where(TouristSpot.spot_name.contains(keyword))
    stmt = stmt.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/restaurants", response_model=list[TouristRestaurantResponse])
async def list_tourist_restaurants(
    sido: str | None = Query(None),
    keyword: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(TouristRestaurant)
    if sido:
        stmt = stmt.where(TouristRestaurant.sido == sido)
    if keyword:
        stmt = stmt.where(TouristRestaurant.restaurant_name.contains(keyword))
    stmt = stmt.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/accommodations", response_model=list[TouristAccommodationResponse])
async def list_tourist_accommodations(
    sido: str | None = Query(None),
    keyword: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(TouristAccommodation)
    if sido:
        stmt = stmt.where(TouristAccommodation.sido == sido)
    if keyword:
        stmt = stmt.where(TouristAccommodation.accommodation_name.contains(keyword))
    stmt = stmt.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(stmt)
    return result.scalars().all()
