"""
Actions Library Router.
Provides reusable building blocks categorized across Communication, Documents, Database, System, and Storage.
Supports uploading custom action blocks, test executions, and library export.
"""
from typing import List, Optional
from datetime import datetime, timezone
import json
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.db.session import get_db
from app.middleware.auth import get_current_user, require_role
from app.models.user import User
from app.models.action_template import ActionTemplate
from app.services.audit_service import write_log

router = APIRouter(prefix="/api/action-library", tags=["Actions Library"])


# ── Schemas ───────────────────────────────────────────────────────────────

class ParameterSchema(BaseModel):
    name: str
    type: str = "string"  # string | number | boolean | json | file | select
    label: str
    placeholder: Optional[str] = None
    default: Optional[str] = None
    required: bool = False
    options: Optional[List[str]] = None


class ActionTemplateCreate(BaseModel):
    key: str
    name: str
    category: str  # Communication | Documents | Database | System | Storage | Custom
    description: Optional[str] = None
    icon: Optional[str] = "Zap"
    parameters_schema: Optional[List[dict]] = None
    execution_type: str = "builtin"  # builtin | script | webhook | sql
    script_content: Optional[str] = None


class ActionTemplateRead(BaseModel):
    id: int
    key: str
    name: str
    category: str
    description: Optional[str]
    icon: Optional[str]
    parameters_schema: Optional[List[dict]]
    execution_type: str
    script_content: Optional[str]
    is_system: bool
    is_enabled: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TestActionRequest(BaseModel):
    parameters: dict = Field(default_factory=dict)


# ── Pre-seeded Default Actions Library ────────────────────────────────────

