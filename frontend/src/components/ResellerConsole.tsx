import { useState, useEffect, useCallback } from "react";
import {
  Crown,
  Building2,
  Users,
  Loader2,
  AlertCircle,
  LogOut,
  Plus,
  LayoutDashboard,
  Package,
  ShieldCheck,
  Activity,
  BarChart3,
  RefreshCw,
  Search,
  Settings,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Server,
  DollarSign,
  Megaphone,
  Trash2,
  Terminal,
  Eye,
  Building,
  GraduationCap,
  Hotel,
  Stethoscope,
  ShoppingCart,
  Clock,
  Play,
  UserPlus,
  Edit3,
  ToggleLeft,
  ToggleRight,
  Boxes,
  Upload,
  Download,
  FileText,
  Mail,
  Database,
  HardDrive,
  UploadCloud,
  Key,
  KeyRound,
  EyeOff,
  Copy,
  Check,
  Wifi,
  CreditCard,
  MessageSquare,
  Cpu,
  Cloud,
  Send,
  AtSign,
  Inbox,
  Radio
} from "lucide-react";

import { API_BASE } from "../config/api";

type Props = {
  token: string;
  userEmail: string;
  userName: string;
  onLogout: () => void;
  onImpersonate?: (token: string) => void;
};

type Stats = {
  total_tenants: number;
  total_users: number;
  active_tenants: number;
  suspended_tenants: number;
  plan_counts: { [key: string]: number };
  institution_type_counts: { [key: string]: number };
  recent_registrations: Array<{
    id: number;
    organisation_name: string;
    admin_email: string;
    admin_name: string;
    institution_type: string;
    subscription_plan: string;
    created_at: string;
  }>;
};

type Tenant = {
  organisation_name: string;
  institution_type: string;
  subscription_plan: string;
  total_users: number;
  active_users: number;
  admin_email: string;
  admin_name: string;
  admin_phone?: string | null;
  department?: string | null;
  job_title?: string | null;
  is_active: boolean;
  created_at: string;
};

type Purchase = {
  id: number;
  actor_email?: string;
  user_email?: string;
  organisation_name: string;
  action?: string;
  description?: string;
  plan?: string;
  amount?: number;
  status?: string;
  created_at?: string;
};

type Schedule = {
  id: number;
  name: string;
  description?: string | null;
  task_type: string;
  recurrence: string;
  cron_expression?: string | null;
  is_active: boolean;
  last_run_at?: string | null;
  last_status: string;
  last_result?: string | null;
  next_run_at?: string | null;
  created_at: string;
};

type ApiKey = {
  id: number;
  service_name: string;
  service_key: string;
  masked_value: string;
  description?: string | null;
  category: string;
  is_active: boolean;
  is_system: boolean;
  added_by?: string | null;
  created_at: string;
  updated_at: string;
};

type KnownService = {
  service_name: string;
  service_key: string;
  description: string;
  category: string;
};

type ResellerAdmin = {
  id: number;
  email: string;
  full_name?: string | null;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  created_at?: string | null;
};

type ActionBlock = {
  id: number;
  key: string;
  name: string;
  category: string;
  description?: string | null;
  icon?: string | null;
  parameters_schema?: Array<{
    name: string;
    type: string;
    label: string;
    placeholder?: string;
    default?: string;
    required?: boolean;
    options?: string[];
  }> | null;
  execution_type: string;
  script_content?: string | null;
  is_system: boolean;
  is_enabled: boolean;
  created_at: string;
};

const PLAN_COLORS: Record<string, string> = {
  starter: "text-slate-400 bg-slate-800/60 border-slate-700",
  professional: "text-blue-400 bg-blue-950/40 border-blue-800",
  enterprise: "text-amber-400 bg-amber-950/40 border-amber-800",
};

const PLAN_PRICES: Record<string, number> = {
  starter: 49,
  professional: 149,
  enterprise: 499,
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  Communication: { bg: "rgba(59, 130, 246, 0.12)", text: "#60a5fa", border: "rgba(59, 130, 246, 0.25)", glow: "rgba(59, 130, 246, 0.3)" },
  Documents: { bg: "rgba(168, 85, 247, 0.12)", text: "#c084fc", border: "rgba(168, 85, 247, 0.25)", glow: "rgba(168, 85, 247, 0.3)" },
  Database: { bg: "rgba(16, 185, 129, 0.12)", text: "#34d399", border: "rgba(16, 185, 129, 0.25)", glow: "rgba(16, 185, 129, 0.3)" },
  System: { bg: "rgba(245, 158, 11, 0.12)", text: "#fbbf24", border: "rgba(245, 158, 11, 0.25)", glow: "rgba(245, 158, 11, 0.3)" },
  Storage: { bg: "rgba(236, 72, 153, 0.12)", text: "#f472b6", border: "rgba(236, 72, 153, 0.25)", glow: "rgba(236, 72, 153, 0.3)" },
  Custom: { bg: "rgba(99, 102, 241, 0.12)", text: "#818cf8", border: "rgba(99, 102, 241, 0.25)", glow: "rgba(99, 102, 241, 0.3)" },
};

function getInstitutionIcon(type: string) {
  switch (type) {
    case "hospital": return Stethoscope;
    case "school": return GraduationCap;
    case "hotel": return Hotel;
    case "ecommerce": return ShoppingCart;
    default: return Building;
  }
}

function getActionCategoryIcon(cat: string) {
  switch (cat) {
    case "Communication": return Mail;
    case "Documents": return FileText;
    case "Database": return Database;
    case "System": return Terminal;
    case "Storage": return HardDrive;
    default: return Boxes;
  }
}

type NavSection = "overview" | "tenants" | "actions" | "schedules" | "billing" | "tasks" | "team" | "email" | "apikeys" | "settings";

