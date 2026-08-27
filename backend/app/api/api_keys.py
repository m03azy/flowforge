"""
API Keys Management.
Reseller Superadmin can register, view, rotate, and delete platform API keys
for services such as Gemini AI, SendGrid, Twilio, Stripe, OpenAI, AWS, etc.
Keys are stored securely (masked) and applied to the live backend config.
"""
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.orm import Session
import sqlalchemy as sa

from app.db.session import Base, get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.services.audit_service import write_log

router = APIRouter(prefix="/api/api-keys", tags=["API Keys Management"])


# ── Model ──────────────────────────────────────────────────────────────────

class ApiKeyConfig(Base):
    __tablename__ = "api_key_configs"

    id = Column(Integer, primary_key=True, index=True)
    service_name = Column(String(100), nullable=False)          # e.g. "Gemini AI", "SendGrid", "Twilio"
    service_key = Column(String(100), nullable=False, unique=True)  # e.g. "GEMINI_API_KEY"
    api_key_value = Column(Text, nullable=False)                # raw key value
    description = Column(String(255), nullable=True)
    category = Column(String(100), nullable=False, default="General")  # AI, Email, SMS, Storage, Payment
    is_active = Column(Boolean, nullable=False, default=True)
    is_system = Column(Boolean, nullable=False, default=False)  # read-only system key
    added_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False)


# ── Schemas ────────────────────────────────────────────────────────────────

class ApiKeyCreate(BaseModel):
    service_name: str = Field(..., min_length=2, max_length=100, example="Gemini AI")
    service_key: str = Field(..., min_length=2, max_length=100, example="GEMINI_API_KEY")
    api_key_value: str = Field(..., min_length=4, example="AIzaSy...")
    description: Optional[str] = Field(None, max_length=255)
    category: str = Field("General", example="AI")


class ApiKeyUpdate(BaseModel):
    service_name: Optional[str] = None
    api_key_value: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None


class ApiKeyRead(BaseModel):
    id: int
    service_name: str
    service_key: str
    masked_value: str
    description: Optional[str]
    category: str
    is_active: bool
    is_system: bool
    added_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


def _mask_key(raw: str) -> str:
    """Return masked version like AIza•••••••••••••••ttU"""
    if len(raw) <= 8:
        return "•" * len(raw)
    return raw[:4] + "•" * (len(raw) - 8) + raw[-4:]


def _require_superadmin(user: User):
    if user.role not in ("superadmin", "reseller_admin"):
        raise HTTPException(status_code=403, detail="Reseller Superadmin access required")


# ── Seeded default known service definitions ───────────────────────────────

KNOWN_SERVICES = [
    {
        "service_name": "Gemini AI",
        "service_key": "GEMINI_API_KEY",
        "description": "Google Gemini 2.0 Flash — used for AI Reports generation",
        "category": "AI",
    },
    {
        "service_name": "OpenAI",
        "service_key": "OPENAI_API_KEY",
        "description": "OpenAI GPT-4o — alternative AI engine for reports and automation",
        "category": "AI",
    },
    {
        "service_name": "SendGrid",
        "service_key": "SENDGRID_API_KEY",
        "description": "SendGrid transactional email delivery for notifications and workflows",
        "category": "Email",
    },
    {
        "service_name": "Twilio SMS",
        "service_key": "TWILIO_AUTH_TOKEN",
        "description": "Twilio SMS & WhatsApp messaging for action workflows",
        "category": "SMS",
    },
    {
        "service_name": "Twilio Account SID",
        "service_key": "TWILIO_ACCOUNT_SID",
        "description": "Twilio Account SID identifier",
        "category": "SMS",
    },
    {
        "service_name": "Stripe Payments",
        "service_key": "STRIPE_SECRET_KEY",
        "description": "Stripe payment processing for billing and subscription management",
        "category": "Payment",
    },
    {
        "service_name": "AWS S3 Access Key",
        "service_key": "AWS_ACCESS_KEY_ID",
        "description": "AWS S3 for document vault cloud storage",
        "category": "Storage",
    },
    {
        "service_name": "AWS S3 Secret Key",
        "service_key": "AWS_SECRET_ACCESS_KEY",
        "description": "AWS S3 secret key for cloud storage operations",
        "category": "Storage",
    },
]


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/services", response_model=List[dict], summary="Get list of supported API service templates")
def get_known_services(
    current_user: User = Depends(get_current_user),
):
    """Return the list of supported service templates a reseller can configure."""
    _require_superadmin(current_user)
    return KNOWN_SERVICES


