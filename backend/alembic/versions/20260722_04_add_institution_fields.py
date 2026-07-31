"""add institution_type and organisation_name to users table

Revision ID: 20260722_04
Revises: e6c0eef2bc11
Create Date: 2026-07-22 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '20260722_04'
down_revision = 'e6c0eef2bc11'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('users', sa.Column('institution_type', sa.String(length=20), server_default='business', nullable=False))
    op.add_column('users', sa.Column('organisation_name', sa.String(length=255), nullable=True))
    op.create_index('ix_users_institution_type', 'users', ['institution_type'])

def downgrade() -> None:
    op.drop_index('ix_users_institution_type', table_name='users')
    op.drop_column('users', 'organisation_name')
    op.drop_column('users', 'institution_type')
