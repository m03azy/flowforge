import { useState } from "react";
import {
  Sparkles,
  RefreshCw,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  DollarSign,
  Users,
  Package,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Download
} from "lucide-react";

interface ReportData {
  report: string;
  data_snapshot: any;
  generated_at: string;
}

// Lightweight markdown-to-HTML renderer (no library needed)
function renderMarkdown(md: string): string {
  return md
    // Headers
    .replace(/^#### (.+)$/gm, '<h4 class="text-base font-bold text-slate-800 dark:text-slate-200 mt-4 mb-2">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold text-slate-900 dark:text-white mt-6 mb-3 flex items-center gap-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-3 pb-2 border-b border-slate-200 dark:border-slate-700">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-extrabold text-slate-900 dark:text-white mb-4">$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em class="italic text-slate-700 dark:text-slate-300">$1</em>')
    // Code inline
    .replace(/`(.+?)`/g, '<code class="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-violet-600 dark:text-violet-400 text-sm font-mono">$1</code>')
    // Bullet list items
    .replace(/^[\s]*[-*] (.+)$/gm, '<li class="flex items-start gap-2 text-slate-700 dark:text-slate-300 text-sm my-1"><span class="mt-1.5 h-1.5 w-1.5 rounded-full bg-violet-500 shrink-0"></span><span>$1</span></li>')
    // Numbered list items
    .replace(/^(\d+)\. (.+)$/gm, '<li class="flex items-start gap-3 text-slate-700 dark:text-slate-300 text-sm my-1.5"><span class="shrink-0 h-5 w-5 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center">$1</span><span>$2</span></li>')
    // Wrap consecutive <li> elements in a ul/ol (simplified)
    .replace(/(<li[^>]*>[\s\S]*?<\/li>\n?)+/g, (match) => `<ul class="space-y-1 my-3 pl-1">${match}</ul>`)
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="border-slate-200 dark:border-slate-700 my-6" />')
    // Paragraphs (empty lines become paragraphs)
    .replace(/\n\n([^<])/g, '\n\n<p class="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mb-3">$1')
    .replace(/([^>])\n\n/g, '$1</p>\n\n');
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

export default function AiReports({ token }: { token: string }) {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSnapshot, setShowSnapshot] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    setError("");
    setReport(null);

    try {
      const res = await fetch("http://localhost:8000/api/reports/generate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to generate report");
      }

      setReport(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;
    const blob = new Blob([report.report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `business-report-${report.generated_at.replace(/ /g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const snap = report?.data_snapshot;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-1.5 bg-violet-100 dark:bg-violet-950/50 rounded-lg">
              <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">
              Powered by Gemini AI
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            AI Business Reports
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Generate an intelligent business intelligence report based on your live data.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {report && (
            <button
              onClick={downloadReport}
              className="inline-flex items-center gap-2 py-2.5 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm self-start"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          )}
          <button
            onClick={generateReport}
            disabled={loading}
            className="inline-flex items-center gap-2 py-2.5 px-5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-xl shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 active:scale-[0.98] transition-all self-start"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <RefreshCw className="h-5 w-5" />
            )}
            {loading ? "Generating…" : report ? "Regenerate Report" : "Generate Report"}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-start gap-3 p-5 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-900/50">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Failed to generate report</p>
            <p className="text-sm mt-1 opacity-80">{error}</p>
            {error.includes("GEMINI_API_KEY") && (
              <div className="mt-3 p-3 bg-red-100 dark:bg-red-950/50 rounded-xl text-xs font-mono">
                Add to <strong>.env.backend</strong>:<br />
                GEMINI_API_KEY=your_api_key_here
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 shadow-sm">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-violet-100 dark:border-violet-950/40 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="h-7 w-7 text-violet-600 dark:text-violet-400 animate-bounce" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <p className="font-bold text-slate-900 dark:text-white">Analyzing your business data…</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Gemini is reviewing your CRM, finances, and inventory to generate insights.
            </p>
          </div>
        </div>
      )}

      {/* Report & Snapshot */}
      {report && !loading && (
        <>
          {/* Quick Metrics from snapshot */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              icon={DollarSign}
              label="Net Profit"
              value={`$${snap?.accounting?.all_time?.net_profit?.toLocaleString() ?? 0}`}
              color={`${snap?.accounting?.all_time?.net_profit >= 0 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"}`}
            />
            <MetricCard
              icon={TrendingUp}
              label="CRM Pipeline"
              value={`$${snap?.crm?.pipeline_value?.toLocaleString() ?? 0}`}
              color="bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400"
            />
            <MetricCard
              icon={Package}
              label="SKUs in Stock"
              value={`${snap?.inventory?.total_products ?? 0} products`}
              color="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400"
            />
            <MetricCard
              icon={Users}
              label="Active Team"
              value={`${snap?.team?.active_employees ?? 0} members`}
              color="bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400"
            />
          </div>

          {/* Alert banners for critical inventory issues */}
          {(snap?.inventory?.out_of_stock_count > 0 || snap?.inventory?.low_stock_count > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {snap?.inventory?.out_of_stock_count > 0 && (
                <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-2xl">
                  <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-rose-700 dark:text-rose-300">Out of Stock Alert</p>
                    <p className="text-xs text-rose-600 dark:text-rose-400">{snap.inventory.out_of_stock_count} product(s) need immediate restocking</p>
                  </div>
                </div>
              )}
              {snap?.inventory?.low_stock_count > 0 && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 rounded-2xl">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-amber-700 dark:text-amber-300">Low Stock Warning</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">{snap.inventory.low_stock_count} product(s) running low on inventory</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Main AI Report */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            {/* Report header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-100 dark:bg-violet-950/50 rounded-xl">
                  <BarChart3 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">AI Business Intelligence Report</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Generated on {report.generated_at}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30 rounded-full">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Report Ready</span>
              </div>
            </div>

            {/* Rendered markdown */}
            <div
              className="p-8 prose-sm max-w-none leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(report.report) }}
            />
          </div>

          {/* Raw Data Snapshot (collapsible) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => setShowSnapshot(!showSnapshot)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                📋 Raw Data Snapshot
              </span>
              {showSnapshot ? (
                <ChevronUp className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </button>
            {showSnapshot && (
              <div className="px-6 pb-6">
                <pre className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl overflow-auto max-h-96 border border-slate-100 dark:border-slate-800">
                  {JSON.stringify(report.data_snapshot, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && !report && !error && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-16 flex flex-col items-center justify-center gap-5 shadow-sm text-center">
          <div className="p-5 bg-violet-50 dark:bg-violet-950/30 rounded-2xl border border-violet-100 dark:border-violet-900/30">
            <Sparkles className="h-10 w-10 text-violet-500 dark:text-violet-400" />
          </div>
          <div className="space-y-2 max-w-md">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Your AI Analyst is Ready
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Click <strong className="text-slate-700 dark:text-slate-300">"Generate Report"</strong> to get a comprehensive business intelligence report powered by Google Gemini. It will analyze your CRM leads, financials, inventory, and team metrics in real-time.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-lg mt-2">
            {[
              { icon: DollarSign, label: "Financial Analysis", color: "text-emerald-500" },
              { icon: TrendingUp, label: "Sales Insights", color: "text-violet-500" },
              { icon: Package, label: "Stock Health", color: "text-indigo-500" },
              { icon: AlertTriangle, label: "Risk Alerts", color: "text-amber-500" },
            ].map(({ icon: Icon, label, color }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700"
              >
                <Icon className={`h-5 w-5 ${color}`} />
                <span className="text-xs text-slate-600 dark:text-slate-400 text-center font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
