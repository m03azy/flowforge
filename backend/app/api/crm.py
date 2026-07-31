from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.middleware.auth import get_current_user
from app.models.crm import Lead
from app.models.user import User
from app.schemas.crm import LeadCreate, LeadRead, LeadUpdate
from app.services.workflow_service import WorkflowService

router = APIRouter()


def _org(user: User) -> str:
    return user.organisation_name or "default"


@router.get("/", response_model=List[LeadRead])
def list_leads(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve leads scoped to the current user's organisation."""
    query = db.query(Lead).filter(Lead.organisation_name == _org(current_user))
    if current_user.role not in ["superadmin", "admin", "manager"]:
        query = query.filter(Lead.assigned_to_id == current_user.id)
    return query.all()


@router.post("/", response_model=LeadRead, status_code=status.HTTP_201_CREATED)
def create_lead(
    payload: LeadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = Lead(
        organisation_name=_org(current_user),
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email,
        phone=payload.phone,
        company=payload.company,
        status=payload.status,
        value=payload.value,
        assigned_to_id=payload.assigned_to_id,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    WorkflowService.trigger_event(db, "lead_created", {
        "id": lead.id, "first_name": lead.first_name, "last_name": lead.last_name,
        "email": lead.email, "phone": lead.phone, "company": lead.company,
        "status": lead.status, "value": lead.value,
    })
    return lead


@router.get("/{lead_id}", response_model=LeadRead)
def get_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.organisation_name == _org(current_user),
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if current_user.role not in ["superadmin", "admin", "manager"] and lead.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: You can only access leads assigned to you")
    return lead


@router.put("/{lead_id}", response_model=LeadRead)
def update_lead(
    lead_id: int,
    payload: LeadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.organisation_name == _org(current_user),
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if current_user.role not in ["superadmin", "admin", "manager"] and lead.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: You can only edit leads assigned to you")

    update_data = payload.model_dump(exclude_unset=True)
    status_changed = "status" in update_data and update_data["status"] != lead.status

    for key, value in update_data.items():
        setattr(lead, key, value)
    db.commit()
    db.refresh(lead)

    if status_changed:
        WorkflowService.trigger_event(db, "lead_status_changed", {
            "id": lead.id, "first_name": lead.first_name, "last_name": lead.last_name,
            "email": lead.email, "phone": lead.phone, "company": lead.company,
            "status": lead.status, "value": lead.value,
        })
    return lead


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ["superadmin", "admin", "manager"]:
        raise HTTPException(status_code=403, detail="Forbidden: Only Managers or Admins can delete leads")

    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.organisation_name == _org(current_user),
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    db.delete(lead)
    db.commit()
    return None
