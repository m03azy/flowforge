import { API_BASE } from "../config/api";
import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  Info,
  Boxes,
} from "lucide-react";

import { getInstitutionTheme } from "../config/InstitutionTheme";

type TriggerForm = {
  event_type: string;
};

type ActionForm = {
  action_type: string;
  order: number;
  payload?: any;
};

type ActionTemplateItem = {
  id: number;
  key: string;
  name: string;
  category: string;
  description?: string;
  parameters_schema?: Array<{
    name: string;
    type: string;
    label: string;
    placeholder?: string;
    default?: string;
    required?: boolean;
    options?: string[];
  }>;
};

type Props = {
  token: string;
  onCreated: () => void;
  institutionType?: string;
};

const FALLBACK_ACTIONS: ActionTemplateItem[] = [
  // Communication
  { id: 1, key: "send_email", name: "Send Email Notification", category: "Communication", parameters_schema: [{ name: "recipient_email", type: "string", label: "Recipient Email", placeholder: "client@domain.com" }, { name: "subject", type: "string", label: "Email Subject", placeholder: "Update notification" }, { name: "body_html", type: "string", label: "Email Body", placeholder: "Hello..." }] },
  { id: 2, key: "send_sms", name: "Send SMS Message", category: "Communication", parameters_schema: [{ name: "phone_number", type: "string", label: "Phone Number", placeholder: "+1 555-0199" }, { name: "message_body", type: "string", label: "SMS Content", placeholder: "Verification..." }] },
  { id: 3, key: "send_whatsapp", name: "Send WhatsApp Message", category: "Communication", parameters_schema: [{ name: "phone_number", type: "string", label: "Phone Number", placeholder: "+1 555-0199" }, { name: "message_template", type: "string", label: "Message Content", placeholder: "Hello from FlowForge..." }] },
  { id: 4, key: "send_push_notification", name: "Send Push Notification", category: "Communication", parameters_schema: [{ name: "target_user_id", type: "string", label: "Target User", placeholder: "user_1029" }, { name: "title", type: "string", label: "Notification Title", placeholder: "Alert" }] },

  // Documents
  { id: 5, key: "generate_pdf", name: "Generate PDF Document", category: "Documents", parameters_schema: [{ name: "document_title", type: "string", label: "Document Title", placeholder: "Invoice_2026.pdf" }, { name: "template_type", type: "string", label: "Template Type", placeholder: "invoice" }] },
  { id: 6, key: "merge_documents", name: "Merge PDF Documents", category: "Documents", parameters_schema: [{ name: "source_files", type: "string", label: "Source Files", placeholder: "doc1.pdf, doc2.pdf" }] },
  { id: 7, key: "convert_csv_excel", name: "Convert CSV to Excel", category: "Documents", parameters_schema: [{ name: "csv_data", type: "string", label: "CSV Data", placeholder: "data.csv" }] },

  // Database
  { id: 8, key: "db_insert", name: "Database Insert Record", category: "Database", parameters_schema: [{ name: "target_table", type: "string", label: "Target Table", placeholder: "leads" }, { name: "record_data", type: "string", label: "Record JSON", placeholder: "{\"name\": \"Acme\"}" }] },
  { id: 9, key: "db_update", name: "Database Update Record", category: "Database", parameters_schema: [{ name: "target_table", type: "string", label: "Target Table", placeholder: "users" }, { name: "record_id", type: "string", label: "Record ID", placeholder: "101" }] },
  { id: 10, key: "db_delete", name: "Database Delete Record", category: "Database", parameters_schema: [{ name: "target_table", type: "string", label: "Target Table", placeholder: "audit_logs" }, { name: "record_id", type: "string", label: "Record ID", placeholder: "502" }] },
  { id: 11, key: "db_backup", name: "Database Snapshot Backup", category: "Database", parameters_schema: [{ name: "backup_tag", type: "string", label: "Backup Tag", placeholder: "daily_backup" }] },
  { id: 12, key: "db_restore", name: "Database Restore Snapshot", category: "Database", parameters_schema: [{ name: "backup_id", type: "string", label: "Snapshot ID", placeholder: "snapshot_01.sql" }] },

  // System
  { id: 13, key: "run_shell_script", name: "Run Shell Script", category: "System", parameters_schema: [{ name: "script_command", type: "string", label: "Shell Command", placeholder: "echo 'Executed'" }] },
  { id: 14, key: "restart_services", name: "Restart Background Services", category: "System", parameters_schema: [{ name: "service_name", type: "string", label: "Service", placeholder: "redis_cache" }] },
  { id: 15, key: "clean_temp_files", name: "Clean Temp Files & Logs", category: "System", parameters_schema: [{ name: "max_age_days", type: "string", label: "Max Age (Days)", placeholder: "7" }] },

  // Storage
  { id: 16, key: "storage_upload", name: "Storage File Upload", category: "Storage", parameters_schema: [{ name: "file_path", type: "string", label: "File Path", placeholder: "/tmp/doc.pdf" }, { name: "target_bucket", type: "string", label: "Bucket", placeholder: "vault" }] },
  { id: 17, key: "storage_download", name: "Storage File Download", category: "Storage", parameters_schema: [{ name: "file_url", type: "string", label: "Storage URL", placeholder: "s3://vault/file.pdf" }] },
  { id: 18, key: "storage_compress", name: "Compress Zip Archive", category: "Storage", parameters_schema: [{ name: "target_paths", type: "string", label: "Target Paths", placeholder: "/uploads/*" }] },
  { id: 19, key: "storage_encrypt", name: "Encrypt with AES-256", category: "Storage", parameters_schema: [{ name: "input_file_or_text", type: "string", label: "Input File", placeholder: "data.txt" }] },
  { id: 20, key: "storage_archive", name: "Archive to Cold Storage", category: "Storage", parameters_schema: [{ name: "retention_months", type: "string", label: "Retention Months", placeholder: "12" }] },
];

