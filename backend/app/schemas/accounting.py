from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.models.accounting import TransactionType
from app.schemas.auth import UserResponse

class TransactionBase(BaseModel):
    type: TransactionType
    amount: float
    category: str
    description: Optional[str] = None
    date: Optional[datetime] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    type: Optional[TransactionType] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime] = None

class TransactionResponse(TransactionBase):
    id: int
    date: datetime
    created_by_id: int
    created_by: Optional[UserResponse] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class AccountingSummary(BaseModel):
    total_sales: float
    total_expenses: float
    net_profit: float
