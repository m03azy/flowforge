"""
AuditLog SQLAlchemy model.

Records every significant action performed by users (login, logout, create, update, delete)
including actor identity, resource type, resource id, HTTP method, IP address, and timestamp.
Used for security compliance, change tracking, and operational accountability.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Index
from app.db.session import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)

    # Who performed the action
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    actor_email = Column(String(255), nullable=True)      # denormalized for history preservation
    actor_role = Column(String(50), nullable=True)
    organisation_name = Column(String(255), nullable=True, index=True)

    # What action was performed
    action = Column(String(100), nullable=False, index=True)
    # e.g. USER_LOGIN, USER_LOGOUT, USER_CREATED, EMPLOYEE_UPDATED, LEAD_CREATED,
    #       BOOKING_CREATED, WORKFLOW_TRIGGERED, INVENTORY_UPDATED, BILLING_UPGRADED

    # What resource was affected
    resource_type = Column(String(100), nullable=True)    # user | lead | booking | workflow | product | transaction | billing
    resource_id = Column(String(100), nullable=True)       # pk of affected record
    description = Column(Text, nullable=True)              # human-readable summary

    # Request context
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(String(512), nullable=True)

    # Outcome
    status = Column(String(20), nullable=False, default="success")  # success | failure | warning

    timestamp = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    __table_args__ = (
        Index("ix_audit_logs_org_timestamp", "organisation_name", "timestamp"),
        Index("ix_audit_logs_actor_action", "actor_id", "action"),
    )

    def __repr__(self) -> str:
        return f"<AuditLog id={self.id} action={self.action} actor={self.actor_email} ts={self.timestamp}>"
