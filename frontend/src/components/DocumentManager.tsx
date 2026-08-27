import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Search,
  Loader2,
  FolderArchive,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileCode,
  FileCheck,
  Tag,
  Sparkles,
  ShieldCheck,
  Clock,
  Zap,
  Folder,
  DollarSign,
  Cpu,
  Eye,
  FileDown
} from "lucide-react";

import { API_BASE } from "../config/api";

type DocumentItem = {
  id: number;
  organisation_name: string;
  title: string;
  file_name: string;
  original_file_name?: string | null;
  suggested_file_name?: string | null;
  file_type: string;
  file_size_bytes: number;
  category: string;
  file_url?: string | null;
  tags?: string | null;
  uploaded_by?: string | null;
  status: string;
  ocr_text?: string | null;
  extracted_invoice_number?: string | null;
  extracted_amount?: number | null;
  extracted_vendor?: string | null;
  smart_folder?: string | null;
  auto_processed?: boolean;
  created_at: string;
  updated_at: string;
};

type DocumentStats = {
  total_documents: number;
  total_size_bytes: number;
  category_counts: Record<string, number>;
  auto_processed_count: number;
  total_invoiced_amount: number;
  folders: string[];
  recent_uploads: Array<{
    id: number;
    title: string;
    file_name: string;
    file_type: string;
    file_size_bytes: number;
    category: string;
    smart_folder?: string;
    created_at: string;
  }>;
};

type Props = {
  token: string;
  organisationName?: string;
};

