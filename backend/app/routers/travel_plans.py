from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user
from app.database import get_db
from app.models.travel_plan import TravelPlan, TravelPlanSpot
from app.models.user import User
from app.schemas.travel_plan import (
    TravelPlanCreate,
    TravelPlanListItem,
    TravelPlanResponse,
    TravelPlanSpotCreate,
    TravelPlanSpotResponse,
    TravelPlanSpotUpdate,
    TravelPlanUpdate,
)

router = APIRouter(prefix="/api/plans", tags=["travel-plans"])


@router.get("/", response_model=list[TravelPlanListItem])
async def list_plans(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(TravelPlan)
        .where(TravelPlan.user_id == current_user.id)
        .order_by(TravelPlan.start_date.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/", response_model=TravelPlanResponse, status_code=201)
async def create_plan(
    plan: TravelPlanCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if plan.end_date < plan.start_date:
        raise HTTPException(status_code=400, detail="end_date must be >= start_date")
    db_plan = TravelPlan(user_id=current_user.id, **plan.model_dump())
    db.add(db_plan)
    await db.commit()
    await db.refresh(db_plan, ["spots"])
    return db_plan


async def _get_owned_plan(plan_id: int, user: User, db: AsyncSession) -> TravelPlan:
    stmt = (
        select(TravelPlan)
        .options(selectinload(TravelPlan.spots))
        .where(TravelPlan.id == plan_id, TravelPlan.user_id == user.id)
    )
    result = await db.execute(stmt)
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


@router.get("/{plan_id}", response_model=TravelPlanResponse)
async def get_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_owned_plan(plan_id, current_user, db)


@router.put("/{plan_id}", response_model=TravelPlanResponse)
async def update_plan(
    plan_id: int,
    plan_update: TravelPlanUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    plan = await _get_owned_plan(plan_id, current_user, db)
    for key, value in plan_update.model_dump(exclude_unset=True).items():
        setattr(plan, key, value)
    if plan.end_date < plan.start_date:
        raise HTTPException(status_code=400, detail="end_date must be >= start_date")
    await db.commit()
    await db.refresh(plan, ["spots"])
    return plan


@router.delete("/{plan_id}", status_code=204)
async def delete_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    plan = await _get_owned_plan(plan_id, current_user, db)
    await db.delete(plan)
    await db.commit()


@router.post("/{plan_id}/spots", response_model=TravelPlanSpotResponse, status_code=201)
async def add_spot(
    plan_id: int,
    spot: TravelPlanSpotCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_plan(plan_id, current_user, db)
    db_spot = TravelPlanSpot(
        travel_plan_id=plan_id,
        **spot.model_dump(),
        location=f"SRID=4326;POINT({spot.longitude} {spot.latitude})",
    )
    db.add(db_spot)
    await db.commit()
    await db.refresh(db_spot)
    return db_spot


@router.patch("/{plan_id}/spots/{spot_id}", response_model=TravelPlanSpotResponse)
async def update_spot(
    plan_id: int,
    spot_id: int,
    spot_update: TravelPlanSpotUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_plan(plan_id, current_user, db)
    stmt = select(TravelPlanSpot).where(
        TravelPlanSpot.id == spot_id, TravelPlanSpot.travel_plan_id == plan_id
    )
    result = await db.execute(stmt)
    spot = result.scalar_one_or_none()
    if not spot:
        raise HTTPException(status_code=404, detail="Spot not found")
    data = spot_update.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(spot, k, v)
    if "latitude" in data or "longitude" in data:
        spot.location = f"SRID=4326;POINT({spot.longitude} {spot.latitude})"
    await db.commit()
    await db.refresh(spot)
    return spot


@router.delete("/{plan_id}/spots/{spot_id}", status_code=204)
async def remove_spot(
    plan_id: int,
    spot_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_owned_plan(plan_id, current_user, db)
    stmt = select(TravelPlanSpot).where(
        TravelPlanSpot.id == spot_id, TravelPlanSpot.travel_plan_id == plan_id
    )
    result = await db.execute(stmt)
    spot = result.scalar_one_or_none()
    if not spot:
        raise HTTPException(status_code=404, detail="Spot not found")
    await db.delete(spot)
    await db.commit()
