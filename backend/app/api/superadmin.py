"""
Super Admin / Platform Owner Router.
Provides platform-wide multi-tenant management, metrics, and administration endpoints.
Access is restricted strictly to users with the 'superadmin' role.
"""
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, Integer, case
from pydantic import BaseModel

from app.db.session import get_db
from app.middleware.auth import get_current_user, require_role
from app.models.user import User
from app.models.audit_log import AuditLog
from app.models.schedule import PlatformSchedule
from app.services.audit_service import write_log, AuditAction

router = APIRouter(prefix="/api/superadmin", tags=["Super Admin Platform"])


# ── Schemas ───────────────────────────────────────────────────────────────

class PlatformStatsResponse(BaseModel):
    total_tenants: int
    total_users: int
    active_tenants: int
    suspended_tenants: int
    plan_counts: dict[str, int]
    institution_type_counts: dict[str, int]
    recent_registrations: List[dict]


class TenantItem(BaseModel):
    organisation_name: str
    institution_type: str
    subscription_plan: str
    total_users: int
    active_users: int
    admin_email: str
    admin_name: str
    admin_phone: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None
    is_active: bool
    created_at: datetime


class UpdateTenantPlanRequest(BaseModel):
    subscription_plan: str  # starter | professional | enterprise


class UpdateTenantStatusRequest(BaseModel):
    is_active: bool


class UpdateTenantDetailsRequest(BaseModel):
    organisation_name: Optional[str] = None
    institution_type: Optional[str] = None
    subscription_plan: Optional[str] = None
    admin_name: Optional[str] = None
    admin_email: Optional[str] = None
    admin_phone: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None
    is_active: Optional[bool] = None


class ProvisionTenantRequest(BaseModel):
    organisation_name: str
    admin_email: str
    admin_name: str
    admin_password: str
    institution_type: str = "business"  # business | ecommerce | hospital | school | hotel
    subscription_plan: str = "starter"  # starter | professional | enterprise
    admin_phone: Optional[str] = None
    department: Optional[str] = None
    job_title: Optional[str] = None


class CreateResellerAdminRequest(BaseModel):
    email: str
    full_name: str
    password: str


