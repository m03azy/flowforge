from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.accounting import Transaction, TransactionType
from app.schemas.accounting import TransactionCreate, TransactionUpdate, TransactionResponse, AccountingSummary
from app.middleware.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/accounting", tags=["Accounting"])


def _org(user: User) -> str:
    return user.organisation_name or "default"


@router.get("/summary", response_model=AccountingSummary)
def get_accounting_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    org = _org(current_user)
    sales = db.query(func.sum(Transaction.amount)).filter(
        Transaction.organisation_name == org,
        Transaction.type == TransactionType.SALE,
    ).scalar() or 0.0
    expenses = db.query(func.sum(Transaction.amount)).filter(
        Transaction.organisation_name == org,
        Transaction.type == TransactionType.EXPENSE,
    ).scalar() or 0.0

    return AccountingSummary(total_sales=sales, total_expenses=expenses, net_profit=sales - expenses)


@router.get("/", response_model=List[TransactionResponse])
def get_transactions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Transaction).filter(
        Transaction.organisation_name == _org(current_user)
    ).order_by(Transaction.date.desc()).all()


@router.post("/", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(payload: TransactionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    transaction = Transaction(
        **payload.model_dump(),
        created_by_id=current_user.id,
        organisation_name=_org(current_user),
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.put("/{tx_id}", response_model=TransactionResponse)
def update_transaction(tx_id: int, payload: TransactionUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    transaction = db.query(Transaction).filter(
        Transaction.id == tx_id,
        Transaction.organisation_name == _org(current_user),
    ).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(transaction, key, value)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.delete("/{tx_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(tx_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    transaction = db.query(Transaction).filter(
        Transaction.id == tx_id,
        Transaction.organisation_name == _org(current_user),
    ).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    db.delete(transaction)
    db.commit()
    return None
