from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime


class LeadBase(BaseModel):
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    company: Optional[str] = Field(None, max_length=255)
    status: str = Field("New", max_length=50)  # New | Contacted | Qualified | Converted | Lost
    value: float = Field(0.0, ge=0.0)


class LeadCreate(LeadBase):
    assigned_to_id: Optional[int] = None


class LeadUpdate(BaseModel):
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    company: Optional[str] = Field(None, max_length=255)
    status: Optional[str] = Field(None, max_length=50)
    value: Optional[float] = Field(None, ge=0.0)
    assigned_to_id: Optional[int] = None

    class Config:
        from_attributes = True


class LeadAssigneeRead(BaseModel):
    id: int
    full_name: str
    email: str
    department: Optional[str] = None
    job_title: Optional[str] = None

    class Config:
        from_attributes = True


class LeadRead(LeadBase):
    id: int
    assigned_to_id: Optional[int] = None
    assigned_to: Optional[LeadAssigneeRead] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
