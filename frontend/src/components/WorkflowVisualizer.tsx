import { useState, useRef } from "react";
import {
  Zap,
  MessageSquare,
  Mail,
  Send,
  Webhook,
  ArrowRight,
  Sparkles,
  Layers,
  Phone,
  FileText,
  UserPlus,
  Activity,
  ShoppingBag,
  Move,
  RotateCw,
  Spline,
  LayoutGrid,
  Maximize2
} from "lucide-react";

export type TriggerItem = {
  id?: number;
  event_type: string;
  condition?: any;
};

export type ActionItem = {
  id?: number;
  action_type: string;
  payload?: any;
  order: number;
};

export type WorkflowData = {
  id: number;
  name: string;
  description?: string | null;
  triggers: TriggerItem[];
  actions: ActionItem[];
};

type Props = {
  workflow: WorkflowData;
  compact?: boolean;
  onEdit?: () => void;
};

type NodePosition = {
  x: number;
  y: number;
};

export default function WorkflowVisualizer({ workflow, compact = false, onEdit }: Props) {
  // Flow layout mode: 'twisted' | 'linear' | 'vertical'
  const [layoutMode, setLayoutMode] = useState<"twisted" | "linear" | "vertical">("twisted");
  // Curvature control for twisted mode
  const [twistCurvature, setTwistCurvature] = useState<number>(60);
  
  // Dragging state for nodes
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>({});
  const [draggingNodeKey, setDraggingNodeKey] = useState<string | null>(null);
  const dragStartRef = useRef<{ startX: number; startY: number; initialNodeX: number; initialNodeY: number }>({
    startX: 0,
    startY: 0,
    initialNodeX: 0,
    initialNodeY: 0,
  });

  const getEventMeta = (eventType: string) => {
    switch (eventType) {
      case "lead_created":
        return { label: "Lead Created", icon: UserPlus, color: "emerald" };
      case "lead_status_changed":
        return { label: "Lead Status Changed", icon: Activity, color: "violet" };
      case "order_created":
        return { label: "Order Created", icon: ShoppingBag, color: "blue" };
      case "user_registered":
        return { label: "User Registered", icon: Zap, color: "amber" };
      default:
        return { label: eventType.replace(/_/g, " "), icon: Zap, color: "slate" };
    }
  };

  const getActionMeta = (actionType: string) => {
    switch (actionType) {
      case "whatsapp_message":
        return { label: "Send WhatsApp Message", icon: MessageSquare, badge: "WhatsApp", color: "emerald" };
      case "send_email":
        return { label: "Send Email Notification", icon: Mail, badge: "Email", color: "sky" };
      case "post_slack_message":
        return { label: "Post to Slack Channel", icon: Send, badge: "Slack", color: "purple" };
      case "trigger_webhook":
        return { label: "Call Webhook", icon: Webhook, badge: "Webhook", color: "amber" };
      default:
        return { label: actionType.replace(/_/g, " "), icon: Layers, badge: "Action", color: "indigo" };
    }
  };

  const sortedActions = [...(workflow.actions || [])].sort((a, b) => a.order - b.order);

  // Mouse drag handlers for canvas nodes
  const handleMouseDown = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentPos = nodePositions[key] || { x: 0, y: 0 };
    setDraggingNodeKey(key);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialNodeX: currentPos.x,
      initialNodeY: currentPos.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingNodeKey) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    setNodePositions((prev) => ({
      ...prev,
      [draggingNodeKey]: {
        x: dragStartRef.current.initialNodeX + dx,
        y: dragStartRef.current.initialNodeY + dy,
      },
    }));
  };

  const handleMouseUp = () => {
    setDraggingNodeKey(null);
  };

  const resetPositions = () => {
    setNodePositions({});
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className={`w-full rounded-3xl bg-slate-950 border border-slate-800 p-6 backdrop-blur-xl shadow-2xl text-white select-none ${
        compact ? "text-xs p-4" : ""
      }`}
    >
      {/* Top Header & Layout Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-bold text-base text-slate-100 flex items-center gap-2">
              {workflow.name}
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-medium">
                {sortedActions.length} Step{sortedActions.length === 1 ? "" : "s"}
              </span>
            </h4>
            {workflow.description && (
              <p className="text-xs text-slate-400 mt-0.5">{workflow.description}</p>
            )}
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setLayoutMode("twisted")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                layoutMode === "twisted"
                  ? "bg-violet-600 text-white font-bold shadow-md shadow-violet-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Twisted / Curved Spline Layout"
            >
              <Spline className="h-3.5 w-3.5" />
              <span>Twisted</span>
            </button>
            <button
              onClick={() => setLayoutMode("linear")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                layoutMode === "linear"
                  ? "bg-violet-600 text-white font-bold shadow-md shadow-violet-600/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Linear Flow"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Linear</span>
            </button>
          </div>

          {/* Curvature adjustment for Twisted mode */}
          {layoutMode === "twisted" && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400">
              <RotateCw className="h-3.5 w-3.5 text-violet-400" />
              <span>Twist:</span>
              <input
                type="range"
                min="20"
                max="120"
                value={twistCurvature}
                onChange={(e) => setTwistCurvature(Number(e.target.value))}
                className="w-16 accent-violet-500 cursor-pointer"
              />
            </div>
          )}

          {/* Reset Drag Positions Button */}
          {Object.keys(nodePositions).length > 0 && (
            <button
              onClick={resetPositions}
              className="p-2 text-xs text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-xl transition-all"
              title="Reset Draggable Positions"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}

          {onEdit && (
            <button
              onClick={onEdit}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl shadow-lg shadow-violet-600/30 transition-all active:scale-95"
            >
              Edit Flow
            </button>
          )}
        </div>
      </div>

      {/* Visual Canvas */}
      <div
        className={`relative w-full rounded-2xl bg-slate-950/80 border border-slate-800/80 p-6 min-h-[220px] overflow-hidden ${
          layoutMode === "twisted" ? "bg-grid-pattern" : ""
        }`}
      >
        {/* Helper Drag Instruction */}
        <div className="absolute top-3 right-4 flex items-center gap-1.5 text-[10px] text-slate-500 font-medium pointer-events-none">
          <Move className="h-3 w-3 text-violet-400" />
          <span>Nodes are draggable on canvas</span>
        </div>

        {/* Canvas Diagram Layout */}
        <div
          className={`flex ${
            layoutMode === "vertical"
              ? "flex-col items-center gap-6"
              : "flex-row items-center gap-6 overflow-x-auto py-4"
          }`}
        >
          {/* Triggers */}
          {workflow.triggers.length === 0 ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400">
              <Zap className="h-5 w-5 text-amber-400" />
              <span className="text-xs font-medium">Manual Execution</span>
            </div>
          ) : (
            workflow.triggers.map((trig, idx) => {
              const meta = getEventMeta(trig.event_type);
              const Icon = meta.icon;
              const nodeKey = `trigger-${idx}`;
              const pos = nodePositions[nodeKey] || { x: 0, y: 0 };

              return (
                <div key={idx} className="flex items-center gap-4 shrink-0">
                  <div
                    onMouseDown={(e) => handleMouseDown(nodeKey, e)}
                    style={{
                      transform: `translate(${pos.x}px, ${pos.y}px)`,
                    }}
                    className={`group relative p-4 rounded-2xl bg-gradient-to-br from-violet-950/60 via-slate-900 to-slate-950 border border-violet-500/40 shadow-xl shadow-violet-950/30 hover:border-violet-400 transition-shadow cursor-grab active:cursor-grabbing min-w-[210px] ${
                      draggingNodeKey === nodeKey ? "z-20 border-violet-400 shadow-2xl scale-[1.02]" : "z-10"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        Trigger
                      </span>
                      <Move className="h-3 w-3 text-slate-600 group-hover:text-slate-400 transition-colors" />
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-violet-600 text-white shadow-md shadow-violet-600/30">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-slate-100 block">{meta.label}</span>
                        <span className="text-[11px] text-slate-400">Listens live</span>
                      </div>
                    </div>
                  </div>

                  {/* Flow Connector Arrow in Linear Mode */}
                  {layoutMode === "linear" && (
                    <div className="flex items-center justify-center text-violet-400">
                      <ArrowRight className="h-5 w-5 animate-pulse" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Action Sequence */}
          {sortedActions.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-slate-500 text-xs">
              No actions in flow yet
            </div>
          ) : (
            sortedActions.map((action, idx) => {
              const meta = getActionMeta(action.action_type);
              const Icon = meta.icon;
              const nodeKey = `action-${idx}`;
              const pos = nodePositions[nodeKey] || { x: 0, y: 0 };
              const isLast = idx === sortedActions.length - 1;

              return (
                <div key={idx} className="flex items-center gap-4 shrink-0">
                  <div
                    onMouseDown={(e) => handleMouseDown(nodeKey, e)}
                    style={{
                      transform: `translate(${pos.x}px, ${pos.y}px)`,
                    }}
                    className={`group relative p-4 rounded-2xl bg-gradient-to-br from-indigo-950/50 via-slate-900 to-slate-950 border border-indigo-500/30 shadow-xl hover:border-indigo-400 transition-shadow cursor-grab active:cursor-grabbing min-w-[240px] ${
                      draggingNodeKey === nodeKey ? "z-20 border-indigo-400 shadow-2xl scale-[1.02]" : "z-10"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center justify-center h-5 w-5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-[10px] border border-indigo-500/30">
                        {action.order}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {meta.badge}
                        </span>
                        <Move className="h-3 w-3 text-slate-600 group-hover:text-slate-400 transition-colors" />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-sm text-slate-100">{meta.label}</span>
                    </div>

                    {/* Action Payloads Snippets */}
                    {action.action_type === "whatsapp_message" && action.payload && (
                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1 text-[11px] text-slate-400">
                        {action.payload.phone_number && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Phone className="h-3 w-3 text-emerald-400 shrink-0" />
                            <span className="truncate">{action.payload.phone_number}</span>
                          </div>
                        )}
                        {action.payload.message_template && (
                          <div className="flex items-start gap-1.5">
                            <FileText className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2 italic text-slate-300">
                              "{action.payload.message_template}"
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {action.action_type === "send_email" && action.payload && (
                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1 text-[11px] text-slate-400">
                        {action.payload.email && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Mail className="h-3 w-3 text-sky-400 shrink-0" />
                            <span className="truncate">{action.payload.email}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Flow Connector Arrow in Linear Mode */}
                  {layoutMode === "linear" && !isLast && (
                    <div className="flex items-center justify-center text-indigo-400 opacity-70">
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
