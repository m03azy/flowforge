import { useState, useEffect } from "react";
import {
  Crown,
  Building2,
  Users,
  ShieldAlert,
  ShieldCheck,
  Zap,
  TrendingUp,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  Building,
  GraduationCap,
  Hotel,
  Stethoscope,
  ShoppingCart,
  Megaphone,
  Activity,
  Trash2,
  Terminal
} from "lucide-react";
import { API_BASE } from "../config/api";

type Props = {
  token: string;
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
  is_active: boolean;
  created_at: string;
};

export default function SuperAdminDashboard({ token, onImpersonate }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [packagePurchases, setPackagePurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal / Plan / Status edit state
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [updatingPlan, setUpdatingPlan] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Reseller Provision Modal State
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [provOrg, setProvOrg] = useState("");
  const [provEmail, setProvEmail] = useState("");
  const [provName, setProvName] = useState("");
  const [provPassword, setProvPassword] = useState("");
  const [provInstType, setProvInstType] = useState("business");
  const [provPlan, setProvPlan] = useState("starter");
  const [provisioning, setProvisioning] = useState(false);

  const handleProvisionTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvisioning(true);
    setActionMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/superadmin/tenants/provision`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organisation_name: provOrg,
          admin_email: provEmail,
          admin_name: provName,
          admin_password: provPassword,
          institution_type: provInstType,
          subscription_plan: provPlan,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to provision tenant");

      setActionMsg({ type: "success", text: `🏢 Provisioned new tenant '${provOrg}' (${provEmail})` });
      setShowProvisionModal(false);
      setProvOrg("");
      setProvEmail("");
      setProvName("");
      setProvPassword("");
      fetchData();
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message });
    } finally {
      setProvisioning(false);
    }
  };

  const handleImpersonateTenant = async (orgName: string) => {
    setActionMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/superadmin/tenants/${encodeURIComponent(orgName)}/impersonate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Impersonation failed");

      if (data.access_token && onImpersonate) {
        setActionMsg({ type: "success", text: `🔑 Switching to workspace: ${orgName}` });
        onImpersonate(data.access_token);
      }
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message });
    }
  };

  const handlePromoteMe = async () => {
    setActionMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/superadmin/promote-me`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Promotion failed");

      setActionMsg({ type: "success", text: "👑 Account promoted to Superadmin! Refreshing session..." });
      if (data.new_token && onImpersonate) {
        onImpersonate(data.new_token);
      }
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message });
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [statsRes, tenantsRes, purchasesRes] = await Promise.all([
        fetch(`${API_BASE}/api/superadmin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/superadmin/tenants`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/superadmin/package-purchases`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!statsRes.ok || !tenantsRes.ok) {
        throw new Error("Failed to load superadmin metrics");
      }

      const statsData = await statsRes.json();
      const tenantsData = await tenantsRes.json();
      const purchasesData = purchasesRes.ok ? await purchasesRes.json() : [];

      setStats(statsData);
      setTenants(tenantsData);
      setPackagePurchases(purchasesData);
    } catch (err: any) {
      setError(err.message || "Error connecting to superadmin API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleUpdatePlan = async (tenantName: string, plan: string) => {
    setUpdatingPlan(true);
    setActionMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/superadmin/tenants/${encodeURIComponent(tenantName)}/plan`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscription_plan: plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to update plan");

      setActionMsg({ type: "success", text: `Updated ${tenantName} plan to ${plan.toUpperCase()}` });
      fetchData();
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message });
    } finally {
      setUpdatingPlan(false);
    }
  };

  // Special Task state
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastLevel, setBroadcastLevel] = useState<"info" | "warning" | "critical">("info");
  const [broadcasting, setBroadcasting] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any | null>(null);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);
  const [purgingSessions, setPurgingSessions] = useState(false);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    setBroadcasting(true);
    setActionMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/superadmin/tasks/broadcast`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: broadcastMessage, level: broadcastLevel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Broadcast failed");
      setActionMsg({ type: "success", text: "📢 Broadcast sent across all active tenant workspaces!" });
      setBroadcastMessage("");
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message });
    } finally {
      setBroadcasting(false);
    }
  };

  const handleRunDiagnostics = async () => {
    setRunningDiagnostics(true);
    setActionMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/superadmin/tasks/diagnostics`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Diagnostics failed");
      setDiagnostics(data);
      setActionMsg({ type: "success", text: `⚡ System Diagnostics Complete: DB Latency ${data.db_latency_ms}ms` });
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message });
    } finally {
      setRunningDiagnostics(false);
    }
  };

  const handlePurgeSessions = async () => {
    setPurgingSessions(true);
    setActionMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/superadmin/tasks/purge-sessions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Session purge failed");
      setActionMsg({ type: "success", text: `🧹 ${data.message}` });
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message });
    } finally {
      setPurgingSessions(false);
    }
  };

  const handleToggleStatus = async (tenantName: string, currentStatus: boolean) => {
    setUpdatingStatus(true);
    setActionMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/superadmin/tenants/${encodeURIComponent(tenantName)}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to update status");

      setActionMsg({
        type: "success",
        text: `${tenantName} has been ${!currentStatus ? "Activated" : "Suspended"}`,
      });
      fetchData();
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getInstitutionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "hospital":
        return <Stethoscope className="h-4 w-4 text-teal-500" />;
      case "school":
        return <GraduationCap className="h-4 w-4 text-blue-500" />;
      case "hotel":
        return <Hotel className="h-4 w-4 text-amber-500" />;
      case "ecommerce":
        return <ShoppingCart className="h-4 w-4 text-emerald-500" />;
      default:
        return <Building className="h-4 w-4 text-violet-500" />;
    }
  };

  const filteredTenants = tenants.filter(
    (t) =>
      t.organisation_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.admin_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.admin_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Estimate MRR (Starter: $49, Pro: $149, Enterprise: $499)
  const mrrEstimate =
    ((stats?.plan_counts?.starter || 0) * 49) +
    ((stats?.plan_counts?.professional || 0) * 149) +
    ((stats?.plan_counts?.enterprise || 0) * 499);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-amber-900/40 via-violet-900/40 to-slate-900 border border-amber-500/20 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 shrink-0">
            <Crown className="h-8 w-8 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white tracking-tight">Platform Master Console</h1>
              <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-full">
                Google Workspace Reseller Mode
              </span>
            </div>
            <p className="text-sm text-slate-300 mt-1">
              Multi-Tenant Oversight • Provision Organizations, Impersonate Workspaces &amp; Manage Accounts
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowProvisionModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <span>+ Provision New Tenant</span>
          </button>
          <button
            onClick={handlePromoteMe}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold rounded-xl border border-amber-500/30 transition-all shadow-sm cursor-pointer"
            title="Make current account Superadmin"
          >
            <Crown className="h-4 w-4" />
            <span>Make Me Superadmin</span>
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl border border-white/10 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {actionMsg && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl text-sm font-medium border ${
            actionMsg.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
          }`}
        >
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="font-bold underline text-xs">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm rounded-xl">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Tenants</span>
            <Building2 className="h-5 w-5 text-violet-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {stats?.total_tenants || 0}
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            {stats?.active_tenants || 0} active organizations
          </p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Platform Users</span>
            <Users className="h-5 w-5 text-blue-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {stats?.total_users || 0}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Across all tenant workspaces
          </p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Est. Monthly Revenue</span>
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            ${mrrEstimate.toLocaleString()} <span className="text-xs text-slate-400 font-normal">/mo</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Based on active tenant plans
          </p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Suspended Tenants</span>
            <ShieldAlert className="h-5 w-5 text-red-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {stats?.suspended_tenants || 0}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Require admin review
          </p>
        </div>
      </div>

      {/* Subscription Breakdown & Institution Type Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tier Distribution */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" /> Subscription Tier Breakdown
          </h3>
          <div className="space-y-3">
            {[
              { id: "starter", name: "Starter Plan ($49/mo)", count: stats?.plan_counts?.starter || 0, color: "bg-blue-500" },
              { id: "professional", name: "Professional Plan ($149/mo)", count: stats?.plan_counts?.professional || 0, color: "bg-violet-500" },
              { id: "enterprise", name: "Enterprise Plan ($499/mo)", count: stats?.plan_counts?.enterprise || 0, color: "bg-amber-500" },
            ].map((tier) => {
              const pct = stats?.total_tenants ? Math.round((tier.count / stats.total_tenants) * 100) : 0;
              return (
                <div key={tier.id} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700 dark:text-slate-300">{tier.name}</span>
                    <span className="text-slate-500">{tier.count} tenants ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${tier.color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Institution Domain Distribution */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-4 w-4 text-violet-500" /> Tenant Institution Domains
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { type: "business", label: "Enterprise", count: stats?.institution_type_counts?.business || 0 },
              { type: "ecommerce", label: "E-Commerce", count: stats?.institution_type_counts?.ecommerce || 0 },
              { type: "hospital", label: "Healthcare", count: stats?.institution_type_counts?.hospital || 0 },
              { type: "school", label: "Academy", count: stats?.institution_type_counts?.school || 0 },
              { type: "hotel", label: "Hospitality", count: stats?.institution_type_counts?.hotel || 0 },
            ].map((domain) => (
              <div
                key={domain.type}
                className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800"
              >
                {getInstitutionIcon(domain.type)}
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">{domain.label}</div>
                  <div className="text-[11px] text-slate-500">{domain.count} organizations</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Special Tasks & Executive Command Center */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Special Tasks &amp; Command Center</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Execute platform-wide administrative actions, system diagnostics, and global announcements
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-full">
            Executive Controls
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Task 1: Global Announcement Broadcast */}
          <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                <Megaphone className="h-4 w-4 text-violet-500" />
                <span>1. Broadcast Platform Notice</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Send an active notification banner to all logged-in tenant users across the system.
              </p>
            </div>
            <form onSubmit={handleBroadcast} className="space-y-3">
              <input
                type="text"
                placeholder="e.g. Scheduled maintenance tonight at 02:00 UTC"
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs rounded-xl text-slate-900 dark:text-white outline-none focus:border-violet-500"
              />
              <div className="flex gap-2">
                <select
                  value={broadcastLevel}
                  onChange={(e) => setBroadcastLevel(e.target.value as any)}
                  className="px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs rounded-xl text-slate-700 dark:text-slate-300 outline-none"
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
                <button
                  type="submit"
                  disabled={broadcasting || !broadcastMessage.trim()}
                  className="flex-1 py-1.5 px-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {broadcasting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Broadcast Now"}
                </button>
              </div>
            </form>
          </div>

          {/* Task 2: Instant Diagnostics */}
          <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                <Activity className="h-4 w-4 text-emerald-500" />
                <span>2. Run System &amp; DB Diagnostics</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Measure database query latency, active connections, and system integrity status.
              </p>
              {diagnostics && (
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs space-y-1 text-emerald-800 dark:text-emerald-300 font-mono">
                  <div>Status: {diagnostics.status} ({diagnostics.database})</div>
                  <div>Latency: {diagnostics.db_latency_ms}ms</div>
                  <div>Users: {diagnostics.total_registered_users} | Events: {diagnostics.total_audit_events}</div>
                </div>
              )}
            </div>
            <button
              onClick={handleRunDiagnostics}
              disabled={runningDiagnostics}
              className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {runningDiagnostics ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Run Diagnostics Test"}
            </button>
          </div>

          {/* Task 3: Purge Expired Sessions */}
          <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                <Trash2 className="h-4 w-4 text-amber-500" />
                <span>3. Session Storage Purge</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Clean up revoked refresh token sessions and expired JWTs to optimize database performance.
              </p>
            </div>
            <button
              onClick={handlePurgeSessions}
              disabled={purgingSessions}
              className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {purgingSessions ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Purge Expired Sessions"}
            </button>
          </div>
        </div>
      </div>

      {/* Tenants Table Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Tenant Directory &amp; Management</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Control access status, subscription tiers, and audit admins across all platform organizations
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search tenant name or admin..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white rounded-xl focus:border-violet-500 outline-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">Tenant Organization</th>
                <th className="py-3.5 px-4">Admin Email</th>
                <th className="py-3.5 px-4">Users</th>
                <th className="py-3.5 px-4">Plan</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-violet-500 mb-2" />
                    Loading tenants directory...
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No tenant organizations found matching "{searchTerm}"
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => (
                  <tr
                    key={tenant.organisation_name}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Org Name & Icon */}
                    <td className="py-4 px-6 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                          {getInstitutionIcon(tenant.institution_type)}
                        </div>
                        <div>
                          <div className="font-bold">{tenant.organisation_name}</div>
                          <div className="text-xs text-slate-400 capitalize">{tenant.institution_type}</div>
                        </div>
                      </div>
                    </td>

                    {/* Admin Email */}
                    <td className="py-4 px-4 text-slate-700 dark:text-slate-300">
                      <div>{tenant.admin_email}</div>
                      <div className="text-xs text-slate-400">{tenant.admin_name}</div>
                    </td>

                    {/* Users */}
                    <td className="py-4 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                      {tenant.active_users} / {tenant.total_users}
                    </td>

                    {/* Plan Badge */}
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full capitalize ${
                          tenant.subscription_plan === "enterprise"
                            ? "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                            : tenant.subscription_plan === "professional"
                            ? "bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-800"
                            : "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800"
                        }`}
                      >
                        {tenant.subscription_plan}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4">
                      {tenant.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-800">
                          <ShieldCheck className="h-3.5 w-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 rounded-full border border-red-200 dark:border-red-800">
                          <ShieldAlert className="h-3.5 w-3.5" /> Suspended
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right space-x-2">
                      {tenant.subscription_plan === "starter" && (
                        <button
                          disabled={updatingPlan}
                          onClick={() => handleUpdatePlan(tenant.organisation_name, "professional")}
                          className="px-2.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-50"
                          title="Upgrade tenant to Professional Plan ($149/mo)"
                        >
                          ⚡ Upgrade Pro
                        </button>
                      )}

                      {tenant.subscription_plan === "professional" && (
                        <>
                          <button
                            disabled={updatingPlan}
                            onClick={() => handleUpdatePlan(tenant.organisation_name, "enterprise")}
                            className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-50"
                            title="Upgrade tenant to Enterprise Plan ($499/mo)"
                          >
                            👑 Upgrade Ent
                          </button>
                          <button
                            disabled={updatingPlan}
                            onClick={() => handleUpdatePlan(tenant.organisation_name, "starter")}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50"
                            title="Downgrade tenant to Starter Plan ($49/mo)"
                          >
                            📉 Downgrade
                          </button>
                        </>
                      )}

                      {tenant.subscription_plan === "enterprise" && (
                        <button
                          disabled={updatingPlan}
                          onClick={() => handleUpdatePlan(tenant.organisation_name, "professional")}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50"
                          title="Downgrade tenant to Professional Plan ($149/mo)"
                        >
                          📉 Downgrade Pro
                        </button>
                      )}

                      <button
                        onClick={() => handleImpersonateTenant(tenant.organisation_name)}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer"
                        title="Log into tenant admin console (Google Workspace Reseller mode)"
                      >
                        🔑 Access Workspace
                      </button>

                      <button
                        onClick={() => setSelectedTenant(tenant)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg transition-all cursor-pointer"
                      >
                        Manage Tenant
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Package Purchases & Add-on Requests Activity Feed */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Recent Tenant Package Purchases &amp; Upgrade Activity
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">Live Audit Feed</span>
        </div>

        {packagePurchases.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">
            No recent tenant plan upgrades or add-on purchases recorded.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {packagePurchases.map((purchase) => (
              <div key={purchase.id} className="py-3 flex items-center justify-between text-xs gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-lg font-bold">
                    💳
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {purchase.organisation_name || "Unknown Tenant"}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">{purchase.description}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] text-slate-400 block">{new Date(purchase.created_at).toLocaleDateString()}</span>
                  <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                    {purchase.actor_email}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manage Tenant Modal */}
      {selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl space-y-6">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
                  <Crown className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Manage {selectedTenant.organisation_name}
                  </h3>
                  <p className="text-xs text-slate-500">Admin: {selectedTenant.admin_email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTenant(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Change Subscription Plan
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["starter", "professional", "enterprise"].map((plan) => (
                    <button
                      key={plan}
                      disabled={updatingPlan}
                      onClick={() => handleUpdatePlan(selectedTenant.organisation_name, plan)}
                      className={`p-3 rounded-xl border text-center transition-all capitalize text-xs font-bold ${
                        selectedTenant.subscription_plan === plan
                          ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/20"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {plan}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Tenant Access Control
                </label>
                <button
                  disabled={updatingStatus}
                  onClick={() =>
                    handleToggleStatus(selectedTenant.organisation_name, selectedTenant.is_active)
                  }
                  className={`w-full py-3 px-4 flex items-center justify-center gap-2 font-bold text-xs rounded-xl transition-all ${
                    selectedTenant.is_active
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {updatingStatus ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : selectedTenant.is_active ? (
                    <>
                      <ShieldAlert className="h-4 w-4" /> Suspend Tenant Access
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" /> Re-Activate Tenant Access
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedTenant(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provision New Tenant Modal (Google Workspace Reseller Style) */}
      {showProvisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl space-y-5">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Provision New Tenant</h3>
                  <p className="text-xs text-slate-500">Reseller Organization Setup</p>
                </div>
              </div>
              <button
                onClick={() => setShowProvisionModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProvisionTenant} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Organization / Company Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Health Corp"
                  value={provOrg}
                  onChange={(e) => setProvOrg(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-xl text-slate-900 dark:text-white outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Admin Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={provName}
                    onChange={(e) => setProvName(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-xl text-slate-900 dark:text-white outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Admin Email</label>
                  <input
                    type="email"
                    required
                    placeholder="admin@acme.com"
                    value={provEmail}
                    onChange={(e) => setProvEmail(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-xl text-slate-900 dark:text-white outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Initial Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={provPassword}
                  onChange={(e) => setProvPassword(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-xl text-slate-900 dark:text-white outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Institution Domain</label>
                  <select
                    value={provInstType}
                    onChange={(e) => setProvInstType(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-xl text-slate-900 dark:text-white outline-none capitalize"
                  >
                    <option value="business">Enterprise Business</option>
                    <option value="ecommerce">E-Commerce Store</option>
                    <option value="hospital">Healthcare / Hospital</option>
                    <option value="school">School / University</option>
                    <option value="hotel">Hotel / Hospitality</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Subscription Tier</label>
                  <select
                    value={provPlan}
                    onChange={(e) => setProvPlan(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-xl text-slate-900 dark:text-white outline-none capitalize"
                  >
                    <option value="starter">Starter Plan ($49/mo)</option>
                    <option value="professional">Professional ($149/mo)</option>
                    <option value="enterprise">Enterprise ($499/mo)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowProvisionModal(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={provisioning}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {provisioning ? <Loader2 className="h-4 w-4 animate-spin" /> : "Provision Tenant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
