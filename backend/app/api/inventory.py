from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.inventory import Product
from app.schemas.inventory import ProductCreate, ProductUpdate, ProductResponse
from app.middleware.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/inventory", tags=["Inventory"])


def _org(user: User) -> str:
    return user.organisation_name or "default"


@router.get("/", response_model=List[ProductResponse])
def get_inventory(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Product).filter(
        Product.organisation_name == _org(current_user)
    ).order_by(Product.name).all()


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # SKU uniqueness is now per-org
    existing = db.query(Product).filter(
        Product.sku == payload.sku,
        Product.organisation_name == _org(current_user),
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Product with this SKU already exists in your organisation")

    product = Product(**payload.model_dump(), organisation_name=_org(current_user))
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, payload: ProductUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    product = db.query(Product).filter(
        Product.id == product_id,
        Product.organisation_name == _org(current_user),
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    product = db.query(Product).filter(
        Product.id == product_id,
        Product.organisation_name == _org(current_user),
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    db.delete(product)
    db.commit()
    return None
