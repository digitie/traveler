"""
Traveler Telegram Bot

두 가지 동작:
1. 텔레그램 long-polling: 사용자가 봇에 /start 또는 아무 메시지를 보내면
   chat_id를 회신해서 사용자가 웹 UI 프로필에 등록할 수 있게 안내한다.
2. 1시간마다 DB의 여행계획을 점검해서 알림 발송:
   - 여행 시작일 7일 전 ~ 2일 전 (전전날 포함): 여행계획 리마인더
   - 여행 시작일 1일 전 ~ 종료일: 날씨 예보 (현재는 placeholder)
   중복 발송 방지를 위해 telegram_notification_log 테이블에 기록한다.
"""

from __future__ import annotations

import asyncio
import logging
import os
from datetime import date, datetime, timedelta
from typing import Iterable

import httpx
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
log = logging.getLogger("traveler-bot")

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
DATABASE_URL = os.environ.get(
    "DATABASE_URL_SYNC",
    "postgresql://traveler:traveler_secret@db:5432/traveler_db",
)
NOTIFY_INTERVAL_SECONDS = int(os.environ.get("NOTIFY_INTERVAL_SECONDS", "3600"))
POLL_TIMEOUT = 30  # long polling timeout

API_BASE = f"https://api.telegram.org/bot{BOT_TOKEN}"

