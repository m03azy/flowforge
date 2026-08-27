import { API_BASE } from "./config/api";
import { useEffect, useState, useCallback } from "react";
import {
  LogOut,
  Moon,
  Sun,
  Sparkles,
  Home,
  Users,
  Briefcase,
  Activity,
  DollarSign,
  Package,
  Brain,
  CalendarDays,
  CreditCard,
  Shield,
  ShoppingCart,
  Crown,
  FileText,
  Bell,
  Megaphone,
  AlertTriangle,
  X,
  Clock,
  Inbox
} from "lucide-react";
import AuthForm from "./components/AuthForm";
import TwoFactorVerify from "./components/TwoFactorVerify";
import TwoFactorSettings from "./components/TwoFactorSettings";
import WorkflowList from "./components/WorkflowList";
import CreateWorkflow from "./components/CreateWorkflow";
import CrmDashboard from "./components/CrmDashboard";
import EmployeeDirectory from "./components/EmployeeDirectory";
import { Inventory } from "./components/Inventory";
import { Accounting } from "./components/Accounting";
import AiReports from "./components/AiReports";
import BookingManager from "./components/BookingManager";
import SubscriptionManager from "./components/SubscriptionManager";
import AuditLogs from "./components/AuditLogs";
import OrdersDashboard from "./components/OrdersDashboard";
import SuperAdminDashboard from "./components/SuperAdminDashboard";
import ResellerConsole from "./components/ResellerConsole";
import DocumentManager from "./components/DocumentManager";
import { getInstitutionTheme } from "./config/InstitutionTheme";

