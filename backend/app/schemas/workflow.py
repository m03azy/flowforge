from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class WorkflowBase(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = None

class WorkflowCreate(WorkflowBase):
    triggers: List["TriggerCreate"] = []
    actions: List["ActionCreate"] = []

class WorkflowRead(WorkflowBase):
    id: int
    created_at: datetime
    updated_at: datetime
    triggers: List["TriggerRead"] = []
    actions: List["ActionRead"] = []

    class Config:
        from_attributes = True

class WorkflowUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    triggers: Optional[List["TriggerCreate"]] = None
    actions: Optional[List["ActionCreate"]] = None

    class Config:
        from_attributes = True

class TriggerBase(BaseModel):
    event_type: str = Field(..., max_length=100)
    condition: Optional[dict] = None

class TriggerCreate(TriggerBase):
    pass

class TriggerRead(TriggerBase):
    id: int
    workflow_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ActionBase(BaseModel):
    action_type: str = Field(..., max_length=100)
    payload: Optional[dict] = None
    order: int

class ActionCreate(ActionBase):
    pass

class ActionRead(ActionBase):
    id: int
    workflow_id: int
    created_at: datetime

    class Config:
        from_attributes = True
