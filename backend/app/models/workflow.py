from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.db.session import Base
import sqlalchemy as sa

class Workflow(Base):
    __tablename__ = "workflows"
    id = Column(Integer, primary_key=True, index=True)
    organisation_name = Column(String(255), nullable=False, default="default", index=True)  # tenant key
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False)

    triggers = relationship("Trigger", back_populates="workflow", cascade="all, delete-orphan")
    actions = relationship("Action", back_populates="workflow", cascade="all, delete-orphan")

class Trigger(Base):
    __tablename__ = "triggers"
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(100), nullable=False)
    condition = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=sa.func.now(), nullable=False)

    workflow = relationship("Workflow", back_populates="triggers")

class Action(Base):
    __tablename__ = "actions"
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False, index=True)
    action_type = Column(String(100), nullable=False)
    payload = Column(JSON, nullable=True)
    order = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=sa.func.now(), nullable=False)

    workflow = relationship("Workflow", back_populates="actions")
    __table_args__ = (Index("ix_actions_workflow_order", "workflow_id", "order"),)