type UserProfile = {
  id: number;
  email: string;
  full_name: string | null;
  role: string;
  institution_type?: string;
  organisation_name?: string | null;
  department: string | null;
  job_title: string | null;
  totp_enabled?: boolean;
};

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  level: string;
  sender: string;
  created_at: string;
  is_read: boolean;
};

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [twoFaToken, setTwoFaToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Workflow reload state
  const [refreshKey, setRefreshKey] = useState(0);
  // CRM Lead counts (for dashboard metrics)
  const [leadCount, setLeadCount] = useState(0);
  const [pipelineValue, setPipelineValue] = useState(0);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [workflowCount, setWorkflowCount] = useState(0);

  const [isDark, setIsDark] = useState(false);

  // ── Reseller Notification & Broadcast State ──
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeBroadcast, setActiveBroadcast] = useState<any>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [dismissedBroadcast, setDismissedBroadcast] = useState(false);

  // Load token & theme from storage
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
    }
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Fetch Current User
  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    fetch(`${API_BASE}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Invalid token");
        return res.json();
      })
      .then((data) => setUser(data))
      .catch(() => {
        handleLogout();
      });
  }, [token]);

  // Fetch Notifications & Reseller Broadcasts
  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/notifications/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
        setActiveBroadcast(data.active_broadcast || null);
      }
    } catch {
      // silent polling catch
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Fetch Dashboard Stats (CRM leads & pipeline)
  useEffect(() => {
    if (!token) return;

    fetch(`${API_BASE}/api/crm/leads`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((leads) => {
        setLeadCount(leads.length);
        const total = leads.reduce((sum: number, l: any) => sum + (l.value || 0), 0);
        setPipelineValue(total);
      })
      .catch(() => {});

    fetch(`${API_BASE}/api/employees/`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((emps) => setEmployeeCount(emps.length))
      .catch(() => {});

    fetch(`${API_BASE}/api/workflows/`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((wfs) => setWorkflowCount(wfs.length))
      .catch(() => {});
  }, [token, refreshKey]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const triggerWorkflowRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const markAllNotificationsRead = () => {
    setUnreadCount(0);
    fetch(`${API_BASE}/api/notifications/mark-read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  };

  // ── 2FA Challenge Screen ────────────────────────────────────────────────
  if (!token && twoFaToken) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 transition-all">
        <TwoFactorVerify
          twoFaToken={twoFaToken}
          onSuccess={(t) => { setTwoFaToken(null); setToken(t); }}
          onBack={() => setTwoFaToken(null)}
        />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center p-4 transition-all">
        <div className="absolute top-4 right-4">
          <button
            onClick={toggleTheme}
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-850 transition-all shadow-sm cursor-pointer"
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>

        {/* Auth Mode Switcher Tabs */}
        <div className="w-full max-w-lg mb-4 p-1 bg-slate-200 dark:bg-slate-800/80 rounded-xl flex items-center gap-1 shadow-inner">
          <button
            onClick={() => setAuthMode("login")}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer ${
              authMode === "login"
                ? "bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setAuthMode("register")}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer ${
              authMode === "register"
                ? "bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Register Institution
          </button>
        </div>

        <AuthForm
          mode={authMode}
          onSuccess={(t) => setToken(t)}
          onRequires2FA={(tok) => setTwoFaToken(tok)}
          onToggleMode={() => setAuthMode(authMode === "login" ? "register" : "login")}
        />
      </div>
    );
  }

  const userRole = user?.role || "employee";
  const theme = getInstitutionTheme(user?.institution_type);
  const InstIcon = theme.icon;

  // ── Superadmin gets a completely separate, standalone Reseller Console ──
  if (userRole === "superadmin") {
    return (
      <ResellerConsole
        token={token!}
        userEmail={user?.email || ""}
        userName={user?.full_name || "Reseller Admin"}
        onLogout={handleLogout}
        onImpersonate={(t) => {
          localStorage.setItem("token", t);
          setToken(t);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-300">
      
      {/* ── Sidebar Navigation ── */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col fixed inset-y-0 left-0 z-30 transition-colors">
        {/* Brand header */}
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-slate-100 dark:border-slate-800/80">
          <div className="p-2 bg-violet-600 rounded-xl text-white shadow-md shadow-violet-500/20 shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white truncate">
              {user?.organisation_name || "AutoFlow AI"}
            </span>
            <span className="text-[10px] text-violet-600 dark:text-violet-400 font-semibold uppercase tracking-wider flex items-center gap-1">
              <InstIcon className="h-3 w-3" /> {theme.name.split(" / ")[0]}
            </span>
          </div>
        </div>

        {/* Navigation Menu (Dynamically filtered and customized per Business Type) */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {theme.enabledModules.includes("dashboard") && (
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-500/25 font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <Home className="h-5 w-5" />
              Dashboard
            </button>
          )}

          {theme.enabledModules.includes("documents") && (
            <button
              onClick={() => setActiveTab("documents")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer ${
                activeTab === "documents"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-500/25 font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <FileText className="h-5 w-5" />
              {theme.navLabels.documents || "Documents & Files"}
            </button>
          )}

          {theme.enabledModules.includes("shop") && (
            <button
              onClick={() => setActiveTab("shop")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer ${
                activeTab === "shop"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-500/25 font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <ShoppingCart className="h-5 w-5" />
              {theme.navLabels.shop || "Shop Orders & Store"}
            </button>
          )}

          {theme.enabledModules.includes("crm") && (
            <button
              onClick={() => setActiveTab("crm")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer ${
                activeTab === "crm"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-500/25 font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <Users className="h-5 w-5" />
              {theme.navLabels.crm}
            </button>
          )}

          {theme.enabledModules.includes("bookings") && (
            <button
              onClick={() => setActiveTab("bookings")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer ${
                activeTab === "bookings"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-500/25 font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <CalendarDays className="h-5 w-5" />
              {theme.navLabels.bookings || theme.bookingLabelPlural}
            </button>
          )}

          {theme.enabledModules.includes("workflows") && (
            <button
              onClick={() => setActiveTab("workflows")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer ${
                activeTab === "workflows"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-500/25 font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <Activity className="h-5 w-5" />
              {theme.navLabels.workflows || "Automations"}
            </button>
          )}

          {theme.enabledModules.includes("employees") && (
            <button
              onClick={() => setActiveTab("employees")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer ${
                activeTab === "employees"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-500/25 font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <Briefcase className="h-5 w-5" />
              {theme.navLabels.employees}
            </button>
          )}

          {theme.enabledModules.includes("inventory") && (
            <button
              onClick={() => setActiveTab("inventory")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer ${
                activeTab === "inventory"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-500/25 font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <Package className="h-5 w-5" />
              {theme.navLabels.inventory}
            </button>
          )}

          {theme.enabledModules.includes("accounting") && (
            <button
              onClick={() => setActiveTab("accounting")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer ${
                activeTab === "accounting"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-500/25 font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <DollarSign className="h-5 w-5" />
              {theme.navLabels.accounting}
            </button>
          )}

          {theme.enabledModules.includes("ai-reports") && (
            <button
              onClick={() => setActiveTab("ai-reports")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer ${
                activeTab === "ai-reports"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-500/25 font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-850/60 dark:hover:bg-slate-800/60"
              }`}
            >
              <Brain className="h-5 w-5" />
              {theme.navLabels.reports}
            </button>
          )}

          {theme.enabledModules.includes("billing") && (
            <button
              onClick={() => setActiveTab("billing")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer ${
                activeTab === "billing"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-500/25 font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <CreditCard className="h-5 w-5" />
              Billing & Plans
            </button>
          )}

          {theme.enabledModules.includes("audit") && (
            <button
              onClick={() => setActiveTab("audit")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer ${
                activeTab === "audit"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-500/25 font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <Shield className="h-5 w-5" />
              Audit Logs
            </button>
          )}

          {userRole === "superadmin" && (
            <button
              onClick={() => setActiveTab("superadmin")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer ${
                activeTab === "superadmin"
                  ? "bg-amber-600 text-white shadow-md shadow-amber-500/25 font-semibold"
                  : "text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              }`}
            >
              <Crown className="h-5 w-5" />
              Platform Tenants
            </button>
          )}
        </nav>

        {/* Sidebar Footer / Profile Info */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-3">
          {user && (
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-full bg-violet-100 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-850 flex items-center justify-center text-sm font-bold text-violet-700 dark:text-violet-300 shrink-0">
                {getInitials(user.full_name)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {user.full_name || "User"}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                  {user.role}
                </span>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all shrink-0 cursor-pointer"
            title="Log out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </aside>

      {/* ── Main View Container ── */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        {/* Top Header with Notification Bell */}
        <header className="h-16 px-8 bg-white/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white capitalize">
              {activeTab === "workflows"
                ? "Workflow Automations"
                : activeTab === "documents"
                ? theme.navLabels.documents || "Documents & Files"
                : activeTab === "crm"
                ? theme.crmModuleTitle
                : activeTab === "employees"
                ? theme.staffLabelPlural
                : activeTab === "bookings"
                ? theme.bookingLabelPlural
                : activeTab + " space"}
            </h2>
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 ${theme.badgeBg} ${theme.badgeText}`}>
              <InstIcon className="h-3.5 w-3.5" />
              {user?.organisation_name || theme.name}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* ── Notification Bell (Receives Reseller Announcements & Alerts) ── */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                title="Notifications from Reseller & Workspace"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                )}
              </button>

              {/* Notification Dropdown Menu */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-violet-600" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Platform Notifications</span>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsRead}
                        className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-80 overflow-y-auto mt-2">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                        <Inbox className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                        <span>No new notifications from reseller</span>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="py-3 flex items-start gap-3">
                          <div
                            className={`p-2 rounded-xl shrink-0 ${
                              n.type === "broadcast"
                                ? "bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400"
                                : "bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400"
                            }`}
                          >
                            {n.type === "broadcast" ? <Megaphone className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{n.title}</p>
                              {n.type === "broadcast" && (
                                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500">
                                  Reseller
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                              <Clock className="h-2.5 w-2.5" />
                              {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Theme selector */}
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              title="Toggle theme"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {/* ── Reseller Broadcast Announcement Banner ── */}
        {activeBroadcast && !dismissedBroadcast && activeBroadcast.message && (
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white px-6 py-3 flex items-center justify-between shadow-md sticky top-16 z-10">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-black/20 rounded-lg shrink-0">
                <Megaphone className="h-4 w-4 text-white animate-bounce" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-100">
                  Reseller Platform Announcement ({activeBroadcast.level || "Notice"})
                </p>
                <p className="text-sm font-semibold">{activeBroadcast.message}</p>
              </div>
            </div>
            <button
              onClick={() => setDismissedBroadcast(true)}
              className="p-1 hover:bg-black/20 rounded-lg text-white/80 hover:text-white transition-all cursor-pointer"
              title="Dismiss announcement"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Tab content switcher */}
        <main className="flex-1 p-8 overflow-y-auto">
          {activeTab === "dashboard" && (
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="space-y-1 z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-violet-300">
                    <InstIcon className="h-4 w-4" /> {theme.name}
                  </div>
                  <h2 className="text-3xl font-extrabold tracking-tight text-white">
                    Welcome back, {user?.full_name?.split(" ")[0] || "User"}!
                  </h2>
                  <p className="text-sm text-slate-300">
                    Managing <span className="font-semibold text-white">{user?.organisation_name || "your organisation"}</span> • {theme.tagline}
                  </p>
                </div>
                <div className="z-10 shrink-0">
                  <button
                    onClick={() => setActiveTab("bookings")}
                    className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    Schedule {theme.bookingLabel}
                  </button>
                </div>
              </div>

              {/* Grid Overview Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-violet-50 dark:bg-violet-950/30 rounded-xl text-violet-600 dark:text-violet-400">
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider">{theme.metric4}</span>
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">${pipelineValue.toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider">{theme.metric1}</span>
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">{leadCount}</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-emerald-600 dark:text-emerald-400">
                    <Briefcase className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider">{theme.metric3}</span>
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">{employeeCount}</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl text-amber-600 dark:text-amber-400">
                    <Activity className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider">{theme.metric2}</span>
                    <span className="text-2xl font-bold text-slate-900 dark:text-white">{workflowCount}</span>
                  </div>
                </div>
              </div>

              {/* CRM & Documents shortcuts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{theme.crmModuleTitle} Overview</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Manage {theme.clientLabelPlural.toLowerCase()} and assign {theme.staffLabelPlural.toLowerCase()} to track status from intake to completion.
                  </p>
                  <button
                    onClick={() => setActiveTab("crm")}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                  >
                    Manage {theme.clientLabelPlural} Directory →
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Documents & File Vault</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Manage organizational invoices, service agreements, SLAs, compliance policies, and executive reports.
                  </p>
                  <button
                    onClick={() => setActiveTab("documents")}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                  >
                    Open Document Vault →
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Automations & Actions Library</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Compose automated pipelines with 20+ reusable action blocks across Communication, Documents, DB, and Storage.
                  </p>
                  <button
                    onClick={() => setActiveTab("workflows")}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                  >
                    Manage Workflow Automations →
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "documents" && (
            <DocumentManager token={token} organisationName={user?.organisation_name || undefined} />
          )}

          {activeTab === "inventory" && <Inventory token={token} />}
          {activeTab === "accounting" && <Accounting token={token} />}
          {activeTab === "ai-reports" && <AiReports token={token} />}
          {activeTab === "billing" && <SubscriptionManager token={token} userRole={userRole} />}
          {activeTab === "audit" && <AuditLogs token={token} />}
          {activeTab === "shop" && <OrdersDashboard token={token} userRole={userRole} />}
          {activeTab === "superadmin" && <SuperAdminDashboard token={token} onImpersonate={(t) => setToken(t)} />}

          {activeTab === "bookings" && <BookingManager token={token} userRole={userRole} institutionType={user?.institution_type} />}
          {activeTab === "settings" && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Account Security</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Manage authentication settings and security options for your account.
                </p>
              </div>
              <TwoFactorSettings
                token={token}
                totpEnabled={user?.totp_enabled ?? false}
                onStatusChange={(enabled) => setUser((prev) => prev ? { ...prev, totp_enabled: enabled } : prev)}
              />
            </div>
          )}

          {activeTab === "crm" && (
            <CrmDashboard token={token} userRole={userRole} />
          )}

          {activeTab === "employees" && (
            <EmployeeDirectory token={token} userRole={userRole} />
          )}

          {activeTab === "workflows" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Creation panel */}
              <div className="lg:col-span-4 sticky top-24">
                <CreateWorkflow
                  token={token}
                  institutionType={user?.institution_type}
                  onCreated={triggerWorkflowRefresh}
                />
              </div>

              {/* Workflows list */}
              <div className="lg:col-span-8">
                <WorkflowList
                  token={token}
                  institutionType={user?.institution_type}
                  refreshTrigger={refreshKey}
                  onRefresh={triggerWorkflowRefresh}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
