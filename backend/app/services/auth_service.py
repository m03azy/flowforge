"""
Authentication service — business logic layer.

Handles user registration, login, token refresh, password reset,
and profile management. Keeps the API router thin.
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import pyotp

from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    LoginResponse,
    TokenResponse,
    ChangePasswordRequest,
    UserUpdateRequest,
)
from app.utils.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    create_password_reset_token,
    hash_token,
)


# ── Registration ──────────────────────────────────────────────────────────

def register_user(db: Session, payload: RegisterRequest) -> User:
    """Create a new user after checking for duplicate email."""
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role="admin",  # Default new registrants to admin of their organisation
        institution_type=payload.institution_type or "business",
        organisation_name=payload.organisation_name,
        is_active=True,
        is_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ── Login ──────────────────────────────────────────────────────────────────

def authenticate_user(db: Session, payload: LoginRequest) -> LoginResponse:
    """Verify credentials. If 2FA is enabled, return a short-lived 2FA token
    instead of full tokens. The client must then call /auth/2fa/login-verify."""
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    # If TOTP is enabled, issue a short-lived 2FA challenge token instead
    if user.totp_enabled and user.totp_secret:
        two_fa_token = create_access_token(
            {"sub": str(user.id), "type": "2fa_challenge"},
            expires_delta=timedelta(minutes=5),
        )
        return LoginResponse(requires_2fa=True, two_fa_token=two_fa_token)

    # No 2FA — issue full tokens immediately
    access, refresh = _issue_token_pair(db, user)
    return LoginResponse(access_token=access, refresh_token=refresh)


def _issue_token_pair(db: Session, user: User):
    """Helper: create access + refresh tokens and persist the refresh token."""
    access = create_access_token({"sub": str(user.id), "role": user.role})
    refresh = create_refresh_token({"sub": str(user.id)})
    db_token = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(refresh),
        expires_at=datetime.fromtimestamp(decode_token(refresh)["exp"], tz=timezone.utc),  # type: ignore[index,arg-type]
    )
    db.add(db_token)
    db.commit()
    return access, refresh


# ── Refresh ───────────────────────────────────────────────────────────────

def refresh_access_token(db: Session, refresh_token_str: str) -> TokenResponse:
    """Rotate tokens: validate refresh token, revoke old, issue new pair."""
    payload = decode_token(refresh_token_str)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    token_record = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token_hash == hash_token(refresh_token_str),
            RefreshToken.revoked == False,  # noqa: E712
        )
        .first()
    )
    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found or already revoked",
        )

    # Revoke old token
    token_record.revoked = True

    user_id = payload["sub"]
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    # Issue new pair
    new_access = create_access_token({"sub": str(user.id), "role": user.role})
    new_refresh = create_refresh_token({"sub": str(user.id)})

    db_token = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(new_refresh),
        expires_at=datetime.fromtimestamp(decode_token(new_refresh)["exp"], tz=timezone.utc),  # type: ignore[index,arg-type]
    )
    db.add(db_token)
    db.commit()

    return TokenResponse(access_token=new_access, refresh_token=new_refresh)


# ── Logout ────────────────────────────────────────────────────────────────

def logout_user(db: Session, user_id: int) -> None:
    """Revoke all refresh tokens for the given user."""
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.revoked == False,  # noqa: E712
    ).update({"revoked": True})
    db.commit()


# ── Password Reset ────────────────────────────────────────────────────────

def initiate_password_reset(db: Session, email: str) -> str:
    """Generate a password-reset token. Returns the token string.
    In production, this would be emailed to the user."""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Don't reveal whether the email exists
        return ""
    return create_password_reset_token(user.email)


def reset_password(db: Session, token: str, new_password: str) -> None:
    """Validate the reset token and update the user's password."""
    payload = decode_token(token)
    if not payload or payload.get("type") != "password_reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )
    user = db.query(User).filter(User.email == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.hashed_password = hash_password(new_password)
    db.commit()


# ── Change Password ──────────────────────────────────────────────────────

def change_password(db: Session, user: User, payload: ChangePasswordRequest) -> None:
    """Change password for an authenticated user after verifying current password."""
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    user.hashed_password = hash_password(payload.new_password)
    db.commit()


# ── Profile ───────────────────────────────────────────────────────────────

def update_user_profile(db: Session, user: User, payload: UserUpdateRequest) -> User:
    """Update mutable profile fields."""
    if payload.full_name is not None:
        user.full_name = payload.full_name
    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return user


# ── Two-Factor Authentication (TOTP) ──────────────────────────────────────────────

def twofa_generate_setup(user: User) -> dict:
    """Generate a new TOTP secret and return the otpauth URI for QR display.
    The secret is saved temporarily; it becomes active only after verification."""
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(
        name=user.email,
        issuer_name="FlowForge",
    )
    return {"secret": secret, "totp_uri": uri}


def twofa_enable(db: Session, user: User, secret: str, code: str) -> None:
    """Verify the TOTP code against the pending secret, then persist and enable."""
    totp = pyotp.TOTP(secret)
    if not totp.verify(code, valid_window=1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 2FA code. Please try again.",
        )
    user.totp_secret = secret
    user.totp_enabled = True
    db.commit()


def twofa_login_verify(db: Session, two_fa_token: str, code: str) -> LoginResponse:
    """Complete the 2FA login challenge: verify TOTP code then issue full tokens."""
    from app.schemas.auth import LoginResponse as LR
    payload = decode_token(two_fa_token)
    if not payload or payload.get("type") != "2fa_challenge":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired 2FA challenge token",
        )
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user or not user.is_active or not user.totp_enabled or not user.totp_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="2FA not configured")

    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(code, valid_window=1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 2FA code",
        )

    access, refresh = _issue_token_pair(db, user)
    return LR(access_token=access, refresh_token=refresh)


def twofa_disable(db: Session, user: User, code: str) -> None:
    """Disable 2FA after verifying the current TOTP code."""
    if not user.totp_enabled or not user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is not currently enabled",
        )
    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(code, valid_window=1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 2FA code",
        )
    user.totp_secret = None
    user.totp_enabled = False
    db.commit()
