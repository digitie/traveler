from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import engine, Base
from app.routers import auth, admin, weather, travel_plans, tourism


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 시작 시 테이블 생성 (개발용 - 프로덕션에서는 alembic 사용)
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        await conn.run_sync(Base.metadata.create_all)
        # 기존 DB를 위한 컬럼 추가 (멱등)
        await conn.execute(
            text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(64)"
            )
        )
    yield
    await engine.dispose()


app = FastAPI(
    title="Traveler API",
    description="여행 계획 및 관광 정보 API",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(weather.router)
app.include_router(travel_plans.router)
app.include_router(tourism.router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
