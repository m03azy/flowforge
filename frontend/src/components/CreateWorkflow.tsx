import { useState } from "react";
import {
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  GitFork,
  Layers,
  Info
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

type Props = {
  token: string;
  onCreated: () => void;
  institutionType?: string;
};

export default function CreateWorkflow({ token, onCreated, institutionType }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggers, setTriggers] = useState<TriggerForm[]>([]);
  const [actions, setActions] = useState<ActionForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const theme = getInstitutionTheme(institutionType);
  const eventTypes = theme.workflowTriggers;

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
    setActions([...actions, { 
      action_type: "whatsapp_message", 
      order: actions.length + 1,
      payload: { phone_number: "", message_template: "" }
    }]);
  };

  const removeAction = (index: number) => {
    const filtered = actions.filter((_, i) => i !== index);
    // Re-adjust order indices
    const updated = filtered.map((act, i) => ({ ...act, order: i + 1 }));
    setActions(updated);
  };

  const updateAction = (index: number, action_type: string) => {
    const updated = [...actions];
    updated[index].action_type = action_type;
    if (action_type === "whatsapp_message") {
      updated[index].payload = { phone_number: "", message_template: "" };
    } else {
      updated[index].payload = null;
    }
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
      const res = await fetch("http://localhost:8000/api/workflows/", {
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

      setMessage({ type: "success", text: "Workflow created successfully!" });
      setName("");
      setDescription("");
      setTriggers([]);
      setActions([]);
      
      // Notify parent app
      onCreated();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div className="p-2 bg-violet-50 dark:bg-violet-950/40 rounded-xl text-violet-600 dark:text-violet-400">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create New Workflow</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Define triggers and actions to build an automation pipeline</p>
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
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Workflow Name
            </label>
            <input
              type="text"
              placeholder="e.g. Sync User to CRM"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-slate-950 dark:text-slate-50 rounded-xl outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Description
            </label>
            <textarea
              placeholder="Provide a brief summary of what this workflow automates..."
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-slate-950 dark:text-slate-50 rounded-xl outline-none transition-all resize-none"
            />
          </div>
        </div>

        {/* Triggers Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <GitFork className="h-4 w-4 text-violet-500" />
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

        {/* Actions Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-indigo-500" />
              Actions Sequence
            </label>
            <button
              type="button"
              onClick={addAction}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/60 px-2.5 py-1.5 rounded-lg border border-indigo-100/50 dark:border-indigo-900/30 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Action
            </button>
          </div>

          {actions.length === 0 ? (
            <div className="flex items-center gap-2 p-4 bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-500 text-xs rounded-xl border border-slate-100 dark:border-slate-850 border-dashed">
              <Info className="h-4 w-4 text-slate-400 shrink-0" />
              <span>No actions defined. Adding actions defines what this workflow executes.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {actions.map((action, idx) => (
                <div key={idx} className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/60 dark:border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 text-xs font-bold shrink-0">
                      {action.order}
                    </span>
                    <select
                      value={action.action_type}
                      onChange={(e) => updateAction(idx, e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-950 dark:text-slate-50 text-sm rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {actionTypes.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeAction(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {action.action_type === "whatsapp_message" && (
                    <div className="pl-8 pr-2 space-y-2 mt-1">
                      <input
                        type="text"
                        placeholder="Recipient Phone (e.g. {{ phone }})"
                        value={action.payload?.phone_number || ""}
                        onChange={(e) => updateActionPayload(idx, "phone_number", e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs rounded-lg outline-none focus:border-indigo-500"
                      />
                      <textarea
                        placeholder="Message Template (e.g. Hello {{ first_name }}, your status is now {{ status }})"
                        rows={2}
                        value={action.payload?.message_template || ""}
                        onChange={(e) => updateActionPayload(idx, "message_template", e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs rounded-lg outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/10 hover:shadow-violet-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all pt-3.5"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Creating Workflow...</span>
            </>
          ) : (
            <>
              <Plus className="h-5 w-5" />
              <span>Create Workflow</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