engine = create_engine(DATABASE_URL, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


# ----------------------- Telegram helpers -----------------------

async def tg_send_message(client: httpx.AsyncClient, chat_id: str, text_msg: str) -> bool:
    try:
        r = await client.post(
            f"{API_BASE}/sendMessage",
            json={
                "chat_id": chat_id,
                "text": text_msg,
                "parse_mode": "HTML",
                "disable_web_page_preview": True,
            },
            timeout=15,
        )
        if r.status_code != 200:
            log.warning("sendMessage failed: %s %s", r.status_code, r.text)
            return False
        return True
    except Exception as e:
        log.exception("sendMessage error: %s", e)
        return False


# ----------------------- Long polling -----------------------

WELCOME_TEMPLATE = (
    "👋 안녕하세요, Traveler 알림 봇입니다.\n\n"
    "당신의 chat_id는 <code>{chat_id}</code> 입니다.\n"
    "이 값을 Traveler 웹사이트의 [프로필 → 텔레그램 chat_id]에 입력하면\n"
    "여행 일정 알림과 날씨 예보를 받아보실 수 있습니다."
)


async def handle_update(client: httpx.AsyncClient, update: dict) -> None:
    msg = update.get("message") or update.get("edited_message")
    if not msg:
        return
    chat = msg.get("chat", {})
    chat_id = str(chat.get("id"))
    if not chat_id:
        return
    await tg_send_message(client, chat_id, WELCOME_TEMPLATE.format(chat_id=chat_id))


async def long_poll_loop() -> None:
    if not BOT_TOKEN:
        log.warning("TELEGRAM_BOT_TOKEN not set; long-poll loop disabled")
        return
    log.info("Starting Telegram long-poll loop")
    offset: int | None = None
    async with httpx.AsyncClient() as client:
        while True:
            try:
                params: dict = {"timeout": POLL_TIMEOUT}
                if offset is not None:
                    params["offset"] = offset
                r = await client.get(
                    f"{API_BASE}/getUpdates",
                    params=params,
                    timeout=POLL_TIMEOUT + 10,
                )
                if r.status_code != 200:
                    log.warning("getUpdates failed: %s %s", r.status_code, r.text)
                    await asyncio.sleep(5)
                    continue
                data = r.json()
                for upd in data.get("result", []):
                    offset = upd["update_id"] + 1
                    await handle_update(client, upd)
            except httpx.ReadTimeout:
                continue
            except Exception as e:
                log.exception("long-poll error: %s", e)
                await asyncio.sleep(5)


# ----------------------- Notification scheduler -----------------------

REMINDER_OFFSETS = list(range(2, 8))  # D-7, D-6, ..., D-2 (전전날 포함)
WEATHER_OFFSETS_RANGE = (1, 0)  # D-1 부터 종료일까지


def fetch_due_plans(db: Session, today: date) -> list[dict]:
    """오늘 알림 발송 대상 plans 조회.

    각 row 에는 user 의 telegram_chat_id, plan 정보가 포함되어 있다.
    """
    sql = text(
        """
        SELECT
            p.id              AS plan_id,
            p.user_id         AS user_id,
            p.title           AS title,
            p.description     AS description,
            p.start_date      AS start_date,
            p.end_date        AS end_date,
            u.telegram_chat_id AS chat_id
        FROM travel_plans p
        JOIN users u ON u.id = p.user_id
        WHERE u.is_active = TRUE
          AND u.telegram_chat_id IS NOT NULL
          AND p.end_date >= :today
          AND p.start_date <= :today + INTERVAL '7 days'
        """
    )
    rows = db.execute(sql, {"today": today}).mappings().all()
    return [dict(r) for r in rows]


def already_sent(db: Session, plan_id: int, kind: str, target_date: date) -> bool:
    sql = text(
        """
        SELECT 1 FROM telegram_notification_log
        WHERE plan_id = :plan_id AND kind = :kind AND target_date = :target_date
        LIMIT 1
        """
    )
    return db.execute(
        sql, {"plan_id": plan_id, "kind": kind, "target_date": target_date}
    ).first() is not None


def mark_sent(db: Session, plan_id: int, user_id: int, kind: str, target_date: date) -> None:
    sql = text(
        """
        INSERT INTO telegram_notification_log (plan_id, user_id, kind, target_date, sent_at)
        VALUES (:plan_id, :user_id, :kind, :target_date, :sent_at)
        ON CONFLICT (plan_id, kind, target_date) DO NOTHING
        """
    )
    db.execute(
        sql,
        {
            "plan_id": plan_id,
            "user_id": user_id,
            "kind": kind,
            "target_date": target_date,
            "sent_at": datetime.utcnow(),
        },
    )
    db.commit()


def fetch_spots(db: Session, plan_id: int) -> list[dict]:
    sql = text(
        """
        SELECT name, plan_date, category
        FROM travel_plan_spots
        WHERE travel_plan_id = :pid
        ORDER BY plan_date NULLS LAST, "order", id
        """
    )
    return [dict(r) for r in db.execute(sql, {"pid": plan_id}).mappings().all()]


def build_reminder_message(plan: dict, days_left: int, spots: list[dict]) -> str:
    lines = [
        f"🧳 <b>여행 알림</b> — D-{days_left}",
        f"<b>{plan['title']}</b>",
        f"📅 {plan['start_date']} ~ {plan['end_date']}",
    ]
    if plan.get("description"):
        lines.append(f"📝 {plan['description']}")
    if spots:
        lines.append("")
        lines.append(f"📍 등록된 장소 {len(spots)}곳:")
        for s in spots[:10]:
            d = f" ({s['plan_date']})" if s.get("plan_date") else ""
            lines.append(f"  • {s['name']}{d}")
        if len(spots) > 10:
            lines.append(f"  … 외 {len(spots) - 10}곳")
    else:
        lines.append("\n아직 등록된 장소가 없어요. 일정을 채워보세요!")
    return "\n".join(lines)


def build_weather_message(plan: dict, today: date) -> str:
    # TODO: 날씨 API 연동 (KMA 단기예보 / 중기예보)
    if today < plan["start_date"]:
        header = f"☁️ <b>여행 전날 날씨 예보</b> — D-1"
    elif today == plan["start_date"]:
        header = "☁️ <b>여행 첫날 날씨</b>"
    elif today == plan["end_date"]:
        header = "☁️ <b>여행 마지막 날 날씨</b>"
    else:
        day_n = (today - plan["start_date"]).days + 1
        header = f"☁️ <b>여행 {day_n}일차 날씨</b>"
    return (
        f"{header}\n"
        f"<b>{plan['title']}</b>\n"
        f"📅 {plan['start_date']} ~ {plan['end_date']}\n\n"
        "(날씨 예보 기능은 아직 준비 중입니다)"
    )


async def send_due_notifications(client: httpx.AsyncClient) -> None:
    today = date.today()
    log.info("notification check at %s", today)

    db = SessionLocal()
    try:
        plans = fetch_due_plans(db, today)
        log.info("%d candidate plan(s)", len(plans))

        for plan in plans:
            chat_id = plan["chat_id"]
            start: date = plan["start_date"]
            end: date = plan["end_date"]

            # ----- reminder: 7일 전 ~ 전전날 -----
            days_left = (start - today).days
            if days_left in REMINDER_OFFSETS:
                if not already_sent(db, plan["plan_id"], "reminder", today):
                    spots = fetch_spots(db, plan["plan_id"])
                    msg = build_reminder_message(plan, days_left, spots)
                    if await tg_send_message(client, chat_id, msg):
                        mark_sent(db, plan["plan_id"], plan["user_id"], "reminder", today)
                        log.info(
                            "reminder sent plan=%s D-%s", plan["plan_id"], days_left
                        )

            # ----- weather: 전날 ~ 종료일 -----
            if (start - timedelta(days=1)) <= today <= end:
                if not already_sent(db, plan["plan_id"], "weather", today):
                    msg = build_weather_message(plan, today)
                    if await tg_send_message(client, chat_id, msg):
                        mark_sent(db, plan["plan_id"], plan["user_id"], "weather", today)
                        log.info("weather sent plan=%s date=%s", plan["plan_id"], today)
    finally:
        db.close()


async def notification_loop() -> None:
    if not BOT_TOKEN:
        log.warning("TELEGRAM_BOT_TOKEN not set; notification loop disabled")
        return
    log.info(
        "Starting notification loop (interval=%ss)", NOTIFY_INTERVAL_SECONDS
    )
    # 시작 직후 한 번, 그 다음 1시간 간격
    async with httpx.AsyncClient() as client:
        while True:
            try:
                await send_due_notifications(client)
            except Exception as e:
                log.exception("notification loop error: %s", e)
            await asyncio.sleep(NOTIFY_INTERVAL_SECONDS)


# ----------------------- Entrypoint -----------------------

async def main() -> None:
    if not BOT_TOKEN:
        log.error(
            "TELEGRAM_BOT_TOKEN environment variable is required. Sleeping forever."
        )
        while True:
            await asyncio.sleep(3600)
    log.info("Traveler Telegram Bot starting…")
    await asyncio.gather(long_poll_loop(), notification_loop())


if __name__ == "__main__":
    asyncio.run(main())