DEFAULT_ACTIONS = [
    # ── Communication ──
    {
        "key": "send_email",
        "name": "Send Email",
        "category": "Communication",
        "description": "Send formatted HTML or plaintext email notifications via SMTP / SendGrid / Resend.",
        "icon": "Mail",
        "execution_type": "builtin",
        "parameters_schema": [
            {"name": "recipient_email", "type": "string", "label": "Recipient Email", "required": True, "placeholder": "client@example.com"},
            {"name": "subject", "type": "string", "label": "Email Subject", "required": True, "placeholder": "Important Notification"},
            {"name": "body_html", "type": "string", "label": "Email Body (HTML/Text)", "required": True, "placeholder": "<p>Hello, your update is ready.</p>"},
            {"name": "sender_name", "type": "string", "label": "Sender Display Name", "required": False, "placeholder": "FlowForge Platform"},
        ]
    },
    {
        "key": "send_sms",
        "name": "Send SMS",
        "category": "Communication",
        "description": "Dispatch instant SMS messages via Twilio, Vonage, or HTTP SMS Gateways.",
        "icon": "MessageSquare",
        "execution_type": "builtin",
        "parameters_schema": [
            {"name": "phone_number", "type": "string", "label": "Destination Phone Number", "required": True, "placeholder": "+1 555-0199"},
            {"name": "message_body", "type": "string", "label": "SMS Message Content", "required": True, "placeholder": "Your verification code is 482910."},
        ]
    },
    {
        "key": "send_whatsapp",
        "name": "Send WhatsApp Message",
        "category": "Communication",
        "description": "Send automated WhatsApp template alerts and rich interactive messages.",
        "icon": "MessageCircle",
        "execution_type": "builtin",
        "parameters_schema": [
            {"name": "phone_number", "type": "string", "label": "WhatsApp Phone Number", "required": True, "placeholder": "+1 555-0199"},
            {"name": "template_name", "type": "string", "label": "Template Name", "required": True, "placeholder": "booking_confirmation_v1"},
            {"name": "template_vars", "type": "json", "label": "Template Variables (JSON)", "required": False, "placeholder": "{\"name\": \"John\"}"},
        ]
    },
    {
        "key": "send_push_notification",
        "name": "Send Push Notification",
        "category": "Communication",
        "description": "Dispatch real-time web browser push notifications or mobile app device alerts.",
        "icon": "Bell",
        "execution_type": "builtin",
        "parameters_schema": [
            {"name": "target_user_id", "type": "string", "label": "Target User / Channel", "required": True, "placeholder": "user_1029"},
            {"name": "title", "type": "string", "label": "Notification Title", "required": True, "placeholder": "New Lead Assigned"},
            {"name": "message", "type": "string", "label": "Notification Message", "required": True, "placeholder": "You have a new inquiry in CRM."},
        ]
    },

    # ── Documents ──
    {
        "key": "generate_pdf",
        "name": "Generate PDF Document",
        "category": "Documents",
        "description": "Compile HTML/CSS templates or raw markdown into branded downloadable PDF files.",
        "icon": "FileText",
        "execution_type": "builtin",
        "parameters_schema": [
            {"name": "document_title", "type": "string", "label": "Document Title", "required": True, "placeholder": "Invoice_INV-2026-001"},
            {"name": "template_type", "type": "select", "label": "Document Layout", "options": ["invoice", "report", "certificate", "receipt"], "default": "invoice"},
            {"name": "data_payload", "type": "json", "label": "Document Data (JSON)", "required": True, "placeholder": "{\"items\": [], \"total\": 149.00}"},
        ]
    },
    {
        "key": "merge_documents",
        "name": "Merge Documents",
        "category": "Documents",
        "description": "Combine multiple PDF documents, appendices, and attachments into a unified file.",
        "icon": "Files",
        "execution_type": "builtin",
        "parameters_schema": [
            {"name": "source_files", "type": "string", "label": "Source File Paths / URLs (comma-separated)", "required": True, "placeholder": "doc1.pdf, doc2.pdf"},
            {"name": "output_filename", "type": "string", "label": "Merged Output Filename", "required": True, "placeholder": "Master_Contract_Bundle.pdf"},
        ]
    },
    {
        "key": "convert_csv_excel",
        "name": "Convert CSV to Excel",
        "category": "Documents",
        "description": "Convert raw CSV spreadsheets into styled multi-sheet Microsoft Excel (.xlsx) workbooks.",
        "icon": "Table",
        "execution_type": "builtin",
        "parameters_schema": [
            {"name": "csv_data", "type": "string", "label": "Raw CSV Content / File URL", "required": True, "placeholder": "id,name,amount\n1,Alpha,120"},
            {"name": "output_format", "type": "select", "label": "Target Format", "options": ["xlsx", "csv_formatted", "json"], "default": "xlsx"},
        ]
    },

    # ── Database ──
    {
        "key": "db_insert",
        "name": "Database Insert Record",
        "category": "Database",
        "description": "Insert structured records into target database tables or collections with integrity validation.",
        "icon": "Database",
        "execution_type": "builtin",
        "parameters_schema": [
            {"name": "target_table", "type": "string", "label": "Target Table / Entity", "required": True, "placeholder": "leads / transactions"},
            {"name": "record_data", "type": "json", "label": "Record Payload (JSON)", "required": True, "placeholder": "{\"name\": \"Acme Corp\", \"status\": \"New\"}"},
        ]
    },
    {
        "key": "db_update",
        "name": "Database Update Record",
        "category": "Database",
        "description": "Update specific fields on matching database records by ID or filter criteria.",
        "icon": "RefreshCw",
        "execution_type": "builtin",
        "parameters_schema": [
            {"name": "target_table", "type": "string", "label": "Target Table", "required": True, "placeholder": "users / bookings"},
            {"name": "record_id", "type": "string", "label": "Record ID / Key", "required": True, "placeholder": "1042"},
            {"name": "updates", "type": "json", "label": "Field Updates (JSON)", "required": True, "placeholder": "{\"status\": \"Confirmed\"}"},
        ]
    },
    {
        "key": "db_delete",
        "name": "Database Delete Record",
        "category": "Database",
        "description": "Safely soft-delete or remove records matching target filters.",
        "icon": "Trash2",
        "execution_type": "builtin",
        "parameters_schema": [
            {"name": "target_table", "type": "string", "label": "Target Table", "required": True, "placeholder": "audit_logs"},
            {"name": "record_id", "type": "string", "label": "Record ID", "required": True, "placeholder": "502"},
            {"name": "soft_delete", "type": "boolean", "label": "Soft Delete Flag", "default": "true"},
        ]
    },
    {
        "key": "db_backup",
        "name": "Database Snapshot Backup",
        "category": "Database",
        "description": "Trigger an automated point-in-time PostgreSQL / SQLite database backup snapshot.",
        "icon": "HardDrive",
        "execution_type": "builtin",
        "parameters_schema": [
            {"name": "backup_tag", "type": "string", "label": "Backup Tag / Label", "required": False, "placeholder": "pre_migration_backup"},
            {"name": "compress", "type": "boolean", "label": "GZip Compress Backup", "default": "true"},
        ]
    },
    {
        "key": "db_restore",
        "name": "Database Restore Snapshot",
        "category": "Database",
        "description": "Restore database state from a validated backup archive.",
        "icon": "RotateCcw",
        "execution_type": "builtin",
        "parameters_schema": [
            {"name": "backup_id", "type": "string", "label": "Backup Snapshot ID / File", "required": True, "placeholder": "snapshot_20260820_0200.sql.gz"},
        ]
    },

    # ── System ──
    {
        "key": "run_shell_script",
        "name": "Run Shell Script",
        "category": "System",
        "description": "Execute secure sandboxed bash/python scripts or system commands and capture outputs.",
        "icon": "Terminal",
        "execution_type": "script",
        "parameters_schema": [
            {"name": "script_command", "type": "string", "label": "Shell Command / Script", "required": True, "placeholder": "echo 'Process complete'"},
            {"name": "timeout_seconds", "type": "number", "label": "Timeout (seconds)", "default": "30"},
        ]
    },
    {
        "key": "restart_services",
        "name": "Restart Background Services",
        "category": "System",
        "description": "Restart specific worker daemons, Celery queues, or cache services.",
        "icon": "RefreshCcw",
        "execution_type": "builtin",
        "parameters_schema": [
            {"name": "service_name", "type": "select", "label": "Target Service", "options": ["redis_cache", "worker_queue", "database_pool", "api_gateway"], "default": "redis_cache"},
        ]
    },
    {
        "key": "clean_temp_files",
        "name": "Clean Temporary Files & Logs",
        "category": "System",
        "description": "Purge temporary storage artifacts, expired session caches, and scratch files.",
        "icon": "FolderArchive",
        "execution_type": "builtin",
        "parameters_schema": [
            {"name": "max_age_days", "type": "number", "label": "Delete Files Older Than (Days)", "default": "7"},
        ]
    },

    # ── Storage ──
    {
        "key": "storage_upload",
        "name": "Storage File Upload",
        "category": "Storage",
        "description": "Upload files or media attachments to S3, Google Cloud Storage, or local disk volume.",
        "icon": "UploadCloud",
        "execution_type": "builtin",
        "parameters_schema": [
            {"name": "file_path", "type": "string", "label": "Source File Path / URL", "required": True, "placeholder": "/tmp/exported_invoice.pdf"},
            {"name": "target_bucket", "type": "string", "label": "Destination Bucket / Directory", "required": True, "placeholder": "tenant-documents/2026"},
        ]
    },
    {
        "key": "storage_download",
        "name": "Storage File Download",
        "category": "Storage",
        "description": "Retrieve remote files or assets from cloud object storage.",
        "icon": "DownloadCloud",
        "execution_type": "builtin",
        "parameters_schema": [
            {"name": "file_url", "type": "string", "label": "Remote Storage URL / Key", "required": True, "placeholder": "s3://flowforge-vault/report.pdf"},
        ]
    },
    {
        "key": "storage_compress",
        "name": "Compress Files / Zip Archive",
        "category": "Storage",
        "description": "Compress files or entire directories into a password-protected or standard .zip archive.",
        "icon": "Archive",
        "execution_type": "builtin",
        "parameters_schema": [
            {"name": "target_paths", "type": "string", "label": "Files / Directories to Zip (comma-separated)", "required": True, "placeholder": "/uploads/invoices/*"},
            {"name": "archive_name", "type": "string", "label": "Output Archive Name", "required": True, "placeholder": "Invoices_Batch_August.zip"},
        ]
    },
    {
        "key": "storage_encrypt",
        "name": "Encrypt Data with AES-256",
        "category": "Storage",
        "description": "Encrypt sensitive customer documents or financial payloads using AES-256-GCM cipher.",
        "icon": "Lock",
        "execution_type": "builtin",
        "parameters_schema": [
            {"name": "input_file_or_text", "type": "string", "label": "File Path or Plaintext to Encrypt", "required": True, "placeholder": "confidential_client_data.csv"},
        ]
    },
    {
        "key": "storage_archive",
        "name": "Archive to Cold Storage",
        "category": "Storage",
        "description": "Move old tenant records and inactive storage files to low-cost archival storage.",
        "icon": "CloudOff",
        "execution_type": "builtin",
        "parameters_schema": [
            {"name": "organisation_name", "type": "string", "label": "Tenant Organization", "required": True, "placeholder": "All Tenants / Acme Corp"},
            {"name": "retention_months", "type": "number", "label": "Archive Records Older Than (Months)", "default": "12"},
        ]
    },
]


