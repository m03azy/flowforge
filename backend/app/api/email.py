"""
Email Management Router.
Provides:
- Email configuration management (from address, reply-to, sender name)
- Send test email to verify configuration
- Transactional email sending (welcome, password reset, notifications)
- Reseller broadcast emails to all tenant admins
- Workflow-triggered custom emails
"""
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.middleware.auth import get_current_user
from app.config.settings import get_settings
from app.models.user import User
from app.services.audit_service import write_log
from app.services.email_service import (
    send_welcome_email,
    send_notification_email,
    send_reseller_broadcast_email,
    send_custom_email,
    _sendgrid_send,
    _build_branded_html,
)

router = APIRouter(prefix="/api/email", tags=["Email Management"])

settings = get_settings()


# ── Helper ──────────────────────────────────────────────────────────────────

def _get_sendgrid_key() -> str:
    """Return the active SendGrid API key from settings (env) or raise a clear error."""
    key = settings.SENDGRID_API_KEY
    if not key:
        raise HTTPException(
            status_code=422,
            detail="SendGrid API key is not configured. Please add SENDGRID_API_KEY to your .env.backend file and restart the backend.",
        )
    return key


def _get_from_address() -> str:
    addr = settings.EMAIL_FROM_ADDRESS
    if not addr:
        raise HTTPException(
            status_code=422,
            detail="Sender email address is not configured. Please add EMAIL_FROM_ADDRESS to your .env.backend file.",
        )
    return addr


def _require_superadmin(user: User):
    if user.role not in ("superadmin", "reseller_admin"):
        raise HTTPException(status_code=403, detail="Reseller Superadmin access required")


# ── Schemas ──────────────────────────────────────────────────────────────────

class EmailConfigRead(BaseModel):
    sendgrid_configured: bool
    from_address: str
    from_name: str
    reply_to: str
    app_url: str


class SendTestEmailRequest(BaseModel):
    to_email: str = Field(..., description="Recipient email for the test")
    to_name: str = Field("Test User", description="Recipient name")


class SendNotificationRequest(BaseModel):
    to_email: str
    to_name: str = "User"
    notification_title: str
    notification_body: str
    action_url: Optional[str] = None
    action_label: str = "View Details"


class SendBroadcastEmailRequest(BaseModel):
    broadcast_title: str = Field(..., min_length=3)
    broadcast_body: str = Field(..., min_length=10)
    level: str = Field("info", description="info | warning | critical")


class SendCustomEmailRequest(BaseModel):
    to_email: str
    to_name: str = "User"
    subject: str
    body_html: str
    reply_to: Optional[str] = None


class SendWelcomeEmailRequest(BaseModel):
    to_email: str
    to_name: str
    org_name: Optional[str] = None


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get(
    "/config",
    response_model=EmailConfigRead,
    summary="Get current email configuration status",
)
def get_email_config(
    current_user: User = Depends(get_current_user),
):
    """Return current email configuration status (keys masked)."""
    _require_superadmin(current_user)
    return EmailConfigRead(
        sendgrid_configured=bool(settings.SENDGRID_API_KEY),
        from_address=settings.EMAIL_FROM_ADDRESS or "Not configured",
        from_name=settings.EMAIL_FROM_NAME or "FlowForge",
        reply_to=settings.EMAIL_REPLY_TO or "",
        app_url=settings.APP_URL or "http://localhost:5173",
    )


@router.post(
    "/test",
    response_model=dict,
    summary="Send a test email to verify SendGrid configuration",
)
def send_test_email(
    payload: SendTestEmailRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a test email to verify SendGrid API key and sender address are correctly configured."""
    _require_superadmin(current_user)
    api_key = _get_sendgrid_key()
    from_addr = _get_from_address()
    from_name = settings.EMAIL_FROM_NAME or "FlowForge"

    body = f"""
    <p>Hello <strong>{payload.to_name}</strong>,</p>
    <p>This is a <strong>test email</strong> sent from the FlowForge Reseller Console.</p>
    <p>If you received this, your SendGrid configuration is working correctly! ✅</p>
    <div style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:8px;padding:14px 18px;margin:20px 0">
      <p style="margin:0;font-size:13px;color:#166534"><strong>Configuration verified:</strong></p>
      <p style="margin:6px 0 0;font-size:13px;color:#15803d">
        From: {from_addr}<br/>
        Sender Name: {from_name}<br/>
        Sent at: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}
      </p>
    </div>
    """
    html = _build_branded_html(
        org_name="FlowForge Platform",
        from_name=from_name,
        subject="✅ FlowForge Email Configuration Test",
        body_html=body,
    )

    result = _sendgrid_send(
        api_key=api_key,
        from_email=from_addr,
        from_name=from_name,
        to_emails=[{"email": payload.to_email, "name": payload.to_name}],
        subject="✅ FlowForge Email Configuration Test",
        html_content=html,
        reply_to=settings.EMAIL_REPLY_TO or None,
    )

    write_log(
        db,
        action="email_test_sent",
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        organisation_name="platform",
        resource_type="email",
        description=f"Test email sent to {payload.to_email} — {'success' if result.get('success') else 'failed'}",
    )

    if not result.get("success"):
        raise HTTPException(
            status_code=400,
            detail=f"Email delivery failed (SendGrid status {result.get('status_code', '?')}): {result.get('error', 'unknown error')}",
        )

    return {"success": True, "message": f"Test email successfully sent to {payload.to_email}", "status_code": result.get("status_code")}


@router.post(
    "/send-notification",
    response_model=dict,
    summary="Send a notification email to a specific user",
)
def send_notification(
    payload: SendNotificationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a notification email to a specific recipient."""
    _require_superadmin(current_user)
    api_key = _get_sendgrid_key()
    from_addr = _get_from_address()

    result = send_notification_email(
        api_key=api_key,
        from_email=from_addr,
        from_name=settings.EMAIL_FROM_NAME or "FlowForge",
        to_email=payload.to_email,
        to_name=payload.to_name,
        org_name=current_user.organisation_name or "FlowForge",
        notification_title=payload.notification_title,
        notification_body=payload.notification_body,
        action_url=payload.action_url,
        action_label=payload.action_label,
    )

    write_log(
        db, action="email_notification_sent",
        actor_id=current_user.id, actor_email=current_user.email,
        actor_role=current_user.role, organisation_name="platform",
        resource_type="email",
        description=f"Notification email '{payload.notification_title}' sent to {payload.to_email}",
    )

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Email delivery failed"))
    return {"success": True, "message": f"Notification email sent to {payload.to_email}"}


