"""add subscription_plan to users table

Revision ID: 20260729_06
Revises: 20260728_05
Create Date: 2026-07-29 11:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260729_06'
down_revision = '20260728_05'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('subscription_plan', sa.String(length=50), nullable=True))
    op.execute("UPDATE users SET subscription_plan = 'starter' WHERE subscription_plan IS NULL")
    op.alter_column('users', 'subscription_plan', nullable=False)


def downgrade() -> None:
    op.drop_column('users', 'subscription_plan')
