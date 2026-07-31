"""
Shopping App API Router.

Exposes two groups of endpoints:

/api/shop/           — Customer-facing (any authenticated user, including role=customer)
  GET  /products     — Browse product catalog
  GET  /products/{id}
  GET  /cart         — My cart
  POST /cart         — Add item to cart
  PUT  /cart/{id}    — Update cart item qty
  DELETE /cart/{id}  — Remove cart item
  POST /orders       — Place order (from cart or direct payload)
  GET  /orders/mine  — My order history
  GET  /orders/{id}  — Single order detail

/api/shop/admin/     — Admin/Manager only
  GET  /orders       — All orders for the org
  PUT  /orders/{id}/status — Update order status
  GET  /stats        — Sales stats

/api/shop/admin/products/ — Admin only
  POST /             — Create product
  PUT  /{id}         — Update product
  DELETE /{id}       — Delete product
"""
from decimal import Decimal
from datetime import datetime, timezone
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, Field

from app.db.session import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.shop import ShopProduct, ShopCart, ShopOrder
from app.services.audit_service import write_log, AuditAction

router = APIRouter(prefix="/api/shop", tags=["Shopping App"])


# ──────────────────────────────────────────────────────────────────────────────
# Schemas
# ──────────────────────────────────────────────────────────────────────────────

class ProductOut(BaseModel):
    id: int
    organisation_name: str
    name: str
    description: Optional[str]
    category: Optional[str]
    sku: Optional[str]
    price: float
    compare_at_price: Optional[float]
    stock_quantity: int
    image_url: Optional[str]
    is_available: str
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)
    sku: Optional[str] = Field(None, max_length=100)
    price: float = Field(..., ge=0)
    compare_at_price: Optional[float] = None
    stock_quantity: int = Field(0, ge=0)
    image_url: Optional[str] = Field(None, max_length=512)
    is_available: str = Field("yes", pattern="^(yes|no|hidden)$")


class CartItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    product_name: Optional[str] = None
    product_price: Optional[float] = None
    product_image: Optional[str] = None
    model_config = {"from_attributes": True}


class AddToCartRequest(BaseModel):
    product_id: int
    quantity: int = Field(1, ge=1)


class OrderOut(BaseModel):
    id: int
    organisation_name: str
    customer_id: Optional[int]
    customer_email: Optional[str]
    customer_name: Optional[str]
    items: Any
    subtotal: float
    discount: float
    total: float
    status: str
    notes: Optional[str]
    delivery_address: Optional[str]
    delivery_method: Optional[str]
    payment_method: Optional[str]
    payment_status: str
    payment_reference: Optional[str]
    placed_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class PlaceOrderRequest(BaseModel):
    """Place an order. If cart_checkout=True, uses the user's current cart."""
    cart_checkout: bool = True
    notes: Optional[str] = None
    delivery_address: Optional[str] = None
    delivery_method: Optional[str] = Field(None, pattern="^(pickup|delivery)$")
    payment_method: Optional[str] = None
    # For direct (non-cart) orders:
    items: Optional[List[dict]] = None  # [{product_id, quantity}]


class UpdateOrderStatusRequest(BaseModel):
    status: str = Field(..., pattern="^(pending|confirmed|processing|shipped|delivered|cancelled|refunded)$")
    notes: Optional[str] = None
    payment_status: Optional[str] = Field(None, pattern="^(unpaid|paid|refunded)$")
    payment_reference: Optional[str] = None


def _org(user: User) -> str:
    return user.organisation_name or "default"