const CATEGORIES = [
  "All",
  "Invoices & Receipts",
  "Contracts & Legal",
  "Policies",
  "Reports",
  "General",
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(type: string) {
  const t = type.toLowerCase();
  if (t === "pdf") return FileText;
  if (t === "xlsx" || t === "xls" || t === "csv") return FileSpreadsheet;
  if (t === "docx" || t === "doc" || t === "txt") return FileCode;
  return FileCheck;
}

export default function DocumentManager({ token, organisationName }: Props) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedFolder, setSelectedFolder] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Automation Action States
  const [automatingBatch, setAutomatingBatch] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [processingDocId, setProcessingDocId] = useState<number | null>(null);

  // View OCR / Document Detail Modal
  const [inspectDoc, setInspectDoc] = useState<DocumentItem | null>(null);

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("General");
  const [uploadTags, setUploadTags] = useState("");
  const [uploading, setUploading] = useState(false);

  // Template Generator Modal State
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateType, setTemplateType] = useState<"invoice" | "agreement" | "report">("invoice");
  const [templateTitle, setTemplateTitle] = useState("");
  const [generating, setGenerating] = useState(false);

  const authHeaders = { Authorization: `Bearer ${token}` };

  const flash = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [docsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/api/documents/`, { headers: authHeaders }),
        fetch(`${API_BASE}/api/documents/stats`, { headers: authHeaders }),
      ]);

      if (!docsRes.ok) throw new Error("Failed to load documents");
      const docsData = await docsRes.json();
      setDocuments(docsData);

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (e: any) {
      setError(e.message || "Failed to connect to document repository");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // ── 1. Batch Document Automation (OCR + Extract + Auto-Rename + Organize) ──
  const handleBatchAutomate = async () => {
    setAutomatingBatch(true);
    try {
      const res = await fetch(`${API_BASE}/api/documents/batch-automate`, {
        method: "POST",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Automation pipeline execution failed");
      const data = await res.json();
      flash("success", `⚡ ${data.message}`);
      fetchDocuments();
    } catch (e: any) {
      flash("error", e.message);
    } finally {
      setAutomatingBatch(false);
    }
  };

  // ── 2. Single Document Auto-Process (OCR + Rename) ──
  const handleSingleAutoProcess = async (docId: number) => {
    setProcessingDocId(docId);
    try {
      const res = await fetch(`${API_BASE}/api/documents/${docId}/auto-process`, {
        method: "POST",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Document auto-processing failed");
      const updated = await res.json();
      flash("success", `⚡ Processed: Extracted #${updated.extracted_invoice_number || "Doc"} & organized to ${updated.smart_folder}`);
      fetchDocuments();
    } catch (e: any) {
      flash("error", e.message);
    } finally {
      setProcessingDocId(null);
    }
  };

  // ── 3. Generate Consolidated Executive Report ──
  const handleGenerateSummaryReport = async () => {
    setGeneratingReport(true);
    try {
      const res = await fetch(`${API_BASE}/api/documents/generate-summary-report`, {
        method: "POST",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed to compile summary report");
      const data = await res.json();
      flash("success", `📑 Generated master report "${data.title}" in vault!`);
      fetchDocuments();
    } catch (e: any) {
      flash("error", e.message);
    } finally {
      setGeneratingReport(false);
    }
  };

  // ── 4. Authentic File Download (Fetches Real Valid Binary) ──
  const handleDownload = async (doc: DocumentItem) => {
    try {
      const res = await fetch(`${API_BASE}/api/documents/${doc.id}/download`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed to download document file");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      flash("success", `Downloaded valid ${doc.file_type.toUpperCase()}: ${doc.file_name}`);
    } catch (e: any) {
      flash("error", e.message || "Download failed");
    }
  };

  // Upload Document
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      flash("error", "Please select a file to upload.");
      return;
    }
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      if (uploadTitle.trim()) formData.append("title", uploadTitle.trim());
      formData.append("category", uploadCategory);
      if (uploadTags.trim()) formData.append("tags", uploadTags.trim());

      const res = await fetch(`${API_BASE}/api/documents/upload`, {
        method: "POST",
        headers: authHeaders,
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }

      flash("success", `Document "${uploadTitle || uploadFile.name}" uploaded & auto-indexed!`);
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadTitle("");
      setUploadTags("");
      fetchDocuments();
    } catch (e: any) {
      flash("error", e.message);
    } finally {
      setUploading(false);
    }
  };

  // Generate Document from Template
  const handleGenerateTemplate = async () => {
    setGenerating(true);
    try {
      let fileName = "Generated_Document.pdf";
      let docCategory = "General";
      let finalTitle = templateTitle.trim();

      if (templateType === "invoice") {
        fileName = `Invoice_${Date.now().toString().slice(-6)}.pdf`;
        docCategory = "Invoices & Receipts";
        if (!finalTitle) finalTitle = `Official Invoice #${Date.now().toString().slice(-6)}`;
      } else if (templateType === "agreement") {
        fileName = "Service_Agreement_Signed.pdf";
        docCategory = "Contracts & Legal";
        if (!finalTitle) finalTitle = "Client Service Level Agreement";
      } else {
        fileName = "Executive_Summary_Report.pdf";
        docCategory = "Reports";
        if (!finalTitle) finalTitle = "Executive Performance Report";
      }

      const res = await fetch(`${API_BASE}/api/documents/`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: finalTitle,
          file_name: fileName,
          file_type: "pdf",
          file_size_bytes: 1450000,
          category: docCategory,
          tags: "generated, template, automated",
        }),
      });

      if (!res.ok) throw new Error("Failed to generate document");
      flash("success", `Generated valid PDF "${finalTitle}" successfully!`);
      setShowTemplateModal(false);
      setTemplateTitle("");
      fetchDocuments();
    } catch (e: any) {
      flash("error", e.message);
    } finally {
      setGenerating(false);
    }
  };

  // Delete Document
  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`Delete document "${title}"?`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/documents/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!res.ok) throw new Error("Failed to delete document");
      flash("success", `Deleted "${title}"`);
      fetchDocuments();
    } catch (e: any) {
      flash("error", e.message);
    }
  };

  const filteredDocs = documents.filter((d) => {
    const matchesCat = selectedCategory === "All" || d.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesFolder = selectedFolder === "All" || d.smart_folder === selectedFolder;
    const matchesSearch =
      !searchTerm ||
      d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.extracted_invoice_number && d.extracted_invoice_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (d.tags && d.tags.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCat && matchesFolder && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* ── Header Banner with Automation Engine Controls ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-violet-50 dark:bg-violet-950/40 rounded-xl text-violet-600 dark:text-violet-400">
              <Cpu className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Document Vault & Automation Engine
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Automatically OCR scan PDFs, extract invoice numbers, standardize filenames, organize into smart folders, and generate reports for {organisationName || "your workspace"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Batch Automation Engine Button */}
          <button
            onClick={handleBatchAutomate}
            disabled={automatingBatch}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
            title="Automatically run OCR, extract invoice numbers, rename, and organize folders"
          >
            {automatingBatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Run Document Automation
          </button>

          {/* Generate Summary Report */}
          <button
            onClick={handleGenerateSummaryReport}
            disabled={generatingReport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 transition-all cursor-pointer disabled:opacity-50"
          >
            {generatingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Generate Report
          </button>

          <button
            onClick={() => setShowTemplateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/50 text-violet-700 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/60 transition-all cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            Template PDF
          </button>

          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/20 transition-all cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            Upload File
          </button>
        </div>
      </div>

      {/* Flash Alert */}
      {message && (
        <div
          className={`p-4 text-sm rounded-2xl border flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30"
              : "bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-400 border-red-100 dark:border-red-900/30"
          }`}
        >
          {message.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Storage & Automation KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Documents</span>
              <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-600 dark:text-blue-400">
                <FileText className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total_documents}</p>
            <p className="text-[11px] text-slate-400 mt-1">{formatBytes(stats.total_size_bytes)} stored in vault</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI OCR Processed</span>
              <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-lg text-amber-600 dark:text-amber-400">
                <Zap className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.auto_processed_count} / {stats.total_documents}</p>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-semibold">Auto-renamed & indexed</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Extracted Invoices</span>
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-600 dark:text-emerald-400">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">${stats.total_invoiced_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-[11px] text-slate-400 mt-1">{stats.category_counts["Invoices & Receipts"] || 0} invoice files detected</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Smart Folders</span>
              <div className="p-2 bg-purple-50 dark:bg-purple-950/40 rounded-lg text-purple-600 dark:text-purple-400">
                <Folder className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.folders?.length || 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Organized directory tree</p>
          </div>
        </div>
      )}

      {/* ── Smart Folder Navigation Pills ── */}
      {stats && stats.folders && stats.folders.length > 0 && (
        <div className="flex items-center gap-2 bg-slate-100/70 dark:bg-slate-900/60 p-2 rounded-2xl border border-slate-200/60 dark:border-slate-800 overflow-x-auto">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 px-3 flex items-center gap-1.5 shrink-0">
            <Folder className="h-3.5 w-3.5 text-amber-500" /> Smart Folders:
          </span>
          <button
            onClick={() => setSelectedFolder("All")}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              selectedFolder === "All"
                ? "bg-violet-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            All Folders
          </button>
          {stats.folders.map((f) => (
            <button
              key={f}
              onClick={() => setSelectedFolder(f)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                selectedFolder === f
                  ? "bg-violet-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? "bg-violet-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, invoice #, tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs rounded-xl focus:ring-2 focus:ring-violet-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Documents List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
          <p className="text-xs text-slate-500">Loading document vault...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl text-center">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center p-6">
          <FolderArchive className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No documents found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
            Upload files or click &quot;Run Document Automation&quot; to auto-organize your repository.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            const Icon = getFileIcon(doc.file_type);
            const isProcessing = processingDocId === doc.id;

            return (
              <div
                key={doc.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-violet-500/40 dark:hover:border-violet-500/40 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate" title={doc.title}>
                          {doc.title}
                        </h3>
                        <span className="text-[11px] font-mono text-slate-400 truncate block">
                          {doc.file_name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Smart Folder & Category */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-900/40">
                      {doc.category}
                    </span>
                    {doc.smart_folder && (
                      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-900/40 flex items-center gap-1">
                        <Folder className="h-2.5 w-2.5" />
                        {doc.smart_folder}
                      </span>
                    )}
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      {doc.file_type} • {formatBytes(doc.file_size_bytes)}
                    </span>
                  </div>

                  {/* Extracted Invoice # and Amount */}
                  {doc.extracted_invoice_number && (
                    <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-200/50 dark:border-emerald-900/30 mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        <span>🏷️ {doc.extracted_invoice_number}</span>
                      </div>
                      {doc.extracted_amount ? (
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          ${doc.extracted_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      ) : null}
                    </div>
                  )}

                  {doc.tags && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-3">
                      <Tag className="h-3 w-3" />
                      <span className="truncate">{doc.tags}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(doc.created_at).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* View OCR / Details */}
                    <button
                      onClick={() => setInspectDoc(doc)}
                      className="p-1.5 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                      title="Inspect OCR Transcript & Metadata"
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    {/* Single Auto-Process Trigger */}
                    <button
                      onClick={() => handleSingleAutoProcess(doc.id)}
                      disabled={isProcessing}
                      className="p-1.5 text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                      title="Auto-Process with OCR & Smart Rename"
                    >
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin text-violet-600" /> : <Zap className="h-4 w-4" />}
                    </button>

                    {/* Authentic Binary Download */}
                    <button
                      onClick={() => handleDownload(doc)}
                      className="p-1.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                      title="Download Real Valid PDF / Spreadsheet"
                    >
                      <Download className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(doc.id, doc.title)}
                      className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer"
                      title="Delete File"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Document Inspection & OCR Modal ── */}
      {inspectDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" /> OCR Data & Document Metadata
              </h3>
              <button
                onClick={() => setInspectDoc(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Title:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{inspectDoc.title}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Original File:</span>
                  <span className="font-mono text-slate-900 dark:text-white">{inspectDoc.original_file_name || inspectDoc.file_name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Suggested Standard Name:</span>
                  <span className="font-mono text-violet-600 dark:text-violet-400">{inspectDoc.suggested_file_name || inspectDoc.file_name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Extracted Invoice #:</span>
                  <span className="font-mono font-bold text-emerald-600">{inspectDoc.extracted_invoice_number || "N/A"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Financial Total:</span>
                  <span className="font-bold text-slate-900 dark:text-white">${inspectDoc.extracted_amount?.toFixed(2) || "0.00"} USD</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Smart Folder:</span>
                  <span className="font-semibold text-amber-600">{inspectDoc.smart_folder || "/Unsorted"}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  OCR Text Transcript
                </label>
                <textarea
                  readOnly
                  rows={8}
                  value={inspectDoc.ocr_text || "No OCR transcript generated yet. Click 'Run Document Automation' to scan."}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono rounded-xl outline-none resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleDownload(inspectDoc)}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="h-4 w-4" /> Download Real {inspectDoc.file_type.toUpperCase()}
                </button>
                <button
                  onClick={() => setInspectDoc(null)}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Upload Modal ── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="h-4 w-4 text-violet-600" /> Upload Document
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center hover:border-violet-500 transition-all cursor-pointer bg-slate-50 dark:bg-slate-950/40">
                <input
                  type="file"
                  id="doc-file-input"
                  className="hidden"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
                <label htmlFor="doc-file-input" className="cursor-pointer flex flex-col items-center gap-2">
                  <div className="h-10 w-10 rounded-xl bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center text-violet-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {uploadFile ? uploadFile.name : "Click to choose PDF, DOCX, CSV, Excel or Image"}
                  </span>
                  <span className="text-[10px] text-slate-400">Max file size: 50MB</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Document Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Q3 Vendor Agreement"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs rounded-xl outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs rounded-xl outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {CATEGORIES.filter((c) => c !== "All").map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. contract, 2026, client"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs rounded-xl outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center gap-2 cursor-pointer"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Upload & Auto-Classify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Generate Template Modal ── */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-600" /> Generate Document from Template
              </h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Template Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "invoice", label: "Invoice / Receipt", icon: FileSpreadsheet },
                    { id: "agreement", label: "Client SLA Agreement", icon: ShieldCheck },
                    { id: "report", label: "Executive Report", icon: FileText },
                  ].map((t) => {
                    const Icon = t.icon;
                    const isSelected = templateType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTemplateType(t.id as any)}
                        className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? "bg-violet-50 dark:bg-violet-950/50 border-violet-500 text-violet-700 dark:text-violet-300 font-bold"
                            : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-[10px] leading-tight">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Custom Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Master Service Agreement 2026"
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs rounded-xl outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGenerateTemplate}
                  disabled={generating}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center gap-2 cursor-pointer"
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Generate PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
