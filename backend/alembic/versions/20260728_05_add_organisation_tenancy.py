"""add organisation_name to all tenant tables

Revision ID: 20260728_05
Revises: 20260722_04
Create Date: 2026-07-28 11:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260728_05'
down_revision = '20260722_04'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Bookings
    op.add_column('bookings', sa.Column('organisation_name', sa.String(length=255), nullable=True))
    op.execute("UPDATE bookings SET organisation_name = 'default' WHERE organisation_name IS NULL")
    op.alter_column('bookings', 'organisation_name', nullable=False)
    op.create_index('ix_bookings_organisation', 'bookings', ['organisation_name'])

    # 2. Workflows
    op.add_column('workflows', sa.Column('organisation_name', sa.String(length=255), nullable=True))
    op.execute("UPDATE workflows SET organisation_name = 'default' WHERE organisation_name IS NULL")
    op.alter_column('workflows', 'organisation_name', nullable=False)
    op.create_index('ix_workflows_organisation', 'workflows', ['organisation_name'])
    op.execute("DROP INDEX IF EXISTS ix_workflows_name")
    op.execute("ALTER TABLE workflows DROP CONSTRAINT IF EXISTS workflows_name_key")
    op.create_index('ix_workflows_name', 'workflows', ['name'])

    # 3. CRM Leads
    op.add_column('crm_leads', sa.Column('organisation_name', sa.String(length=255), nullable=True))
    op.execute("UPDATE crm_leads SET organisation_name = 'default' WHERE organisation_name IS NULL")
    op.alter_column('crm_leads', 'organisation_name', nullable=False)
    op.create_index('ix_crm_leads_organisation', 'crm_leads', ['organisation_name'])
    op.execute("DROP INDEX IF EXISTS ix_crm_leads_email")
    op.execute("ALTER TABLE crm_leads DROP CONSTRAINT IF EXISTS crm_leads_email_key")
    op.create_index('ix_crm_leads_email', 'crm_leads', ['email'])

    # 4. Products
    op.add_column('products', sa.Column('organisation_name', sa.String(), nullable=True))
    op.execute("UPDATE products SET organisation_name = 'default' WHERE organisation_name IS NULL")
    op.alter_column('products', 'organisation_name', nullable=False)
    op.create_index('ix_products_organisation', 'products', ['organisation_name'])
    op.execute("DROP INDEX IF EXISTS ix_products_sku")
    op.execute("ALTER TABLE products DROP CONSTRAINT IF EXISTS products_sku_key")
    op.create_index('ix_products_sku', 'products', ['sku'])

    # 5. Transactions
    op.add_column('transactions', sa.Column('organisation_name', sa.String(), nullable=True))
    op.execute("UPDATE transactions SET organisation_name = 'default' WHERE organisation_name IS NULL")
    op.alter_column('transactions', 'organisation_name', nullable=False)
    op.create_index('ix_transactions_organisation', 'transactions', ['organisation_name'])


def downgrade() -> None:
    op.drop_index('ix_transactions_organisation', table_name='transactions')
    op.drop_column('transactions', 'organisation_name')

    op.drop_index('ix_products_organisation', table_name='products')
    op.drop_column('products', 'organisation_name')

    op.drop_index('ix_crm_leads_organisation', table_name='crm_leads')
    op.drop_column('crm_leads', 'organisation_name')

    op.drop_index('ix_workflows_organisation', table_name='workflows')
    op.drop_column('workflows', 'organisation_name')

    op.drop_index('ix_bookings_organisation', table_name='bookings')
    op.drop_column('bookings', 'organisation_name')
