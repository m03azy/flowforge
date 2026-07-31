"""
Alembic migration: create shop tables (shop_products, shop_carts, shop_orders).
Revision ID: 20260730_08
"""
from alembic import op
import sqlalchemy as sa

revision = "20260730_08"
down_revision = "20260729_07"
branch_labels = None
depends_on = None


def upgrade():
    # ── shop_products ─────────────────────────────────────────────────────
    op.create_table(
        "shop_products",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("organisation_name", sa.String(255), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("category", sa.String(100), nullable=True, index=True),
        sa.Column("sku", sa.String(100), nullable=True),
        sa.Column("price", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("compare_at_price", sa.Numeric(12, 2), nullable=True),
        sa.Column("stock_quantity", sa.Integer, nullable=False, server_default="0"),
        sa.Column("image_url", sa.String(512), nullable=True),
        sa.Column("is_available", sa.String(10), nullable=False, server_default="yes"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_shop_products_org_category", "shop_products", ["organisation_name", "category"])

    # ── shop_carts ────────────────────────────────────────────────────────
    op.create_table(
        "shop_carts",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("organisation_name", sa.String(255), nullable=False, index=True),
        sa.Column("customer_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("product_id", sa.Integer, sa.ForeignKey("shop_products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("quantity", sa.Integer, nullable=False, server_default="1"),
        sa.Column("added_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_shop_carts_customer_product", "shop_carts", ["customer_id", "product_id"])

    # ── shop_orders ───────────────────────────────────────────────────────
    op.create_table(
        "shop_orders",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("organisation_name", sa.String(255), nullable=False, index=True),
        sa.Column("customer_id", sa.Integer, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("customer_email", sa.String(255), nullable=True),
        sa.Column("customer_name", sa.String(255), nullable=True),
        sa.Column("items", sa.JSON, nullable=False),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("discount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("total", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("status", sa.String(30), nullable=False, server_default="pending", index=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("delivery_address", sa.Text, nullable=True),
        sa.Column("delivery_method", sa.String(50), nullable=True),
        sa.Column("payment_method", sa.String(50), nullable=True),
        sa.Column("payment_status", sa.String(30), nullable=False, server_default="unpaid"),
        sa.Column("payment_reference", sa.String(255), nullable=True),
        sa.Column("placed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False, index=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_shop_orders_org_status", "shop_orders", ["organisation_name", "status"])
    op.create_index("ix_shop_orders_org_placed", "shop_orders", ["organisation_name", "placed_at"])


def downgrade():
    op.drop_index("ix_shop_orders_org_placed", table_name="shop_orders")
    op.drop_index("ix_shop_orders_org_status", table_name="shop_orders")
    op.drop_table("shop_orders")
    op.drop_index("ix_shop_carts_customer_product", table_name="shop_carts")
    op.drop_table("shop_carts")
    op.drop_index("ix_shop_products_org_category", table_name="shop_products")
    op.drop_table("shop_products")
