"""
Notifications Router.
Delivers real-time reseller broadcasts, platform announcements, and workspace notifications to tenant users.
"""
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.audit_log import AuditLog
from app.api.superadmin import _active_announcement

router = APIRouter(prefix="/api/notifications", tags=["Notifications & Reseller Broadcasts"])


class NotificationItem(BaseModel):
    id: str
    type: str  # broadcast | system | billing | security | document
    title: str
    message: str
    level: str = "info"  # info | warning | critical
    sender: str
    created_at: str
    is_read: bool = False
    action_url: Optional[str] = None


class NotificationFeedResponse(BaseModel):
    unread_count: int
    active_broadcast: Optional[dict] = None
    notifications: List[NotificationItem]


@router.get(
    "/",
    response_model=NotificationFeedResponse,
    summary="Get tenant user notifications and live reseller broadcast announcements",
)
def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve combined feed of reseller announcements and tenant workspace events."""
    org = current_user.organisation_name or "default"

    items: List[NotificationItem] = []

    # 1. Include Reseller Broadcast Announcement if active
    from app.api import superadmin
    broadcast = superadmin._active_announcement
    if broadcast and broadcast.get("message"):
        items.append(
            NotificationItem(
                id="reseller_broadcast_active",
                type="broadcast",
                title="📢 Platform Reseller Announcement",
                message=broadcast.get("message", ""),
                level=broadcast.get("level", "info"),
                sender=broadcast.get("created_by", "Platform Superadmin"),
                created_at=broadcast.get("created_at", datetime.now(timezone.utc).isoformat()),
                is_read=False,
            )
        )

    # 2. Query recent workspace audit events as notifications
    recent_logs = (
        db.query(AuditLog)
        .filter(AuditLog.organisation_name == org)
        .order_by(AuditLog.timestamp.desc())
        .limit(8)
        .all()
    )

    for log in recent_logs:
        log_type = "system"
        if "login" in log.action.lower() or "auth" in log.action.lower():
            log_type = "security"
        elif "document" in log.action.lower():
            log_type = "document"
        elif "plan" in log.action.lower() or "billing" in log.action.lower():
            log_type = "billing"

        items.append(
            NotificationItem(
                id=f"log_{log.id}",
                type=log_type,
                title=log.action.replace("_", " ").title(),
                message=log.description or f"Action performed on {log.resource_type or 'workspace'}",
                level="info" if log.status == "success" else "warning",
                sender=log.actor_email or "Workspace System",
                created_at=log.timestamp.isoformat() if log.timestamp else datetime.now(timezone.utc).isoformat(),
                is_read=True,
            )
        )

    unread_count = 1 if (broadcast and broadcast.get("message")) else 0

    return {
        "unread_count": unread_count,
        "active_broadcast": broadcast if (broadcast and broadcast.get("message")) else None,
        "notifications": items,
    }


@router.post(
    "/mark-read",
    response_model=dict,
    summary="Mark notifications as read",
)
def mark_notifications_read():
    """Acknowledge all notifications."""
    return {"message": "Notifications marked as read."}
