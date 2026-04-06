from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://traveler:traveler_secret@db:5432/traveler_db"
    database_url_sync: str = "postgresql://traveler:traveler_secret@db:5432/traveler_db"
    data_go_kr_api_key: str = ""
    data_ex_api_key: str = ""
    jwt_secret: str = "traveler-jwt-secret-change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days

    class Config:
        env_file = ".env"


settings = Settings()
