from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.session import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.schemas.auth import UserResponse, UserUpdateRequest, UserCreateRequest
from app.utils.security import hash_password
from app.services.audit_service import write_log, AuditAction

router = APIRouter()


def _org(user: User) -> str:
    return user.organisation_name or "default"


@router.get("/", response_model=List[UserResponse])
def list_employees(
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve active employees from the same organisation only."""
    query = db.query(User).filter(
        User.organisation_name == _org(current_user),
    )
    if department:
        query = query.filter(User.department == department)
    return query.order_by(User.id.asc()).all()


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_employee(
    payload: UserCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new user/employee for the current organisation. Admins/Managers only."""
    if current_user.role not in ["superadmin", "admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only Managers or Admins can create new users"
        )

    if current_user.role == "manager" and payload.role in ["admin", "superadmin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Managers cannot create Admin users"
        )

    # Check email uniqueness
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists"
        )

    new_user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        institution_type=current_user.institution_type or "business",
        organisation_name=_org(current_user),
        department=payload.department,
        job_title=payload.job_title,
        phone_number=payload.phone_number,
        is_active=True,
        is_verified=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    write_log(
        db,
        action=AuditAction.USER_CREATED,
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        organisation_name=_org(current_user),
        resource_type="user",
        resource_id=new_user.id,
        description=f"User created: {new_user.email} ({new_user.role}) by {current_user.email}",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return new_user


@router.put("/{user_id}", response_model=UserResponse)
def update_employee(
    user_id: int,
    payload: UserUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update employee status, department, role, or title. Admins/Managers only, within same org."""
    if current_user.role not in ["superadmin", "admin", "manager"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: Only Managers or Admins can edit employee profiles")

    employee = db.query(User).filter(
        User.id == user_id,
        User.organisation_name == _org(current_user),
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if current_user.role == "manager" and payload.role in ["admin", "superadmin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: Managers cannot assign Admin roles")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(employee, key, value)

    db.commit()
    db.refresh(employee)
    write_log(
        db,
        action=AuditAction.USER_UPDATED,
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        organisation_name=_org(current_user),
        resource_type="user",
        resource_id=employee.id,
        description=f"Employee updated: {employee.email} by {current_user.email}. Fields: {list(update_data.keys())}",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return employee


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deactivate or remove employee. Admins/Managers only."""
    if current_user.role not in ["superadmin", "admin", "manager"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: Only Managers or Admins can remove users")

    if current_user.id == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot delete your own account")

    employee = db.query(User).filter(
        User.id == user_id,
        User.organisation_name == _org(current_user),
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if current_user.role == "manager" and employee.role in ["admin", "superadmin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden: Managers cannot delete Admins")

    # Soft delete / deactivate
    employee_email = employee.email
    employee.is_active = False
    db.commit()
    write_log(
        db,
        action=AuditAction.USER_DEACTIVATED,
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        organisation_name=_org(current_user),
        resource_type="user",
        resource_id=user_id,
        description=f"Employee deactivated: {employee_email} by {current_user.email}",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return None
