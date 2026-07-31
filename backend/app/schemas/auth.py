"""
Pydantic schemas for authentication endpoints.
Handles request validation and response serialization.
"""
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator
import re


# ── Registration ──────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=8, max_length=128)
    institution_type: str = Field("business", max_length=20)
    organisation_name: str | None = Field(None, max_length=255)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one special character")
        return v


# ── Login ─────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ── Token Response ────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Password Management ──────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)


# ── User Response ─────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    institution_type: str = "business"
    organisation_name: str | None = None
    subscription_plan: str = "starter"
    is_active: bool
    is_verified: bool
    department: str | None = None
    job_title: str | None = None
    phone_number: str | None = None
    hire_date: datetime | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserUpdateRequest(BaseModel):
    full_name: str | None = Field(None, min_length=2, max_length=100)
    role: str | None = Field(None, max_length=20)
    institution_type: str | None = Field(None, max_length=20)
    organisation_name: str | None = Field(None, max_length=255)
    department: str | None = Field(None, max_length=100)
    job_title: str | None = Field(None, max_length=100)
    phone_number: str | None = Field(None, max_length=30)
    hire_date: datetime | None = None
    is_active: bool | None = None


class UserCreateRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=6, max_length=128)
    role: str = Field("employee", max_length=20)
    department: str | None = Field(None, max_length=100)
    job_title: str | None = Field(None, max_length=100)
    phone_number: str | None = Field(None, max_length=30)


# ── Generic Message ───────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str
