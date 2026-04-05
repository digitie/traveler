from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import String, Integer, DateTime, Float, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class TouristSpot(Base):
    """전국관광지정보 표준데이터 (data.go.kr 15013111)"""

    __tablename__ = "tourist_spots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    management_number: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    spot_name: Mapped[str] = mapped_column(String(200), index=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sido: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    sigungu: Mapped[str | None] = mapped_column(String(50), nullable=True)
    road_address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    jibun_address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    location = mapped_column(Geometry("POINT", srid=4326), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    homepage: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    operating_hours: Mapped[str | None] = mapped_column(String(200), nullable=True)
    parking: Mapped[str | None] = mapped_column(String(200), nullable=True)
    admission_fee: Mapped[str | None] = mapped_column(String(200), nullable=True)
    data_reference_date: Mapped[str | None] = mapped_column(String(10), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class TouristRestaurant(Base):
    """전국관광식당정보 표준데이터 (data.go.kr 15013112)"""

    __tablename__ = "tourist_restaurants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    management_number: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    restaurant_name: Mapped[str] = mapped_column(String(200), index=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sido: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    sigungu: Mapped[str | None] = mapped_column(String(50), nullable=True)
    road_address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    jibun_address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    location = mapped_column(Geometry("POINT", srid=4326), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    main_menu: Mapped[str | None] = mapped_column(String(500), nullable=True)
    operating_hours: Mapped[str | None] = mapped_column(String(200), nullable=True)
    closed_days: Mapped[str | None] = mapped_column(String(200), nullable=True)
    parking: Mapped[str | None] = mapped_column(String(200), nullable=True)
    data_reference_date: Mapped[str | None] = mapped_column(String(10), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class TouristAccommodation(Base):
    """전국숙박정보 표준데이터 (data.go.kr 15021141)"""

    __tablename__ = "tourist_accommodations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    management_number: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    accommodation_name: Mapped[str] = mapped_column(String(200), index=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sido: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    sigungu: Mapped[str | None] = mapped_column(String(50), nullable=True)
    road_address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    jibun_address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    location = mapped_column(Geometry("POINT", srid=4326), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    room_count: Mapped[str | None] = mapped_column(String(50), nullable=True)
    homepage: Mapped[str | None] = mapped_column(String(500), nullable=True)
    operating_hours: Mapped[str | None] = mapped_column(String(200), nullable=True)
    parking: Mapped[str | None] = mapped_column(String(200), nullable=True)
    data_reference_date: Mapped[str | None] = mapped_column(String(10), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