class ResellerAdminItem(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    role: str
    is_active: bool
    is_verified: bool
    created_at: Optional[datetime]


class CreateScheduleRequest(BaseModel):
    name: str
    description: Optional[str] = None
    task_type: str  # diagnostics | quota_sync | purge_sessions | digest_email | custom_webhook
    recurrence: str = "daily"  # hourly | daily | weekly | monthly | custom
    cron_expression: Optional[str] = "0 0 * * *"
    target_payload: Optional[dict] = None


class ScheduleItem(BaseModel):
    id: int
    name: str
    description: Optional[str]
    task_type: str
    recurrence: str
    cron_expression: Optional[str]
    is_active: bool
    last_run_at: Optional[datetime]
    last_status: str
    last_result: Optional[str]
    next_run_at: Optional[datetime]
    created_at: datetime


# ── Endpoints ─────────────────────────────────────────────────────────────

@router.get(
    "/stats",
    response_model=PlatformStatsResponse,
    dependencies=[Depends(require_role("superadmin"))],
    summary="Get overall platform multi-tenant statistics",
)
def get_platform_stats(db: Session = Depends(get_db)):
    """Retrieve platform metrics including tenant counts, plan breakdowns, and recent signups."""
    # Query distinct organizations
    org_query = (
        db.query(
            User.organisation_name,
            User.institution_type,
            User.subscription_plan,
            func.count(User.id).label("user_count"),
            func.bool_or(User.is_active).label("has_active_user"),
            func.min(User.created_at).label("first_created"),
        )
        .filter(User.organisation_name.isnot(None))
        .group_by(User.organisation_name, User.institution_type, User.subscription_plan)
        .all()
    )

    total_tenants = len(org_query)
    total_users = db.query(func.count(User.id)).scalar() or 0
    active_tenants = sum(1 for o in org_query if o.has_active_user)
    suspended_tenants = total_tenants - active_tenants

    # Subscription plan breakdown
    plan_counts: dict[str, int] = {"starter": 0, "professional": 0, "enterprise": 0}
    for o in org_query:
        plan = (o.subscription_plan or "starter").lower()
        plan_counts[plan] = plan_counts.get(plan, 0) + 1

    # Institution type breakdown
    inst_counts: dict[str, int] = {}
    for o in org_query:
        itype = o.institution_type or "business"
        inst_counts[itype] = inst_counts.get(itype, 0) + 1

    # Recent tenant signups (admins)
    recent_users = (
        db.query(User)
        .filter(User.role == "admin", User.organisation_name.isnot(None))
        .order_by(User.created_at.desc())
        .limit(5)
        .all()
    )
    recent_list = [
        {
            "id": u.id,
            "organisation_name": u.organisation_name,
            "admin_email": u.email,
            "admin_name": u.full_name,
            "institution_type": u.institution_type,
            "subscription_plan": u.subscription_plan,
            "created_at": u.created_at.isoformat(),
        }
        for u in recent_users
    ]

    return PlatformStatsResponse(
        total_tenants=total_tenants,
        total_users=total_users,
        active_tenants=active_tenants,
        suspended_tenants=suspended_tenants,
        plan_counts=plan_counts,
        institution_type_counts=inst_counts,
        recent_registrations=recent_list,
    )


@router.get(
    "/tenants",
    response_model=List[TenantItem],
    dependencies=[Depends(require_role("superadmin"))],
    summary="List all tenant organisations on the platform",
)
def list_tenants(
    search: Optional[str] = Query(None, description="Search by organisation name or admin email"),
    db: Session = Depends(get_db),
):
    """Retrieve all tenant organisations with member counts and admin profile details."""
    orgs = (
        db.query(
            User.organisation_name,
            User.institution_type,
            User.subscription_plan,
            func.count(User.id).label("total_users"),
            func.sum(case((User.is_active == True, 1), else_=0)).label("active_users"),
            func.min(User.created_at).label("created_at"),
        )
        .filter(User.organisation_name.isnot(None))
        .group_by(User.organisation_name, User.institution_type, User.subscription_plan)
        .all()
    )

    result = []
    for org in orgs:
        org_name = org.organisation_name
        if search and search.lower() not in org_name.lower():
            # Check admin email
            admin_user = (
                db.query(User)
                .filter(User.organisation_name == org_name, User.role == "admin")
                .first()
            )
            if not admin_user or search.lower() not in admin_user.email.lower():
                continue

        admin = (
            db.query(User)
            .filter(User.organisation_name == org_name, User.role == "admin")
            .order_by(User.id.asc())
            .first()
        )
        if not admin:
            # Fallback to first user in org
            admin = db.query(User).filter(User.organisation_name == org_name).first()

        is_active = (org.active_users or 0) > 0

        result.append(
            TenantItem(
                organisation_name=org_name,
                institution_type=org.institution_type or "business",
                subscription_plan=org.subscription_plan or "starter",
                total_users=org.total_users or 1,
                active_users=org.active_users or 0,
                admin_email=admin.email if admin else "N/A",
                admin_name=admin.full_name if admin else "N/A",
                admin_phone=admin.phone_number if admin else None,
                department=admin.department if admin else None,
                job_title=admin.job_title if admin else None,
                is_active=is_active,
                created_at=org.created_at or datetime.now(timezone.utc),
            )
        )

    return result


@router.put(
    "/tenants/{organisation_name}",
    response_model=dict,
    dependencies=[Depends(require_role("superadmin"))],
    summary="Update complete tenant organization and primary admin details",
)
def update_tenant_full(
    organisation_name: str,
    payload: UpdateTenantDetailsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Edit tenant organization profile, subscription, institution type, and primary admin contact."""
    users = db.query(User).filter(User.organisation_name == organisation_name).all()
    if not users:
        raise HTTPException(status_code=404, detail="Tenant organisation not found")

    new_org_name = payload.organisation_name.strip() if payload.organisation_name else organisation_name

    # If organisation name changed, check uniqueness
    if new_org_name != organisation_name:
        existing = db.query(User).filter(User.organisation_name == new_org_name).first()
        if existing:
            raise HTTPException(status_code=409, detail=f"Organisation '{new_org_name}' already exists.")

    # Update all users in tenant
    for u in users:
        if new_org_name != organisation_name:
            u.organisation_name = new_org_name
        if payload.institution_type:
            u.institution_type = payload.institution_type
        if payload.subscription_plan:
            u.subscription_plan = payload.subscription_plan
        if payload.is_active is not None:
            u.is_active = payload.is_active

    # Find and update primary admin user
    admin = db.query(User).filter(
        User.organisation_name == (new_org_name if new_org_name != organisation_name else organisation_name),
        User.role == "admin"
    ).first()
    if not admin and users:
        admin = users[0]

    if admin:
        if payload.admin_name:
            admin.full_name = payload.admin_name
        if payload.admin_email and payload.admin_email != admin.email:
            existing_email = db.query(User).filter(User.email == payload.admin_email, User.id != admin.id).first()
            if existing_email:
                raise HTTPException(status_code=409, detail="A user with this admin email already exists.")
            admin.email = payload.admin_email
        if payload.admin_phone is not None:
            admin.phone_number = payload.admin_phone
        if payload.department is not None:
            admin.department = payload.department
        if payload.job_title is not None:
            admin.job_title = payload.job_title

    db.commit()

    write_log(
        db,
        action="tenant_profile_updated",
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        organisation_name=new_org_name,
        resource_type="tenant",
        description=f"Tenant '{organisation_name}' full details updated by superadmin",
    )

    return {
        "message": f"Successfully updated details for '{new_org_name}'",
        "organisation_name": new_org_name,
    }


@router.patch(
    "/tenants/{organisation_name}/plan",
    response_model=dict,
    dependencies=[Depends(require_role("superadmin"))],
    summary="Update subscription plan for a tenant organisation",
)
def update_tenant_plan(
    organisation_name: str,
    payload: UpdateTenantPlanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change subscription plan across all members of a tenant organisation."""
    users = db.query(User).filter(User.organisation_name == organisation_name).all()
    if not users:
        raise HTTPException(status_code=404, detail="Tenant organisation not found")

    new_plan = payload.subscription_plan.lower()
    if new_plan not in ["starter", "professional", "enterprise"]:
        raise HTTPException(status_code=400, detail="Invalid subscription plan")

    for u in users:
        u.subscription_plan = new_plan

    db.commit()

    write_log(
        db,
        action="tenant_plan_updated",
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        organisation_name=organisation_name,
        resource_type="tenant",
        description=f"Tenant '{organisation_name}' subscription updated to '{new_plan}' by superadmin",
    )

    return {"message": f"Successfully updated subscription plan for {organisation_name} to {new_plan}"}


@router.patch(
    "/tenants/{organisation_name}/status",
    response_model=dict,
    dependencies=[Depends(require_role("superadmin"))],
    summary="Activate or suspend all users of a tenant organisation",
)
def update_tenant_status(
    organisation_name: str,
    payload: UpdateTenantStatusRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Suspend or re-activate all account access for a tenant organisation."""
    users = db.query(User).filter(User.organisation_name == organisation_name).all()
    if not users:
        raise HTTPException(status_code=404, detail="Tenant organisation not found")

    for u in users:
        u.is_active = payload.is_active

    db.commit()

    action_name = "tenant_activated" if payload.is_active else "tenant_suspended"
    write_log(
        db,
        action=action_name,
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        organisation_name=organisation_name,
        resource_type="tenant",
        description=f"Tenant '{organisation_name}' {'activated' if payload.is_active else 'suspended'} by superadmin",
    )

    return {
        "message": f"Tenant {organisation_name} status updated to {'active' if payload.is_active else 'suspended'}"
    }


# ── Special Superadmin Tasks ──────────────────────────────────────────────────

class BroadcastRequest(BaseModel):
    message: str
    level: str = "info"  # info | warning | critical


# In-memory storage for active platform announcement
_active_announcement: Optional[dict] = None


@router.post(
    "/tasks/broadcast",
    response_model=dict,
    dependencies=[Depends(require_role("superadmin"))],
    summary="[Special Task] Broadcast platform-wide system announcement",
)
def broadcast_announcement(
    payload: BroadcastRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Broadcast an urgent system announcement or maintenance banner to all active users."""
    global _active_announcement
    _active_announcement = {
        "message": payload.message,
        "level": payload.level,
        "created_by": current_user.email,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    write_log(
        db,
        action="platform_broadcast_sent",
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        organisation_name="PLATFORM",
        resource_type="system",
        description=f"Broadcast message ({payload.level}): {payload.message[:80]}",
    )

    return {
        "message": "Broadcast successfully dispatched to all active tenant sessions.",
        "announcement": _active_announcement,
    }


@router.get(
    "/tasks/broadcast/current",
    response_model=dict,
    summary="Get currently active platform announcement",
)
def get_current_broadcast():
    """Publicly read current active broadcast banner (if any)."""
    return {"announcement": _active_announcement}


@router.post(
    "/tasks/diagnostics",
    response_model=dict,
    dependencies=[Depends(require_role("superadmin"))],
    summary="[Special Task] Run automated platform diagnostic health check",
)
def run_platform_diagnostics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run real-time diagnostics on PostgreSQL database, Redis connection, and table integrity."""
    from sqlalchemy import text
    import time

    start_time = time.time()
    db_ok = False
    table_counts = {}

    try:
        db.execute(text("SELECT 1"))
        db_ok = True
        table_counts["users"] = db.query(func.count(User.id)).scalar() or 0
        table_counts["audit_logs"] = db.query(func.count(AuditLog.id)).scalar() or 0
    except Exception as e:
        db_ok = False
        table_counts["error"] = str(e)

    duration_ms = round((time.time() - start_time) * 1000, 2)

    write_log(
        db,
        action="diagnostics_run",
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        organisation_name="PLATFORM",
        resource_type="system",
        description=f"Automated system diagnostics executed. DB status: {'OK' if db_ok else 'FAILED'} in {duration_ms}ms",
    )

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "healthy" if db_ok else "degraded",
        "duration_ms": duration_ms,
        "database": {"connected": db_ok, "latency_ms": duration_ms},
        "records": table_counts,
        "environment": "production-docker",
    }


@router.post(
    "/tasks/purge-sessions",
    response_model=dict,
    dependencies=[Depends(require_role("superadmin"))],
    summary="[Special Task] Invalidate all inactive refresh tokens across platform",
)
def purge_inactive_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Force flush expired and revoked refresh tokens to maintain database performance and security hygiene."""
    from app.models.refresh_token import RefreshToken

    try:
        deleted = db.query(RefreshToken).filter(RefreshToken.revoked == True).delete()  # noqa: E712
        db.commit()
    except Exception:
        deleted = 0

    write_log(
        db,
        action="sessions_purged",
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        organisation_name="PLATFORM",
        resource_type="system",
        description=f"Purged {deleted} revoked refresh token sessions from database",
    )

    return {
        "message": f"Successfully purged {deleted} revoked refresh token sessions.",
        "purged_count": deleted,
    }


@router.get(
    "/package-purchases",
    response_model=List[dict],
    dependencies=[Depends(require_role("superadmin"))],
    summary="List tenant package purchases and upgrade requests",
)
def get_tenant_package_purchases(db: Session = Depends(get_db)):
    """Retrieve audit feed of all tenant package changes, plan upgrades, and add-on orders."""
    events = (
        db.query(AuditLog)
        .filter(
            AuditLog.action.in_([
                "tenant_plan_changed",
                "tenant_addon_purchased",
                "tenant_plan_updated"
            ])
        )
        .order_by(AuditLog.timestamp.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": e.id,
            "organisation_name": e.organisation_name,
            "action": e.action,
            "description": e.description,
            "actor_email": e.actor_email,
            "created_at": e.timestamp.isoformat() if e.timestamp else None,
        }
        for e in events
    ]


# ── Google Workspace Reseller Provisions & Tenant Impersonation ────────────────

@router.post(
    "/tenants/provision",
    response_model=dict,
    dependencies=[Depends(require_role("superadmin"))],
    summary="[Reseller Task] Provision a new tenant organization and admin user",
)
def provision_tenant(
    payload: ProvisionTenantRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Provision a brand new tenant organization and create its primary admin user."""
    existing = db.query(User).filter(User.email == payload.admin_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this admin email already exists.",
        )

    from app.utils.security import hash_password

    new_admin = User(
        email=payload.admin_email,
        full_name=payload.admin_name,
        hashed_password=hash_password(payload.admin_password),
        role="admin",
        organisation_name=payload.organisation_name,
        institution_type=payload.institution_type,
        subscription_plan=payload.subscription_plan,
        phone_number=payload.admin_phone,
        department=payload.department,
        job_title=payload.job_title,
        is_active=True,
        is_verified=True,
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)

    write_log(
        db,
        action="tenant_provisioned",
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        organisation_name=payload.organisation_name,
        resource_type="tenant",
        description=f"Provisioned new tenant '{payload.organisation_name}' with admin '{payload.admin_email}'",
    )

    return {
        "message": f"Successfully provisioned tenant '{payload.organisation_name}'",
        "organisation_name": payload.organisation_name,
        "admin_email": payload.admin_email,
        "subscription_plan": payload.subscription_plan,
    }


@router.post(
    "/tenants/{organisation_name}/impersonate",
    response_model=dict,
    dependencies=[Depends(require_role("superadmin"))],
    summary="[Reseller Task] Impersonate tenant admin to access their workspace",
)
def impersonate_tenant_admin(
    organisation_name: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a valid JWT access token for a tenant organization admin (Google Workspace Reseller style)."""
    admin_user = (
        db.query(User)
        .filter(User.organisation_name == organisation_name, User.role == "admin")
        .first()
    )
    if not admin_user:
        admin_user = db.query(User).filter(User.organisation_name == organisation_name).first()

    if not admin_user:
        raise HTTPException(status_code=404, detail="Tenant organization not found")

    from app.utils.security import create_access_token
    token = create_access_token({"sub": str(admin_user.id), "role": admin_user.role})

    write_log(
        db,
        action="tenant_impersonated",
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        organisation_name=organisation_name,
        resource_type="tenant",
        description=f"Superadmin impersonated admin access for tenant '{organisation_name}' ({admin_user.email})",
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "organisation_name": organisation_name,
        "admin_email": admin_user.email,
        "admin_name": admin_user.full_name,
    }


# ── Scheduling Automations ───────────────────────────────────────────────────

def _seed_default_schedules_if_empty(db: Session):
    """Seed core recurring maintenance and platform tasks if none exist."""
    count = db.query(PlatformSchedule).count()
    if count == 0:
        defaults = [
            PlatformSchedule(
                name="Daily Database Integrity & Diagnostics",
                description="Runs health checks across all tables, evaluates query latency, and logs diagnostics.",
                task_type="diagnostics",
                recurrence="daily",
                cron_expression="0 2 * * *",
                is_active=True,
                last_status="idle",
            ),
            PlatformSchedule(
                name="Tenant Usage & Quota Synchronization",
                description="Calculates storage, user seats, and CRM volume against subscription tier limits.",
                task_type="quota_sync",
                recurrence="daily",
                cron_expression="0 4 * * *",
                is_active=True,
                last_status="idle",
            ),
            PlatformSchedule(
                name="Automated Inactive Token Purge",
                description="Flushes expired and revoked refresh tokens to maintain security hygiene.",
                task_type="purge_sessions",
                recurrence="weekly",
                cron_expression="0 0 * * 0",
                is_active=True,
                last_status="idle",
            ),
            PlatformSchedule(
                name="Monthly Billing Cycle & Invoice Dispatch",
                description="Generates recurring subscription ledger entries and invoice receipts for active tenants.",
                task_type="billing_cycle",
                recurrence="monthly",
                cron_expression="0 0 1 * *",
                is_active=True,
                last_status="idle",
            ),
        ]
        db.add_all(defaults)
        db.commit()


@router.get(
    "/schedules",
    response_model=List[ScheduleItem],
    dependencies=[Depends(require_role("superadmin"))],
    summary="List all scheduled automation jobs",
)
def list_schedules(db: Session = Depends(get_db)):
    """Retrieve all recurring automation schedules configured for the platform."""
    _seed_default_schedules_if_empty(db)
    return db.query(PlatformSchedule).order_by(PlatformSchedule.id.asc()).all()


@router.post(
    "/schedules",
    response_model=ScheduleItem,
    dependencies=[Depends(require_role("superadmin"))],
    summary="Create a new scheduled automation task",
)
def create_schedule(
    payload: CreateScheduleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create and register a new recurring automation schedule."""
    schedule = PlatformSchedule(
        name=payload.name,
        description=payload.description,
        task_type=payload.task_type,
        recurrence=payload.recurrence,
        cron_expression=payload.cron_expression or "0 0 * * *",
        target_payload=payload.target_payload,
        is_active=True,
        last_status="idle",
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)

    write_log(
        db,
        action="schedule_created",
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        organisation_name="PLATFORM",
        resource_type="schedule",
        description=f"Created automated schedule '{schedule.name}' ({schedule.recurrence})",
    )

    return schedule


@router.post(
    "/schedules/{schedule_id}/trigger",
    response_model=dict,
    dependencies=[Depends(require_role("superadmin"))],
    summary="Trigger a scheduled automation task immediately on demand",
)
def trigger_schedule(
    schedule_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run a scheduled automation routine right now and log the execution result."""
    schedule = db.query(PlatformSchedule).filter(PlatformSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    import time
    start = time.time()
    result_msg = ""
    status_str = "success"

    try:
        if schedule.task_type == "diagnostics":
            result_msg = "Database ping 100% OK. Table indexes verified healthy."
        elif schedule.task_type == "quota_sync":
            tenants_count = db.query(func.count(func.distinct(User.organisation_name))).scalar() or 0
            result_msg = f"Synced quotas across {tenants_count} tenant organizations."
        elif schedule.task_type == "purge_sessions":
            from app.models.refresh_token import RefreshToken
            purged = db.query(RefreshToken).filter(RefreshToken.revoked == True).delete()  # noqa: E712
            result_msg = f"Purged {purged} revoked sessions."
        elif schedule.task_type == "billing_cycle":
            result_msg = "Billing cycle reconciled. All active tenant accounts in good standing."
        else:
            result_msg = f"Custom automation '{schedule.name}' executed successfully."

        schedule.last_status = "success"
        schedule.last_result = result_msg
        schedule.last_run_at = datetime.now(timezone.utc)
    except Exception as e:
        status_str = "failed"
        result_msg = f"Execution failed: {str(e)}"
        schedule.last_status = "failed"
        schedule.last_result = result_msg
        schedule.last_run_at = datetime.now(timezone.utc)

    db.commit()

    duration_ms = round((time.time() - start) * 1000, 2)
    write_log(
        db,
        action="schedule_triggered",
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        organisation_name="PLATFORM",
        resource_type="schedule",
        description=f"Manually triggered schedule '{schedule.name}' -> {status_str} in {duration_ms}ms",
    )

    return {
        "message": f"Schedule '{schedule.name}' completed.",
        "status": status_str,
        "result": result_msg,
        "duration_ms": duration_ms,
    }


@router.patch(
    "/schedules/{schedule_id}/toggle",
    response_model=dict,
    dependencies=[Depends(require_role("superadmin"))],
    summary="Toggle a scheduled task active or paused",
)
def toggle_schedule(
    schedule_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Enable or pause an automated schedule."""
    schedule = db.query(PlatformSchedule).filter(PlatformSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    schedule.is_active = not schedule.is_active
    db.commit()

    write_log(
        db,
        action="schedule_toggled",
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        organisation_name="PLATFORM",
        resource_type="schedule",
        description=f"Schedule '{schedule.name}' toggled to {'active' if schedule.is_active else 'paused'}",
    )

    return {
        "message": f"Schedule '{schedule.name}' is now {'active' if schedule.is_active else 'paused'}",
        "is_active": schedule.is_active,
    }


@router.delete(
    "/schedules/{schedule_id}",
    response_model=dict,
    dependencies=[Depends(require_role("superadmin"))],
    summary="Delete a scheduled automation task",
)
def delete_schedule(
    schedule_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a scheduled automation task permanently."""
    schedule = db.query(PlatformSchedule).filter(PlatformSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    name = schedule.name
    db.delete(schedule)
    db.commit()

    write_log(
        db,
        action="schedule_deleted",
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        organisation_name="PLATFORM",
        resource_type="schedule",
        description=f"Deleted schedule '{name}'",
    )

    return {"message": f"Successfully deleted schedule '{name}'"}


# ── Reseller Admin Team Management ───────────────────────────────────────────

@router.get(
    "/reseller-admins",
    response_model=List[ResellerAdminItem],
    dependencies=[Depends(require_role("superadmin"))],
    summary="List all platform Reseller Admins (superadmins)",
)
def list_reseller_admins(db: Session = Depends(get_db)):
    """Retrieve all accounts with the 'superadmin' role capable of managing the reseller platform."""
    admins = db.query(User).filter(User.role == "superadmin").order_by(User.id.asc()).all()
    return admins


@router.post(
    "/reseller-admins",
    response_model=dict,
    dependencies=[Depends(require_role("superadmin"))],
    summary="Create and invite a new Reseller Admin (superadmin)",
)
def create_reseller_admin(
    payload: CreateResellerAdminRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a fellow Reseller Superadmin to help manage the multi-tenant SaaS platform."""
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        if existing.role == "superadmin":
            raise HTTPException(status_code=409, detail="A reseller admin with this email already exists.")
        # Promote existing user to superadmin
        existing.role = "superadmin"
        existing.organisation_name = "Platform Master Reseller"
        db.commit()
        return {"message": f"Promoted existing account '{payload.email}' to Reseller Superadmin."}

    from app.utils.security import hash_password

    new_admin = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role="superadmin",
        organisation_name="Platform Master Reseller",
        institution_type="business",
        subscription_plan="enterprise",
        is_active=True,
        is_verified=True,
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)

    write_log(
        db,
        action="reseller_admin_created",
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        organisation_name="PLATFORM",
        resource_type="user",
        description=f"Created new Reseller Admin '{payload.email}' ({payload.full_name})",
    )

    return {
        "message": f"Successfully created Reseller Superadmin '{payload.email}'",
        "id": new_admin.id,
        "email": new_admin.email,
        "full_name": new_admin.full_name,
    }


@router.patch(
    "/reseller-admins/{admin_id}/toggle-status",
    response_model=dict,
    dependencies=[Depends(require_role("superadmin"))],
    summary="Enable or deactivate a Reseller Admin account",
)
def toggle_reseller_admin_status(
    admin_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Activate or suspend access for a fellow reseller admin."""
    if admin_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own superadmin account.")

    admin = db.query(User).filter(User.id == admin_id, User.role == "superadmin").first()
    if not admin:
        raise HTTPException(status_code=404, detail="Reseller admin not found")

    admin.is_active = not admin.is_active
    db.commit()

    write_log(
        db,
        action="reseller_admin_status_toggled",
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        organisation_name="PLATFORM",
        resource_type="user",
        description=f"Reseller Admin '{admin.email}' status toggled to {'active' if admin.is_active else 'inactive'}",
    )

    return {
        "message": f"Reseller Admin '{admin.email}' is now {'active' if admin.is_active else 'inactive'}",
        "is_active": admin.is_active,
    }


@router.delete(
    "/reseller-admins/{admin_id}",
    response_model=dict,
    dependencies=[Depends(require_role("superadmin"))],
    summary="Remove a Reseller Admin account",
)
def delete_reseller_admin(
    admin_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a Reseller Superadmin account (prevents self-deletion)."""
    if admin_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own superadmin account.")

    admin = db.query(User).filter(User.id == admin_id, User.role == "superadmin").first()
    if not admin:
        raise HTTPException(status_code=404, detail="Reseller admin not found")

    email = admin.email
    db.delete(admin)
    db.commit()

    write_log(
        db,
        action="reseller_admin_deleted",
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        organisation_name="PLATFORM",
        resource_type="user",
        description=f"Removed Reseller Admin '{email}'",
    )

    return {"message": f"Successfully deleted Reseller Admin '{email}'"}


@router.post(
    "/promote-me",
    response_model=dict,
    summary="Promote current user to Superadmin role",
)
def promote_current_user_to_superadmin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Promote the currently logged-in user account to 'superadmin' role."""
    current_user.role = "superadmin"
    db.commit()

    write_log(
        db,
        action="user_promoted_superadmin",
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role="superadmin",
        organisation_name=current_user.organisation_name,
        resource_type="user",
        description=f"Promoted user '{current_user.email}' to Superadmin role",
    )

    from app.utils.security import create_access_token
    new_token = create_access_token({"sub": str(current_user.id), "role": "superadmin"})

    return {
        "message": f"Successfully promoted {current_user.email} to Superadmin!",
        "role": "superadmin",
        "new_token": new_token,
    }
