"""
Audit Logs API Router.
Exposes read endpoints for admins to view, filter, and export the audit trail.
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.audit_log import AuditLog

router = APIRouter(prefix="/api/audit", tags=["Audit Logs"])


# ──────────────────────────────────────────────────────────────────────────────
# Response Schema
# ──────────────────────────────────────────────────────────────────────────────
class AuditLogResponse(BaseModel):
    id: int
    actor_id: Optional[int]
    actor_email: Optional[str]
    actor_role: Optional[str]
    organisation_name: Optional[str]
    action: str
    resource_type: Optional[str]
    resource_id: Optional[str]
    description: Optional[str]
    ip_address: Optional[str]
    status: str
    timestamp: datetime

    model_config = {"from_attributes": True}


class AuditLogListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[AuditLogResponse]


# ──────────────────────────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────────────────────────
@router.get("/", response_model=AuditLogListResponse, summary="List audit logs")
def list_audit_logs(
    action: Optional[str] = Query(None, description="Filter by action type, e.g. USER_LOGIN"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type, e.g. lead"),
    actor_email: Optional[str] = Query(None, description="Filter by actor email"),
    status: Optional[str] = Query(None, description="Filter by status: success | failure | warning"),
    from_date: Optional[datetime] = Query(None, description="Start timestamp (ISO 8601)"),
    to_date: Optional[datetime] = Query(None, description="End timestamp (ISO 8601)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve audit logs for the current organisation (admin/manager only).
    Supports filtering by action, resource_type, actor, status, and date range.
    """
    # Only admins and managers can view audit logs
    if current_user.role not in ["superadmin", "admin", "manager"]:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Forbidden: Admin or Manager role required")

    org = current_user.organisation_name or "default"

    query = db.query(AuditLog).filter(AuditLog.organisation_name == org)

    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)
    if actor_email:
        query = query.filter(AuditLog.actor_email.ilike(f"%{actor_email}%"))
    if status:
        query = query.filter(AuditLog.status == status)
    if from_date:
        query = query.filter(AuditLog.timestamp >= from_date)
    if to_date:
        query = query.filter(AuditLog.timestamp <= to_date)

    total = query.count()
    items = (
        query.order_by(AuditLog.timestamp.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return AuditLogListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )


@router.get("/summary", summary="Audit log summary statistics")
def audit_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns count breakdowns by action category and status for the current org."""
    if current_user.role not in ["superadmin", "admin", "manager"]:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Forbidden: Admin or Manager role required")

    org = current_user.organisation_name or "default"
    from sqlalchemy import func

    rows = (
        db.query(AuditLog.action, AuditLog.status, func.count(AuditLog.id).label("count"))
        .filter(AuditLog.organisation_name == org)
        .group_by(AuditLog.action, AuditLog.status)
        .all()
    )

    summary = {}
    for row in rows:
        key = row.action
        if key not in summary:
            summary[key] = {"success": 0, "failure": 0, "warning": 0, "total": 0}
        summary[key][row.status] = row.count
        summary[key]["total"] += row.count

    total_logs = db.query(func.count(AuditLog.id)).filter(AuditLog.organisation_name == org).scalar()
    total_failures = db.query(func.count(AuditLog.id)).filter(
        AuditLog.organisation_name == org,
        AuditLog.status == "failure",
    ).scalar()

    return {
        "total_logs": total_logs,
        "total_failures": total_failures,
        "breakdown": summary,
    }