# ──────────────────────────────────────────────────────────────────────────────
# 1. PUBLIC PRODUCT CATALOG (any authenticated user)
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/products", response_model=List[ProductOut], summary="Browse product catalog")
def list_products(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    available_only: bool = Query(True),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Browse available products in the organisation's catalog."""
    query = db.query(ShopProduct).filter(ShopProduct.organisation_name == _org(current_user))
    if available_only:
        query = query.filter(ShopProduct.is_available == "yes")
    if category:
        query = query.filter(ShopProduct.category == category)
    if search:
        query = query.filter(ShopProduct.name.ilike(f"%{search}%"))
    return query.order_by(ShopProduct.id.desc()).offset((page - 1) * page_size).limit(page_size).all()


@router.get("/products/{product_id}", response_model=ProductOut, summary="Get single product")
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(ShopProduct).filter(
        ShopProduct.id == product_id,
        ShopProduct.organisation_name == _org(current_user),
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


# ──────────────────────────────────────────────────────────────────────────────
# 2. SHOPPING CART
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/cart", response_model=List[CartItemOut], summary="Get my cart")
def get_cart(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the current user's cart with product details."""
    cart_items = db.query(ShopCart).filter(
        ShopCart.customer_id == current_user.id,
        ShopCart.organisation_name == _org(current_user),
    ).all()

    result = []
    for item in cart_items:
        product = db.query(ShopProduct).filter(ShopProduct.id == item.product_id).first()
        result.append(CartItemOut(
            id=item.id,
            product_id=item.product_id,
            quantity=item.quantity,
            product_name=product.name if product else None,
            product_price=float(product.price) if product else None,
            product_image=product.image_url if product else None,
        ))
    return result


@router.post("/cart", status_code=status.HTTP_201_CREATED, summary="Add item to cart")
def add_to_cart(
    payload: AddToCartRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a product to the cart. If already in cart, increases quantity."""
    product = db.query(ShopProduct).filter(
        ShopProduct.id == payload.product_id,
        ShopProduct.organisation_name == _org(current_user),
        ShopProduct.is_available == "yes",
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found or unavailable")

    existing = db.query(ShopCart).filter(
        ShopCart.customer_id == current_user.id,
        ShopCart.product_id == payload.product_id,
    ).first()

    if existing:
        existing.quantity += payload.quantity
    else:
        cart_item = ShopCart(
            organisation_name=_org(current_user),
            customer_id=current_user.id,
            product_id=payload.product_id,
            quantity=payload.quantity,
        )
        db.add(cart_item)
    db.commit()
    return {"message": f"Added {payload.quantity}x '{product.name}' to cart"}


@router.put("/cart/{item_id}", summary="Update cart item quantity")
def update_cart_item(
    item_id: int,
    quantity: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(ShopCart).filter(
        ShopCart.id == item_id,
        ShopCart.customer_id == current_user.id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    item.quantity = quantity
    db.commit()
    return {"message": "Cart item updated"}


@router.delete("/cart/{item_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remove cart item")
def remove_cart_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(ShopCart).filter(
        ShopCart.id == item_id,
        ShopCart.customer_id == current_user.id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    db.delete(item)
    db.commit()
    return None


@router.delete("/cart", status_code=status.HTTP_204_NO_CONTENT, summary="Clear entire cart")
def clear_cart(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(ShopCart).filter(ShopCart.customer_id == current_user.id).delete()
    db.commit()
    return None


# ──────────────────────────────────────────────────────────────────────────────
# 3. ORDERS
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/orders", response_model=OrderOut, status_code=status.HTTP_201_CREATED, summary="Place an order")
def place_order(
    payload: PlaceOrderRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Place an order. By default converts the user's cart to an order.
    Pass cart_checkout=false and provide items array to place a direct order.
    """
    org = _org(current_user)
    line_items = []

    if payload.cart_checkout:
        cart_items = db.query(ShopCart).filter(
            ShopCart.customer_id == current_user.id,
            ShopCart.organisation_name == org,
        ).all()
        if not cart_items:
            raise HTTPException(status_code=400, detail="Cart is empty")

        for ci in cart_items:
            product = db.query(ShopProduct).filter(ShopProduct.id == ci.product_id).first()
            if product:
                line_items.append({
                    "product_id": product.id,
                    "name": product.name,
                    "price": float(product.price),
                    "quantity": ci.quantity,
                    "line_total": float(product.price) * ci.quantity,
                })
    else:
        if not payload.items:
            raise HTTPException(status_code=400, detail="No items provided")
        for item_req in payload.items:
            product = db.query(ShopProduct).filter(
                ShopProduct.id == item_req.get("product_id"),
                ShopProduct.organisation_name == org,
            ).first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Product {item_req.get('product_id')} not found")
            qty = int(item_req.get("quantity", 1))
            line_items.append({
                "product_id": product.id,
                "name": product.name,
                "price": float(product.price),
                "quantity": qty,
                "line_total": float(product.price) * qty,
            })

    subtotal = sum(Decimal(str(i["line_total"])) for i in line_items)

    order = ShopOrder(
        organisation_name=org,
        customer_id=current_user.id,
        customer_email=current_user.email,
        customer_name=current_user.full_name,
        items=line_items,
        subtotal=subtotal,
        discount=Decimal("0"),
        total=subtotal,
        status="pending",
        notes=payload.notes,
        delivery_address=payload.delivery_address,
        delivery_method=payload.delivery_method,
        payment_method=payload.payment_method,
        payment_status="unpaid",
    )
    db.add(order)

    if payload.cart_checkout:
        db.query(ShopCart).filter(
            ShopCart.customer_id == current_user.id,
            ShopCart.organisation_name == org,
        ).delete()

    db.commit()
    db.refresh(order)

    write_log(
        db,
        action="ORDER_PLACED",
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        organisation_name=org,
        resource_type="order",
        resource_id=order.id,
        description=f"Order #{order.id} placed by {current_user.email} — Total: {float(order.total)}",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return order


@router.get("/orders/mine", response_model=List[OrderOut], summary="My order history")
def my_orders(
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(ShopOrder).filter(
        ShopOrder.customer_id == current_user.id,
        ShopOrder.organisation_name == _org(current_user),
    )
    if status_filter:
        query = query.filter(ShopOrder.status == status_filter)
    return query.order_by(ShopOrder.placed_at.desc()).offset((page - 1) * page_size).limit(page_size).all()


@router.get("/orders/{order_id}", response_model=OrderOut, summary="Get order detail")
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = db.query(ShopOrder).filter(
        ShopOrder.id == order_id,
        ShopOrder.organisation_name == _org(current_user),
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    # Customers can only see their own orders; admins/managers can see all
    if current_user.role in ["customer", "employee"] and order.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return order


# ──────────────────────────────────────────────────────────────────────────────
# 4. ADMIN ENDPOINTS
# ──────────────────────────────────────────────────────────────────────────────

def _require_admin(current_user: User):
    if current_user.role not in ["superadmin", "admin", "manager"]:
        raise HTTPException(status_code=403, detail="Admin or Manager role required")


@router.get("/admin/orders", response_model=List[OrderOut], summary="[Admin] All orders")
def admin_list_orders(
    order_status: Optional[str] = Query(None, alias="status"),
    customer_email: Optional[str] = Query(None),
    payment_status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin view of all orders for the organisation."""
    _require_admin(current_user)
    query = db.query(ShopOrder).filter(ShopOrder.organisation_name == _org(current_user))
    if order_status:
        query = query.filter(ShopOrder.status == order_status)
    if customer_email:
        query = query.filter(ShopOrder.customer_email.ilike(f"%{customer_email}%"))
    if payment_status:
        query = query.filter(ShopOrder.payment_status == payment_status)
    return query.order_by(ShopOrder.placed_at.desc()).offset((page - 1) * page_size).limit(page_size).all()


@router.put("/admin/orders/{order_id}/status", response_model=OrderOut, summary="[Admin] Update order status")
def update_order_status(
    order_id: int,
    payload: UpdateOrderStatusRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update order status, payment status, and payment reference."""
    _require_admin(current_user)
    order = db.query(ShopOrder).filter(
        ShopOrder.id == order_id,
        ShopOrder.organisation_name == _org(current_user),
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    old_status = order.status
    order.status = payload.status
    if payload.notes:
        order.notes = payload.notes
    if payload.payment_status:
        order.payment_status = payload.payment_status
    if payload.payment_reference:
        order.payment_reference = payload.payment_reference
    order.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(order)

    write_log(
        db,
        action="ORDER_STATUS_UPDATED",
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        organisation_name=_org(current_user),
        resource_type="order",
        resource_id=order_id,
        description=f"Order #{order_id} status: {old_status} → {payload.status} by {current_user.email}",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return order


@router.get("/admin/stats", summary="[Admin] Sales statistics")
def admin_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns summary statistics for the admin dashboard."""
    _require_admin(current_user)
    org = _org(current_user)

    from datetime import date
    today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)

    total_orders = db.query(func.count(ShopOrder.id)).filter(ShopOrder.organisation_name == org).scalar()
    pending_orders = db.query(func.count(ShopOrder.id)).filter(
        ShopOrder.organisation_name == org, ShopOrder.status == "pending").scalar()
    orders_today = db.query(func.count(ShopOrder.id)).filter(
        ShopOrder.organisation_name == org, ShopOrder.placed_at >= today_start).scalar()
    revenue_total = db.query(func.sum(ShopOrder.total)).filter(
        ShopOrder.organisation_name == org, ShopOrder.payment_status == "paid").scalar() or 0
    revenue_today = db.query(func.sum(ShopOrder.total)).filter(
        ShopOrder.organisation_name == org,
        ShopOrder.placed_at >= today_start,
        ShopOrder.payment_status == "paid",
    ).scalar() or 0
    total_customers = db.query(func.count(func.distinct(ShopOrder.customer_id))).filter(
        ShopOrder.organisation_name == org).scalar()
    total_products = db.query(func.count(ShopProduct.id)).filter(
        ShopProduct.organisation_name == org, ShopProduct.is_available == "yes").scalar()

    status_breakdown = db.query(ShopOrder.status, func.count(ShopOrder.id)).filter(
        ShopOrder.organisation_name == org).group_by(ShopOrder.status).all()

    return {
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "orders_today": orders_today,
        "revenue_total": float(revenue_total),
        "revenue_today": float(revenue_today),
        "total_customers": total_customers,
        "total_products": total_products,
        "status_breakdown": {row[0]: row[1] for row in status_breakdown},
    }


# ── Admin Product Management ──────────────────────────────────────────────────

@router.get("/admin/products", response_model=List[ProductOut], summary="[Admin] List all products")
def admin_list_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    return db.query(ShopProduct).filter(
        ShopProduct.organisation_name == _org(current_user)
    ).order_by(ShopProduct.id.desc()).all()


@router.post("/admin/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED, summary="[Admin] Create product")
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    product = ShopProduct(
        organisation_name=_org(current_user),
        **payload.model_dump(),
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/admin/products/{product_id}", response_model=ProductOut, summary="[Admin] Update product")
def update_product(
    product_id: int,
    payload: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    product = db.query(ShopProduct).filter(
        ShopProduct.id == product_id,
        ShopProduct.organisation_name == _org(current_user),
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for key, value in payload.model_dump().items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/admin/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT, summary="[Admin] Delete product")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    product = db.query(ShopProduct).filter(
        ShopProduct.id == product_id,
        ShopProduct.organisation_name == _org(current_user),
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return None