@router.post(
    "/broadcast",
    response_model=dict,
    summary="Send a broadcast email to all tenant admin users",
)
def broadcast_email(
    payload: SendBroadcastEmailRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a reseller broadcast email to all active tenant admin users."""
    _require_superadmin(current_user)
    api_key = _get_sendgrid_key()
    from_addr = _get_from_address()

    # Fetch all tenant admin users
    admins = db.query(User).filter(
        User.role.in_(["admin", "tenant_admin"]),
        User.is_active == True,
    ).all()

    if not admins:
        raise HTTPException(status_code=404, detail="No tenant admin users found to broadcast to")

    tenant_list = [
        {"email": u.email, "name": u.full_name or u.email.split("@")[0], "org": u.organisation_name or ""}
        for u in admins
    ]

    results = send_reseller_broadcast_email(
        api_key=api_key,
        from_email=from_addr,
        from_name=settings.EMAIL_FROM_NAME or "FlowForge Platform",
        tenant_admins=tenant_list,
        broadcast_title=payload.broadcast_title,
        broadcast_body=payload.broadcast_body,
        level=payload.level,
    )

    write_log(
        db, action="email_broadcast_sent",
        actor_id=current_user.id, actor_email=current_user.email,
        actor_role=current_user.role, organisation_name="platform",
        resource_type="email",
        description=f"Broadcast email '{payload.broadcast_title}' sent to {results['sent']} admins ({results['failed']} failed)",
    )

    return {
        "success": True,
        "message": f"Broadcast sent to {results['sent']} tenant admins",
        "sent": results["sent"],
        "failed": results["failed"],
        "errors": results.get("errors", []),
    }


@router.post(
    "/send-welcome",
    response_model=dict,
    summary="Send a welcome email to a new user",
)
def send_welcome(
    payload: SendWelcomeEmailRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a welcome email to a newly registered user."""
    _require_superadmin(current_user)
    api_key = _get_sendgrid_key()
    from_addr = _get_from_address()

    result = send_welcome_email(
        api_key=api_key,
        from_email=from_addr,
        from_name=settings.EMAIL_FROM_NAME or "FlowForge",
        to_email=payload.to_email,
        to_name=payload.to_name,
        org_name=payload.org_name or current_user.organisation_name or "FlowForge",
        login_url=settings.APP_URL or "http://localhost:5173",
    )

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Email delivery failed"))
    return {"success": True, "message": f"Welcome email sent to {payload.to_email}"}


@router.post(
    "/send-custom",
    response_model=dict,
    summary="Send a fully custom email (used by workflow actions)",
)
def send_custom(
    payload: SendCustomEmailRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a custom email with user-defined subject and HTML body."""
    api_key = _get_sendgrid_key()
    from_addr = _get_from_address()

    result = send_custom_email(
        api_key=api_key,
        from_email=from_addr,
        from_name=settings.EMAIL_FROM_NAME or "FlowForge",
        to_email=payload.to_email,
        to_name=payload.to_name,
        org_name=current_user.organisation_name or "FlowForge",
        subject=payload.subject,
        body_html=payload.body_html,
        reply_to=payload.reply_to or settings.EMAIL_REPLY_TO or None,
    )

    write_log(
        db, action="email_custom_sent",
        actor_id=current_user.id, actor_email=current_user.email,
        actor_role=current_user.role, organisation_name=current_user.organisation_name or "platform",
        resource_type="email",
        description=f"Custom email '{payload.subject}' sent to {payload.to_email}",
    )

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Email delivery failed"))
    return {"success": True, "message": f"Email '{payload.subject}' sent to {payload.to_email}"}