def _seed_default_actions_if_empty(db: Session):
    """Seed the default categorized action blocks if none exist."""
    count = db.query(ActionTemplate).count()
    if count == 0:
        for item in DEFAULT_ACTIONS:
            action = ActionTemplate(
                key=item["key"],
                name=item["name"],
                category=item["category"],
                description=item["description"],
                icon=item.get("icon", "Zap"),
                execution_type=item.get("execution_type", "builtin"),
                parameters_schema=item.get("parameters_schema", []),
                is_system=True,
                is_enabled=True,
            )
            db.add(action)
        db.commit()


# ── Endpoints ─────────────────────────────────────────────────────────────

@router.get(
    "/",
    response_model=List[ActionTemplateRead],
    summary="List all building blocks in the Actions Library",
)
def list_actions(
    category: Optional[str] = Query(None, description="Filter by category (Communication, Documents, Database, System, Storage)"),
    search: Optional[str] = Query(None, description="Search action name or description"),
    db: Session = Depends(get_db),
):
    """Retrieve all reusable action building blocks across categories."""
    _seed_default_actions_if_empty(db)
    query = db.query(ActionTemplate)
    if category and category.lower() != "all":
        query = query.filter(ActionTemplate.category.ilike(category))
    if search:
        query = query.filter(
            (ActionTemplate.name.ilike(f"%{search}%")) |
            (ActionTemplate.description.ilike(f"%{search}%")) |
            (ActionTemplate.key.ilike(f"%{search}%"))
        )
    return query.order_by(ActionTemplate.category.asc(), ActionTemplate.id.asc()).all()


