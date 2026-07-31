"""
Create workflow related tables.
"""

# revision identifiers, used by Alembic.
revision = "20240702_02"
down_revision = "20240702_01"
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa

def upgrade() -> None:
    # Workflows table
    op.create_table(
        "workflows",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("name", sa.String(255), nullable=False, unique=True, index=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    # Triggers table
    op.create_table(
        "triggers",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("workflow_id", sa.Integer, sa.ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("condition", sa.JSON, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    # Actions table
    op.create_table(
        "actions",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("workflow_id", sa.Integer, sa.ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("action_type", sa.String(100), nullable=False),
        sa.Column("payload", sa.JSON, nullable=True),
        sa.Column("order", sa.Integer, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Index("ix_actions_workflow_order", "workflow_id", "order"),
    )

def downgrade() -> None:
    op.drop_table("actions")
    op.drop_table("triggers")
    op.drop_table("workflows")