export default function ResellerConsole({ token, userEmail, userName, onLogout, onImpersonate }: Props) {
  const [activeSection, setActiveSection] = useState<NavSection>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [admins, setAdmins] = useState<ResellerAdmin[]>([]);
  const [actions, setActions] = useState<ActionBlock[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [knownServices, setKnownServices] = useState<KnownService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [updatingOrg, setUpdatingOrg] = useState<string | null>(null);
  const [impersonatingOrg, setImpersonatingOrg] = useState<string | null>(null);

  // ── Actions Library State ──
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [testingAction, setTestingAction] = useState<ActionBlock | null>(null);
  const [testParams, setTestParams] = useState<Record<string, string>>({});
  const [testingLoading, setTestingLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Upload Action Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTab, setUploadTab] = useState<"file" | "manual">("file");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadingAction, setUploadingAction] = useState(false);

  // Manual Custom Action Builder
  const [manualKey, setManualKey] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualCategory, setManualCategory] = useState("Custom");
  const [manualDesc, setManualDesc] = useState("");
  const [manualExecType, setManualExecType] = useState("builtin");
  const [manualScript, setManualScript] = useState("");

  // ── Provision Tenant Modal ──
  const [showProvision, setShowProvision] = useState(false);
  const [provOrg, setProvOrg] = useState("");
  const [provEmail, setProvEmail] = useState("");
  const [provName, setProvName] = useState("");
  const [provPassword, setProvPassword] = useState("");
  const [provPhone, setProvPhone] = useState("");
  const [provDept, setProvDept] = useState("");
  const [provJobTitle, setProvJobTitle] = useState("");
  const [provType, setProvType] = useState("business");
  const [provPlan, setProvPlan] = useState("starter");
  const [provisioning, setProvisioning] = useState(false);

  // ── Edit Tenant Modal ──
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editOrgName, setEditOrgName] = useState("");
  const [editAdminName, setEditAdminName] = useState("");
  const [editAdminEmail, setEditAdminEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editType, setEditType] = useState("business");
  const [editPlan, setEditPlan] = useState("starter");
  const [editIsActive, setEditIsActive] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  // ── Add Schedule Modal ──
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [schedName, setSchedName] = useState("");
  const [schedDesc, setSchedDesc] = useState("");
  const [schedType, setSchedType] = useState("diagnostics");
  const [schedRecurrence, setSchedRecurrence] = useState("daily");
  const [schedCron, setSchedCron] = useState("0 0 * * *");
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [triggeringSchedId, setTriggeringSchedId] = useState<number | null>(null);

  // ── Add Reseller Admin Modal ──
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [adminFullName, setAdminFullName] = useState("");
  const [adminEmailInput, setAdminEmailInput] = useState("");
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [savingAdmin, setSavingAdmin] = useState(false);

  // ── API Keys State ──
  const [showAddKeyModal, setShowAddKeyModal] = useState(false);
  const [keyServiceName, setKeyServiceName] = useState("");
  const [keyServiceKey, setKeyServiceKey] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [keyDescription, setKeyDescription] = useState("");
  const [keyCategory, setKeyCategory] = useState("AI");
  const [savingKey, setSavingKey] = useState(false);
  const [deletingKeyId, setDeletingKeyId] = useState<number | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<number | null>(null);
  const [editingKeyId, setEditingKeyId] = useState<number | null>(null);
  const [editKeyValue, setEditKeyValue] = useState("");
  const [savingEditKey, setSavingEditKey] = useState(false);

  // ── Email State ──
  type EmailConfig = { sendgrid_configured: boolean; from_address: string; from_name: string; reply_to: string; app_url: string };
  const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null);
  const [emailTestTo, setEmailTestTo] = useState("");
  const [emailTestName, setEmailTestName] = useState("Test User");
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [emailBroadcastTitle, setEmailBroadcastTitle] = useState("");
  const [emailBroadcastBody, setEmailBroadcastBody] = useState("");
  const [emailBroadcastLevel, setEmailBroadcastLevel] = useState("info");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{ sent: number; failed: number } | null>(null);
  const [emailTab, setEmailTab] = useState<"config" | "test" | "broadcast" | "custom">("config");
  const [customTo, setCustomTo] = useState("");
  const [customToName, setCustomToName] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [sendingCustom, setSendingCustom] = useState(false);

  const authHeaders = { Authorization: `Bearer ${token}` };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [statsRes, tenantsRes, purchasesRes, schedulesRes, adminsRes, actionsRes, apiKeysRes, knownServicesRes, emailConfigRes] = await Promise.all([
        fetch(`${API_BASE}/api/superadmin/stats`, { headers: authHeaders }),
        fetch(`${API_BASE}/api/superadmin/tenants`, { headers: authHeaders }),
        fetch(`${API_BASE}/api/superadmin/package-purchases`, { headers: authHeaders }),
        fetch(`${API_BASE}/api/superadmin/schedules`, { headers: authHeaders }),
        fetch(`${API_BASE}/api/superadmin/reseller-admins`, { headers: authHeaders }),
        fetch(`${API_BASE}/api/action-library/`, { headers: authHeaders }),
        fetch(`${API_BASE}/api/api-keys/`, { headers: authHeaders }),
        fetch(`${API_BASE}/api/api-keys/services`, { headers: authHeaders }),
        fetch(`${API_BASE}/api/email/config`, { headers: authHeaders }),
      ]);

      if (!statsRes.ok || !tenantsRes.ok) throw new Error("Failed to load platform data");

      setStats(await statsRes.json());
      setTenants(await tenantsRes.json());
      setPurchases(purchasesRes.ok ? await purchasesRes.json() : []);
      setSchedules(schedulesRes.ok ? await schedulesRes.json() : []);
      setAdmins(adminsRes.ok ? await adminsRes.json() : []);
      setActions(actionsRes.ok ? await actionsRes.json() : []);
      setApiKeys(apiKeysRes.ok ? await apiKeysRes.json() : []);
      setKnownServices(knownServicesRes.ok ? await knownServicesRes.json() : []);
      setEmailConfig(emailConfigRes.ok ? await emailConfigRes.json() : null);
    } catch (e: any) {
      setError(e.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const flash = (type: "success" | "error", text: string) => {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 4000);
  };

  // ── Tenant Quick Actions ──
  const updatePlan = async (org: string, plan: string) => {
    setUpdatingOrg(org + plan);
    try {
      const res = await fetch(`${API_BASE}/api/superadmin/tenants/${encodeURIComponent(org)}/plan`, {
        method: "PATCH",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ subscription_plan: plan }),
      });
      if (!res.ok) throw new Error(await res.text());
      flash("success", `${org} upgraded to ${plan}`);
      fetchAll();
    } catch (e: any) {
      flash("error", e.message);
    } finally {
      setUpdatingOrg(null);
    }
  };

  const toggleStatus = async (org: string, active: boolean) => {
    setUpdatingOrg(org + "status");
    try {
      const res = await fetch(`${API_BASE}/api/superadmin/tenants/${encodeURIComponent(org)}/status`, {
        method: "PATCH",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !active }),
      });
      if (!res.ok) throw new Error(await res.text());
      flash("success", `${org} ${!active ? "activated" : "suspended"}`);
      fetchAll();
    } catch (e: any) {
      flash("error", e.message);
    } finally {
      setUpdatingOrg(null);
    }
  };

  const impersonate = async (org: string) => {
    setImpersonatingOrg(org);
    try {
      const res = await fetch(`${API_BASE}/api/superadmin/tenants/${encodeURIComponent(org)}/impersonate`, {
        method: "POST",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Impersonation failed");
      const data = await res.json();
      onImpersonate?.(data.access_token);
    } catch (e: any) {
      flash("error", e.message);
    } finally {
      setImpersonatingOrg(null);
    }
  };

  // ── Provision Tenant ──
  const provision = async () => {
    if (!provOrg || !provEmail || !provName || !provPassword) {
      flash("error", "Organization name, admin name, email, and password are required.");
      return;
    }
    setProvisioning(true);
    try {
      const res = await fetch(`${API_BASE}/api/superadmin/tenants/provision`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          organisation_name: provOrg,
          admin_email: provEmail,
          admin_name: provName,
          admin_password: provPassword,
          admin_phone: provPhone || null,
          department: provDept || null,
          job_title: provJobTitle || null,
          institution_type: provType,
          subscription_plan: provPlan,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to provision");
      }
      flash("success", `Tenant "${provOrg}" provisioned successfully`);
      setShowProvision(false);
      setProvOrg(""); setProvEmail(""); setProvName(""); setProvPassword("");
      setProvPhone(""); setProvDept(""); setProvJobTitle("");
      fetchAll();
    } catch (e: any) {
      flash("error", e.message);
    } finally {
      setProvisioning(false);
    }
  };

  // ── Edit Tenant ──
  const openEditTenant = (t: Tenant) => {
    setEditingTenant(t);
    setEditOrgName(t.organisation_name);
    setEditAdminName(t.admin_name || "");
    setEditAdminEmail(t.admin_email || "");
    setEditPhone(t.admin_phone || "");
    setEditDept(t.department || "");
    setEditJobTitle(t.job_title || "");
    setEditType(t.institution_type || "business");
    setEditPlan(t.subscription_plan || "starter");
    setEditIsActive(t.is_active);
  };

  const saveTenantEdit = async () => {
    if (!editingTenant) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`${API_BASE}/api/superadmin/tenants/${encodeURIComponent(editingTenant.organisation_name)}`, {
        method: "PUT",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          organisation_name: editOrgName,
          institution_type: editType,
          subscription_plan: editPlan,
          admin_name: editAdminName,
          admin_email: editAdminEmail,
          admin_phone: editPhone || null,
          department: editDept || null,
          job_title: editJobTitle || null,
          is_active: editIsActive,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to save tenant edits");
      }
      flash("success", `Updated details for "${editOrgName}"`);
      setEditingTenant(null);
      fetchAll();
    } catch (e: any) {
      flash("error", e.message);
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Actions Library Operations ──
  const toggleActionEnabled = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/action-library/${id}/toggle`, {
        method: "PATCH",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed to toggle action block");
      const data = await res.json();
      flash("success", data.message);
      fetchAll();
    } catch (e: any) {
      flash("error", e.message);
    }
  };

  const deleteActionBlock = async (id: number, name: string) => {
    if (!window.confirm(`Delete custom action building block "${name}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/action-library/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to delete action");
      }
      flash("success", `Removed "${name}" from Actions Library`);
      fetchAll();
    } catch (e: any) {
      flash("error", e.message);
    }
  };

  const openTestAction = (action: ActionBlock) => {
    setTestingAction(action);
    setTestResult(null);
    const defaults: Record<string, string> = {};
    action.parameters_schema?.forEach(p => {
      defaults[p.name] = p.default || (p.type === "json" ? "{}" : "");
    });
    setTestParams(defaults);
  };

  const runTestAction = async () => {
    if (!testingAction) return;
    setTestingLoading(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/action-library/${testingAction.id}/test`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ parameters: testParams }),
      });
      if (!res.ok) throw new Error("Test execution failed");
      const data = await res.json();
      setTestResult(data);
    } catch (e: any) {
      setTestResult({ error: e.message });
    } finally {
      setTestingLoading(false);
    }
  };

  const handleUploadAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadingAction(true);

    try {
      if (uploadTab === "file") {
        if (!uploadFile) {
          flash("error", "Please select a JSON blueprint or Python/Shell script file.");
          setUploadingAction(false);
          return;
        }
        const formData = new FormData();
        formData.append("file", uploadFile);

        const res = await fetch(`${API_BASE}/api/action-library/upload`, {
          method: "POST",
          headers: authHeaders,
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || "Failed to upload file");
        }
        const data = await res.json();
        flash("success", data.message);
      } else {
        // Manual creation
        if (!manualName.trim() || !manualKey.trim()) {
          flash("error", "Action key and name are required.");
          setUploadingAction(false);
          return;
        }
        const res = await fetch(`${API_BASE}/api/action-library/`, {
          method: "POST",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            key: manualKey,
            name: manualName,
            category: manualCategory,
            description: manualDesc,
            execution_type: manualExecType,
            script_content: manualScript || null,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || "Failed to create action block");
        }
        flash("success", `Created action block "${manualName}"`);
      }

      setShowUploadModal(false);
      setUploadFile(null);
      setManualKey(""); setManualName(""); setManualDesc(""); setManualScript("");
      fetchAll();
    } catch (e: any) {
      flash("error", e.message);
    } finally {
      setUploadingAction(false);
    }
  };

  const exportActionsLibrary = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/action-library/export/bundle`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed to export Actions Library");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FlowForge_Actions_Library_Bundle_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      flash("success", "Exported Actions Library JSON bundle");
    } catch (e: any) {
      flash("error", e.message);
    }
  };

  // ── Schedules Actions ──
  const triggerSchedule = async (id: number, name: string) => {
    setTriggeringSchedId(id);
    try {
      const res = await fetch(`${API_BASE}/api/superadmin/schedules/${id}/trigger`, {
        method: "POST",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed to trigger schedule");
      const data = await res.json();
      flash("success", `Triggered ${name}: ${data.result}`);
      fetchAll();
    } catch (e: any) {
      flash("error", e.message);
    } finally {
      setTriggeringSchedId(null);
    }
  };

  const toggleScheduleActive = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/superadmin/schedules/${id}/toggle`, {
        method: "PATCH",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed to toggle schedule");
      const data = await res.json();
      flash("success", data.message);
      fetchAll();
    } catch (e: any) {
      flash("error", e.message);
    }
  };

  const deleteSchedule = async (id: number) => {
    if (!window.confirm("Delete this automated schedule?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/superadmin/schedules/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed to delete schedule");
      flash("success", "Schedule deleted successfully");
      fetchAll();
    } catch (e: any) {
      flash("error", e.message);
    }
  };

  const createSchedule = async () => {
    if (!schedName.trim()) {
      flash("error", "Schedule name is required");
      return;
    }
    setSavingSchedule(true);
    try {
      const res = await fetch(`${API_BASE}/api/superadmin/schedules`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: schedName,
          description: schedDesc || null,
          task_type: schedType,
          recurrence: schedRecurrence,
          cron_expression: schedCron,
        }),
      });
      if (!res.ok) throw new Error("Failed to create schedule");
      flash("success", `Automated schedule "${schedName}" created`);
      setShowAddSchedule(false);
      setSchedName(""); setSchedDesc("");
      fetchAll();
    } catch (e: any) {
      flash("error", e.message);
    } finally {
      setSavingSchedule(false);
    }
  };

  // ── Reseller Team Actions ──
  const createAdmin = async () => {
    if (!adminEmailInput || !adminFullName || !adminPasswordInput) {
      flash("error", "All fields required for new Reseller Admin.");
      return;
    }
    setSavingAdmin(true);
    try {
      const res = await fetch(`${API_BASE}/api/superadmin/reseller-admins`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: adminFullName,
          email: adminEmailInput,
          password: adminPasswordInput,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to create admin");
      }
      const data = await res.json();
      flash("success", data.message);
      setShowAddAdmin(false);
      setAdminFullName(""); setAdminEmailInput(""); setAdminPasswordInput("");
      fetchAll();
    } catch (e: any) {
      flash("error", e.message);
    } finally {
      setSavingAdmin(false);
    }
  };

  const toggleAdminStatus = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/superadmin/reseller-admins/${id}/toggle-status`, {
        method: "PATCH",
        headers: authHeaders,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Action failed");
      }
      flash("success", "Admin status updated");
      fetchAll();
    } catch (e: any) {
      flash("error", e.message);
    }
  };

  const deleteAdmin = async (id: number, email: string) => {
    if (!window.confirm(`Are you sure you want to remove Reseller Admin "${email}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/superadmin/reseller-admins/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to delete admin");
      }
      flash("success", `Reseller Admin "${email}" removed`);
      fetchAll();
    } catch (e: any) {
      flash("error", e.message);
    }
  };

  const filteredTenants = tenants.filter(t =>
    !searchTerm ||
    t.organisation_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.admin_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredActions = actions.filter(a => {
    const matchesCat = selectedCategory === "All" || a.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = !searchTerm ||
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.description && a.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const mrr = tenants.reduce((sum, t) => sum + (PLAN_PRICES[t.subscription_plan] || 0), 0);

  const navItems: { id: NavSection; label: string; icon: any; badge?: number }[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "tenants", label: "Tenants Directory", icon: Building2 },
    { id: "actions", label: "Actions Library", icon: Boxes, badge: actions.length },
    { id: "schedules", label: "Scheduling & Cron", icon: Clock },
    { id: "billing", label: "Revenue & Billing", icon: DollarSign },
    { id: "tasks", label: "System Tasks", icon: Terminal },
    { id: "team", label: "Reseller Team", icon: ShieldCheck },
    { id: "email", label: "Email", icon: Mail },
    { id: "apikeys", label: "API Keys", icon: KeyRound, badge: apiKeys.length > 0 ? apiKeys.length : undefined },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div style={{ fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif" }}
      className="min-h-screen flex bg-[#0a0d14] text-slate-100">

      {/* ── Left Sidebar ── */}
      <aside className="w-[230px] flex-shrink-0 fixed inset-y-0 left-0 z-40 flex flex-col"
        style={{ background: "linear-gradient(180deg, #0d1117 0%, #0a0d14 100%)", borderRight: "1px solid rgba(255,255,255,0.06)" }}>

        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)", boxShadow: "0 0 16px rgba(245,158,11,0.4)" }}>
            <Crown className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">FlowForge</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#f59e0b" }}>Reseller Console</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-5 px-3 flex flex-col gap-1 overflow-y-auto">
          {navItems.map(({ id, label, icon: Icon, badge }) => (
            <button key={id} onClick={() => setActiveSection(id)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left"
              style={activeSection === id
                ? { background: "rgba(245,158,11,0.12)", color: "#f59e0b", borderLeft: "2px solid #f59e0b" }
                : { color: "rgba(255,255,255,0.45)", borderLeft: "2px solid transparent" }
              }
              onMouseEnter={e => { if (activeSection !== id) (e.currentTarget.style.color = "rgba(255,255,255,0.85)"); }}
              onMouseLeave={e => { if (activeSection !== id) (e.currentTarget.style.color = "rgba(255,255,255,0.45)"); }}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </div>
              {badge !== undefined && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-white/10 text-slate-300">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-3 p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "white" }}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{userName}</p>
              <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{userEmail}</p>
            </div>
            <button onClick={onLogout} title="Logout"
              className="p-1.5 rounded-md transition-colors flex-shrink-0"
              style={{ color: "rgba(255,255,255,0.3)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}>
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 ml-[230px] flex flex-col min-h-screen">

        {/* Top bar */}
        <header className="h-16 flex items-center justify-between px-8 flex-shrink-0 sticky top-0 z-30"
          style={{ background: "rgba(10,13,20,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div>
            <h1 className="text-base font-bold text-white">
              {navItems.find(n => n.id === activeSection)?.label}
            </h1>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Google Workspace Reseller Infrastructure</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Flash message */}
            {actionMsg && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={actionMsg.type === "success"
                  ? { background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }
                  : { background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                {actionMsg.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                {actionMsg.text}
              </div>
            )}

            <button onClick={fetchAll}
              className="p-2 rounded-lg transition-all"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "white")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            {activeSection === "actions" ? (
              <div className="flex items-center gap-2">
                <button onClick={exportActionsLibrary}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <Download className="w-3.5 h-3.5" />
                  Export Library
                </button>
                <button onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "white", boxShadow: "0 4px 12px rgba(245,158,11,0.3)" }}>
                  <Upload className="w-4 h-4" />
                  Upload Action Block
                </button>
              </div>
            ) : activeSection === "schedules" ? (
              <button onClick={() => setShowAddSchedule(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "white", boxShadow: "0 4px 12px rgba(245,158,11,0.3)" }}>
                <Plus className="w-4 h-4" />
                Add Schedule
              </button>
            ) : activeSection === "team" ? (
              <button onClick={() => setShowAddAdmin(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "white", boxShadow: "0 4px 12px rgba(245,158,11,0.3)" }}>
                <UserPlus className="w-4 h-4" />
                Add Reseller Admin
              </button>
            ) : (
              <button onClick={() => setShowProvision(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "white", boxShadow: "0 4px 12px rgba(245,158,11,0.3)" }}>
                <Plus className="w-4 h-4" />
                New Tenant
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#f59e0b" }} />
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Loading platform data...</p>
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 p-4 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}>
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          ) : (
            <>
              {/* ── OVERVIEW ── */}
              {activeSection === "overview" && stats && (
                <div className="space-y-8">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: "Total Tenants", value: stats.total_tenants, icon: Building2, color: "#6366f1", change: "Active Organizations" },
                      { label: "Monthly Revenue", value: `$${mrr.toLocaleString()}`, icon: DollarSign, color: "#10b981", change: "MRR estimate" },
                      { label: "Reusable Actions", value: actions.length, icon: Boxes, color: "#f59e0b", change: "In Actions Library" },
                      { label: "Total Users", value: stats.total_users, icon: Users, color: "#8b5cf6", change: "Across all orgs" },
                    ].map(({ label, value, icon: Icon, color, change }) => (
                      <div key={label} className="rounded-2xl p-5"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</p>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
                            <Icon className="w-4 h-4" style={{ color }} />
                          </div>
                        </div>
                        <p className="text-2xl font-bold text-white mb-1">{value}</p>
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{change}</p>
                      </div>
                    ))}
                  </div>

                  {/* Plan + Actions distribution */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <h3 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
                        <Package className="w-4 h-4" style={{ color: "#6366f1" }} /> Plan Distribution
                      </h3>
                      <div className="space-y-3">
                        {[
                          { key: "enterprise", label: "Enterprise ($499/mo)", color: "#f59e0b" },
                          { key: "professional", label: "Professional ($149/mo)", color: "#6366f1" },
                          { key: "starter", label: "Starter ($49/mo)", color: "#64748b" },
                        ].map(({ key, label, color }) => {
                          const count = stats.plan_counts[key] || 0;
                          const pct = stats.total_tenants > 0 ? Math.round((count / stats.total_tenants) * 100) : 0;
                          return (
                            <div key={key}>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>{label}</span>
                                <span className="text-xs font-bold" style={{ color }}>{count}</span>
                              </div>
                              <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                                <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <h3 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
                        <Boxes className="w-4 h-4" style={{ color: "#ec4899" }} /> Actions Library Categories
                      </h3>
                      <div className="space-y-3">
                        {["Communication", "Documents", "Database", "System", "Storage"].map(cat => {
                          const count = actions.filter(a => a.category.toLowerCase() === cat.toLowerCase()).length;
                          const Icon = getActionCategoryIcon(cat);
                          const col = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Custom;
                          return (
                            <div key={cat} className="flex items-center justify-between p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                              <div className="flex items-center gap-2.5">
                                <Icon className="w-4 h-4" style={{ color: col.text }} />
                                <span className="text-xs font-medium text-white">{cat}</span>
                              </div>
                              <span className="text-xs font-bold px-2 py-0.5 rounded-md" style={{ background: col.bg, color: col.text, border: `1px solid ${col.border}` }}>
                                {count} blocks
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Recent Registrations */}
                  <div className="rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Activity className="w-4 h-4" style={{ color: "#f59e0b" }} /> Recent Tenant Signups
                      </h3>
                    </div>
                    <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                      {stats.recent_registrations.slice(0, 5).map(reg => {
                        const Icon = getInstitutionIcon(reg.institution_type);
                        return (
                          <div key={reg.id} className="px-6 py-3.5 flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: "rgba(255,255,255,0.05)" }}>
                              <Icon className="w-4 h-4" style={{ color: "rgba(255,255,255,0.5)" }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{reg.organisation_name}</p>
                              <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{reg.admin_email}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${PLAN_COLORS[reg.subscription_plan] || PLAN_COLORS.starter}`}>
                              {reg.subscription_plan}
                            </span>
                            <span className="text-xs flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>
                              {new Date(reg.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── ACTIONS LIBRARY ── */}
              {activeSection === "actions" && (
                <div className="space-y-6">
                  {/* Actions Library Header / Filters */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Boxes className="w-4 h-4 text-amber-400" /> Actions Library — Reusable Building Blocks
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Modular automation blocks across Communication, Documents, Database, System, and Storage
                      </p>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {["All", "Communication", "Documents", "Database", "System", "Storage", "Custom"].map(cat => {
                        const active = selectedCategory.toLowerCase() === cat.toLowerCase();
                        return (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
                            style={active
                              ? { background: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "white", boxShadow: "0 2px 8px rgba(245,158,11,0.25)" }
                              : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }
                            }
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Search bar */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search action blocks (email, pdf, backup, shell)..."
                        className="w-full pl-9 pr-4 py-2 text-sm rounded-xl outline-none"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "white" }}
                      />
                    </div>
                    <span className="text-xs text-slate-400">
                      Showing {filteredActions.length} of {actions.length} action blocks
                    </span>
                  </div>

                  {/* Action Blocks Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredActions.map(action => {
                      const col = CATEGORY_COLORS[action.category] || CATEGORY_COLORS.Custom;
                      const Icon = getActionCategoryIcon(action.category);

                      return (
                        <div
                          key={action.id}
                          className="rounded-2xl p-5 flex flex-col justify-between transition-all relative group"
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            border: `1px solid ${col.border}`,
                          }}
                        >
                          <div>
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                  style={{ background: col.bg, border: `1px solid ${col.border}` }}>
                                  <Icon className="w-5 h-5" style={{ color: col.text }} />
                                </div>
                                <div>
                                  <h3 className="text-sm font-bold text-white">{action.name}</h3>
                                  <span className="text-[10px] font-mono text-slate-400">{action.key}</span>
                                </div>
                              </div>

                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider"
                                style={{ background: col.bg, color: col.text, border: `1px solid ${col.border}` }}
                              >
                                {action.category}
                              </span>
                            </div>

                            {/* Description */}
                            <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                              {action.description || "Reusable workflow building block."}
                            </p>

                            {/* Parameters preview */}
                            {action.parameters_schema && action.parameters_schema.length > 0 && (
                              <div className="mb-4 space-y-1.5">
                                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Input Parameters:</p>
                                <div className="flex flex-wrap gap-1">
                                  {action.parameters_schema.slice(0, 4).map((p, i) => (
                                    <span
                                      key={i}
                                      className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/5 font-mono"
                                    >
                                      {p.name}{p.required ? "*" : ""}
                                    </span>
                                  ))}
                                  {action.parameters_schema.length > 4 && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
                                      +{action.parameters_schema.length - 4} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Footer Actions */}
                          <div className="pt-3 border-t border-white/5 flex items-center justify-between mt-2">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${action.execution_type === 'script' ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-slate-400'}`}>
                                {action.execution_type}
                              </span>
                              {!action.is_system && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                                  Custom
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Test Run Button */}
                              <button
                                onClick={() => openTestAction(action)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" }}
                                title="Simulate / Test run this action"
                              >
                                <Play className="w-3 h-3" />
                                Test Run
                              </button>

                              {/* Toggle Enable Switch */}
                              <button
                                onClick={() => toggleActionEnabled(action.id)}
                                className="p-1.5 rounded-lg transition-all"
                                style={{ background: "rgba(255,255,255,0.06)", color: action.is_enabled ? "#f59e0b" : "rgba(255,255,255,0.3)" }}
                                title={action.is_enabled ? "Disable for tenants" : "Enable for tenants"}
                              >
                                {action.is_enabled ? <ToggleRight className="w-4 h-4 text-amber-400" /> : <ToggleLeft className="w-4 h-4" />}
                              </button>

                              {/* Delete (if custom) */}
                              {!action.is_system && (
                                <button
                                  onClick={() => deleteActionBlock(action.id, action.name)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                  title="Delete custom action"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── TENANTS DIRECTORY ── */}
              {activeSection === "tenants" && (
                <div className="space-y-5">
                  {/* Search and Action Header */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                      <input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search tenants or admin emails..."
                        className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl outline-none"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "white"
                        }}
                      />
                    </div>
                    <button onClick={() => setShowProvision(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                      style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "white" }}>
                      <Plus className="w-4 h-4" />
                      Provision New Tenant
                    </button>
                  </div>

                  {/* Table */}
                  <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="grid grid-cols-[1.2fr_110px_90px_90px_200px] gap-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider"
                      style={{ background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.35)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <span>Tenant & Primary Admin</span>
                      <span>Plan</span>
                      <span>Users</span>
                      <span>Status</span>
                      <span className="text-right">Actions</span>
                    </div>

                    {filteredTenants.length === 0 ? (
                      <div className="flex flex-col items-center py-16 gap-3">
                        <Building2 className="w-10 h-10" style={{ color: "rgba(255,255,255,0.1)" }} />
                        <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>No tenants found</p>
                      </div>
                    ) : (
                      <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                        {filteredTenants.map(tenant => {
                          const Icon = getInstitutionIcon(tenant.institution_type);
                          const isUpdating = updatingOrg?.startsWith(tenant.organisation_name);
                          const isImpersonating = impersonatingOrg === tenant.organisation_name;
                          return (
                            <div key={tenant.organisation_name}
                              className="grid grid-cols-[1.2fr_110px_90px_90px_200px] gap-4 items-center px-5 py-4 transition-colors"
                              style={{ background: "transparent" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>

                              {/* Tenant info */}
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                  style={{ background: "rgba(255,255,255,0.06)" }}>
                                  <Icon className="w-4 h-4" style={{ color: "rgba(255,255,255,0.6)" }} />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-white truncate">{tenant.organisation_name}</p>
                                    <span className="text-[10px] capitalize px-1.5 py-0.2 rounded bg-white/5 text-slate-400">
                                      {tenant.institution_type}
                                    </span>
                                  </div>
                                  <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
                                    {tenant.admin_name} • {tenant.admin_email}
                                  </p>
                                </div>
                              </div>

                              {/* Plan */}
                              <div>
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-wider ${PLAN_COLORS[tenant.subscription_plan] || PLAN_COLORS.starter}`}>
                                  {tenant.subscription_plan}
                                </span>
                              </div>

                              {/* Users */}
                              <div className="flex items-center gap-2">
                                <Users className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
                                <span className="text-sm text-white">{tenant.total_users}</span>
                              </div>

                              {/* Status */}
                              <div>
                                {tenant.is_active
                                  ? <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#10b981" }}>
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />Active
                                    </span>
                                  : <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#ef4444" }}>
                                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />Suspended
                                    </span>
                                }
                              </div>

                              {/* Actions */}
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Impersonate Workspace */}
                                <button
                                  onClick={() => impersonate(tenant.organisation_name)}
                                  disabled={isImpersonating}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                  style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.25)" }}
                                  title="Access workspace (Impersonation)"
                                >
                                  {isImpersonating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                                  Access
                                </button>

                                {/* Edit Tenant Form Button */}
                                <button
                                  onClick={() => openEditTenant(tenant)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.1)" }}
                                  title="Edit full tenant details"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  Edit
                                </button>

                                {/* Upgrade quick button */}
                                {tenant.subscription_plan !== "enterprise" && (
                                  <button
                                    onClick={() => {
                                      const next = tenant.subscription_plan === "starter" ? "professional" : "enterprise";
                                      updatePlan(tenant.organisation_name, next);
                                    }}
                                    disabled={isUpdating}
                                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                    style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}
                                    title="Upgrade plan"
                                  >
                                    {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowUpRight className="w-3 h-3" />}
                                  </button>
                                )}

                                {/* Suspend/activate toggle */}
                                <button
                                  onClick={() => toggleStatus(tenant.organisation_name, tenant.is_active)}
                                  disabled={isUpdating}
                                  className="p-1.5 rounded-lg transition-all"
                                  style={{ background: tenant.is_active ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)", color: tenant.is_active ? "#ef4444" : "#10b981" }}
                                  title={tenant.is_active ? "Suspend" : "Activate"}
                                >
                                  {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : (tenant.is_active ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />)}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── SCHEDULING AUTOMATION ── */}
              {activeSection === "schedules" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-white">Platform Automated Schedules</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Recurring cron tasks, maintenance routines, and automated billing triggers</p>
                    </div>
                    <button onClick={() => setShowAddSchedule(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                      style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "white" }}>
                      <Plus className="w-4 h-4" />
                      Add Schedule
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {schedules.map(sched => {
                      const isTriggering = triggeringSchedId === sched.id;
                      return (
                        <div key={sched.id} className="rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ background: sched.is_active ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.05)" }}>
                              <Clock className="w-5 h-5" style={{ color: sched.is_active ? "#f59e0b" : "rgba(255,255,255,0.3)" }} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <h3 className="text-sm font-bold text-white">{sched.name}</h3>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border border-amber-500/30 bg-amber-500/10 text-amber-400">
                                  {sched.recurrence}
                                </span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400">
                                  {sched.cron_expression || "0 0 * * *"}
                                </span>
                                {sched.last_status === "success" && (
                                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                                    <CheckCircle2 className="w-3 h-3" /> Last ran OK
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 mt-1 max-w-xl">{sched.description}</p>
                              {sched.last_result && (
                                <p className="text-[11px] font-mono text-emerald-400/90 mt-1.5 bg-black/30 px-2.5 py-1 rounded inline-block">
                                  Log: {sched.last_result}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end md:self-center">
                            <button
                              onClick={() => triggerSchedule(sched.id, sched.name)}
                              disabled={isTriggering}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                              style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}
                            >
                              {isTriggering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                              Run Now
                            </button>

                            <button
                              onClick={() => toggleScheduleActive(sched.id)}
                              className="p-1.5 rounded-lg transition-all"
                              style={{ background: "rgba(255,255,255,0.06)", color: sched.is_active ? "#f59e0b" : "rgba(255,255,255,0.3)" }}
                              title={sched.is_active ? "Pause schedule" : "Activate schedule"}
                            >
                              {sched.is_active ? <ToggleRight className="w-5 h-5 text-amber-400" /> : <ToggleLeft className="w-5 h-5" />}
                            </button>

                            <button
                              onClick={() => deleteSchedule(sched.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                              title="Delete schedule"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── RESELLER TEAM ADMINS ── */}
              {activeSection === "team" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-white">Reseller Superadmin Team</h2>
                      <p className="text-xs text-slate-400 mt-0.5">Manage users authorized to access the Master Reseller Platform Console</p>
                    </div>
                    <button onClick={() => setShowAddAdmin(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                      style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "white" }}>
                      <UserPlus className="w-4 h-4" />
                      Add Reseller Admin
                    </button>
                  </div>

                  <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="grid grid-cols-[1.5fr_120px_100px_140px] gap-4 px-6 py-3 text-[11px] font-semibold uppercase tracking-wider"
                      style={{ background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.35)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <span>Admin Member</span>
                      <span>Role</span>
                      <span>Status</span>
                      <span className="text-right">Actions</span>
                    </div>

                    <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                      {admins.map(admin => {
                        const isSelf = admin.email.toLowerCase() === userEmail.toLowerCase();
                        return (
                          <div key={admin.id} className="grid grid-cols-[1.5fr_120px_100px_140px] gap-4 items-center px-6 py-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "white" }}>
                                {(admin.full_name || admin.email).charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-white truncate">{admin.full_name || "Superadmin"}</p>
                                  {isSelf && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400">
                                      YOU
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs truncate text-slate-400">{admin.email}</p>
                              </div>
                            </div>

                            <div>
                              <span className="text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                Superadmin
                              </span>
                            </div>

                            <div>
                              {admin.is_active ? (
                                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Active
                                </span>
                              ) : (
                                <span className="text-xs text-red-400 font-medium flex items-center gap-1">
                                  <XCircle className="w-3 h-3" /> Inactive
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-end gap-2">
                              {!isSelf && (
                                <>
                                  <button
                                    onClick={() => toggleAdminStatus(admin.id)}
                                    className="p-1.5 rounded-lg text-xs font-medium transition-all"
                                    style={{ background: "rgba(255,255,255,0.06)", color: admin.is_active ? "#ef4444" : "#10b981" }}
                                    title={admin.is_active ? "Deactivate access" : "Activate access"}
                                  >
                                    {admin.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                  </button>

                                  <button
                                    onClick={() => deleteAdmin(admin.id, admin.email)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                    title="Delete admin account"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── REVENUE & BILLING ── */}
              {activeSection === "billing" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: "Monthly Recurring Revenue", value: `$${mrr.toLocaleString()}`, sub: "Estimated MRR", color: "#10b981" },
                      { label: "Annual Run Rate", value: `$${(mrr * 12).toLocaleString()}`, sub: "ARR projection", color: "#6366f1" },
                      { label: "Avg. Revenue / Tenant", value: `$${tenants.length > 0 ? Math.round(mrr / tenants.length) : 0}`, sub: "ARPU", color: "#f59e0b" },
                    ].map(({ label, value, sub, color }) => (
                      <div key={label} className="rounded-2xl p-6"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</p>
                        <p className="text-3xl font-bold mb-1" style={{ color }}>{value}</p>
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{sub}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" style={{ color: "#10b981" }} /> Package Purchase History
                      </h3>
                    </div>
                    {purchases.length === 0 ? (
                      <div className="flex items-center justify-center py-16 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                        No purchases recorded yet
                      </div>
                    ) : (
                      <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                        {purchases.slice(0, 20).map((p, i) => (
                          <div key={i} className="flex items-center px-6 py-3.5 gap-5">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: "rgba(16,185,129,0.1)" }}>
                              <DollarSign className="w-4 h-4" style={{ color: "#10b981" }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{p.organisation_name}</p>
                              <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                                {p.description || p.actor_email || p.user_email || p.action}
                              </p>
                            </div>
                            {p.plan && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${PLAN_COLORS[p.plan] || PLAN_COLORS.starter}`}>
                                {p.plan}
                              </span>
                            )}
                            {p.amount !== undefined && (
                              <span className="text-sm font-bold" style={{ color: "#10b981" }}>${p.amount}</span>
                            )}
                            <span className="text-xs flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>
                              {p.created_at ? new Date(p.created_at).toLocaleDateString() : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── SYSTEM TASKS ── */}
              {activeSection === "tasks" && (
                <SystemTasksPanel token={token} onFlash={flash} />
              )}

              {/* ── SETTINGS ── */}
              {/* ── EMAIL MANAGEMENT ── */}
              {activeSection === "email" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Mail className="w-4 h-4" style={{ color: "#6366f1" }} /> Email Management
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Configure SendGrid and send transactional, notification, and broadcast emails.</p>
                  </div>

                  {/* Email Tab Nav */}
                  <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    {(["config", "test", "broadcast", "custom"] as const).map(tab => (
                      <button key={tab} onClick={() => setEmailTab(tab)}
                        className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all"
                        style={emailTab === tab
                          ? { background: "rgba(99,102,241,0.2)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }
                          : { color: "rgba(255,255,255,0.4)" }}>
                        {tab === "config" ? "⚙️ Config" : tab === "test" ? "🧪 Send Test" : tab === "broadcast" ? "📡 Broadcast" : "✉️ Custom"}
                      </button>
                    ))}
                  </div>

                  {/* Config Status Tab */}
                  {emailTab === "config" && (
                    <div className="space-y-4">
                      {/* Status Card */}
                      <div className="rounded-2xl p-5" style={{
                        background: emailConfig?.sendgrid_configured ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
                        border: `1px solid ${emailConfig?.sendgrid_configured ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`
                      }}>
                        <div className="flex items-center gap-3 mb-3">
                          {emailConfig?.sendgrid_configured
                            ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            : <AlertCircle className="w-5 h-5 text-red-400" />}
                          <p className="text-sm font-semibold" style={{ color: emailConfig?.sendgrid_configured ? "#4ade80" : "#f87171" }}>
                            {emailConfig?.sendgrid_configured ? "SendGrid Connected" : "SendGrid Not Configured"}
                          </p>
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span style={{ color: "rgba(255,255,255,0.4)" }}>API Key:</span>
                            <span className="font-mono" style={{ color: "rgba(255,255,255,0.7)" }}>
                              {emailConfig?.sendgrid_configured ? "SG.••••••••••••••••" : "Not set"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span style={{ color: "rgba(255,255,255,0.4)" }}>From Address:</span>
                            <span className="font-mono" style={{ color: emailConfig?.from_address !== "Not configured" ? "rgba(255,255,255,0.8)" : "#f87171" }}>
                              {emailConfig?.from_address || "Not set"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span style={{ color: "rgba(255,255,255,0.4)" }}>Sender Name:</span>
                            <span style={{ color: "rgba(255,255,255,0.7)" }}>{emailConfig?.from_name}</span>
                          </div>
                          {emailConfig?.reply_to && (
                            <div className="flex justify-between">
                              <span style={{ color: "rgba(255,255,255,0.4)" }}>Reply-To:</span>
                              <span className="font-mono" style={{ color: "rgba(255,255,255,0.7)" }}>{emailConfig.reply_to}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Setup Instructions */}
                      {!emailConfig?.sendgrid_configured && (
                        <div className="rounded-2xl p-5 space-y-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#f59e0b" }}>Setup Instructions</p>
                          <ol className="text-xs space-y-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                            <li className="flex gap-2"><span className="text-amber-400 font-bold shrink-0">1.</span>
                              <span>Create a free SendGrid account at <span className="text-indigo-400 font-mono">https://sendgrid.com</span> (100 emails/day free)</span>
                            </li>
                            <li className="flex gap-2"><span className="text-amber-400 font-bold shrink-0">2.</span>
                              <span>Go to Settings → API Keys → Create API Key with "Mail Send" permissions</span>
                            </li>
                            <li className="flex gap-2"><span className="text-amber-400 font-bold shrink-0">3.</span>
                              <span>Go to Settings → Sender Authentication and verify your sender email address</span>
                            </li>
                            <li className="flex gap-2"><span className="text-amber-400 font-bold shrink-0">4.</span>
                              <span>Edit <span className="font-mono text-emerald-400">/var/www/html/flowforge/.env.backend</span> and fill in:</span>
                            </li>
                          </ol>
                          <div className="rounded-xl p-4 font-mono text-xs" style={{ background: "rgba(0,0,0,0.4)", color: "#86efac" }}>
                            <div>SENDGRID_API_KEY=SG.your_key_here</div>
                            <div>EMAIL_FROM_ADDRESS=noreply@yourdomain.com</div>
                            <div>EMAIL_FROM_NAME=Your Company Name</div>
                          </div>
                          <li className="flex gap-2 text-xs list-none" style={{ color: "rgba(255,255,255,0.6)" }}>
                            <span className="text-amber-400 font-bold shrink-0">5.</span>
                            <span>Run <span className="font-mono text-emerald-400">docker restart flowforge_backend</span> to apply changes</span>
                          </li>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Send Test Email Tab */}
                  {emailTab === "test" && (
                    <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p className="text-xs font-semibold text-white">Send a test email to verify your SendGrid configuration is working correctly.</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1 text-slate-400">Recipient Email *</label>
                          <input value={emailTestTo} onChange={e => setEmailTestTo(e.target.value)} placeholder="you@example.com" type="email"
                            className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1 text-slate-400">Recipient Name</label>
                          <input value={emailTestName} onChange={e => setEmailTestName(e.target.value)} placeholder="Test User"
                            className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                          />
                        </div>
                      </div>

                      {emailTestResult && (
                        <div className="rounded-xl p-3 flex items-center gap-2 text-sm" style={{
                          background: emailTestResult.success ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                          border: `1px solid ${emailTestResult.success ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                          color: emailTestResult.success ? "#4ade80" : "#f87171",
                        }}>
                          {emailTestResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                          {emailTestResult.message}
                        </div>
                      )}

                      <button
                        disabled={sendingTestEmail || !emailTestTo.trim()}
                        onClick={async () => {
                          setSendingTestEmail(true);
                          setEmailTestResult(null);
                          const r = await fetch(`${API_BASE}/api/email/test`, {
                            method: "POST",
                            headers: { ...authHeaders, "Content-Type": "application/json" },
                            body: JSON.stringify({ to_email: emailTestTo.trim(), to_name: emailTestName.trim() || "Test User" }),
                          });
                          setSendingTestEmail(false);
                          const data = await r.json();
                          setEmailTestResult({ success: r.ok, message: r.ok ? data.message : (data.detail || "Failed to send test email") });
                        }}
                        className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                        style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white" }}>
                        {sendingTestEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {sendingTestEmail ? "Sending…" : "Send Test Email"}
                      </button>
                    </div>
                  )}

                  {/* Broadcast Email Tab */}
                  {emailTab === "broadcast" && (
                    <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p className="text-xs font-semibold text-white">Send an announcement email to <strong>all tenant admin users</strong> across every organization.</p>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-slate-400">Broadcast Title *</label>
                        <input value={emailBroadcastTitle} onChange={e => setEmailBroadcastTitle(e.target.value)} placeholder="e.g. Platform Maintenance Notice"
                          className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-slate-400">Message *</label>
                        <textarea value={emailBroadcastBody} onChange={e => setEmailBroadcastBody(e.target.value)} rows={4}
                          placeholder="Write your broadcast message here…"
                          className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none resize-none"
                          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-slate-400">Priority Level</label>
                        <select value={emailBroadcastLevel} onChange={e => setEmailBroadcastLevel(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                          <option value="info">ℹ️ Info — General announcement</option>
                          <option value="warning">⚠️ Warning — Requires attention</option>
                          <option value="critical">🚨 Critical — Urgent action needed</option>
                        </select>
                      </div>

                      {broadcastResult && (
                        <div className="rounded-xl p-3 text-xs" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                          <span className="text-emerald-400 font-bold">✓ Broadcast sent!</span>
                          <span className="text-slate-400 ml-2">{broadcastResult.sent} delivered · {broadcastResult.failed} failed</span>
                        </div>
                      )}

                      <button
                        disabled={sendingBroadcast || !emailBroadcastTitle.trim() || !emailBroadcastBody.trim()}
                        onClick={async () => {
                          setSendingBroadcast(true);
                          setBroadcastResult(null);
                          const r = await fetch(`${API_BASE}/api/email/broadcast`, {
                            method: "POST",
                            headers: { ...authHeaders, "Content-Type": "application/json" },
                            body: JSON.stringify({ broadcast_title: emailBroadcastTitle, broadcast_body: emailBroadcastBody, level: emailBroadcastLevel }),
                          });
                          setSendingBroadcast(false);
                          if (r.ok) {
                            const data = await r.json();
                            setBroadcastResult({ sent: data.sent, failed: data.failed });
                            flash("success", `Broadcast email sent to ${data.sent} tenant admins`);
                            setEmailBroadcastTitle(""); setEmailBroadcastBody("");
                          } else {
                            const data = await r.json().catch(() => ({}));
                            flash("error", data.detail || "Broadcast failed");
                          }
                        }}
                        className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                        style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "white" }}>
                        {sendingBroadcast ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
                        {sendingBroadcast ? "Sending to all admins…" : "Send Broadcast Email"}
                      </button>
                    </div>
                  )}

                  {/* Custom Email Tab */}
                  {emailTab === "custom" && (
                    <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p className="text-xs font-semibold text-white">Send a one-off custom email to any recipient.</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1 text-slate-400">To Email *</label>
                          <input value={customTo} onChange={e => setCustomTo(e.target.value)} placeholder="recipient@example.com" type="email"
                            className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1 text-slate-400">To Name</label>
                          <input value={customToName} onChange={e => setCustomToName(e.target.value)} placeholder="Recipient Name"
                            className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-slate-400">Subject *</label>
                        <input value={customSubject} onChange={e => setCustomSubject(e.target.value)} placeholder="Email subject line"
                          className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1 text-slate-400">Message Body *</label>
                        <textarea value={customBody} onChange={e => setCustomBody(e.target.value)} rows={5}
                          placeholder="Enter your message here. You can use basic HTML like &lt;b&gt;, &lt;p&gt;, &lt;br/&gt;."
                          className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none resize-none font-mono"
                          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                        />
                      </div>
                      <button
                        disabled={sendingCustom || !customTo.trim() || !customSubject.trim() || !customBody.trim()}
                        onClick={async () => {
                          setSendingCustom(true);
                          const r = await fetch(`${API_BASE}/api/email/send-custom`, {
                            method: "POST",
                            headers: { ...authHeaders, "Content-Type": "application/json" },
                            body: JSON.stringify({ to_email: customTo.trim(), to_name: customToName.trim() || "User", subject: customSubject.trim(), body_html: customBody.trim() }),
                          });
                          setSendingCustom(false);
                          const data = await r.json().catch(() => ({}));
                          if (r.ok) {
                            flash("success", data.message || `Email sent to ${customTo}`);
                            setCustomTo(""); setCustomToName(""); setCustomSubject(""); setCustomBody("");
                          } else flash("error", data.detail || "Failed to send email");
                        }}
                        className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                        style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white" }}>
                        {sendingCustom ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {sendingCustom ? "Sending…" : "Send Email"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── API KEYS MANAGEMENT ── */}
              {activeSection === "apikeys" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                        <KeyRound className="w-4 h-4" style={{ color: "#f59e0b" }} /> Platform API Keys
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">Manage third-party integration keys for AI, email, SMS, payments, and storage services.</p>
                    </div>
                    <button onClick={() => setShowAddKeyModal(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                      style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "white" }}>
                      <Plus className="w-4 h-4" /> Add API Key
                    </button>
                  </div>

                  {/* Category legend */}
                  <div className="flex flex-wrap gap-2">
                    {["AI", "Email", "SMS", "Payment", "Storage", "General"].map(cat => {
                      const catIconMap: Record<string, any> = { AI: Cpu, Email: Mail, SMS: MessageSquare, Payment: CreditCard, Storage: Cloud, General: Wifi };
                      const CatIcon = catIconMap[cat] || Key;
                      const count = apiKeys.filter(k => k.category === cat).length;
                      return (
                        <div key={cat} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}>
                          <CatIcon className="w-3 h-3" />{cat} <span className="text-amber-400 font-bold">{count}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Keys list */}
                  {apiKeys.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 rounded-2xl"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <KeyRound className="w-10 h-10 mb-3" style={{ color: "rgba(255,255,255,0.15)" }} />
                      <p className="text-sm text-slate-400 font-medium">No API keys configured yet</p>
                      <p className="text-xs text-slate-500 mt-1">Click "Add API Key" to connect your first integration.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {["AI", "Email", "SMS", "Payment", "Storage", "General"].map(cat => {
                        const catKeys = apiKeys.filter(k => k.category === cat);
                        if (catKeys.length === 0) return null;
                        const catIconMap: Record<string, any> = { AI: Cpu, Email: Mail, SMS: MessageSquare, Payment: CreditCard, Storage: Cloud, General: Wifi };
                        const CatIcon = catIconMap[cat] || Key;
                        return (
                          <div key={cat}>
                            <div className="flex items-center gap-2 mb-2 px-1">
                              <CatIcon className="w-3.5 h-3.5 text-amber-400" />
                              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">{cat}</span>
                              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                            </div>
                            <div className="space-y-2">
                              {catKeys.map(k => (
                                <div key={k.id} className="rounded-xl p-4 flex items-center gap-4"
                                  style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${k.is_active ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.06)"}` }}>
                                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ background: k.is_active ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.06)" }}>
                                    <KeyRound className="w-4 h-4" style={{ color: k.is_active ? "#f59e0b" : "rgba(255,255,255,0.3)" }} />
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm font-semibold text-white">{k.service_name}</span>
                                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                                        style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)" }}>{k.service_key}</span>
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        k.is_active ? "text-emerald-400 bg-emerald-500/10" : "text-slate-500 bg-slate-800"
                                      }`}>{k.is_active ? "● Active" : "○ Inactive"}</span>
                                    </div>
                                    {/* Edit inline or show masked */}
                                    {editingKeyId === k.id ? (
                                      <div className="flex items-center gap-2 mt-2">
                                        <input
                                          type="password"
                                          value={editKeyValue}
                                          onChange={e => setEditKeyValue(e.target.value)}
                                          placeholder="Paste new key value…"
                                          className="flex-1 px-3 py-1.5 rounded-lg text-xs text-white outline-none font-mono"
                                          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(245,158,11,0.4)" }}
                                        />
                                        <button
                                          disabled={savingEditKey || !editKeyValue.trim()}
                                          onClick={async () => {
                                            setSavingEditKey(true);
                                            const r = await fetch(`${API_BASE}/api/api-keys/${k.id}`, {
                                              method: "PATCH",
                                              headers: { ...authHeaders, "Content-Type": "application/json" },
                                              body: JSON.stringify({ api_key_value: editKeyValue }),
                                            });
                                            setSavingEditKey(false);
                                            if (r.ok) {
                                              setEditingKeyId(null);
                                              setEditKeyValue("");
                                              const updated = await r.json();
                                              setApiKeys(prev => prev.map(x => x.id === k.id ? updated : x));
                                              flash("success", `Key for ${k.service_name} updated.`);
                                            } else flash("error", "Failed to update key.");
                                          }}
                                          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                                          style={{ background: "rgba(245,158,11,0.2)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
                                          {savingEditKey ? "Saving…" : "Save"}
                                        </button>
                                        <button onClick={() => { setEditingKeyId(null); setEditKeyValue(""); }}
                                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-all">
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-xs font-mono tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>{k.masked_value}</span>
                                      </div>
                                    )}
                                    {k.description && (
                                      <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>{k.description}</p>
                                    )}
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {/* Toggle active */}
                                    <button
                                      title={k.is_active ? "Disable key" : "Enable key"}
                                      onClick={async () => {
                                        const r = await fetch(`${API_BASE}/api/api-keys/${k.id}`, {
                                          method: "PATCH",
                                          headers: { ...authHeaders, "Content-Type": "application/json" },
                                          body: JSON.stringify({ is_active: !k.is_active }),
                                        });
                                        if (r.ok) {
                                          const updated = await r.json();
                                          setApiKeys(prev => prev.map(x => x.id === k.id ? updated : x));
                                        }
                                      }}
                                      className="p-1.5 rounded-lg transition-all hover:bg-white/10"
                                      style={{ color: k.is_active ? "#34d399" : "rgba(255,255,255,0.3)" }}>
                                      {k.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                    </button>
                                    {/* Rotate key */}
                                    <button
                                      title="Rotate / update key value"
                                      onClick={() => { setEditingKeyId(k.id); setEditKeyValue(""); }}
                                      className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 transition-all">
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                    {/* Delete */}
                                    <button
                                      title="Delete key"
                                      disabled={deletingKeyId === k.id}
                                      onClick={async () => {
                                        if (!window.confirm(`Delete the key for "${k.service_name}"?`)) return;
                                        setDeletingKeyId(k.id);
                                        const r = await fetch(`${API_BASE}/api/api-keys/${k.id}`, { method: "DELETE", headers: authHeaders });
                                        setDeletingKeyId(null);
                                        if (r.ok) {
                                          setApiKeys(prev => prev.filter(x => x.id !== k.id));
                                          flash("success", `Key for ${k.service_name} deleted.`);
                                        } else flash("error", "Failed to delete key.");
                                      }}
                                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                                      {deletingKeyId === k.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Known service templates (not yet configured) */}
                  {knownServices.filter(s => !apiKeys.find(k => k.service_key === s.service_key)).length > 0 && (
                    <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>Quick Add — Supported Services</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {knownServices.filter(s => !apiKeys.find(k => k.service_key === s.service_key)).map(svc => (
                          <button key={svc.service_key}
                            onClick={() => {
                              setKeyServiceName(svc.service_name);
                              setKeyServiceKey(svc.service_key);
                              setKeyDescription(svc.description);
                              setKeyCategory(svc.category);
                              setKeyValue("");
                              setShowAddKeyModal(true);
                            }}
                            className="flex items-start gap-3 p-3 rounded-xl text-left transition-all hover:border-amber-500/40"
                            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                            <Key className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
                            <div>
                              <p className="text-xs font-semibold text-white">{svc.service_name}</p>
                              <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{svc.description}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeSection === "settings" && (
                <div className="max-w-2xl space-y-6">
                  <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <h3 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" style={{ color: "#f59e0b" }} /> Active Reseller Session
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium mb-1.5 text-slate-400">Name</label>
                        <p className="text-sm text-white">{userName}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5 text-slate-400">Email</label>
                        <p className="text-sm text-white">{userEmail}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5 text-slate-400">Role</label>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider"
                          style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}>
                          Platform Superadmin
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl p-5" style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.12)" }}>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#f59e0b" }}>Quick access</h3>
                    <button onClick={() => setActiveSection("apikeys")}
                      className="flex items-center gap-3 w-full p-3 rounded-xl text-left transition-all hover:bg-white/5"
                      style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                      <KeyRound className="w-5 h-5" style={{ color: "#f59e0b" }} />
                      <div>
                        <p className="text-sm font-semibold text-white">API Keys Management</p>
                        <p className="text-[11px] text-slate-400">Configure Gemini AI, SendGrid, Twilio, Stripe & more</p>
                      </div>
                      <ArrowUpRight className="w-4 h-4 ml-auto text-slate-500" />
                    </button>
                  </div>

                  <div className="rounded-2xl p-6" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
                    <h3 className="text-sm font-semibold mb-3 text-red-400">Sign Out</h3>
                    <p className="text-xs mb-4 text-slate-400">
                      Logging out will terminate your reseller session.
                    </p>
                    <button onClick={onLogout}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                      style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ── Test Action Modal ── */}
      {testingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Play className="w-4 h-4 text-emerald-400" /> Test Execution: {testingAction.name}
                </h2>
                <p className="text-xs text-slate-400">Category: {testingAction.category} • Key: {testingAction.key}</p>
              </div>
              <button onClick={() => setTestingAction(null)} className="text-slate-500 hover:text-white text-lg">✕</button>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fill Test Parameters</p>
                {testingAction.parameters_schema?.map((p, idx) => (
                  <div key={idx}>
                    <label className="block text-xs font-medium mb-1 text-slate-300">
                      {p.label} {p.required && <span className="text-red-400">*</span>}
                    </label>
                    {p.type === "select" && p.options ? (
                      <select
                        value={testParams[p.name] || p.default || ""}
                        onChange={e => setTestParams({ ...testParams, [p.name]: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                      >
                        {p.options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={testParams[p.name] || ""}
                        onChange={e => setTestParams({ ...testParams, [p.name]: e.target.value })}
                        placeholder={p.placeholder || p.name}
                        className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                      />
                    )}
                  </div>
                ))}
              </div>

              {testResult && (
                <div className="p-4 rounded-xl space-y-2 bg-black/40 border border-white/10">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Simulation Result ({testResult.duration_ms}ms)
                    </span>
                    <span className="font-mono text-slate-400">{testResult.action_key}</span>
                  </div>
                  <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto p-2.5 rounded bg-black/50">
                    {JSON.stringify(testResult.result || testResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setTestingAction(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
                Close
              </button>
              <button onClick={runTestAction} disabled={testingLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "white" }}>
                {testingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Execute Simulation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Upload Action Block Modal ── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-amber-400" /> Upload Action Building Block
                </h2>
                <p className="text-xs text-slate-400">Import `.json` definitions or custom Python/Shell action scripts</p>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-500 hover:text-white text-lg">✕</button>
            </div>

            {/* Mode Switcher */}
            <div className="flex gap-2 p-1 rounded-xl bg-white/5 mb-5">
              <button
                type="button"
                onClick={() => setUploadTab("file")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${uploadTab === "file" ? "bg-amber-500 text-white" : "text-slate-400 hover:text-white"}`}
              >
                Upload File (.json / .py / .sh)
              </button>
              <button
                type="button"
                onClick={() => setUploadTab("manual")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${uploadTab === "manual" ? "bg-amber-500 text-white" : "text-slate-400 hover:text-white"}`}
              >
                Custom Script Builder
              </button>
            </div>

            <form onSubmit={handleUploadAction} className="space-y-4">
              {uploadTab === "file" ? (
                <div className="space-y-3">
                  <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 text-center hover:border-amber-500/50 transition-all cursor-pointer bg-white/2">
                    <input
                      type="file"
                      accept=".json,.py,.sh,.yaml,.txt"
                      onChange={e => setUploadFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="action-file-upload"
                    />
                    <label htmlFor="action-file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-white">
                        {uploadFile ? uploadFile.name : "Click to select a blueprint JSON or Script file"}
                      </p>
                      <p className="text-[10px] text-slate-500">Supports: .json (action templates) or .py / .sh scripts</p>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-slate-400">Action Key *</label>
                      <input
                        value={manualKey}
                        onChange={e => setManualKey(e.target.value)}
                        placeholder="custom_slack_alert"
                        className="w-full px-3 py-2 rounded-xl text-sm text-white font-mono outline-none"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-slate-400">Category</label>
                      <select
                        value={manualCategory}
                        onChange={e => setManualCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                      >
                        <option value="Communication">Communication</option>
                        <option value="Documents">Documents</option>
                        <option value="Database">Database</option>
                        <option value="System">System</option>
                        <option value="Storage">Storage</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-400">Action Display Name *</label>
                    <input
                      value={manualName}
                      onChange={e => setManualName(e.target.value)}
                      placeholder="Post Alert to Discord / Slack"
                      className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-400">Description</label>
                    <textarea
                      value={manualDesc}
                      onChange={e => setManualDesc(e.target.value)}
                      placeholder="Summary of what this building block performs..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none resize-none"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-400">Execution Runtime Type</label>
                    <select
                      value={manualExecType}
                      onChange={e => setManualExecType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      <option value="builtin">Builtin Python Routine</option>
                      <option value="script">Custom Python / Shell Script</option>
                      <option value="webhook">Outbound Webhook / API</option>
                      <option value="sql">Direct SQL Statement</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-400">Execution Script / Code</label>
                    <textarea
                      value={manualScript}
                      onChange={e => setManualScript(e.target.value)}
                      placeholder="# Python or Bash executable routine&#10;print('Action executed successfully')"
                      rows={4}
                      className="w-full px-3 py-2 rounded-xl text-xs text-white font-mono outline-none resize-none"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingAction}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "white" }}
                >
                  {uploadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Save to Actions Library
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Provision Tenant Modal ── */}
      {showProvision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-400" /> Provision New Tenant Organization
                </h2>
                <p className="text-xs mt-0.5 text-slate-400">Create workspace, allocate plan, and configure initial admin</p>
              </div>
              <button onClick={() => setShowProvision(false)} className="text-slate-500 hover:text-white text-lg">✕</button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-400">Organisation Name *</label>
                  <input value={provOrg} onChange={e => setProvOrg(e.target.value)} placeholder="Acme Hospital / Corp"
                    className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-400">Institution Domain Type</label>
                  <select value={provType} onChange={e => setProvType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <option value="business">Enterprise Business</option>
                    <option value="hospital">Hospital & Healthcare</option>
                    <option value="school">School & University</option>
                    <option value="hotel">Hotel & Hospitality</option>
                    <option value="ecommerce">E-Commerce & Retail</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-slate-400">Subscription Plan Package</label>
                <select value={provPlan} onChange={e => setProvPlan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <option value="starter">Starter Package ($49 / month)</option>
                  <option value="professional">Professional Package ($149 / month)</option>
                  <option value="enterprise">Enterprise Package ($499 / month)</option>
                </select>
              </div>

              <div className="pt-2 border-t border-white/5">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">Primary Administrator Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-400">Admin Full Name *</label>
                    <input value={provName} onChange={e => setProvName(e.target.value)} placeholder="Dr. Mosey Smith"
                      className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-400">Admin Email Address *</label>
                    <input value={provEmail} onChange={e => setProvEmail(e.target.value)} placeholder="admin@tenant.com"
                      className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-400">Admin Password *</label>
                  <input value={provPassword} onChange={e => setProvPassword(e.target.value)} type="password" placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-400">Phone Number (Optional)</label>
                  <input value={provPhone} onChange={e => setProvPhone(e.target.value)} placeholder="+1 555-0199"
                    className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-400">Department (Optional)</label>
                  <input value={provDept} onChange={e => setProvDept(e.target.value)} placeholder="Executive / Operations"
                    className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-400">Job Title (Optional)</label>
                  <input value={provJobTitle} onChange={e => setProvJobTitle(e.target.value)} placeholder="Chief Executive / Dean"
                    className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowProvision(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
                Cancel
              </button>
              <button onClick={provision} disabled={provisioning}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "white" }}>
                {provisioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Provision Tenant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Tenant Modal ── */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-amber-400" /> Edit Tenant: {editingTenant.organisation_name}
                </h2>
                <p className="text-xs mt-0.5 text-slate-400">Update organization settings, plan, and primary administrator</p>
              </div>
              <button onClick={() => setEditingTenant(null)} className="text-slate-500 hover:text-white text-lg">✕</button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-400">Organisation Name</label>
                  <input value={editOrgName} onChange={e => setEditOrgName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-400">Institution Domain Type</label>
                  <select value={editType} onChange={e => setEditType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <option value="business">Enterprise Business</option>
                    <option value="hospital">Hospital & Healthcare</option>
                    <option value="school">School & University</option>
                    <option value="hotel">Hotel & Hospitality</option>
                    <option value="ecommerce">E-Commerce & Retail</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-400">Subscription Plan</label>
                  <select value={editPlan} onChange={e => setEditPlan(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <option value="starter">Starter ($49/mo)</option>
                    <option value="professional">Professional ($149/mo)</option>
                    <option value="enterprise">Enterprise ($499/mo)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-400">Status</label>
                  <select value={editIsActive ? "active" : "suspended"} onChange={e => setEditIsActive(e.target.value === "active")}
                    className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <option value="active">Active (Access Enabled)</option>
                    <option value="suspended">Suspended (Access Blocked)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">Primary Admin Contact</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-400">Admin Name</label>
                    <input value={editAdminName} onChange={e => setEditAdminName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-400">Admin Email</label>
                    <input value={editAdminEmail} onChange={e => setEditAdminEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-400">Phone</label>
                  <input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+1..."
                    className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-400">Department</label>
                  <input value={editDept} onChange={e => setEditDept(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-400">Job Title</label>
                  <input value={editJobTitle} onChange={e => setEditJobTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingTenant(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
                Cancel
              </button>
              <button onClick={saveTenantEdit} disabled={savingEdit}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "white" }}>
                {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Automated Schedule Modal ── */}
      {showAddSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" /> Create Automated Schedule
                </h2>
                <p className="text-xs mt-0.5 text-slate-400">Configure recurring cron maintenance & billing triggers</p>
              </div>
              <button onClick={() => setShowAddSchedule(false)} className="text-slate-500 hover:text-white text-lg">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-slate-400">Schedule Name *</label>
                <input value={schedName} onChange={e => setSchedName(e.target.value)} placeholder="e.g. Daily Data Backup & Ledger Sync"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-slate-400">Task Routine Type</label>
                <select value={schedType} onChange={e => setSchedType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <option value="diagnostics">Database Diagnostics & Table Index Verification</option>
                  <option value="quota_sync">Tenant Quotas & Usage Synchronization</option>
                  <option value="purge_sessions">Stale Refresh Token & Session Purge</option>
                  <option value="billing_cycle">Billing Ledger & Invoicing Reconciliation</option>
                  <option value="custom_webhook">Custom Automation / Webhook Dispatch</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-400">Recurrence</label>
                  <select value={schedRecurrence} onChange={e => setSchedRecurrence(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-400">Cron Expression</label>
                  <input value={schedCron} onChange={e => setSchedCron(e.target.value)} placeholder="0 0 * * *"
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white font-mono outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-slate-400">Description (Optional)</label>
                <textarea value={schedDesc} onChange={e => setSchedDesc(e.target.value)} placeholder="Summary of what this routine accomplishes..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none resize-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddSchedule(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
                Cancel
              </button>
              <button onClick={createSchedule} disabled={savingSchedule}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "white" }}>
                {savingSchedule ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add API Key Modal ── */}
      {showAddKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-400" /> Add API Key
                </h2>
                <p className="text-xs mt-0.5 text-slate-400">Register a new third-party service integration key</p>
              </div>
              <button onClick={() => { setShowAddKeyModal(false); setKeyServiceName(""); setKeyServiceKey(""); setKeyValue(""); setKeyDescription(""); setKeyCategory("AI"); }} className="text-slate-500 hover:text-white text-lg">✕</button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-400">Service Name *</label>
                  <input value={keyServiceName} onChange={e => setKeyServiceName(e.target.value)} placeholder="e.g. Gemini AI"
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-slate-400">Category *</label>
                  <select value={keyCategory} onChange={e => setKeyCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    {["AI", "Email", "SMS", "Payment", "Storage", "General"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-slate-400">Environment Variable Key *</label>
                <input value={keyServiceKey} onChange={e => setKeyServiceKey(e.target.value.toUpperCase())} placeholder="e.g. GEMINI_API_KEY"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none font-mono"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-slate-400">API Key Value *</label>
                <input type="password" value={keyValue} onChange={e => setKeyValue(e.target.value)} placeholder="Paste your API key here…"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none font-mono"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(245,158,11,0.3)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-slate-400">Description (optional)</label>
                <input value={keyDescription} onChange={e => setKeyDescription(e.target.value)} placeholder="What this key is used for…"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAddKeyModal(false); setKeyServiceName(""); setKeyServiceKey(""); setKeyValue(""); setKeyDescription(""); setKeyCategory("AI"); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
                Cancel
              </button>
              <button
                disabled={savingKey || !keyServiceName.trim() || !keyServiceKey.trim() || !keyValue.trim()}
                onClick={async () => {
                  setSavingKey(true);
                  const r = await fetch(`${API_BASE}/api/api-keys/`, {
                    method: "POST",
                    headers: { ...authHeaders, "Content-Type": "application/json" },
                    body: JSON.stringify({
                      service_name: keyServiceName.trim(),
                      service_key: keyServiceKey.trim().toUpperCase(),
                      api_key_value: keyValue.trim(),
                      description: keyDescription.trim() || null,
                      category: keyCategory,
                    }),
                  });
                  setSavingKey(false);
                  if (r.ok) {
                    const newKey = await r.json();
                    setApiKeys(prev => [...prev.filter(k => k.service_key !== newKey.service_key), newKey]);
                    setShowAddKeyModal(false);
                    setKeyServiceName(""); setKeyServiceKey(""); setKeyValue(""); setKeyDescription(""); setKeyCategory("AI");
                    flash("success", `API key for "${newKey.service_name}" saved successfully.`);
                  } else {
                    const err = await r.json().catch(() => ({}));
                    flash("error", err.detail || "Failed to save API key.");
                  }
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "white" }}>
                {savingKey ? "Saving…" : "Save API Key"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Reseller Admin Modal ── */}
      {showAddAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-amber-400" /> Add Reseller Superadmin
                </h2>
                <p className="text-xs mt-0.5 text-slate-400">Grant full superadmin access to manage tenants and infrastructure</p>
              </div>
              <button onClick={() => setShowAddAdmin(false)} className="text-slate-500 hover:text-white text-lg">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-slate-400">Full Name *</label>
                <input value={adminFullName} onChange={e => setAdminFullName(e.target.value)} placeholder="Jane Doe"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-slate-400">Email Address *</label>
                <input value={adminEmailInput} onChange={e => setAdminEmailInput(e.target.value)} placeholder="partner.admin@flowforge.dev"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-slate-400">Password *</label>
                <input value={adminPasswordInput} onChange={e => setAdminPasswordInput(e.target.value)} type="password" placeholder="••••••••"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddAdmin(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
                Cancel
              </button>
              <button onClick={createAdmin} disabled={savingAdmin}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "white" }}>
                {savingAdmin ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Create Superadmin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── System Tasks Sub-panel ──
function SystemTasksPanel({ token, onFlash }: { token: string; onFlash: (t: "success" | "error", m: string) => void }) {
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [running, setRunning] = useState<string | null>(null);

  const run = async (taskKey: string, endpoint: string, body?: object) => {
    setRunning(taskKey);
    try {
      const res = await fetch(`${API_BASE}/api/superadmin/tasks/${endpoint}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error("Task failed");
      const data = await res.json();
      onFlash("success", data.message || "Task completed successfully");
    } catch (e: any) {
      onFlash("error", e.message);
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
          <Megaphone className="w-4 h-4" style={{ color: "#6366f1" }} /> Broadcast Announcement
        </h3>
        <textarea
          value={broadcastMsg}
          onChange={e => setBroadcastMsg(e.target.value)}
          placeholder="Enter a message to broadcast to all tenant workspaces..."
          rows={3}
          className="w-full px-4 py-3 rounded-xl text-sm resize-none outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
        />
        <button
          onClick={() => run("broadcast", "broadcast", { message: broadcastMsg })}
          disabled={running === "broadcast" || !broadcastMsg.trim()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: "rgba(99,102,241,0.2)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }}>
          {running === "broadcast" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
          Send Broadcast
        </button>
      </div>

      {[
        { key: "diagnostics", label: "Run System Diagnostics", desc: "Checks PostgreSQL latency, Redis queues, and table record counts", icon: Server, color: "#10b981", endpoint: "diagnostics" },
        { key: "purge", label: "Purge All Inactive Sessions", desc: "Invalidates revoked refresh tokens platform-wide to free memory", icon: Trash2, color: "#ef4444", endpoint: "purge-sessions" },
      ].map(({ key, label, desc, icon: Icon, color, endpoint }) => (
        <div key={key} className="rounded-2xl p-5 flex items-center gap-4"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}18` }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{label}</p>
            <p className="text-xs mt-0.5 text-slate-400">{desc}</p>
          </div>
          <button onClick={() => run(key, endpoint)} disabled={running === key}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
            {running === key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Terminal className="w-3.5 h-3.5" />}
            Run
          </button>
        </div>
      ))}
    </div>
  );
}
