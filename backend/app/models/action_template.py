"""
ActionTemplate SQLAlchemy model.
Represents reusable action building blocks across Communication, Documents, Database, System, and Storage.
Supports built-in templates and user-uploaded custom action blocks.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON
import sqlalchemy as sa
from app.db.session import Base


class ActionTemplate(Base):
    __tablename__ = "action_templates"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False, index=True)  # Communication | Documents | Database | System | Storage | Custom
    description = Column(Text, nullable=True)
    icon = Column(String(50), nullable=True, default="Zap")

    parameters_schema = Column(JSON, nullable=True)  # List of parameter definitions [{name, type, label, default, required, placeholder}]
    execution_type = Column(String(50), nullable=False, default="builtin")  # builtin | script | webhook | sql
    script_content = Column(Text, nullable=True)

    is_system = Column(Boolean, default=False, nullable=False)
    is_enabled = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False)

    def __repr__(self) -> str:
        return f"<ActionTemplate id={self.id} key='{self.key}' category='{self.category}'>"