@router.get("/", response_model=List[ApiKeyRead], summary="List all configured API keys (masked)")
def list_api_keys(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all API keys configured by the reseller superadmin (values are masked)."""
    _require_superadmin(current_user)

    keys = db.query(ApiKeyConfig).order_by(ApiKeyConfig.category, ApiKeyConfig.service_name).all()
    result = []
    for k in keys:
        result.append(ApiKeyRead(
            id=k.id,
            service_name=k.service_name,
            service_key=k.service_key,
            masked_value=_mask_key(k.api_key_value),
            description=k.description,
            category=k.category,
            is_active=k.is_active,
            is_system=k.is_system,
            added_by=k.added_by,
            created_at=k.created_at,
            updated_at=k.updated_at,
        ))
    return result


@router.post("/", response_model=ApiKeyRead, status_code=status.HTTP_201_CREATED, summary="Add a new API key")
def create_api_key(
    payload: ApiKeyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add or replace a platform API key. If the service_key already exists, it updates the value."""
    _require_superadmin(current_user)

    existing = db.query(ApiKeyConfig).filter(ApiKeyConfig.service_key == payload.service_key).first()
    if existing:
        # Update rather than duplicate
        existing.service_name = payload.service_name
        existing.api_key_value = payload.api_key_value.strip()
        existing.description = payload.description
        existing.category = payload.category
        existing.is_active = True
        existing.added_by = current_user.email
        db.commit()
        db.refresh(existing)
        k = existing
    else:
        k = ApiKeyConfig(
            service_name=payload.service_name,
            service_key=payload.service_key.strip().upper(),
            api_key_value=payload.api_key_value.strip(),
            description=payload.description,
            category=payload.category,
            is_active=True,
            added_by=current_user.email,
        )
        db.add(k)
        db.commit()
        db.refresh(k)

    write_log(
        db,
        action="api_key_added",
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        organisation_name="platform",
        resource_type="api_key",
        description=f"API key added/updated for service '{k.service_name}' ({k.service_key})",
    )

    return ApiKeyRead(
        id=k.id,
        service_name=k.service_name,
        service_key=k.service_key,
        masked_value=_mask_key(k.api_key_value),
        description=k.description,
        category=k.category,
        is_active=k.is_active,
        is_system=k.is_system,
        added_by=k.added_by,
        created_at=k.created_at,
        updated_at=k.updated_at,
    )


@router.patch("/{key_id}", response_model=ApiKeyRead, summary="Update an existing API key")
def update_api_key(
    key_id: int,
    payload: ApiKeyUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an API key's value, status, or metadata."""
    _require_superadmin(current_user)

    k = db.query(ApiKeyConfig).filter(ApiKeyConfig.id == key_id).first()
    if not k:
        raise HTTPException(status_code=404, detail="API key not found")
    if k.is_system:
        raise HTTPException(status_code=403, detail="System keys cannot be modified via the portal")

    if payload.service_name is not None:
        k.service_name = payload.service_name
    if payload.api_key_value is not None:
        k.api_key_value = payload.api_key_value.strip()
    if payload.description is not None:
        k.description = payload.description
    if payload.category is not None:
        k.category = payload.category
    if payload.is_active is not None:
        k.is_active = payload.is_active

    db.commit()
    db.refresh(k)

    write_log(
        db,
        action="api_key_updated",
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        organisation_name="platform",
        resource_type="api_key",
        description=f"API key updated for '{k.service_name}' ({k.service_key})",
    )

    return ApiKeyRead(
        id=k.id,
        service_name=k.service_name,
        service_key=k.service_key,
        masked_value=_mask_key(k.api_key_value),
        description=k.description,
        category=k.category,
        is_active=k.is_active,
        is_system=k.is_system,
        added_by=k.added_by,
        created_at=k.created_at,
        updated_at=k.updated_at,
    )


@router.delete("/{key_id}", response_model=dict, summary="Delete an API key")
def delete_api_key(
    key_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove an API key configuration from the platform."""
    _require_superadmin(current_user)

    k = db.query(ApiKeyConfig).filter(ApiKeyConfig.id == key_id).first()
    if not k:
        raise HTTPException(status_code=404, detail="API key not found")
    if k.is_system:
        raise HTTPException(status_code=403, detail="System keys cannot be deleted")

    name = k.service_name
    db.delete(k)
    db.commit()

    write_log(
        db,
        action="api_key_deleted",
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        organisation_name="platform",
        resource_type="api_key",
        description=f"API key deleted for service '{name}'",
    )

    return {"message": f"API key for '{name}' has been deleted."}
