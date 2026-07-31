from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.db.session import Base

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    organisation_name = Column(String(255), nullable=False, default="default", index=True)  # tenant key
    institution_type = Column(String(50), nullable=False, default="hospital") # hospital | hotel | school | general
    title = Column(String(255), nullable=False) # e.g. Cardiology Visit, Room 304, Parent Meeting
    client_name = Column(String(255), nullable=False) # Patient, Guest, or Student name
    client_phone = Column(String(50), nullable=True) # WhatsApp number
    client_email = Column(String(255), nullable=True)
    
    assigned_staff_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resource_unit = Column(String(100), nullable=True) # Room, Office, Bed number
    
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=True)
    
    status = Column(String(50), nullable=False, default="Scheduled") # Scheduled | Confirmed | Completed | Cancelled
    notes = Column(Text, nullable=True)

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
    assigned_staff = relationship("User")

    __table_args__ = (
        Index("ix_bookings_institution_status", "institution_type", "status"),
        Index("ix_bookings_assigned_staff", "assigned_staff_id"),
        Index("ix_bookings_organisation", "organisation_name"),
    )
