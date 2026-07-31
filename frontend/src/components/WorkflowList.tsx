import { useEffect, useState } from "react";
import {
  GitFork,
  Trash2,
  ArrowRight,
  Activity,
  Layers,
  AlertCircle,
  RefreshCw,
  Clock,
  Edit,
  Eye,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import WorkflowVisualizer from "./WorkflowVisualizer";
import EditWorkflowModal from "./EditWorkflowModal";

type Trigger = {
  id: number;
  event_type: string;
  condition: any;
};

type Action = {
  id: number;
  action_type: string;
  payload: any;
  order: number;
};

type Workflow = {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  triggers: Trigger[];
  actions: Action[];
};

type Props = {
  token: string;
  refreshTrigger: number;
  onRefresh: () => void;
  institutionType?: string;
};

export default function WorkflowList({ token, refreshTrigger, onRefresh, institutionType }: Props) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [expandedDiagramId, setExpandedDiagramId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/workflows/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Failed to load workflows");
      setWorkflows(data);
      setError("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this workflow?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`http://localhost:8000/api/workflows/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail ?? "Failed to delete workflow");
      }
      // Remove from UI state
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
      onRefresh(); // Trigger count refresh
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, [token, refreshTrigger]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <RefreshCw className="h-10 w-10 text-violet-500 animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 font-medium">Fetching workflows...</p>
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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Activity className="h-5 w-5 text-violet-500" />
          Active Workflows
        </h2>
        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-full border border-slate-200/50 dark:border-slate-700/50">
          {workflows.length} Total
        </span>
      </div>

      {workflows.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-full border border-slate-100 dark:border-slate-800">
            <GitFork className="h-10 w-10 text-slate-400 dark:text-slate-600" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No workflows yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
              Use the creation panel to define your triggers, actions, and create your first automated flow.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-1">
          {workflows.map((wf) => (
            <div key={wf.id} className="space-y-3">
              <div className="group relative p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3 flex-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                        {wf.name}
                      </h3>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        Active
                      </span>
                    </div>
                    {wf.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {wf.description}
                      </p>
                    )}
                  </div>

                  {/* Display simple flow pipeline overview */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 px-2.5 py-1 rounded-lg">
                      <Activity className="h-3.5 w-3.5 text-violet-500" />
                      <span>{wf.triggers?.length || 0} Trigger(s)</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-700" />
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 px-2.5 py-1 rounded-lg">
                      <Layers className="h-3.5 w-3.5 text-indigo-500" />
                      <span>{wf.actions?.length || 0} Action(s)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 ml-auto">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatDate(wf.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 dark:border-slate-800/80">
                  <button
                    onClick={() =>
                      setExpandedDiagramId(expandedDiagramId === wf.id ? null : wf.id)
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl border border-slate-200/60 dark:border-slate-800 transition-all"
                  >
                    <Eye className="h-4 w-4 text-violet-500" />
                    <span>{expandedDiagramId === wf.id ? "Hide Diagram" : "Visual Flow"}</span>
                    {expandedDiagramId === wf.id ? (
                      <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    )}
                  </button>

                  <button
                    onClick={() => setEditingWorkflow(wf)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/60 text-violet-700 dark:text-violet-300 text-xs font-semibold rounded-xl border border-violet-200/60 dark:border-violet-800/50 transition-all"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit Flow</span>
                  </button>

                  <button
                    onClick={() => handleDelete(wf.id)}
                    disabled={deletingId === wf.id}
                    className="p-2.5 bg-slate-50 hover:bg-red-50 dark:bg-slate-950 dark:hover:bg-red-950/30 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:border-red-200 dark:hover:border-red-900/50 transition-all disabled:opacity-50 disabled:pointer-events-none"
                    title="Delete Workflow"
                  >
                    {deletingId === wf.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expandable Visual Diagram */}
              {expandedDiagramId === wf.id && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                  <WorkflowVisualizer
                    workflow={wf}
                    onEdit={() => setEditingWorkflow(wf)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingWorkflow && (
        <EditWorkflowModal
          workflow={editingWorkflow}
          token={token}
          institutionType={institutionType}
          onClose={() => setEditingWorkflow(null)}
          onSaved={() => {
            fetchWorkflows();
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
