"""
Authentication Router.
Exposes REST endpoints for registering, logging in, logging out,
refreshing tokens, requesting/resetting passwords, and profile management.
"""
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.middleware.auth import get_current_user
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    RefreshRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
    UserResponse,
    UserUpdateRequest,
    MessageResponse,
)
from app.services import auth_service
from app.services.audit_service import write_log, AuditAction

router = APIRouter()


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    """Register a new user with email, full name, and a strong password."""
    user = auth_service.register_user(db, payload)
    write_log(
        db,
        action=AuditAction.USER_REGISTERED,
        actor_id=user.id,
        actor_email=user.email,
        actor_role=user.role,
        organisation_name=user.organisation_name,
        resource_type="user",
        resource_id=user.id,
        description=f"New user registered: {user.email}",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return user


# Let's fix register status code to 201 Created
@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Login user and obtain tokens",
)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Authenticate credentials and return JWT access and refresh tokens."""
    try:
        result = auth_service.authenticate_user(db, payload)
        # Look up user for audit context
        from app.models.user import User as UserModel
        user = db.query(UserModel).filter(UserModel.email == payload.email).first()
        write_log(
            db,
            action=AuditAction.USER_LOGIN,
            actor_id=user.id if user else None,
            actor_email=payload.email,
            actor_role=user.role if user else None,
            organisation_name=user.organisation_name if user else None,
            resource_type="session",
            description=f"User logged in: {payload.email}",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        return result
    except Exception as exc:
        write_log(
            db,
            action=AuditAction.USER_LOGIN_FAILED,
            actor_email=payload.email,
            description=f"Failed login attempt for: {payload.email}",
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            log_status="failure",
        )
        raise


@router.post(
    "/refresh",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Rotate tokens via refresh token",
)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    """Rotate tokens using a valid refresh token. Old refresh token is revoked."""
    return auth_service.refresh_access_token(db, payload.refresh_token)


@router.post(
    "/logout",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Logout user and revoke refresh tokens",
)
def logout(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Revoke all active refresh tokens for the logged-in user."""
    auth_service.logout_user(db, current_user.id)
    write_log(
        db,
        action=AuditAction.USER_LOGOUT,
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        organisation_name=current_user.organisation_name,
        resource_type="session",
        description=f"User logged out: {current_user.email}",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return MessageResponse(message="Successfully logged out")


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Initiate password reset flow",
)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Send reset password instructions to the user email if registered."""
    token = auth_service.initiate_password_reset(db, payload.email)
    # In a full production flow, we would trigger an email celery task here.
    # For now, we return a generic success message to prevent user enumeration,
    # and if in DEBUG/Dev mode, we could log the token.
    if token:
        # For development / testing visibility:
        print(f"[DEV] Reset Password Link: http://localhost:5173/reset-password?token={token}")
    return MessageResponse(message="If the email is registered, password reset instructions have been sent.")


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Reset password using token",
)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset user password using the token sent via email."""
    auth_service.reset_password(db, payload.token, payload.new_password)
    return MessageResponse(message="Password has been reset successfully")


@router.post(
    "/change-password",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Change user password when logged in",
)
def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change the user password. Requires valid current password and new password."""
    auth_service.change_password(db, current_user, payload)
    write_log(
        db,
        action=AuditAction.PASSWORD_CHANGED,
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        organisation_name=current_user.organisation_name,
        resource_type="user",
        resource_id=current_user.id,
        description=f"Password changed by: {current_user.email}",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return MessageResponse(message="Password changed successfully")


@router.get(
    "/profile",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current user profile",
)
def get_profile(current_user: User = Depends(get_current_user)):
    """Retrieve logged-in user's profile details."""
    return current_user


@router.put(
    "/profile",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Update current user profile",
)
def update_profile(
    payload: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update profile fields (e.g. full name) for the current user."""
    return auth_service.update_user_profile(db, current_user, payload)
