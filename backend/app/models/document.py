"""
Document SQLAlchemy model.
Enables tenant users to upload, store, categorize, manage, and auto-process documents with OCR & entity extraction
while strictly preserving user data integrity, original filenames, and raw file binaries.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, BigInteger, Boolean, Float
import sqlalchemy as sa
from app.db.session import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    organisation_name = Column(String(255), nullable=False, default="default", index=True)
    title = Column(String(255), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    original_file_name = Column(String(255), nullable=True)
    suggested_file_name = Column(String(255), nullable=True)
    file_type = Column(String(50), nullable=False, default="pdf")  # pdf | docx | xlsx | csv | png | jpg | txt
    file_size_bytes = Column(BigInteger, nullable=False, default=102400)
    category = Column(String(100), nullable=False, default="General", index=True)  # Invoices & Receipts | Contracts & Legal | Reports | Policies | General
    file_url = Column(String(500), nullable=True)
    tags = Column(String(255), nullable=True)
    uploaded_by = Column(String(255), nullable=True)
    status = Column(String(50), nullable=False, default="active")  # active | archived

    # ── Document Automation & OCR Fields (Enrichment / Metadata) ──
    ocr_text = Column(Text, nullable=True)
    extracted_invoice_number = Column(String(100), nullable=True, index=True)
    extracted_amount = Column(Float, nullable=True)
    extracted_vendor = Column(String(255), nullable=True)
    smart_folder = Column(String(255), nullable=True, default="/Unsorted")
    auto_processed = Column(Boolean, nullable=False, default=False)
    file_content_base64 = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False)

    def __repr__(self) -> str:
        return f"<Document id={self.id} title='{self.title}' org='{self.organisation_name}'>"
