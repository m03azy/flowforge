"""
PlatformSchedule SQLAlchemy model.
Manages automated cron jobs, recurring maintenance tasks, and platform scheduled workflows for Superadmins.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON
import sqlalchemy as sa
from app.db.session import Base


class PlatformSchedule(Base):
    __tablename__ = "platform_schedules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    task_type = Column(String(100), nullable=False)  # diagnostics | quota_sync | purge_sessions | digest_email | custom_webhook
    recurrence = Column(String(50), nullable=False, default="daily")  # hourly | daily | weekly | monthly | custom
    cron_expression = Column(String(100), nullable=True, default="0 0 * * *")
    target_payload = Column(JSON, nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    last_status = Column(String(50), default="idle", nullable=False)  # idle | success | failed | running
    last_result = Column(Text, nullable=True)
    next_run_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False)

    def __repr__(self) -> str:
        return f"<PlatformSchedule id={self.id} name='{self.name}' type='{self.task_type}' active={self.is_active}>"
