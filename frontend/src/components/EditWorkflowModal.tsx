import { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
  Sparkles,
  GitFork,
  Layers,
  Save,
  GripVertical
} from "lucide-react";
import WorkflowVisualizer, { WorkflowData } from "./WorkflowVisualizer";
import { getInstitutionTheme } from "../config/InstitutionTheme";

type TriggerForm = {
  event_type: string;
};

type ActionForm = {
  action_type: string;
  order: number;
  payload?: any;
};

type Props = {
  workflow: WorkflowData;
  token: string;
  onClose: () => void;
  onSaved: () => void;
  institutionType?: string;
};

export default function EditWorkflowModal({ workflow, token, onClose, onSaved, institutionType }: Props) {
  const [name, setName] = useState(workflow.name);
  const [description, setDescription] = useState(workflow.description || "");
  const [triggers, setTriggers] = useState<TriggerForm[]>(
    workflow.triggers?.map((t) => ({ event_type: t.event_type })) || []
  );
  const [actions, setActions] = useState<ActionForm[]>(
    workflow.actions?.map((a) => ({
      action_type: a.action_type,
      order: a.order,
      payload: a.payload || {}
    })) || []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const theme = getInstitutionTheme(institutionType);
  const eventTypes = theme.workflowTriggers;

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const updated = [...actions];
    const itemToMove = updated.splice(draggedIndex, 1)[0];
    updated.splice(targetIndex, 0, itemToMove);

    // Re-index order
    const reordered = updated.map((act, i) => ({ ...act, order: i + 1 }));
    setActions(reordered);
    setDraggedIndex(null);
  };

  const actionTypes = [
    { value: "whatsapp_message", label: "Send WhatsApp Message" },
    { value: "send_email", label: "Send Email Notification" },
    { value: "post_slack_message", label: "Post to Slack Channel" },
    { value: "trigger_webhook", label: "Call Webhook" },
  ];

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
    setActions([
      ...actions,
      {
        action_type: "whatsapp_message",
        order: actions.length + 1,
        payload: { phone_number: "{{ phone }}", message_template: "Hello {{ first_name }}!" }
      }
    ]);
  };

  const removeAction = (index: number) => {
    const filtered = actions.filter((_, i) => i !== index);
    const updated = filtered.map((act, i) => ({ ...act, order: i + 1 }));
    setActions(updated);
  };

  const moveAction = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === actions.length - 1)
    ) {
      return;
    }
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    const updated = [...actions];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    // Re-index orders
    const reordered = updated.map((act, i) => ({ ...act, order: i + 1 }));
    setActions(reordered);
  };

  const updateActionType = (index: number, action_type: string) => {
    const updated = [...actions];
    updated[index].action_type = action_type;
    if (action_type === "whatsapp_message") {
      updated[index].payload = { phone_number: "{{ phone }}", message_template: "" };
    } else if (action_type === "send_email") {
      updated[index].payload = { email: "{{ email }}", subject: "Update" };
    } else {
      updated[index].payload = {};
    }
    setActions(updated);
  };

  const updateActionPayload = (index: number, key: string, value: string) => {
    const updated = [...actions];
    if (!updated[index].payload) updated[index].payload = {};
    updated[index].payload[key] = value;
    setActions(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`http://localhost:8000/api/workflows/${workflow.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description: description || null,
          triggers: triggers.map((t) => ({ event_type: t.event_type, condition: null })),
          actions: actions.map((a, idx) => ({
            action_type: a.action_type,
            payload: a.payload || null,
            order: idx + 1,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Failed to update workflow");

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const livePreviewData: WorkflowData = {
    id: workflow.id,
    name: name || "Untitled Flow",
    description,
    triggers,
    actions,
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-600/30 rounded-xl text-violet-400 border border-violet-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Visual Flow Editor</h3>
              <p className="text-xs text-slate-400">Add multiple actions, adjust sequence, and configure payloads</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-950/40 border border-red-900/50 text-red-400 text-sm rounded-xl">
              {error}
            </div>
          )}

          {/* Live Diagram Preview */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Live Diagram Preview
            </label>
            <WorkflowVisualizer workflow={livePreviewData} compact />
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Metadata inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Workflow Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:border-violet-500 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:border-violet-500 outline-none"
                />
              </div>
            </div>

            {/* Triggers Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <GitFork className="h-4 w-4 text-violet-400" />
                  Event Triggers
                </label>
                <button
                  type="button"
                  onClick={addTrigger}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-violet-400 bg-violet-950/50 hover:bg-violet-900/60 px-3 py-1.5 rounded-xl border border-violet-800/50 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Trigger
                </button>
              </div>

              {triggers.map((trig, idx) => (
                <div key={idx} className="flex items-center gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <select
                    value={trig.event_type}
                    onChange={(e) => updateTrigger(idx, e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 text-sm rounded-lg outline-none focus:border-violet-500"
                  >
                    {eventTypes.map((et) => (
                      <option key={et.value} value={et.value}>
                        {et.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeTrigger(idx)}
                    className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-950/30 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Multi-Action Sequence Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-400" />
                  Actions Sequence ({actions.length} defined)
                </label>
                <button
                  type="button"
                  onClick={addAction}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/80 px-3 py-1.5 rounded-xl border border-indigo-700/50 transition-all shadow-md shadow-indigo-950/40"
                >
                  <Plus className="h-4 w-4" />
                  Add Another Action
                </button>
              </div>

              {actions.length === 0 ? (
                <div className="p-6 text-center bg-slate-950/50 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
                  No actions added yet. Click "Add Another Action" to chain steps.
                </div>
              ) : (
                <div className="space-y-3">
                  {actions.map((act, idx) => (
                    <div
                      key={idx}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e)}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={() => setDraggedIndex(null)}
                      className={`p-4 bg-slate-950/90 rounded-2xl border transition-all space-y-3 relative group cursor-grab active:cursor-grabbing ${
                        draggedIndex === idx
                          ? "border-violet-500 shadow-lg shadow-violet-500/20 scale-[1.01] bg-slate-900 opacity-80"
                          : "border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <GripVertical className="h-4 w-4 text-slate-500 group-hover:text-slate-300 shrink-0 cursor-grab" />
                          <span className="flex items-center justify-center h-6 w-6 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-xs border border-indigo-500/30">
                            {idx + 1}
                          </span>
                          <select
                            value={act.action_type}
                            onChange={(e) => updateActionType(idx, e.target.value)}
                            className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 text-sm font-medium rounded-xl outline-none focus:border-indigo-500"
                          >
                            {actionTypes.map((a) => (
                              <option key={a.value} value={a.value}>
                                {a.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Order adjustment & deletion */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveAction(idx, "up")}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 disabled:opacity-30 transition-all"
                            title="Move Up"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === actions.length - 1}
                            onClick={() => moveAction(idx, "down")}
                            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 disabled:opacity-30 transition-all"
                            title="Move Down"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeAction(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-950/40 transition-all ml-1"
                            title="Remove Action"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Dynamic Action Payloads */}
                      {act.action_type === "whatsapp_message" && (
                        <div className="pl-8 space-y-2 pt-1 border-t border-slate-800/80">
                          <input
                            type="text"
                            placeholder="Recipient Phone Number (e.g. {{ phone }})"
                            value={act.payload?.phone_number || ""}
                            onChange={(e) => updateActionPayload(idx, "phone_number", e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 text-xs rounded-xl outline-none focus:border-indigo-500"
                          />
                          <textarea
                            placeholder="Message Template (e.g. Hello {{ first_name }}, your status is {{ status }})"
                            rows={2}
                            value={act.payload?.message_template || ""}
                            onChange={(e) => updateActionPayload(idx, "message_template", e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 text-xs rounded-xl outline-none focus:border-indigo-500 resize-none"
                          />
                        </div>
                      )}

                      {act.action_type === "send_email" && (
                        <div className="pl-8 space-y-2 pt-1 border-t border-slate-800/80">
                          <input
                            type="text"
                            placeholder="Target Email (e.g. {{ email }})"
                            value={act.payload?.email || ""}
                            onChange={(e) => updateActionPayload(idx, "email", e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 text-xs rounded-xl outline-none focus:border-indigo-500"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold text-sm transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-violet-600/30 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving Flow...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Flow Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
