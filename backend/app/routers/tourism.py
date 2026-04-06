from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.tourism import TouristAccommodation, TouristRestaurant, TouristSpot
from app.models.tourism_memo import AccommodationPublicMemo, AccommodationUserMemo
from app.models.travel_plan import TravelPlan, TravelPlanSpot
from app.models.user import User
from app.schemas.tourism import (
    AccommodationDetailResponse,
    AccommodationPlanRef,
    MemoUpdate,
    TouristAccommodationResponse,
    TouristRestaurantResponse,
    TouristSpotResponse,
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


# ============ Accommodations ============

@router.get("/accommodations", response_model=list[TouristAccommodationResponse])
async def list_tourist_accommodations(
    sido: str | None = Query(None),
    keyword: str | None = Query(None),
    sw_lat: float | None = Query(None),
    sw_lng: float | None = Query(None),
    ne_lat: float | None = Query(None),
    ne_lng: float | None = Query(None),
    limit: int = Query(500, ge=1, le=2000),
    db: AsyncSession = Depends(get_db),
):
    """위경도 박스 또는 키워드/시도로 숙소 조회. 마커 표시용."""
    stmt = select(TouristAccommodation).where(
        TouristAccommodation.latitude.is_not(None),
        TouristAccommodation.longitude.is_not(None),
    )
    if sido:
        stmt = stmt.where(TouristAccommodation.sido == sido)
    if keyword:
        stmt = stmt.where(TouristAccommodation.accommodation_name.contains(keyword))
    if None not in (sw_lat, sw_lng, ne_lat, ne_lng):
        stmt = stmt.where(
            and_(
                TouristAccommodation.latitude >= sw_lat,
                TouristAccommodation.latitude <= ne_lat,
                TouristAccommodation.longitude >= sw_lng,
                TouristAccommodation.longitude <= ne_lng,
            )
        )
    stmt = stmt.limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get(
    "/accommodations/{accommodation_id}",
    response_model=AccommodationDetailResponse,
)
async def get_accommodation_detail(
    accommodation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    acc = await db.get(TouristAccommodation, accommodation_id)
    if not acc:
        raise HTTPException(404, "Accommodation not found")

    # 공용 메모
    pub_row = await db.get(AccommodationPublicMemo, accommodation_id)
    public_memo = pub_row.content if pub_row else ""
    public_memo_updated_at = (
        pub_row.updated_at.isoformat() if pub_row and pub_row.updated_at else None
    )

    # 개인 메모
    my_row = await db.get(
        AccommodationUserMemo, (accommodation_id, current_user.id)
    )
    my_memo = my_row.content if my_row else ""

    # 내 여행계획에 포함된 spot 들
    plans_stmt = (
        select(TravelPlanSpot.id, TravelPlan.id, TravelPlan.title)
        .join(TravelPlan, TravelPlan.id == TravelPlanSpot.travel_plan_id)
        .where(
            TravelPlan.user_id == current_user.id,
            TravelPlanSpot.source == "accommodation",
            TravelPlanSpot.source_id == str(accommodation_id),
        )
    )
    plan_rows = (await db.execute(plans_stmt)).all()
    my_plans = [
        AccommodationPlanRef(plan_id=p_id, plan_title=p_title, spot_id=spot_id)
        for spot_id, p_id, p_title in plan_rows
    ]

    return AccommodationDetailResponse(
        id=acc.id,
        accommodation_name=acc.accommodation_name,
        category=acc.category,
        sido=acc.sido,
        sigungu=acc.sigungu,
        road_address=acc.road_address,
        jibun_address=acc.jibun_address,
        latitude=acc.latitude,
        longitude=acc.longitude,
        phone=acc.phone,
        room_count=acc.room_count,
        homepage=acc.homepage,
        operating_hours=acc.operating_hours,
        parking=acc.parking,
        public_memo=public_memo,
        public_memo_updated_at=public_memo_updated_at,
        my_memo=my_memo,
        my_plans=my_plans,
    )


@router.put("/accommodations/{accommodation_id}/memo")
async def update_public_memo(
    accommodation_id: int,
    payload: MemoUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    acc = await db.get(TouristAccommodation, accommodation_id)
    if not acc:
        raise HTTPException(404, "Accommodation not found")
    row = await db.get(AccommodationPublicMemo, accommodation_id)
    if row is None:
        row = AccommodationPublicMemo(
            accommodation_id=accommodation_id,
            content=payload.content,
            updated_by=current_user.id,
        )
        db.add(row)
    else:
        row.content = payload.content
        row.updated_by = current_user.id
    await db.commit()
    return {"ok": True}


@router.put("/accommodations/{accommodation_id}/my-memo")
async def update_user_memo(
    accommodation_id: int,
    payload: MemoUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    acc = await db.get(TouristAccommodation, accommodation_id)
    if not acc:
        raise HTTPException(404, "Accommodation not found")
    row = await db.get(
        AccommodationUserMemo, (accommodation_id, current_user.id)
    )
    if row is None:
        row = AccommodationUserMemo(
            accommodation_id=accommodation_id,
            user_id=current_user.id,
            content=payload.content,
        )
        db.add(row)
    else:
        row.content = payload.content
    await db.commit()
    return {"ok": True}
