import { useEffect, useState } from "react";
import { DollarSign, ArrowUpRight, ArrowDownRight, Plus, Trash2, Loader2, AlertCircle } from "lucide-react";

interface Transaction {
  id: number;
  type: "SALE" | "EXPENSE";
  amount: number;
  category: string;
  description: string | null;
  date: string;
  created_by: {
    id: number;
    email: string;
    full_name: string;
  };
}

interface Summary {
  total_sales: number;
  total_expenses: number;
  net_profit: number;
}

export const Accounting = ({ token }: { token: string }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary>({ total_sales: 0, total_expenses: 0, net_profit: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: "SALE",
    amount: 0.0,
    category: "",
    description: "",
  });

  const fetchData = async () => {
    try {
      const [txRes, sumRes] = await Promise.all([
        fetch("http://localhost:8000/api/accounting/", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("http://localhost:8000/api/accounting/summary", { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (txRes.ok && sumRes.ok) {
        setTransactions(await txRes.json());
        setSummary(await sumRes.json());
      } else {
        setError("Failed to fetch accounting data.");
      }
    } catch (err) {
      setError("Network error fetching accounting.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:8000/api/accounting/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          amount: Number(formData.amount)
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ type: "SALE", amount: 0.0, category: "", description: "" });
        fetchData();
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to log transaction");
      }
    } catch (err) {
      alert("Error logging transaction");
    }
  };

  const deleteTransaction = async (id: number) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try {
      const res = await fetch(`http://localhost:8000/api/accounting/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
      } else {
        alert("Failed to delete transaction. Only admins can delete.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Sales & Expenses</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Track company revenue, costs, and net profit.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 py-2.5 px-4 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl shadow-lg shadow-violet-500/10 hover:shadow-violet-500/20 active:scale-[0.98] transition-all self-start sm:self-auto"
        >
          <Plus className="h-5 w-5" />
          Record Transaction
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-sm rounded-2xl border border-red-100 dark:border-red-900/50">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <span className="font-semibold">Error:</span> {error}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-emerald-600 dark:text-emerald-400">
            <ArrowUpRight className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider">Total Sales</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">${summary.total_sales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl text-rose-600 dark:text-rose-400">
            <ArrowDownRight className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider">Total Expenses</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">${summary.total_expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex items-center gap-4">
          <div className={`p-3 rounded-xl ${summary.net_profit >= 0 ? 'bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400' : 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'}`}>
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block uppercase tracking-wider">Net Profit</span>
            <span className={`text-2xl font-bold ${summary.net_profit >= 0 ? 'text-slate-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
              ${summary.net_profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <Loader2 className="h-10 w-10 text-violet-500 animate-spin" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">Loading ledger...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <DollarSign className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">No Transactions</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              There are no transactions recorded yet. Click "Record Transaction" to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/55 dark:bg-slate-950/40 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6">Type</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">Description</th>
                  <th className="py-4 px-6">Amount</th>
                  <th className="py-4 px-6">Logged By</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="py-4 px-6 text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      {new Date(tx.date).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${tx.type === 'SALE' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30'}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm font-medium text-slate-900 dark:text-white">
                      {tx.category}
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {tx.description || <span className="text-slate-400 dark:text-slate-600">—</span>}
                    </td>
                    <td className={`py-4 px-6 text-sm font-bold ${tx.type === 'SALE' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {tx.type === 'SALE' ? '+' : '-'}${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-400">
                      {tx.created_by.full_name}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button onClick={() => deleteTransaction(tx.id)} className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-all" title="Delete Transaction">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/80">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Record Transaction</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Type *</label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-1 focus:ring-violet-500 text-sm"
                  >
                    <option value="SALE">Sale (Income)</option>
                    <option value="EXPENSE">Expense (Cost)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Amount ($) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-1 focus:ring-violet-500 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Category *</label>
                <input
                  required
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-1 focus:ring-violet-500 text-sm"
                  placeholder={formData.type === 'SALE' ? 'e.g. Software License' : 'e.g. Office Supplies'}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-1 focus:ring-violet-500 text-sm"
                  rows={2}
                  placeholder="Optional details..."
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-white text-sm font-semibold rounded-xl transition-all ${formData.type === 'SALE' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20' : 'bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-500/10 hover:shadow-rose-500/20'}`}
                >
                  Save {formData.type === 'SALE' ? 'Sale' : 'Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
