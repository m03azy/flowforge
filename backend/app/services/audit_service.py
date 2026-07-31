"""
Audit logging service.

Provides a simple write_log() helper that can be called from any API endpoint
to persist an AuditLog entry. All writes are non-blocking and fail silently
to avoid breaking core request flows.
"""
from typing import Optional
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


# ──────────────────────────────────────────────────────────────────────────────
# Action constants  (use these everywhere to avoid string typos)
# ──────────────────────────────────────────────────────────────────────────────
class AuditAction:
    # Auth
    USER_LOGIN = "USER_LOGIN"
    USER_LOGIN_FAILED = "USER_LOGIN_FAILED"
    USER_LOGOUT = "USER_LOGOUT"
    USER_REGISTERED = "USER_REGISTERED"
    PASSWORD_CHANGED = "PASSWORD_CHANGED"
    PASSWORD_RESET_REQUESTED = "PASSWORD_RESET_REQUESTED"
    PASSWORD_RESET = "PASSWORD_RESET"

    # User / Employee management
    USER_CREATED = "USER_CREATED"
    USER_UPDATED = "USER_UPDATED"
    USER_DEACTIVATED = "USER_DEACTIVATED"
    PROFILE_UPDATED = "PROFILE_UPDATED"

    # CRM
    LEAD_CREATED = "LEAD_CREATED"
    LEAD_UPDATED = "LEAD_UPDATED"
    LEAD_DELETED = "LEAD_DELETED"

    # Bookings
    BOOKING_CREATED = "BOOKING_CREATED"
    BOOKING_UPDATED = "BOOKING_UPDATED"
    BOOKING_DELETED = "BOOKING_DELETED"

    # Workflows
    WORKFLOW_CREATED = "WORKFLOW_CREATED"
    WORKFLOW_UPDATED = "WORKFLOW_UPDATED"
    WORKFLOW_DELETED = "WORKFLOW_DELETED"
    WORKFLOW_TRIGGERED = "WORKFLOW_TRIGGERED"

    # Inventory
    PRODUCT_CREATED = "PRODUCT_CREATED"
    PRODUCT_UPDATED = "PRODUCT_UPDATED"
    PRODUCT_DELETED = "PRODUCT_DELETED"

    # Accounting
    TRANSACTION_CREATED = "TRANSACTION_CREATED"
    TRANSACTION_UPDATED = "TRANSACTION_UPDATED"
    TRANSACTION_DELETED = "TRANSACTION_DELETED"

    # Billing
    BILLING_PLAN_UPGRADED = "BILLING_PLAN_UPGRADED"
    ADDON_REQUESTED = "ADDON_REQUESTED"


def write_log(
    db: Session,
    *,
    action: str,
    actor_id: Optional[int] = None,
    actor_email: Optional[str] = None,
    actor_role: Optional[str] = None,
    organisation_name: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    description: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    log_status: str = "success",
) -> None:
    """
    Persist a single audit log entry. Safe to call anywhere — exceptions
    are caught and printed rather than propagated.
    """
    try:
        entry = AuditLog(
            actor_id=actor_id,
            actor_email=actor_email,
            actor_role=actor_role,
            organisation_name=organisation_name,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id is not None else None,
            description=description,
            ip_address=ip_address,
            user_agent=user_agent,
            status=log_status,
        )
        db.add(entry)
        db.commit()
    except Exception as exc:
        # Never break core request flow due to audit failure
        db.rollback()
        print(f"[AuditLog] Failed to write log entry: {exc}")
