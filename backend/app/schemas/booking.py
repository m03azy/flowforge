from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from app.schemas.auth import UserResponse

class BookingBase(BaseModel):
    institution_type: str = "hospital" # hospital | hotel | school | general
    title: str
    client_name: str
    client_phone: Optional[str] = None
    client_email: Optional[str] = None
    assigned_staff_id: Optional[int] = None
    resource_unit: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    status: str = "Scheduled"
    notes: Optional[str] = None

class BookingCreate(BookingBase):
    pass

class BookingUpdate(BaseModel):
    title: Optional[str] = None
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    client_email: Optional[str] = None
    assigned_staff_id: Optional[int] = None
    resource_unit: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class BookingResponse(BookingBase):
    id: int
    created_at: datetime
    updated_at: datetime
    assigned_staff: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)
