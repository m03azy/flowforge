import { useState, useEffect, useCallback } from "react";

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────
interface AuditLogEntry {
  id: number;
  actor_id: number | null;
  actor_email: string | null;
  actor_role: string | null;
  organisation_name: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  description: string | null;
  ip_address: string | null;
  status: string;
  timestamp: string;
}

interface AuditLogListResponse {
  total: number;
  page: number;
  page_size: number;
  items: AuditLogEntry[];
}

interface AuditSummary {
  total_logs: number;
  total_failures: number;
  breakdown: Record<string, { success: number; failure: number; warning: number; total: number }>;
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
const ACTION_CATEGORIES: Record<string, { label: string; color: string; icon: string }> = {
  USER_LOGIN: { label: "Login", color: "#22c55e", icon: "🔓" },
  USER_LOGIN_FAILED: { label: "Login Failed", color: "#ef4444", icon: "🚫" },
  USER_LOGOUT: { label: "Logout", color: "#64748b", icon: "🔒" },
  USER_REGISTERED: { label: "Registered", color: "#3b82f6", icon: "✨" },
  USER_CREATED: { label: "User Created", color: "#8b5cf6", icon: "👤" },
  USER_UPDATED: { label: "User Updated", color: "#f59e0b", icon: "✏️" },
  USER_DEACTIVATED: { label: "User Deactivated", color: "#ef4444", icon: "🗑️" },
  PASSWORD_CHANGED: { label: "Password Changed", color: "#06b6d4", icon: "🔑" },
  PASSWORD_RESET_REQUESTED: { label: "Reset Requested", color: "#f97316", icon: "📧" },
  PASSWORD_RESET: { label: "Password Reset", color: "#10b981", icon: "🔐" },
  LEAD_CREATED: { label: "Lead Created", color: "#3b82f6", icon: "💼" },
  LEAD_UPDATED: { label: "Lead Updated", color: "#f59e0b", icon: "💼" },
  LEAD_DELETED: { label: "Lead Deleted", color: "#ef4444", icon: "💼" },
  BOOKING_CREATED: { label: "Booking Created", color: "#22c55e", icon: "📅" },
  BOOKING_UPDATED: { label: "Booking Updated", color: "#f59e0b", icon: "📅" },
  BOOKING_DELETED: { label: "Booking Deleted", color: "#ef4444", icon: "📅" },
  WORKFLOW_CREATED: { label: "Workflow Created", color: "#8b5cf6", icon: "⚡" },
  WORKFLOW_TRIGGERED: { label: "Workflow Triggered", color: "#06b6d4", icon: "⚡" },
  PRODUCT_CREATED: { label: "Product Created", color: "#22c55e", icon: "📦" },
  TRANSACTION_CREATED: { label: "Transaction", color: "#10b981", icon: "💰" },
  BILLING_PLAN_UPGRADED: { label: "Plan Upgraded", color: "#f59e0b", icon: "⭐" },
  ADDON_REQUESTED: { label: "Add-on Requested", color: "#8b5cf6", icon: "🔧" },
};

function getActionMeta(action: string) {
  return ACTION_CATEGORIES[action] ?? { label: action, color: "#94a3b8", icon: "📋" };
}

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const API = (window as any).__API_BASE__ ?? "http://localhost:8000";

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────
export default function AuditLogs({ token }: { token: string }) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [filterAction, setFilterAction] = useState("");
  const [filterResource, setFilterResource] = useState("");
  const [filterEmail, setFilterEmail] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const PAGE_SIZE = 20;

