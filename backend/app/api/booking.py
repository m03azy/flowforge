from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.booking import Booking
from app.schemas.booking import BookingCreate, BookingUpdate, BookingResponse
from app.middleware.auth import get_current_user
from app.models.user import User
from app.services.workflow_service import WorkflowService

router = APIRouter(prefix="/api/bookings", tags=["Bookings & Appointments"])

def _org(user: User) -> str:
    """Return the tenant key for this user (their organisation_name)."""
    return user.organisation_name or "default"


@router.get("/", response_model=List[BookingResponse])
def list_bookings(
    institution_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve bookings scoped to the current user's organisation."""
    query = db.query(Booking).filter(Booking.organisation_name == _org(current_user))

    if institution_type:
        query = query.filter(Booking.institution_type == institution_type)

    # Employees only see their own assigned bookings within the org
    if current_user.role not in ["superadmin", "admin", "manager"]:
        query = query.filter(Booking.assigned_staff_id == current_user.id)

    return query.order_by(Booking.start_time.asc()).all()


@router.post("/", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(
    payload: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new booking, stamped with the current user's organisation."""
    booking = Booking(**payload.model_dump(), organisation_name=_org(current_user))
    db.add(booking)
    db.commit()
    db.refresh(booking)

    WorkflowService.trigger_event(db, "booking_created", {
        "id": booking.id,
        "title": booking.title,
        "client_name": booking.client_name,
        "phone": booking.client_phone or "",
        "email": booking.client_email or "",
        "institution_type": booking.institution_type,
        "resource_unit": booking.resource_unit or "",
        "status": booking.status,
        "start_time": str(booking.start_time),
    })

    return booking


@router.put("/{booking_id}", response_model=BookingResponse)
def update_booking(
    booking_id: int,
    payload: BookingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a booking — verifies it belongs to the user's organisation."""
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.organisation_name == _org(current_user),
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if current_user.role not in ["superadmin", "admin", "manager"] and booking.assigned_staff_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: You can only edit bookings assigned to you")

    update_data = payload.model_dump(exclude_unset=True)
    status_changed = "status" in update_data and update_data["status"] != booking.status

    for key, value in update_data.items():
        setattr(booking, key, value)

    db.commit()
    db.refresh(booking)

    if status_changed:
        WorkflowService.trigger_event(db, "booking_status_changed", {
            "id": booking.id,
            "title": booking.title,
            "client_name": booking.client_name,
            "phone": booking.client_phone or "",
            "email": booking.client_email or "",
            "institution_type": booking.institution_type,
            "resource_unit": booking.resource_unit or "",
            "status": booking.status,
            "start_time": str(booking.start_time),
        })

    return booking


@router.delete("/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a booking (Admin/Manager only, within the same organisation)."""
    if current_user.role not in ["superadmin", "admin", "manager"]:
        raise HTTPException(status_code=403, detail="Forbidden: Only Admins or Managers can delete bookings")

    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.organisation_name == _org(current_user),
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    db.delete(booking)
    db.commit()
    return None
