import { useEffect, useState } from "react";
import {
  Briefcase,
  Mail,
  Phone,
  Calendar,
  Edit2,
  CheckCircle,
  Loader2,
  AlertCircle,
  FolderOpen,
  UserPlus,
  X,
  UserX,
  UserCheck,
  ShieldAlert,
  Wand2,
  Eye,
  EyeOff,
  Copy,
  Check
} from "lucide-react";

type Employee = {
  id: number;
  email: string;
  full_name: string;
  role: string;
  department: string | null;
  job_title: string | null;
  phone_number: string | null;
  hire_date: string | null;
  is_active: boolean;
};

type Props = {
  token: string;
  userRole: string;
};

export default function EmployeeDirectory({ token, userRole }: Props) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add User modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newRole, setNewRole] = useState("employee");
  const [newDept, setNewDept] = useState("");
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  
  // Created credentials banner state
  const [createdCreds, setCreatedCreds] = useState<{ email: string; pass: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Edit employee states
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("");
  const [updating, setUpdating] = useState(false);

  // Filters
  const [filterDept, setFilterDept] = useState("");

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const url = filterDept
        ? `http://localhost:8000/api/employees/?department=${encodeURIComponent(filterDept)}`
        : "http://localhost:8000/api/employees/";
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load employee directory");
      const data = await res.json();
      setEmployees(data);
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [token, filterDept]);

  // Secure Password Generator
  const handleGeneratePassword = () => {
    const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lowercase = "abcdefghijkmnopqrstuvwxyz";
    const numbers = "23456789";
    const symbols = "!@#$%^&*()_+-=";

    let pwd = "";
    pwd += uppercase[Math.floor(Math.random() * uppercase.length)];
    pwd += lowercase[Math.floor(Math.random() * lowercase.length)];
    pwd += numbers[Math.floor(Math.random() * numbers.length)];
    pwd += symbols[Math.floor(Math.random() * symbols.length)];

    const allChars = uppercase + lowercase + numbers + symbols;
    for (let i = 4; i < 12; i++) {
      pwd += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle password
    const shuffled = pwd.split("").sort(() => 0.5 - Math.random()).join("");
    setNewPassword(shuffled);
    setShowPassword(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    try {
      const payload = {
        full_name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
        department: newDept || null,
        job_title: newJobTitle || null,
        phone_number: newPhone || null,
      };

      const res = await fetch("http://localhost:8000/api/employees/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail ?? "Failed to create user");
      }

      setCreatedCreds({
        name: data.full_name,
        email: data.email,
        pass: newPassword,
      });

      setIsAddModalOpen(false);

      // Clear form
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setShowPassword(false);
      setNewRole("employee");
      setNewDept("");
      setNewJobTitle("");
      setNewPhone("");

      fetchEmployees();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCreds) return;
    const text = `FlowForge Credentials for ${createdCreds.name}:\nEmail: ${createdCreds.email}\nPassword: ${createdCreds.pass}\nLogin URL: http://localhost:5173`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const startEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setEditTitle(emp.job_title || "");
    setEditDept(emp.department || "");
    setEditPhone(emp.phone_number || "");
    setEditRole(emp.role);
  };

  const handleUpdate = async (id: number) => {
    setUpdating(true);
    try {
      const payload = {
        job_title: editTitle || null,
        department: editDept || null,
        phone_number: editPhone || null,
        role: editRole,
      };

      const res = await fetch(`http://localhost:8000/api/employees/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail ?? "Failed to update profile");
      }

      setEditingId(null);
      fetchEmployees();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleStatus = async (emp: Employee) => {
    const actionText = emp.is_active ? "deactivate" : "activate";
    if (!confirm(`Are you sure you want to ${actionText} user ${emp.full_name}?`)) return;

    try {
      const res = await fetch(`http://localhost:8000/api/employees/${emp.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !emp.is_active }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail ?? `Failed to ${actionText} user`);
      }

      fetchEmployees();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "superadmin":
      case "admin":
        return "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-100 dark:border-red-900/30";
      case "manager":
        return "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-100 dark:border-blue-900/30";
      default:
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30";
    }
  };

  // Extract unique departments for filter dropdown
  const departments = Array.from(
    new Set(employees.map((e) => e.department).filter(Boolean))
  ) as string[];

  const isManagement = userRole === "superadmin" || userRole === "admin" || userRole === "manager";

  if (loading && employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Loader2 className="h-10 w-10 text-violet-500 animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 font-medium">Loading Directory...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-sm rounded-2xl border border-red-100 dark:border-red-900/50">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <div>
          <span className="font-semibold">Error:</span> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Created Credentials Success Banner */}
      {createdCreds && (
        <div className="p-5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-3xl space-y-3 shadow-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-emerald-900 dark:text-emerald-300 font-bold">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span>User Credentials Generated for {createdCreds.name}</span>
            </div>
            <button
              onClick={() => setCreatedCreds(null)}
              className="text-emerald-600 hover:text-emerald-800 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-emerald-100 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 dark:text-slate-500 block uppercase font-bold text-[10px]">Email Address</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">{createdCreds.email}</span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500 block uppercase font-bold text-[10px]">Initial Password</span>
              <span className="font-mono text-violet-600 dark:text-violet-400 font-bold">{createdCreds.pass}</span>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={handleCopyCredentials}
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied to Clipboard!" : "Copy User Credentials"}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">User & Team Management</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Create user credentials, generate secure passwords, manage roles & departments</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter Dropdown */}
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-slate-400" />
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-sm rounded-xl outline-none focus:ring-2 focus:ring-violet-500/20"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Add User Button (Admins & Managers) */}
          {isManagement && (
            <button
              onClick={() => {
                setCreateError("");
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all duration-200"
            >
              <UserPlus className="h-4 w-4" />
              <span>Create User</span>
            </button>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-lg">
                <div className="p-2 bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 rounded-xl">
                  <UserPlus className="h-5 w-5" />
                </div>
                <span>Create New System User</span>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {createError && (
              <div className="flex items-center gap-2.5 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-xs rounded-xl border border-red-100 dark:border-red-900/50">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="sarah@org.com"
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Initial Password *</label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-600 hover:text-violet-700 dark:text-violet-400 hover:underline"
                    >
                      <Wand2 className="h-3 w-3" />
                      Generate
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-3.5 pr-16 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                    />
                    <div className="absolute right-2 top-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title={showPassword ? "Hide Password" : "Show Password"}
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Role / Role Level *</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  >
                    <option value="employee">Employee (Standard Access)</option>
                    <option value="manager">Manager (Department Lead)</option>
                    {userRole !== "manager" && <option value="admin">Administrator (Full Access)</option>}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Department</label>
                  <input
                    type="text"
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    placeholder="e.g. Operations, IT, Sales"
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Job Title</label>
                  <input
                    type="text"
                    value={newJobTitle}
                    onChange={(e) => setNewJobTitle(e.target.value)}
                    placeholder="e.g. Senior Specialist"
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Phone Number</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Create & Grant Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Directory Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {employees.map((emp) => (
          <div
            key={emp.id}
            className={`bg-white dark:bg-slate-900 border p-6 rounded-2xl shadow-sm space-y-4 hover:shadow-md transition-all duration-300 ${
              !emp.is_active ? "border-amber-200 dark:border-amber-900/40 opacity-75" : "border-slate-200 dark:border-slate-800"
            }`}
          >
            {/* Header info */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`h-12 w-12 rounded-full font-bold border flex items-center justify-center text-lg ${
                  emp.is_active 
                    ? "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-100 dark:border-violet-900/30"
                    : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-900/30"
                }`}>
                  {getInitials(emp.full_name)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {emp.full_name}
                    {!emp.is_active && (
                      <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 rounded-md">
                        Deactivated
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    <Briefcase className="h-4 w-4 text-slate-400" />
                    <span>
                      {emp.job_title || "Employee"}{" "}
                      {emp.department && <span className="text-slate-400 dark:text-slate-600">({emp.department})</span>}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getRoleBadge(emp.role)}`}>
                  {emp.role}
                </span>

                {isManagement && editingId !== emp.id && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(emp)}
                      className="p-1.5 text-slate-400 hover:text-violet-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                      title="Edit Profile"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(emp)}
                      className={`p-1.5 rounded-lg transition-all ${
                        emp.is_active 
                          ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                          : "text-amber-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      }`}
                      title={emp.is_active ? "Deactivate User" : "Activate User"}
                    >
                      {emp.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Editing form panel */}
            {editingId === emp.id ? (
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Department</label>
                    <input
                      type="text"
                      value={editDept}
                      onChange={(e) => setEditDept(e.target.value)}
                      placeholder="e.g. Sales"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Job Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="e.g. Director"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Phone</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="Phone"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Role</label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-violet-500"
                    >
                      <option value="employee">employee</option>
                      <option value="manager">manager</option>
                      {userRole !== "manager" && <option value="admin">admin</option>}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-2.5 py-1.5 bg-transparent hover:bg-slate-200 dark:hover:bg-slate-800 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleUpdate(emp.id)}
                    disabled={updating}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold rounded-lg"
                  >
                    {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                    Save
                  </button>
                </div>
              </div>
            ) : (
              /* Contact details */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="truncate">{emp.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{emp.phone_number || <span className="text-slate-400 dark:text-slate-600 italic">No phone</span>}</span>
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>Hire Date: {formatDate(emp.hire_date)}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