  const fetchLogs = useCallback(async (pg = 1) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(pg),
        page_size: String(PAGE_SIZE),
      });
      if (filterAction) params.set("action", filterAction);
      if (filterResource) params.set("resource_type", filterResource);
      if (filterEmail) params.set("actor_email", filterEmail);
      if (filterStatus) params.set("status", filterStatus);

      const res = await fetch(`${API}/api/audit/?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).detail ?? "Failed to load audit logs");
      const data: AuditLogListResponse = await res.json();
      setLogs(data.items);
      setTotal(data.total);
      setPage(pg);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, filterAction, filterResource, filterEmail, filterStatus]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/audit/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setSummary(await res.json());
    } catch {/* silent */}
  }, [token]);

  useEffect(() => { fetchLogs(1); fetchSummary(); }, []);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={styles.page}>
      {/* ── Header ── */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🛡️ Audit Logs</h1>
          <p style={styles.subtitle}>Complete activity trail for your organisation</p>
        </div>
        <button style={styles.refreshBtn} onClick={() => { fetchLogs(1); fetchSummary(); }}>
          🔄 Refresh
        </button>
      </div>

      {/* ── Summary Cards ── */}
      {summary && (
        <div style={styles.summaryGrid}>
          <div style={{ ...styles.summaryCard, borderColor: "#3b82f6" }}>
            <div style={styles.summaryIcon}>📋</div>
            <div style={styles.summaryValue}>{summary.total_logs.toLocaleString()}</div>
            <div style={styles.summaryLabel}>Total Events</div>
          </div>
          <div style={{ ...styles.summaryCard, borderColor: "#ef4444" }}>
            <div style={styles.summaryIcon}>⚠️</div>
            <div style={{ ...styles.summaryValue, color: "#ef4444" }}>{summary.total_failures.toLocaleString()}</div>
            <div style={styles.summaryLabel}>Failed Actions</div>
          </div>
          <div style={{ ...styles.summaryCard, borderColor: "#22c55e" }}>
            <div style={styles.summaryIcon}>✅</div>
            <div style={{ ...styles.summaryValue, color: "#22c55e" }}>
              {(summary.total_logs - summary.total_failures).toLocaleString()}
            </div>
            <div style={styles.summaryLabel}>Successful Events</div>
          </div>
          <div style={{ ...styles.summaryCard, borderColor: "#8b5cf6" }}>
            <div style={styles.summaryIcon}>🔑</div>
            <div style={styles.summaryValue}>
              {Object.values(summary.breakdown).filter(b => b.total > 0).length}
            </div>
            <div style={styles.summaryLabel}>Unique Actions</div>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div style={styles.filterBar}>
        <input
          style={styles.filterInput}
          placeholder="🔍 Filter by action (e.g. USER_LOGIN)"
          value={filterAction}
          onChange={e => setFilterAction(e.target.value)}
          onKeyDown={e => e.key === "Enter" && fetchLogs(1)}
        />
        <input
          style={styles.filterInput}
          placeholder="📂 Resource type (e.g. user, lead)"
          value={filterResource}
          onChange={e => setFilterResource(e.target.value)}
          onKeyDown={e => e.key === "Enter" && fetchLogs(1)}
        />
        <input
          style={styles.filterInput}
          placeholder="👤 Actor email"
          value={filterEmail}
          onChange={e => setFilterEmail(e.target.value)}
          onKeyDown={e => e.key === "Enter" && fetchLogs(1)}
        />
        <select
          style={{ ...styles.filterInput, cursor: "pointer" }}
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="success">✅ Success</option>
          <option value="failure">❌ Failure</option>
          <option value="warning">⚠️ Warning</option>
        </select>
        <button style={styles.searchBtn} onClick={() => fetchLogs(1)}>Search</button>
        <button style={styles.clearBtn} onClick={() => {
          setFilterAction(""); setFilterResource(""); setFilterEmail(""); setFilterStatus("");
          setTimeout(() => fetchLogs(1), 50);
        }}>Clear</button>
      </div>

      {/* ── Error ── */}
      {error && <div style={styles.errorBanner}>⚠️ {error}</div>}

      {/* ── Table ── */}
      <div style={styles.tableWrapper}>
        {loading ? (
          <div style={styles.loader}>
            <div style={styles.spinner} />
            <p style={{ color: "#94a3b8", marginTop: 12 }}>Loading audit trail…</p>
          </div>
        ) : logs.length === 0 ? (
          <div style={styles.empty}>
            <div style={{ fontSize: 48 }}>🛡️</div>
            <p style={{ color: "#94a3b8", marginTop: 8 }}>No audit events found for the current filters.</p>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                {["#", "Timestamp", "Action", "Actor", "Resource", "IP Address", "Status"].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => {
                const meta = getActionMeta(log.action);
                return (
                  <tr
                    key={log.id}
                    style={{
                      ...styles.tr,
                      background: idx % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                      cursor: "pointer",
                    }}
                    onClick={() => setSelectedLog(log)}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.08)")}
                    onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent")}
                  >
                    <td style={{ ...styles.td, color: "#64748b", fontSize: 12 }}>#{log.id}</td>
                    <td style={styles.td}>
                      <div style={{ fontSize: 13, color: "#e2e8f0" }}>{formatTimestamp(log.timestamp)}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{timeAgo(log.timestamp)}</div>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "3px 10px", borderRadius: 20,
                        background: `${meta.color}18`,
                        border: `1px solid ${meta.color}40`,
                        color: meta.color, fontSize: 12, fontWeight: 600,
                      }}>
                        {meta.icon} {meta.label}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontSize: 13, color: "#e2e8f0" }}>{log.actor_email ?? "—"}</div>
                      {log.actor_role && (
                        <div style={{ fontSize: 11, color: "#64748b", textTransform: "capitalize" }}>{log.actor_role}</div>
                      )}
                    </td>
                    <td style={styles.td}>
                      {log.resource_type ? (
                        <span style={{ color: "#94a3b8", fontSize: 12 }}>
                          {log.resource_type}{log.resource_id ? ` #${log.resource_id}` : ""}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ ...styles.td, fontSize: 12, color: "#64748b", fontFamily: "monospace" }}>
                      {log.ip_address ?? "—"}
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                        background: log.status === "success" ? "#22c55e18"
                          : log.status === "failure" ? "#ef444418" : "#f59e0b18",
                        color: log.status === "success" ? "#22c55e"
                          : log.status === "failure" ? "#ef4444" : "#f59e0b",
                        border: `1px solid ${log.status === "success" ? "#22c55e40"
                          : log.status === "failure" ? "#ef444440" : "#f59e0b40"}`,
                        textTransform: "uppercase",
                      }}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ── */}
      {!loading && totalPages > 1 && (
        <div style={styles.pagination}>
          <span style={{ color: "#64748b", fontSize: 13 }}>
            Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()} events
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...styles.pageBtn, opacity: page <= 1 ? 0.4 : 1 }}
              disabled={page <= 1} onClick={() => fetchLogs(page - 1)}>← Prev</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
              return (
                <button key={p} style={{
                  ...styles.pageBtn,
                  background: p === page ? "#3b82f6" : "rgba(255,255,255,0.05)",
                  color: p === page ? "#fff" : "#94a3b8",
                }} onClick={() => fetchLogs(p)}>{p}</button>
              );
            })}
            <button style={{ ...styles.pageBtn, opacity: page >= totalPages ? 0.4 : 1 }}
              disabled={page >= totalPages} onClick={() => fetchLogs(page + 1)}>Next →</button>
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {selectedLog && (
        <div style={styles.modalOverlay} onClick={() => setSelectedLog(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <div style={{ fontSize: 20 }}>🔍 Event Detail</div>
                <div style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>ID #{selectedLog.id}</div>
              </div>
              <button style={styles.closeBtn} onClick={() => setSelectedLog(null)}>✕</button>
            </div>
            <div style={styles.modalBody}>
              {[
                ["Action", `${getActionMeta(selectedLog.action).icon} ${selectedLog.action}`],
                ["Status", selectedLog.status.toUpperCase()],
                ["Timestamp", formatTimestamp(selectedLog.timestamp)],
                ["Actor Email", selectedLog.actor_email ?? "—"],
                ["Actor Role", selectedLog.actor_role ?? "—"],
                ["Organisation", selectedLog.organisation_name ?? "—"],
                ["Resource Type", selectedLog.resource_type ?? "—"],
                ["Resource ID", selectedLog.resource_id ?? "—"],
                ["IP Address", selectedLog.ip_address ?? "—"],
                ["Description", selectedLog.description ?? "—"],
              ].map(([label, value]) => (
                <div key={label} style={styles.detailRow}>
                  <span style={styles.detailLabel}>{label}</span>
                  <span style={styles.detailValue}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: "28px 32px",
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    minHeight: "100vh",
    fontFamily: "'Inter', sans-serif",
    color: "#e2e8f0",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: 28,
  },
  title: {
    fontSize: 28, fontWeight: 800, margin: 0,
    background: "linear-gradient(135deg, #60a5fa, #a78bfa)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
  },
  subtitle: { color: "#64748b", margin: "4px 0 0", fontSize: 14 },
  refreshBtn: {
    padding: "8px 18px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.05)", color: "#94a3b8",
    cursor: "pointer", fontSize: 13, fontWeight: 600,
  },
  summaryGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 16, marginBottom: 24,
  },
  summaryCard: {
    background: "rgba(255,255,255,0.04)", borderRadius: 14,
    border: "1px solid", padding: "20px 24px",
    textAlign: "center" as const,
  },
  summaryIcon: { fontSize: 28, marginBottom: 8 },
  summaryValue: { fontSize: 32, fontWeight: 800, color: "#e2e8f0" },
  summaryLabel: { fontSize: 12, color: "#64748b", marginTop: 4, fontWeight: 500 },
  filterBar: {
    display: "flex", flexWrap: "wrap" as const, gap: 10, marginBottom: 20,
  },
  filterInput: {
    flex: "1 1 180px", padding: "9px 14px", borderRadius: 10,
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    color: "#e2e8f0", fontSize: 13, outline: "none",
  },
  searchBtn: {
    padding: "9px 20px", borderRadius: 10, background: "#3b82f6",
    border: "none", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13,
  },
  clearBtn: {
    padding: "9px 16px", borderRadius: 10,
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    color: "#94a3b8", cursor: "pointer", fontSize: 13,
  },
  errorBanner: {
    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
    color: "#fca5a5", padding: "12px 16px", borderRadius: 10, marginBottom: 16, fontSize: 14,
  },
  tableWrapper: {
    background: "rgba(255,255,255,0.03)", borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden",
  },
  loader: { padding: 60, textAlign: "center" as const },
  spinner: {
    width: 36, height: 36, border: "3px solid rgba(255,255,255,0.1)",
    borderTop: "3px solid #3b82f6", borderRadius: "50%",
    animation: "spin 0.8s linear infinite", margin: "0 auto",
  },
  empty: { padding: 60, textAlign: "center" as const },
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: {
    padding: "12px 16px", fontSize: 11, fontWeight: 700,
    textTransform: "uppercase" as const, letterSpacing: "0.06em",
    color: "#64748b", textAlign: "left" as const,
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(0,0,0,0.2)",
  },
  tr: { transition: "background 0.15s ease", borderBottom: "1px solid rgba(255,255,255,0.04)" },
  td: { padding: "12px 16px", verticalAlign: "middle" as const },
  pagination: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginTop: 20, padding: "0 4px",
  },
  pageBtn: {
    padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.05)", color: "#94a3b8",
    cursor: "pointer", fontSize: 13, fontWeight: 500,
  },
  modalOverlay: {
    position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.7)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    backdropFilter: "blur(4px)",
  },
  modal: {
    background: "#1e293b", borderRadius: 18, width: "90%", maxWidth: 520,
    border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden",
    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
  },
  modalHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(255,255,255,0.02)",
  },
  closeBtn: {
    background: "rgba(255,255,255,0.07)", border: "none", color: "#94a3b8",
    width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 16,
  },
  modalBody: { padding: 24 },
  detailRow: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", gap: 16,
  },
  detailLabel: { fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.04em", flexShrink: 0 },
  detailValue: { fontSize: 13, color: "#e2e8f0", textAlign: "right" as const, wordBreak: "break-all" as const },
};
