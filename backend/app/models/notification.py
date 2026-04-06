from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class TelegramNotificationLog(Base):
    """텔레그램 알림 발송 이력 (중복 발송 방지용)"""

    __tablename__ = "telegram_notification_log"
    __table_args__ = (
        UniqueConstraint(
            "plan_id", "kind", "target_date", name="uq_notif_plan_kind_date"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    plan_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("travel_plans.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # "reminder" | "weather"
    kind: Mapped[str] = mapped_column(String(20))
    # 알림 대상 날짜 (예: D-7 인 경우 그 날짜)
    target_date: Mapped[date] = mapped_column(Date)
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