export default function CreateWorkflow({ token, onCreated, institutionType }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggers, setTriggers] = useState<TriggerForm[]>([]);
  const [actions, setActions] = useState<ActionForm[]>([]);
  const [actionLibrary, setActionLibrary] = useState<ActionTemplateItem[]>(FALLBACK_ACTIONS);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const theme = getInstitutionTheme(institutionType);
  const eventTypes = theme.workflowTriggers;

  // Load Action Blocks from Actions Library API
  useEffect(() => {
    fetch(`${API_BASE}/api/action-library/`)
      .then((res) => (res.ok ? res.json() : FALLBACK_ACTIONS))
      .then((data: ActionTemplateItem[]) => {
        if (data && data.length > 0) {
          setActionLibrary(data);
        }
      })
      .catch(() => setActionLibrary(FALLBACK_ACTIONS));
  }, []);

  const addTrigger = () => {
    setTriggers([...triggers, { event_type: eventTypes[0]?.value || "user_registered" }]);
  };

  const removeTrigger = (index: number) => {
    setTriggers(triggers.filter((_, i) => i !== index));
  };

  const updateTrigger = (index: number, event_type: string) => {
    const updated = [...triggers];
    updated[index].event_type = event_type;
    setTriggers(updated);
  };

  const addAction = () => {
    const defaultActionKey = actionLibrary[0]?.key || "send_email";
    setActions([...actions, {
      action_type: defaultActionKey,
      order: actions.length + 1,
      payload: {}
    }]);
  };

  const removeAction = (index: number) => {
    const filtered = actions.filter((_, i) => i !== index);
    const updated = filtered.map((act, i) => ({ ...act, order: i + 1 }));
    setActions(updated);
  };

  const updateAction = (index: number, action_type: string) => {
    const updated = [...actions];
    updated[index].action_type = action_type;
    updated[index].payload = {};
    setActions(updated);
  };

  const updateActionPayload = (index: number, key: string, value: string) => {
    const updated = [...actions];
    if (!updated[index].payload) updated[index].payload = {};
    updated[index].payload[key] = value;
    setActions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_BASE}/api/workflows/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description: description || null,
          triggers: triggers.map((t) => ({ event_type: t.event_type, condition: null })),
          actions: actions.map((a) => ({ action_type: a.action_type, payload: a.payload, order: a.order })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Failed to create workflow");

      setMessage({ type: "success", text: "Workflow created successfully with Actions Library blocks!" });
      setName("");
      setDescription("");
      setTriggers([]);
      setActions([]);
      
      onCreated();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Group actions by Category for the optgroup dropdown
  const categories = Array.from(new Set(actionLibrary.map((a) => a.category)));

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div className="p-2 bg-violet-50 dark:bg-violet-950/40 rounded-xl text-violet-600 dark:text-violet-400">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create New Workflow</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Build multi-step pipelines using reusable blocks from the Actions Library
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 text-sm rounded-2xl border ${
            message.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30"
              : "bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-400 border-red-100 dark:border-red-900/30"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Workflow Metadata */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Workflow Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. New Patient Document & Database Sync"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Brief summary of what this automated sequence executes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition-all resize-none"
            />
          </div>
        </div>

        {/* Triggers Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-violet-500" />
              Triggers
            </label>
            <button
              type="button"
              onClick={addTrigger}
              className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/30 dark:hover:bg-violet-950/60 px-2.5 py-1.5 rounded-lg border border-violet-100/50 dark:border-violet-900/30 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Trigger
            </button>
          </div>

          {triggers.length === 0 ? (
            <div className="flex items-center gap-2 p-4 bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-500 text-xs rounded-xl border border-slate-100 dark:border-slate-850 border-dashed">
              <Info className="h-4 w-4 text-slate-400 shrink-0" />
              <span>No triggers defined. The workflow will trigger on manual execution.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {triggers.map((trigger, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/60 dark:border-slate-800/80"
                >
                  <select
                    value={trigger.event_type}
                    onChange={(e) => updateTrigger(idx, e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-950 dark:text-slate-50 text-sm rounded-lg outline-none focus:ring-1 focus:ring-violet-500"
                  >
                    {eventTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeTrigger(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions Section — Powered by Actions Library */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Boxes className="h-4 w-4 text-amber-500" />
              Actions Sequence (From Actions Library)
            </label>
            <button
              type="button"
              onClick={addAction}
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/60 px-2.5 py-1.5 rounded-lg border border-amber-100/50 dark:border-amber-900/30 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Action Block
            </button>
          </div>

          {actions.length === 0 ? (
            <div className="flex items-center gap-2 p-4 bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-500 text-xs rounded-xl border border-slate-100 dark:border-slate-850 border-dashed">
              <Info className="h-4 w-4 text-slate-400 shrink-0" />
              <span>No action blocks added yet. Click &quot;Add Action Block&quot; to pick from Communication, Documents, Database, System, and Storage.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {actions.map((action, idx) => {
                const actionDef = actionLibrary.find((a) => a.key === action.action_type);
                const schema = actionDef?.parameters_schema || [];

                return (
                  <div
                    key={idx}
                    className="flex flex-col gap-3 p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/60 dark:border-slate-800/80"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 text-xs font-bold shrink-0">
                        {action.order}
                      </span>

                      {/* Categorized Dropdown */}
                      <select
                        value={action.action_type}
                        onChange={(e) => updateAction(idx, e.target.value)}
                        className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-950 dark:text-slate-50 text-sm font-semibold rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        {categories.map((cat) => (
                          <optgroup key={cat} label={`── ${cat} ──`}>
                            {actionLibrary
                              .filter((a) => a.category === cat)
                              .map((a) => (
                                <option key={a.key} value={a.key}>
                                  {a.name} ({a.key})
                                </option>
                              ))}
                          </optgroup>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => removeAction(idx)}
                        className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Action Description */}
                    {actionDef?.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 pl-8">
                        {actionDef.description}
                      </p>
                    )}

                    {/* Dynamic Action Parameter Inputs */}
                    {schema.length > 0 && (
                      <div className="pl-8 pr-2 grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {schema.map((param) => (
                          <div key={param.name} className={param.name.includes("body") || param.name.includes("script") ? "md:col-span-2" : ""}>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                              {param.label}
                            </label>
                            {param.name.includes("body") || param.name.includes("script") || param.type === "json" ? (
                              <textarea
                                rows={2}
                                placeholder={param.placeholder || param.name}
                                value={action.payload?.[param.name] || ""}
                                onChange={(e) => updateActionPayload(idx, param.name, e.target.value)}
                                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs rounded-lg outline-none focus:border-amber-500 font-mono resize-none"
                              />
                            ) : (
                              <input
                                type="text"
                                placeholder={param.placeholder || param.name}
                                value={action.payload?.[param.name] || ""}
                                onChange={(e) => updateActionPayload(idx, param.name, e.target.value)}
                                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs rounded-lg outline-none focus:border-amber-500"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-violet-500/20 hover:shadow-lg hover:shadow-violet-500/30 transition-all disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Save & Publish Workflow
          </button>
        </div>
      </form>
    </div>
  );
}
