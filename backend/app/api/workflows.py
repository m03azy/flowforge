from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.workflow import Workflow, Trigger, Action
from app.schemas.workflow import (
    WorkflowCreate,
    WorkflowRead,
    WorkflowUpdate,
    TriggerCreate,
    ActionCreate,
)

router = APIRouter()


def _org(user: User) -> str:
    return user.organisation_name or "default"


@router.get("/", response_model=list[WorkflowRead])
def list_workflows(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Workflow).filter(Workflow.organisation_name == _org(current_user)).all()


@router.post("/", response_model=WorkflowRead, status_code=status.HTTP_201_CREATED)
def create_workflow(
    payload: WorkflowCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workflow = Workflow(
        name=payload.name,
        description=payload.description,
        organisation_name=_org(current_user),
    )
    db.add(workflow)
    db.flush()

    for trig in payload.triggers:
        db.add(Trigger(workflow_id=workflow.id, event_type=trig.event_type, condition=trig.condition))

    for act in payload.actions:
        db.add(Action(workflow_id=workflow.id, action_type=act.action_type, payload=act.payload, order=act.order))

    db.commit()
    db.refresh(workflow)
    return workflow


@router.get("/{workflow_id}", response_model=WorkflowRead)
def get_workflow(
    workflow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workflow = db.query(Workflow).filter(
        Workflow.id == workflow_id,
        Workflow.organisation_name == _org(current_user),
    ).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow


@router.put("/{workflow_id}", response_model=WorkflowRead)
def update_workflow(
    workflow_id: int,
    payload: WorkflowUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workflow = db.query(Workflow).filter(
        Workflow.id == workflow_id,
        Workflow.organisation_name == _org(current_user),
    ).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    if payload.name is not None:
        workflow.name = payload.name
    if payload.description is not None:
        workflow.description = payload.description

    if payload.triggers is not None:
        db.query(Trigger).filter(Trigger.workflow_id == workflow.id).delete()
        for trig in payload.triggers:
            db.add(Trigger(workflow_id=workflow.id, event_type=trig.event_type, condition=trig.condition))

    if payload.actions is not None:
        db.query(Action).filter(Action.workflow_id == workflow.id).delete()
        for act in payload.actions:
            db.add(Action(workflow_id=workflow.id, action_type=act.action_type, payload=act.payload, order=act.order))

    db.commit()
    db.refresh(workflow)
    return workflow


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workflow(
    workflow_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workflow = db.query(Workflow).filter(
        Workflow.id == workflow_id,
        Workflow.organisation_name == _org(current_user),
    ).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    db.delete(workflow)
    db.commit()
    return None
