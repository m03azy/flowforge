import { API_BASE } from "../config/api";
import { useEffect, useState } from "react";
import {
  Users,
  DollarSign,
  TrendingUp,
  Plus,
  Phone,
  Mail,
  Trash2,
  Loader2,
  AlertCircle,
  Briefcase
} from "lucide-react";

type Employee = {
  id: number;
  full_name: string;
  email: string;
  department: string | null;
  job_title: string | null;
};

type Lead = {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  value: number;
  assigned_to_id: number | null;
  assigned_to: Employee | null;
  created_at: string;
};

type Props = {
  token: string;
  userRole: string;
};

export default function CrmDashboard({ token, userRole }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [statusVal, setStatusVal] = useState("New");
  const [value, setValue] = useState("0");
  const [assignedToId, setAssignedToId] = useState("");
  const [formMsg, setFormMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const statuses = ["New", "Contacted", "Qualified", "Converted", "Lost"];

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch leads
      const leadsRes = await fetch(`${API_BASE}/api/crm/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!leadsRes.ok) throw new Error("Failed to load leads");
      const leadsData = await leadsRes.json();
      setLeads(leadsData);

      // 2. Fetch employees (for lead assignment)
      const empRes = await fetch(`${API_BASE}/api/employees/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployees(empData);
      }
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormMsg("");

    try {
      const payload = {
        first_name: firstName,
        last_name: lastName,
        email: email || null,
        phone: phone || null,
        company: company || null,
        status: statusVal,
        value: parseFloat(value) || 0.0,
        assigned_to_id: assignedToId ? parseInt(assignedToId) : null,
      };

      const res = await fetch(`${API_BASE}/api/crm/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Failed to create lead");

      // Reset Form
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setCompany("");
      setStatusVal("New");
      setValue("0");
      setAssignedToId("");
      setShowAddForm(false);
      
      // Refresh list
      fetchData();
    } catch (err: any) {
      setFormMsg(`❌ ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (leadId: number, nextStatus: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/crm/${leadId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      
      // Update locally
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: nextStatus } : l))
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteLead = async (leadId: number) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/crm/${leadId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail ?? "Failed to delete lead");
      }
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Calculations
  const pipelineValue = leads.reduce((sum, l) => sum + (l.status !== "Lost" ? l.value : 0), 0);
  const activeLeadsCount = leads.filter((l) => l.status !== "Converted" && l.status !== "Lost").length;
  const conversionRate = leads.length
    ? Math.round((leads.filter((l) => l.status === "Converted").length / leads.length) * 100)
    : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "New":
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
      case "Contacted":
        return "bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400 border-sky-100 dark:border-sky-900/30";
      case "Qualified":
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-100 dark:border-amber-900/30";
      case "Converted":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30";
      case "Lost":
        return "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-rose-100 dark:border-rose-900/30";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Loader2 className="h-10 w-10 text-violet-500 animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 font-medium">Loading CRM Dashboard...</p>
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
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">CRM Leads</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {userRole === "employee" ? "Manage and progress your assigned sales leads" : "Monitor sales pipeline value, leads, and team conversion rates"}
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 py-2.5 px-4 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl shadow-lg shadow-violet-500/10 hover:shadow-violet-500/20 active:scale-[0.98] transition-all self-start sm:self-auto"
        >
          <Plus className="h-5 w-5" />
          Add Lead
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-violet-50 dark:bg-violet-950/30 rounded-xl text-violet-600 dark:text-violet-400">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider">Pipeline Value</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">${pipelineValue.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl text-indigo-600 dark:text-indigo-400">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider">Active Leads</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{activeLeadsCount}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider">Win Rate</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{conversionRate}%</span>
          </div>
        </div>
      </div>

      {/* Add Lead Form (collapsible) */}
      {showAddForm && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-md transition-all">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Add New CRM Lead</h3>
          <form onSubmit={handleCreateLead} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-1 focus:ring-violet-500 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-1 focus:ring-violet-500 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-1 focus:ring-violet-500 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-1 focus:ring-violet-500 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Company</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-1 focus:ring-violet-500 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Lead Value ($)</label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                min="0"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-1 focus:ring-violet-500 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Assign To</label>
              <select
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-1 focus:ring-violet-500 text-sm"
              >
                <option value="">Unassigned</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.job_title || "Employee"})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Initial Status</label>
              <select
                value={statusVal}
                onChange={(e) => setStatusVal(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-1 focus:ring-violet-500 text-sm"
              >
                {statuses.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-all"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save Lead
              </button>
            </div>
          </form>
          {formMsg && <p className="mt-2 text-sm">{formMsg}</p>}
        </div>
      )}

      {/* Leads List Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {leads.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">No Leads Found</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              There are no sales leads logged in your workspace directory. Click "Add Lead" to log your first client opportunity.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/55 dark:bg-slate-950/40 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">Company</th>
                  <th className="py-4 px-6">Contacts</th>
                  <th className="py-4 px-6">Value</th>
                  <th className="py-4 px-6">Assignee</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">
                      {lead.first_name} {lead.last_name}
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-400">
                      {lead.company || <span className="text-slate-400 dark:text-slate-600">—</span>}
                    </td>
                    <td className="py-4 px-6 text-sm">
                      <div className="space-y-0.5">
                        {lead.email && (
                          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                            <Mail className="h-3.5 w-3.5" /> {lead.email}
                          </span>
                        )}
                        {lead.phone && (
                          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                            <Phone className="h-3.5 w-3.5" /> {lead.phone}
                          </span>
                        )}
                        {!lead.email && !lead.phone && <span className="text-slate-400 dark:text-slate-600">—</span>}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-950 dark:text-slate-100">
                      ${lead.value.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-400">
                      {lead.assigned_to ? (
                        <div className="flex items-center gap-1.5">
                          <Briefcase className="h-3.5 w-3.5 text-violet-500" />
                          <span>{lead.assigned_to.full_name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <select
                        value={lead.status}
                        onChange={(e) => handleUpdateStatus(lead.id, e.target.value)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border outline-none cursor-pointer ${getStatusColor(
                          lead.status
                        )}`}
                      >
                        {statuses.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {userRole !== "employee" && (
                        <button
                          onClick={() => handleDeleteLead(lead.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                          title="Delete Lead"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
