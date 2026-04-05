from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.travel_plan import TravelPlan, TravelPlanSpot
from app.schemas.travel_plan import (
    TravelPlanCreate,
    TravelPlanUpdate,
    TravelPlanResponse,
    TravelPlanSpotCreate,
    TravelPlanSpotResponse,
)

router = APIRouter(prefix="/api/plans", tags=["travel-plans"])


@router.get("/", response_model=list[TravelPlanResponse])
async def list_plans(db: AsyncSession = Depends(get_db)):
    stmt = (
        select(TravelPlan)
        .options(selectinload(TravelPlan.spots))
        .order_by(TravelPlan.start_date.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/", response_model=TravelPlanResponse, status_code=201)
async def create_plan(plan: TravelPlanCreate, db: AsyncSession = Depends(get_db)):
    db_plan = TravelPlan(**plan.model_dump())
    db.add(db_plan)
    await db.commit()
    await db.refresh(db_plan, ["spots"])
    return db_plan


@router.get("/{plan_id}", response_model=TravelPlanResponse)
async def get_plan(plan_id: int, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(TravelPlan)
        .options(selectinload(TravelPlan.spots))
        .where(TravelPlan.id == plan_id)
    )
    result = await db.execute(stmt)
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


@router.put("/{plan_id}", response_model=TravelPlanResponse)
async def update_plan(
    plan_id: int, plan_update: TravelPlanUpdate, db: AsyncSession = Depends(get_db)
):
    stmt = select(TravelPlan).where(TravelPlan.id == plan_id)
    result = await db.execute(stmt)
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    for key, value in plan_update.model_dump(exclude_unset=True).items():
        setattr(plan, key, value)
    await db.commit()
    await db.refresh(plan, ["spots"])
    return plan


@router.delete("/{plan_id}", status_code=204)
async def delete_plan(plan_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(TravelPlan).where(TravelPlan.id == plan_id)
    result = await db.execute(stmt)
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    await db.delete(plan)
    await db.commit()


@router.post("/{plan_id}/spots", response_model=TravelPlanSpotResponse, status_code=201)
async def add_spot(
    plan_id: int, spot: TravelPlanSpotCreate, db: AsyncSession = Depends(get_db)
):
    stmt = select(TravelPlan).where(TravelPlan.id == plan_id)
    result = await db.execute(stmt)
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    db_spot = TravelPlanSpot(
        travel_plan_id=plan_id,
        **spot.model_dump(),
        location=f"SRID=4326;POINT({spot.longitude} {spot.latitude})",
    )
    db.add(db_spot)
    await db.commit()
    await db.refresh(db_spot)
    return db_spot


@router.delete("/{plan_id}/spots/{spot_id}", status_code=204)
async def remove_spot(
    plan_id: int, spot_id: int, db: AsyncSession = Depends(get_db)
):
    stmt = select(TravelPlanSpot).where(
        TravelPlanSpot.id == spot_id, TravelPlanSpot.travel_plan_id == plan_id
    )
    result = await db.execute(stmt)
    spot = result.scalar_one_or_none()
    if not spot:
        raise HTTPException(status_code=404, detail="Spot not found")
    await db.delete(spot)
    await db.commit()
