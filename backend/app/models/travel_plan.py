from datetime import date, datetime

from geoalchemy2 import Geometry
from sqlalchemy import String, Integer, DateTime, Date, Float, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TravelPlan(Base):
    """여행 계획"""

    __tablename__ = "travel_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    user: Mapped["User"] = relationship(back_populates="travel_plans")
    spots: Mapped[list["TravelPlanSpot"]] = relationship(
        back_populates="travel_plan", cascade="all, delete-orphan"
    )
    layer_weather: Mapped[list["TravelPlanLayerWeather"]] = relationship(
        cascade="all, delete-orphan"
    )


class TravelPlanSpot(Base):
    """여행 계획 내 장소"""

    __tablename__ = "travel_plan_spots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    travel_plan_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("travel_plans.id", ondelete="CASCADE"), index=True
    )
    plan_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    order: Mapped[int] = mapped_column(Integer, default=0)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    location = mapped_column(Geometry("POINT", srid=4326), nullable=True)
    source: Mapped[str | None] = mapped_column(String(50), nullable=True)
    source_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    travel_plan: Mapped["TravelPlan"] = relationship(back_populates="spots")


class TravelPlanLayerWeather(Base):
    """레이어(plan_date)별 날씨 표시 기준 spot"""

    __tablename__ = "travel_plan_layer_weather"

    plan_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("travel_plans.id", ondelete="CASCADE"),
        primary_key=True,
    )
    plan_date: Mapped[date] = mapped_column(Date, primary_key=True)
    weather_spot_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("travel_plan_spots.id", ondelete="SET NULL"), nullable=True
    )
