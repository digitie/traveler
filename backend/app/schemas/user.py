from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    name: str | None = None
    is_active: bool
    is_admin: bool
    telegram_chat_id: str | None = None
    telegram_enabled: bool = True
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdateAdmin(BaseModel):
    is_active: bool | None = None
    is_admin: bool | None = None


class UserUpdateMe(BaseModel):
    name: str | None = None
    telegram_chat_id: str | None = None
    telegram_enabled: bool | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str
    new_password_confirm: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
