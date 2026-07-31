"""
User SQLAlchemy model.

Columns:
  - id: primary key
  - email: unique, indexed
  - full_name: display name
  - hashed_password: bcrypt hash
  - role: one of superadmin | admin | manager | employee
  - is_active: soft-delete / deactivation flag
  - is_verified: email verification status
  - created_at / updated_at: timestamps
"""
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Index,
)
from sqlalchemy.orm import relationship
from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(
        String(20),
        nullable=False,
        default="employee",
        index=True,
    )  # superadmin | admin | manager | employee
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    # Institution & Organisation fields
    institution_type = Column(
        String(20),
        nullable=False,
        default="business",
        index=True,
    )  # hospital | school | hotel | business
    organisation_name = Column(String(255), nullable=True)
    subscription_plan = Column(String(50), nullable=False, default="starter")  # starter | professional | enterprise

    # Employee Profile fields
    department = Column(String(100), nullable=True)
    job_title = Column(String(100), nullable=True)
    phone_number = Column(String(30), nullable=True)
    hire_date = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    leads = relationship("Lead", back_populates="assigned_to")

    # Composite index for common query pattern
    __table_args__ = (
        Index("ix_users_role_active", "role", "is_active"),
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role={self.role}>"