@router.post(
    "/",
    response_model=ActionTemplateRead,
    dependencies=[Depends(require_role("superadmin"))],
    summary="Create and add a new action block to the library",
)
def create_action(
    payload: ActionTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Register a custom action block building block into the Actions Library."""
    existing = db.query(ActionTemplate).filter(ActionTemplate.key == payload.key).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Action with key '{payload.key}' already exists.")

    action = ActionTemplate(
        key=payload.key,
        name=payload.name,
        category=payload.category,
        description=payload.description,
        icon=payload.icon or "Zap",
        parameters_schema=payload.parameters_schema or [],
        execution_type=payload.execution_type,
        script_content=payload.script_content,
        is_system=False,
        is_enabled=True,
    )
    db.add(action)
    db.commit()
    db.refresh(action)

    write_log(
        db,
        action="action_block_created",
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        organisation_name="PLATFORM",
        resource_type="action_library",
        description=f"Created custom action building block '{action.name}' ({action.category})",
    )

    return action


@router.post(
    "/upload",
    response_model=dict,
    dependencies=[Depends(require_role("superadmin"))],
    summary="Upload an action block definition (JSON or Script file)",
)
async def upload_action_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a JSON blueprint file or Python/Shell action script to add to the library."""
    content = await file.read()
    filename = file.filename or "action.json"

    try:
        if filename.endswith(".json"):
            data = json.loads(content.decode("utf-8"))
            # Can be single action or list of actions
            items = data if isinstance(data, list) else [data]
            imported = 0
            for item in items:
                key = item.get("key", f"custom_action_{int(datetime.now().timestamp())}")
                existing = db.query(ActionTemplate).filter(ActionTemplate.key == key).first()
                if existing:
                    existing.name = item.get("name", existing.name)
                    existing.description = item.get("description", existing.description)
                    existing.parameters_schema = item.get("parameters_schema", existing.parameters_schema)
                    existing.execution_type = item.get("execution_type", existing.execution_type)
                    existing.script_content = item.get("script_content", existing.script_content)
                else:
                    action = ActionTemplate(
                        key=key,
                        name=item.get("name", "Custom Action Block"),
                        category=item.get("category", "Custom"),
                        description=item.get("description", ""),
                        icon=item.get("icon", "Zap"),
                        parameters_schema=item.get("parameters_schema", []),
                        execution_type=item.get("execution_type", "script"),
                        script_content=item.get("script_content"),
                        is_system=False,
                        is_enabled=True,
                    )
                    db.add(action)
                imported += 1
            db.commit()
            return {"message": f"Successfully uploaded and imported {imported} action building block(s).", "count": imported}

        else:
            # Script file (Python or Bash)
            script_text = content.decode("utf-8")
            base_name = filename.rsplit(".", 1)[0].replace("-", "_").lower()
            action = ActionTemplate(
                key=f"uploaded_{base_name}_{int(datetime.now().timestamp())}",
                name=f"Custom Script: {filename}",
                category="System",
                description=f"Uploaded script building block from {filename}",
                icon="Terminal",
                parameters_schema=[
                    {"name": "arguments", "type": "string", "label": "Script Arguments", "required": False, "placeholder": "--dry-run"}
                ],
                execution_type="script",
                script_content=script_text,
                is_system=False,
                is_enabled=True,
            )
            db.add(action)
            db.commit()
            db.refresh(action)
            return {"message": f"Successfully registered script action block '{action.name}'.", "action_id": action.id}

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse uploaded action file: {str(e)}")


@router.post(
    "/{action_id}/test",
    response_model=dict,
    dependencies=[Depends(require_role("superadmin"))],
    summary="Test execute an action building block with test parameters",
)
def test_action_execution(
    action_id: int,
    payload: TestActionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Simulate execution of an action block and return the output payload."""
    action = db.query(ActionTemplate).filter(ActionTemplate.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action block not found")

    import time
    start = time.time()
    result_details = {}

    # Category-specific simulated execution
    if action.category == "Communication":
        result_details = {
            "status": "DELIVERED",
            "provider": "FlowForge Notification Service",
            "recipient": payload.parameters.get("recipient_email") or payload.parameters.get("phone_number") or "test@domain.com",
            "message_id": f"msg_{int(time.time()*1000)}",
        }
    elif action.category == "Documents":
        result_details = {
            "status": "COMPILED",
            "document": payload.parameters.get("document_title") or "Document_Output.pdf",
            "file_size_bytes": 1048576,
            "pages": 3,
            "checksum": "sha256-e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        }
    elif action.category == "Database":
        result_details = {
            "status": "COMMITTED",
            "affected_rows": 1,
            "operation": action.key,
            "latency_ms": round((time.time() - start) * 1000, 2),
        }
    elif action.category == "System":
        result_details = {
            "status": "EXIT_SUCCESS",
            "exit_code": 0,
            "stdout": f"[FlowForge Engine] Executed {action.name} successfully at {datetime.now(timezone.utc).isoformat()}",
        }
    elif action.category == "Storage":
        result_details = {
            "status": "STORED",
            "storage_path": f"s3://flowforge-vault/{payload.parameters.get('archive_name') or 'data_payload.bin'}",
            "encryption": "AES-256-GCM",
            "etag": f"W/\"{int(time.time())}\"",
        }
    else:
        result_details = {
            "status": "COMPLETED",
            "output": f"Executed action {action.name} with {len(payload.parameters)} parameters.",
        }

    duration_ms = round((time.time() - start) * 1000, 2)

    return {
        "action_key": action.key,
        "action_name": action.name,
        "category": action.category,
        "execution_type": action.execution_type,
        "duration_ms": duration_ms,
        "result": result_details,
    }


@router.patch(
    "/{action_id}/toggle",
    response_model=dict,
    dependencies=[Depends(require_role("superadmin"))],
    summary="Enable or disable an action block for tenants",
)
def toggle_action_block(
    action_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Toggle whether this action block is available in tenant workflow builders."""
    action = db.query(ActionTemplate).filter(ActionTemplate.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action block not found")

    action.is_enabled = not action.is_enabled
    db.commit()

    return {
        "message": f"Action '{action.name}' is now {'enabled' if action.is_enabled else 'disabled'}.",
        "is_enabled": action.is_enabled,
    }


@router.delete(
    "/{action_id}",
    response_model=dict,
    dependencies=[Depends(require_role("superadmin"))],
    summary="Delete a custom action building block",
)
def delete_action_block(
    action_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a custom uploaded action block from the library."""
    action = db.query(ActionTemplate).filter(ActionTemplate.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action block not found")

    if action.is_system:
        raise HTTPException(status_code=400, detail="Cannot delete built-in system action templates.")

    name = action.name
    db.delete(action)
    db.commit()

    return {"message": f"Successfully removed action building block '{name}'."}


@router.get(
    "/export/bundle",
    response_model=List[dict],
    dependencies=[Depends(require_role("superadmin"))],
    summary="Export entire Actions Library as JSON bundle",
)
def export_actions_bundle(db: Session = Depends(get_db)):
    """Export all action templates for backup, migration, or sharing."""
    _seed_default_actions_if_empty(db)
    actions = db.query(ActionTemplate).all()
    return [
        {
            "key": a.key,
            "name": a.name,
            "category": a.category,
            "description": a.description,
            "icon": a.icon,
            "execution_type": a.execution_type,
            "parameters_schema": a.parameters_schema,
            "script_content": a.script_content,
        }
        for a in actions
    ]
