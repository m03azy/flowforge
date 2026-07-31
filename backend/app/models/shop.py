"""
Shopping App Models.

ShopProduct: Products in the shop catalog (shared with FlowForge inventory or standalone)
ShopCart: Per-user shopping cart items (temporary, pre-order)
ShopOrder: Placed orders with items snapshot, total, and status tracking
ShopOrderItem: Line items inside each order (denormalized for history stability)

All models are scoped to organisation_name for multi-tenancy.
"""
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey,
    Numeric, Text, Index, JSON
)
from app.db.session import Base


class ShopProduct(Base):
    """
    Standalone product catalog for the shopping app.
    Admin manages products; customers browse and order them.
    """
    __tablename__ = "shop_products"

    id = Column(Integer, primary_key=True, index=True)
    organisation_name = Column(String(255), nullable=False, index=True)

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True, index=True)
    sku = Column(String(100), nullable=True)          # stock-keeping unit / barcode
    price = Column(Numeric(12, 2), nullable=False, default=0)
    compare_at_price = Column(Numeric(12, 2), nullable=True)  # original/crossed-out price
    stock_quantity = Column(Integer, nullable=False, default=0)
    image_url = Column(String(512), nullable=True)
    is_available = Column(String(10), nullable=False, default="yes")  # yes | no | hidden

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_shop_products_org_category", "organisation_name", "category"),
    )


class ShopCart(Base):
    """
    Persistent shopping cart — one row per (user, product) combination.
    Carts survive across sessions until converted to an order or cleared.
    """
    __tablename__ = "shop_carts"

    id = Column(Integer, primary_key=True, index=True)
    organisation_name = Column(String(255), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("shop_products.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    added_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_shop_carts_customer_product", "customer_id", "product_id"),
    )


class ShopOrder(Base):
    """
    A placed customer order. Items are stored as a JSON snapshot so the order
    remains accurate even if products are later edited or deleted.
    """
    __tablename__ = "shop_orders"

    id = Column(Integer, primary_key=True, index=True)
    organisation_name = Column(String(255), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    customer_email = Column(String(255), nullable=True)  # denormalized for history
    customer_name = Column(String(255), nullable=True)

    # Order items snapshot: [{"product_id": 1, "name": "T-Shirt", "price": 29.99, "quantity": 2}]
    items = Column(JSON, nullable=False, default=list)
    subtotal = Column(Numeric(12, 2), nullable=False, default=0)
    discount = Column(Numeric(12, 2), nullable=False, default=0)
    total = Column(Numeric(12, 2), nullable=False, default=0)

    # Status flow: pending → confirmed → processing → shipped → delivered | cancelled | refunded
    status = Column(String(30), nullable=False, default="pending", index=True)
    notes = Column(Text, nullable=True)   # customer notes / delivery instructions

    # Delivery info (optional — can be ignored for pickup orders)
    delivery_address = Column(Text, nullable=True)
    delivery_method = Column(String(50), nullable=True)  # pickup | delivery

    # Payment
    payment_method = Column(String(50), nullable=True)   # cash | mpesa | card | bank
    payment_status = Column(String(30), nullable=False, default="unpaid")  # unpaid | paid | refunded
    payment_reference = Column(String(255), nullable=True)  # M-Pesa txn ID, receipt no, etc.

    placed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_shop_orders_org_status", "organisation_name", "status"),
        Index("ix_shop_orders_org_placed", "organisation_name", "placed_at"),
    )
