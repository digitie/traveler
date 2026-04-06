from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AccommodationPublicMemo(Base):
    """숙소 공용 메모 (전체 사용자 공유)"""

    __tablename__ = "accommodation_public_memos"

    accommodation_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("tourist_accommodations.id", ondelete="CASCADE"),
        primary_key=True,
    )
    content: Mapped[str] = mapped_column(Text, default="")
    updated_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class AccommodationUserMemo(Base):
    """숙소 개인 메모 (작성자 본인만)"""

    __tablename__ = "accommodation_user_memos"

    accommodation_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("tourist_accommodations.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    content: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
