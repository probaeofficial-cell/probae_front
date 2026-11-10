"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Copy,
  Check,
  Search,
  RefreshCw,
  Loader2,
  Database,
  ShieldCheck,
  ExternalLink,
  History,
  FileText,
  X,
} from "lucide-react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { BowlLoader } from "@/components/admin/BowlLoader";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { endpoints } from "@/lib/apiService";

type SampleColumn = {
  key: string;
  header: string;
  required: string;
  description: string;
  example: string;
};

type SampleBowl = {
  ulid: string;
  code: string;
  name: string;
  bowl_type: string;
  status: boolean;
  meal_slot: string;
  category_name: string;
  base_cost: number;
  has_ingredients: boolean;
  ingredient_count: number;
};

type SampleData = {
  today_ist: string;
  max_allowed_target_date: string;
  rule_summary: string;
  columns: SampleColumn[];
  meal_slots: { slug: string; name: string }[];
  bowls: SampleBowl[];
  sample_rows: Record<string, any>[];
};

type ValidationErrorRow = {
  row_number: number;
  customer_phone: string;
  bowl_code: string;
  target_date: string;
  meal_slot: string;
  errors: string[];
};

type BulkJob = {
  job_id: string;
  filename: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  status: "QUEUED" | "VALIDATING" | "IMPORTING" | "COMPLETED" | "VALIDATION_FAILED" | "FAILED";
  phase: string;
  message: string;
  total_rows: number;
  validated_rows: number;
  processed_rows: number;
  created_orders: number;
  valid_rows: number;
  failed_rows: number;
  progress_pct: number;
  validation_progress_pct: number;
  import_progress_pct: number;
  total_wallet_debited: number;
  total_subscription_bowls_deducted: number;
  total_calories_logged: number;
  errors: ValidationErrorRow[];
  total_error_count?: number;
  summary?: {
    total_orders_created: number;
    unique_customers_count: number;
    wallet_orders_count: number;
    subscription_orders_count: number;
    total_wallet_debited: number;
    total_subscription_bowls_deducted: number;
    total_calories_logged: number;
    date_range?: { min: string; max: string };
    sample_created_orders?: Array<{
      row_number: number;
      order_ulid: string;
      order_number: string;
      target_date: string;
      customer_ulid: string;
      customer_name: string;
      customer_phone: string;
      bowl_code: string;
      bowl_name: string;
      meal_slot: string;
      calories: number;
      billed_price: number;
      deduct_from_subscription: boolean;
    }>;
  } | null;
};

const ACTIVE_JOB_STORAGE_KEY = "probae_bulk_legacy_active_job_id";

export default function BulkLegacyOrdersPage() {
  // Sample metadata from live backend
  const [sampleData, setSampleData] = useState<SampleData | null>(null);
  const [isLoadingSample, setIsLoadingSample] = useState(true);
  const [isDownloadingCsv, setIsDownloadingCsv] = useState(false);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Active Celery job & history
  const [activeJob, setActiveJob] = useState<BulkJob | null>(null);
  const [recentJobs, setRecentJobs] = useState<BulkJob[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [errorFilter, setErrorFilter] = useState("");

  // Lookup helpers
  const [activeRefTab, setActiveRefTab] = useState<"bowls" | "customers" | "history">("bowls");
  const [bowlSearch, setBowlSearch] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);

  const isJobRunning = (status?: string) =>
    status === "QUEUED" || status === "VALIDATING" || status === "IMPORTING";

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      // Ignore clipboard failures
    }
  };

  const fetchSampleData = useCallback(async () => {
    setIsLoadingSample(true);
    try {
      const data = await endpoints.orders.getBulkLegacySample();
      setSampleData(data);
    } catch (err) {
      console.error("Failed to fetch bulk legacy sample metadata:", err);
    } finally {
      setIsLoadingSample(false);
    }
  }, []);

  const fetchRecentJobs = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await endpoints.orders.listBulkLegacyJobs(15);
      if (res?.jobs) {
        setRecentJobs(res.jobs);
      }
    } catch (err) {
      console.error("Failed to fetch recent bulk legacy jobs:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const fetchJobById = useCallback(async (jobId: string) => {
    try {
      const res = await endpoints.orders.getBulkLegacyJob(jobId);
      if (res?.job) {
        setActiveJob(res.job);
        return res.job as BulkJob;
      }
    } catch (err: any) {
      if (err?.status === 404 && typeof window !== "undefined") {
        sessionStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
      } else {
        console.error("Failed to poll bulk legacy job status:", err);
      }
    }
    return null;
  }, []);

  useEffect(() => {
    fetchSampleData();
    fetchRecentJobs();

    if (typeof window !== "undefined") {
      const savedJobId = sessionStorage.getItem(ACTIVE_JOB_STORAGE_KEY);
      if (savedJobId) {
        fetchJobById(savedJobId);
      }
    }
  }, [fetchSampleData, fetchRecentJobs, fetchJobById]);

  // Poll active Celery task progress
  useEffect(() => {
    if (!activeJob?.job_id) return;

    if (!isJobRunning(activeJob.status)) {
      return;
    }

    const interval = setInterval(async () => {
      const updated = await fetchJobById(activeJob.job_id);
      if (updated && !isJobRunning(updated.status)) {
        fetchRecentJobs();
      }
    }, 900);

    return () => clearInterval(interval);
  }, [activeJob?.job_id, activeJob?.status, fetchJobById, fetchRecentJobs]);

  // Debounced customer phone search helper
  useEffect(() => {
    const trimmed = customerSearch.trim();
    const timer = setTimeout(async () => {
      setIsSearchingCustomers(true);
      try {
        const res: any = await endpoints.customers.list({
          page: 1,
          limit: 12,
          search: trimmed || undefined,
        });
        setCustomerResults(res?.customers || []);
      } catch (err) {
        console.error("Failed to search customers:", err);
      } finally {
        setIsSearchingCustomers(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  const handleDownloadXlsxTemplate = () => {
    if (!sampleData) return;

    const headers = sampleData.columns.map((c) => c.header);
    const dataSheetRows = [
      headers,
      ...sampleData.sample_rows.map((row) => headers.map((h) => row[h] ?? "")),
    ];
    const wsData = XLSX.utils.aoa_to_sheet(dataSheetRows);
    wsData["!cols"] = [
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 14 },
      { wch: 24 },
      { wch: 16 },
      { wch: 14 },
      { wch: 15 },
      { wch: 14 },
      { wch: 12 },
      { wch: 13 },
      { wch: 32 },
      { wch: 28 },
    ];

    const bowlRows: any[][] = [
      [
        "Bowl Code",
        "Bowl Name",
        "Bowl Type",
        "Meal Slot",
        "Category",
        "Active",
        "Base Cost (INR)",
        "Ready for Upload?",
      ],
      ...sampleData.bowls.map((b) => [
        b.code || "(No Code)",
        b.name,
        b.bowl_type,
        b.meal_slot,
        b.category_name,
        b.status ? "YES" : "NO",
        b.base_cost,
        b.has_ingredients ? "YES" : "NO (Missing Ingredients)",
      ]),
    ];
    const wsBowls = XLSX.utils.aoa_to_sheet(bowlRows);
    wsBowls["!cols"] = [
      { wch: 16 },
      { wch: 28 },
      { wch: 12 },
      { wch: 14 },
      { wch: 18 },
      { wch: 10 },
      { wch: 16 },
      { wch: 24 },
    ];

    const instrRows: any[][] = [
      ["Bulk Legacy Order Upload - Instructions & Field Guide"],
      ["Rule", sampleData.rule_summary],
      ["Today (IST)", sampleData.today_ist],
      ["Latest Allowed Order Date", sampleData.max_allowed_target_date],
      [
        "Active Meal Slots",
        sampleData.meal_slots.map((s) => `${s.slug} (${s.name})`).join(", "),
      ],
      [],
      ["Column Name", "Required?", "Description", "Example"],
      ...sampleData.columns.map((c) => [c.header, c.required, c.description, c.example]),
    ];
    const wsInstr = XLSX.utils.aoa_to_sheet(instrRows);
    wsInstr["!cols"] = [{ wch: 26 }, { wch: 24 }, { wch: 68 }, { wch: 24 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsData, "Bulk_Legacy_Orders");
    XLSX.utils.book_append_sheet(wb, wsBowls, "Valid_Bowl_Codes");
    XLSX.utils.book_append_sheet(wb, wsInstr, "Instructions");
    XLSX.writeFile(wb, `Probae_Bulk_Legacy_Orders_Sample_${sampleData.today_ist}.xlsx`);
  };

  const handleDownloadCsvTemplate = async () => {
    setIsDownloadingCsv(true);
    try {
      const blob = await endpoints.orders.downloadBulkLegacySampleCsv();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bulk_legacy_orders_sample.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setUploadError(err?.detail || err?.message || "Failed to download CSV sample.");
    } finally {
      setIsDownloadingCsv(false);
    }
  };

  const handleExportErrorReport = () => {
    if (!activeJob?.errors || activeJob.errors.length === 0) return;
    const rows = [
      ["Row Number", "Customer Phone / ULID", "Bowl Code", "Target Date", "Meal Slot", "Validation Errors"],
      ...activeJob.errors.map((e) => [
        e.row_number,
        e.customer_phone,
        e.bowl_code,
        e.target_date,
        e.meal_slot,
        (e.errors || []).join(" | "),
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const csvOut = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csvOut], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bulk_legacy_errors_${activeJob.job_id}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleFileSelect = (file: File | null | undefined) => {
    setUploadError(null);
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
      setUploadError("Please select a .xlsx, .xls, or .csv file.");
      return;
    }
    setSelectedFile(file);
  };

  const normalizeUploadFile = async (file: File): Promise<File> => {
    if (!file.name.toLowerCase().endsWith(".xls")) {
      return file;
    }
    // Convert legacy binary .xls -> .xlsx client-side using SheetJS
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const firstSheetName = wb.SheetNames[0];
    if (!firstSheetName) {
      throw new Error("The selected .xls file has no worksheets.");
    }
    const ws = wb.Sheets[firstSheetName];
    const outWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(outWb, ws, "Bulk_Legacy_Orders");
    const xlsxBytes = XLSX.write(outWb, { type: "array", bookType: "xlsx" });
    const newName = file.name.replace(/\.xls$/i, ".xlsx");
    return new File([xlsxBytes], newName, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  };

  const handleStartUpload = async () => {
    if (!selectedFile || isUploading || isJobRunning(activeJob?.status)) return;
    setIsUploading(true);
    setUploadError(null);

    try {
      const preparedFile = await normalizeUploadFile(selectedFile);
      const res = await endpoints.orders.uploadBulkLegacyOrders(preparedFile);

      if (res?.job_id) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem(ACTIVE_JOB_STORAGE_KEY, res.job_id);
        }
        setActiveJob({
          job_id: res.job_id,
          filename: res.filename || preparedFile.name,
          uploaded_by: "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: "QUEUED",
          phase: "QUEUED",
          message: `Queued ${res.total_rows || 0} row(s) for Celery validation and import...`,
          total_rows: res.total_rows || 0,
          validated_rows: 0,
          processed_rows: 0,
          created_orders: 0,
          valid_rows: 0,
          failed_rows: 0,
          progress_pct: 0,
          validation_progress_pct: 0,
          import_progress_pct: 0,
          total_wallet_debited: 0,
          total_subscription_bowls_deducted: 0,
          total_calories_logged: 0,
          errors: [],
          summary: null,
        });
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        await fetchJobById(res.job_id);
        fetchRecentJobs();
      }
    } catch (err: any) {
      setUploadError(err?.detail || err?.message || "Failed to upload bulk legacy orders file.");
    } finally {
      setIsUploading(false);
    }
  };

  const filteredBowls = (sampleData?.bowls || []).filter((b) => {
    const q = bowlSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (b.code || "").toLowerCase().includes(q) ||
      (b.name || "").toLowerCase().includes(q) ||
      (b.meal_slot || "").toLowerCase().includes(q) ||
      (b.category_name || "").toLowerCase().includes(q)
    );
  });

  const filteredErrors = (activeJob?.errors || []).filter((err) => {
    const q = errorFilter.trim().toLowerCase();
    if (!q) return true;
    return (
      String(err.row_number).includes(q) ||
      (err.customer_phone || "").toLowerCase().includes(q) ||
      (err.bowl_code || "").toLowerCase().includes(q) ||
      (err.target_date || "").toLowerCase().includes(q) ||
      (err.errors || []).some((m) => m.toLowerCase().includes(q))
    );
  });

  const renderStatusBadge = (status: BulkJob["status"]) => {
    switch (status) {
      case "QUEUED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-700 border border-neutral-200">
            <Clock className="w-3.5 h-3.5" /> Queued in Celery
          </span>
        );
      case "VALIDATING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Phase 1: Validating
          </span>
        );
      case "IMPORTING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-[#6A0FAD] border border-purple-200">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Phase 2: Saving to DB
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Import Completed
          </span>
        );
      case "VALIDATION_FAILED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5" /> Validation Failed (0 Saved)
          </span>
        );
      case "FAILED":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5" /> Failed (Rolled Back)
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-y-auto custom-scrollbar">
        <Header />
        <Breadcrumbs segments={["Admin", "Customers", "Bulk Legacy Orders"]} />

        <div className="space-y-6 pb-8">
          {/* Top Title & Rule Notice */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-[#6A0FAD]/5 via-purple-50/40 to-amber-50/40 border border-purple-100 rounded-3xl p-6">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black text-neutral-900">
                  Bulk Legacy Order Upload
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wide">
                  Older Orders Only
                </span>
              </div>
              <p className="text-sm text-neutral-600 mt-1.5 max-w-3xl">
                Upload past delivered meals across multiple customers via Celery background processing.
                Every row (customer, bowl code, meal slot, past-only date, overrides, and subscription quota)
                is validated strictly before anything is saved to the database.
              </p>
              {sampleData && (
                <p className="text-xs font-semibold text-[#6A0FAD] mt-2">
                  Allowed dates: strictly before {sampleData.today_ist} IST (latest accepted:{" "}
                  {sampleData.max_allowed_target_date}) · Recorded as delivered manual legacy orders without deducting KDS/kitchen inventory.
                </p>
              )}
            </div>
            <Link
              href="/admin/customers"
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-neutral-200 text-sm font-bold text-neutral-700 hover:border-[#6A0FAD] hover:text-[#6A0FAD] transition-colors shadow-sm"
            >
              View Customer Directory
            </Link>
          </div>

          {/* Step 1 & Step 2 Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1: Download Sample */}
            <div className="border border-neutral-200 rounded-3xl p-6 bg-neutral-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#6A0FAD]/10 text-[#6A0FAD] flex items-center justify-center font-black">
                    1
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-neutral-900">
                      Download System Sample Template
                    </h2>
                    <p className="text-xs text-neutral-500">
                      Generated live with your active Bowl Codes, Meal Slots & instructions
                    </p>
                  </div>
                </div>

                {isLoadingSample ? (
                  <div className="py-8 flex items-center justify-center gap-3 text-neutral-500 text-sm">
                    <BowlLoader className="w-6 h-6 text-[#6A0FAD]" />
                    Loading bowl catalog & meal slots...
                  </div>
                ) : sampleData ? (
                  <div className="mt-4 bg-white rounded-2xl border border-neutral-200 p-4 space-y-2.5 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-neutral-700">Live Bowl Codes:</span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold">
                        {sampleData.bowls.filter((b) => b.code && b.has_ingredients).length} ready
                      </span>
                      <span className="text-neutral-400">
                        ({sampleData.bowls.length} total bowls)
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-neutral-700 mr-1">Meal Slots:</span>
                      {sampleData.meal_slots.map((slot) => (
                        <span
                          key={slot.slug}
                          className="px-2 py-0.5 rounded-full bg-purple-50 text-[#6A0FAD] font-bold"
                        >
                          {slot.slug}
                        </span>
                      ))}
                    </div>
                    <p className="text-neutral-500 leading-relaxed">
                      Required fields per row: <code className="text-neutral-800 font-bold">customer_phone</code>,{" "}
                      <code className="text-neutral-800 font-bold">target_date</code> (YYYY-MM-DD, past only),{" "}
                      <code className="text-neutral-800 font-bold">meal_slot</code>, and{" "}
                      <code className="text-neutral-800 font-bold">bowl_code</code>. Optional overrides mirror the Log Past Meal modal.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                    Failed to load live sample metadata from server.
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleDownloadXlsxTemplate}
                  disabled={isLoadingSample || !sampleData}
                  className="flex-1 min-w-[200px] bg-white border border-neutral-200 text-neutral-800 px-4 py-3 rounded-xl font-bold text-sm hover:border-[#6A0FAD] hover:text-[#6A0FAD] transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Download Excel Sample (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCsvTemplate}
                  disabled={isDownloadingCsv || isLoadingSample}
                  className="px-4 py-3 rounded-xl bg-white border border-neutral-200 text-neutral-700 font-bold text-sm hover:border-[#6A0FAD] hover:text-[#6A0FAD] transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  {isDownloadingCsv ? "Downloading..." : "CSV Sample"}
                </button>
              </div>
            </div>

            {/* Card 2: Upload File */}
            <div className="border border-[#6A0FAD]/25 rounded-3xl p-6 bg-[#6A0FAD]/[0.03] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#6A0FAD] text-white flex items-center justify-center font-black">
                    2
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-neutral-900">
                      Upload Sheet & Run Celery Import
                    </h2>
                    <p className="text-xs text-neutral-500">
                      Supports .xlsx, .xls, and .csv (up to 5,000 rows per batch)
                    </p>
                  </div>
                </div>

                {uploadError && (
                  <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="flex-1">{uploadError}</span>
                  </div>
                )}

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    handleFileSelect(file);
                  }}
                  className={`mt-2 border-2 border-dashed rounded-2xl p-6 text-center transition-colors relative ${
                    isDragging
                      ? "border-[#6A0FAD] bg-[#6A0FAD]/10"
                      : "border-[#6A0FAD]/30 bg-white/80 hover:bg-white"
                  }`}
                >
                  <Upload className="w-8 h-8 text-[#6A0FAD] mx-auto mb-2" />
                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-1">
                      <p className="text-sm font-bold text-neutral-900 break-all">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB · Ready for Celery validation
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:underline relative z-10"
                      >
                        <X className="w-3.5 h-3.5" /> Remove file
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-neutral-800">
                        Drag & drop your filled Excel or CSV file here
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">
                        or click anywhere in this box to browse
                      </p>
                    </>
                  )}
                  {!selectedFile && (
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => handleFileSelect(e.target.files?.[0])}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  )}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-3">
                <ProbaeButton
                  type="button"
                  onClick={handleStartUpload}
                  disabled={!selectedFile || isUploading || isJobRunning(activeJob?.status)}
                  className="!w-full !rounded-xl !py-3 !text-sm"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading & Queuing Celery Task...
                    </>
                  ) : isJobRunning(activeJob?.status) ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Celery Job in Progress...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload, Validate & Import Older Orders
                    </>
                  )}
                </ProbaeButton>
              </div>
            </div>
          </div>

          {/* Active Celery Progress Tracker */}
          {activeJob && (
            <div className="border border-neutral-200 rounded-3xl bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/60 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  {renderStatusBadge(activeJob.status)}
                  <div>
                    <p className="text-sm font-bold text-neutral-900">{activeJob.filename || "Bulk Upload"}</p>
                    <p className="text-[11px] font-mono text-neutral-400">
                      Job ID: {activeJob.job_id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fetchJobById(activeJob.job_id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-neutral-200 text-xs font-bold text-neutral-700 hover:border-[#6A0FAD] transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isJobRunning(activeJob.status) ? "animate-spin" : ""}`} />
                    Refresh Status
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Progress Bars + 2-Stage Pipeline */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-neutral-800">{activeJob.message}</span>
                    <span className="font-black text-[#6A0FAD]">{activeJob.progress_pct}%</span>
                  </div>

                  <div className="w-full h-3.5 bg-neutral-100 rounded-full overflow-hidden border border-neutral-200">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        activeJob.status === "COMPLETED"
                          ? "bg-emerald-500"
                          : activeJob.status === "VALIDATION_FAILED"
                          ? "bg-amber-500"
                          : activeJob.status === "FAILED"
                          ? "bg-rose-500"
                          : "bg-gradient-to-r from-[#6A0FAD] to-violet-500"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(2, activeJob.progress_pct || 0))}%` }}
                    />
                  </div>

                  {/* Two-Stage Indicators */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <div className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50/50">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-700">
                          <ShieldCheck className="w-4 h-4 text-blue-600" />
                          Phase 1: Row & Bowl Validation
                        </span>
                        <span className="text-xs font-black text-neutral-800">
                          {activeJob.validation_progress_pct || 0}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            activeJob.status === "VALIDATION_FAILED" ? "bg-amber-500" : "bg-blue-600"
                          }`}
                          style={{ width: `${activeJob.validation_progress_pct || 0}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-1.5">
                        Checked {activeJob.validated_rows} / {activeJob.total_rows} rows ·{" "}
                        <span className="text-emerald-700 font-bold">{activeJob.valid_rows} valid</span> ·{" "}
                        <span className="text-rose-600 font-bold">{activeJob.failed_rows} invalid</span>
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50/50">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-700">
                          <Database className="w-4 h-4 text-[#6A0FAD]" />
                          Phase 2: Atomic DB Persistence
                        </span>
                        <span className="text-xs font-black text-neutral-800">
                          {activeJob.import_progress_pct || 0}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            activeJob.status === "COMPLETED"
                              ? "bg-emerald-500"
                              : activeJob.status === "FAILED"
                              ? "bg-rose-500"
                              : "bg-[#6A0FAD]"
                          }`}
                          style={{ width: `${activeJob.import_progress_pct || 0}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-1.5">
                        Processed {activeJob.processed_rows} / {activeJob.total_rows} rows ·{" "}
                        <span className="text-[#6A0FAD] font-bold">
                          {activeJob.created_orders} committed orders
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Validation Failed Table */}
                {activeJob.status === "VALIDATION_FAILED" && activeJob.errors?.length > 0 && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5 text-amber-900">
                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                        <div className="text-xs sm:text-sm">
                          <p className="font-bold">
                            Validation failed on {activeJob.failed_rows} row(s). No orders were saved.
                          </p>
                          <p className="text-amber-800/90 mt-0.5">
                            Fix the highlighted issues in your spreadsheet and upload again.
                            {activeJob.total_error_count && activeJob.total_error_count > activeJob.errors.length
                              ? ` Showing first ${activeJob.errors.length} of ${activeJob.total_error_count} failed rows.`
                              : ""}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleExportErrorReport}
                        className="shrink-0 px-4 py-2 rounded-xl bg-white border border-amber-300 text-amber-900 font-bold text-xs hover:bg-amber-100 transition-colors flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> Export Error CSV
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="relative w-full max-w-sm">
                        <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={errorFilter}
                          onChange={(e) => setErrorFilter(e.target.value)}
                          placeholder="Filter errors by row #, phone, bowl code..."
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-200 text-neutral-800 focus:outline-none focus:border-[#6A0FAD]"
                        />
                      </div>
                      <span className="text-xs font-bold text-neutral-500">
                        {filteredErrors.length} row(s) shown
                      </span>
                    </div>

                    <div className="border border-neutral-200 rounded-2xl overflow-hidden max-h-[380px] overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-neutral-50 sticky top-0 border-b border-neutral-200">
                          <tr>
                            <th className="px-4 py-3 font-bold text-neutral-500 uppercase">Row #</th>
                            <th className="px-4 py-3 font-bold text-neutral-500 uppercase">Customer</th>
                            <th className="px-4 py-3 font-bold text-neutral-500 uppercase">Bowl Code</th>
                            <th className="px-4 py-3 font-bold text-neutral-500 uppercase">Target Date</th>
                            <th className="px-4 py-3 font-bold text-neutral-500 uppercase">Meal Slot</th>
                            <th className="px-4 py-3 font-bold text-neutral-500 uppercase">Validation Errors</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {filteredErrors.map((err, i) => (
                            <tr key={`${err.row_number}-${i}`} className="bg-rose-50/30 hover:bg-rose-50/60">
                              <td className="px-4 py-3 font-mono font-bold text-neutral-800">
                                Row {err.row_number}
                              </td>
                              <td className="px-4 py-3 font-medium text-neutral-700">
                                {err.customer_phone || "—"}
                              </td>
                              <td className="px-4 py-3 font-mono text-neutral-700">
                                {err.bowl_code || "—"}
                              </td>
                              <td className="px-4 py-3 text-neutral-700">
                                {err.target_date || "—"}
                              </td>
                              <td className="px-4 py-3 text-neutral-700">
                                {err.meal_slot || "—"}
                              </td>
                              <td className="px-4 py-3 text-rose-700 font-semibold">
                                <ul className="list-disc pl-4 space-y-0.5">
                                  {err.errors.map((msg, mIdx) => (
                                    <li key={mIdx}>{msg}</li>
                                  ))}
                                </ul>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Completed Summary & Created Orders Preview */}
                {activeJob.status === "COMPLETED" && activeJob.summary && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                        <p className="text-[11px] font-bold text-emerald-700 uppercase">Orders Created</p>
                        <p className="text-xl font-black text-emerald-900 mt-0.5">
                          {activeJob.summary.total_orders_created}
                        </p>
                      </div>
                      <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
                        <p className="text-[11px] font-bold text-neutral-500 uppercase">Customers Updated</p>
                        <p className="text-xl font-black text-neutral-900 mt-0.5">
                          {activeJob.summary.unique_customers_count}
                        </p>
                      </div>
                      <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
                        <p className="text-[11px] font-bold text-neutral-500 uppercase">Wallet Debited</p>
                        <p className="text-xl font-black text-neutral-900 mt-0.5">
                          ₹{Number(activeJob.summary.total_wallet_debited || 0).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-neutral-400">
                          {activeJob.summary.wallet_orders_count} order(s)
                        </p>
                      </div>
                      <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
                        <p className="text-[11px] font-bold text-neutral-500 uppercase">Subscription Bowls</p>
                        <p className="text-xl font-black text-neutral-900 mt-0.5">
                          {activeJob.summary.total_subscription_bowls_deducted}
                        </p>
                        <p className="text-[10px] text-neutral-400">
                          {activeJob.summary.subscription_orders_count} order(s)
                        </p>
                      </div>
                      <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200">
                        <p className="text-[11px] font-bold text-[#6A0FAD] uppercase">Calories Logged</p>
                        <p className="text-xl font-black text-[#6A0FAD] mt-0.5">
                          {Math.round(activeJob.summary.total_calories_logged || 0).toLocaleString()} kcal
                        </p>
                      </div>
                    </div>

                    {activeJob.summary.sample_created_orders &&
                      activeJob.summary.sample_created_orders.length > 0 && (
                        <div className="border border-neutral-200 rounded-2xl overflow-hidden max-h-[360px] overflow-y-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-neutral-50 sticky top-0 border-b border-neutral-200">
                              <tr>
                                <th className="px-4 py-3 font-bold text-neutral-500 uppercase">Order #</th>
                                <th className="px-4 py-3 font-bold text-neutral-500 uppercase">Date</th>
                                <th className="px-4 py-3 font-bold text-neutral-500 uppercase">Customer</th>
                                <th className="px-4 py-3 font-bold text-neutral-500 uppercase">Bowl</th>
                                <th className="px-4 py-3 font-bold text-neutral-500 uppercase">Slot</th>
                                <th className="px-4 py-3 font-bold text-neutral-500 uppercase">Calories</th>
                                <th className="px-4 py-3 font-bold text-neutral-500 uppercase">Billing</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                              {activeJob.summary.sample_created_orders.map((ord) => (
                                <tr key={ord.order_ulid} className="hover:bg-neutral-50">
                                  <td className="px-4 py-3">
                                    <a
                                      href={`/admin/orders/${ord.order_ulid}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 font-mono font-bold text-[#6A0FAD] hover:underline"
                                    >
                                      {ord.order_number}
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </td>
                                  <td className="px-4 py-3 font-medium text-neutral-800">
                                    {ord.target_date}
                                  </td>
                                  <td className="px-4 py-3">
                                    <Link
                                      href={`/admin/customers/${ord.customer_ulid}`}
                                      className="font-bold text-neutral-900 hover:text-[#6A0FAD]"
                                    >
                                      {ord.customer_name}
                                    </Link>
                                    <p className="text-[11px] text-neutral-400">{ord.customer_phone}</p>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="font-bold text-neutral-800">{ord.bowl_name}</span>
                                    <span className="ml-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">
                                      {ord.bowl_code}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="px-2 py-0.5 rounded-full bg-purple-50 text-[#6A0FAD] font-bold">
                                      {ord.meal_slot}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 font-bold text-neutral-800">
                                    {Math.round(ord.calories)} kcal
                                  </td>
                                  <td className="px-4 py-3">
                                    {ord.deduct_from_subscription ? (
                                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold">
                                        1 Sub Bowl
                                      </span>
                                    ) : (
                                      <span className="font-bold text-neutral-800">
                                        ₹{ord.billed_price} Wallet
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reference & Recent History Tabs */}
          <div className="border border-neutral-200 rounded-3xl overflow-hidden bg-white">
            <div className="px-6 py-3 border-b border-neutral-100 bg-neutral-50/50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveRefTab("bowls")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                    activeRefTab === "bowls"
                      ? "bg-[#6A0FAD] text-white"
                      : "bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> Valid Bowl Codes ({sampleData?.bowls.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRefTab("customers")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                    activeRefTab === "customers"
                      ? "bg-[#6A0FAD] text-white"
                      : "bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  <Search className="w-3.5 h-3.5" /> Customer Phone Lookup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveRefTab("history");
                    fetchRecentJobs();
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                    activeRefTab === "history"
                      ? "bg-[#6A0FAD] text-white"
                      : "bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  <History className="w-3.5 h-3.5" /> Recent Celery Uploads ({recentJobs.length})
                </button>
              </div>
            </div>

            <div className="p-6">
              {activeRefTab === "bowls" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative w-full max-w-sm">
                      <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={bowlSearch}
                        onChange={(e) => setBowlSearch(e.target.value)}
                        placeholder="Search bowl code, name, or meal slot..."
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-200 text-neutral-800 focus:outline-none focus:border-[#6A0FAD]"
                      />
                    </div>
                    <span className="text-xs text-neutral-500 font-medium">
                      Click any Bowl Code to copy it to your clipboard
                    </span>
                  </div>

                  <div className="border border-neutral-200 rounded-2xl overflow-hidden max-h-[320px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-50 sticky top-0 border-b border-neutral-200">
                        <tr>
                          <th className="px-4 py-3 font-bold text-neutral-500 uppercase">Bowl Code</th>
                          <th className="px-4 py-3 font-bold text-neutral-500 uppercase">Bowl Name</th>
                          <th className="px-4 py-3 font-bold text-neutral-500 uppercase">Meal Slot</th>
                          <th className="px-4 py-3 font-bold text-neutral-500 uppercase">Type</th>
                          <th className="px-4 py-3 font-bold text-neutral-500 uppercase">Status</th>
                          <th className="px-4 py-3 font-bold text-neutral-500 uppercase">Upload Ready</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {filteredBowls.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-6 text-center text-neutral-400">
                              No matching bowls found.
                            </td>
                          </tr>
                        ) : (
                          filteredBowls.map((b) => (
                            <tr key={b.ulid} className="hover:bg-neutral-50">
                              <td className="px-4 py-2.5">
                                {b.code ? (
                                  <button
                                    type="button"
                                    onClick={() => copyText(b.code, `bowl-${b.ulid}`)}
                                    className="inline-flex items-center gap-1.5 font-mono font-bold px-2 py-1 rounded-lg bg-purple-50 text-[#6A0FAD] hover:bg-purple-100 transition-colors"
                                  >
                                    {b.code}
                                    {copiedKey === `bowl-${b.ulid}` ? (
                                      <Check className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3 h-3 opacity-60" />
                                    )}
                                  </button>
                                ) : (
                                  <span className="text-neutral-400 italic">No bowl code</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 font-semibold text-neutral-800">{b.name}</td>
                              <td className="px-4 py-2.5 text-neutral-600">{b.meal_slot}</td>
                              <td className="px-4 py-2.5 text-neutral-600">{b.bowl_type}</td>
                              <td className="px-4 py-2.5">
                                {b.status ? (
                                  <span className="text-emerald-700 font-bold">Active</span>
                                ) : (
                                  <span className="text-neutral-400 font-medium">Inactive</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                {b.has_ingredients ? (
                                  <span className="text-emerald-700 font-bold">
                                    Ready ({b.ingredient_count} ings)
                                  </span>
                                ) : (
                                  <span className="text-rose-600 font-bold">No ingredients</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeRefTab === "customers" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative w-full max-w-sm">
                      <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder="Search customer name or phone number..."
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-200 text-neutral-800 focus:outline-none focus:border-[#6A0FAD]"
                      />
                    </div>
                    <span className="text-xs text-neutral-500 font-medium">
                      Click phone or ULID to copy directly into your spreadsheet
                    </span>
                  </div>

                  <div className="border border-neutral-200 rounded-2xl overflow-hidden max-h-[320px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-50 sticky top-0 border-b border-neutral-200">
                        <tr>
                          <th className="px-4 py-3 font-bold text-neutral-500 uppercase">Customer</th>
                          <th className="px-4 py-3 font-bold text-neutral-500 uppercase">Phone</th>
                          <th className="px-4 py-3 font-bold text-neutral-500 uppercase">Subscription Bowls</th>
                          <th className="px-4 py-3 font-bold text-neutral-500 uppercase">Wallet Balance</th>
                          <th className="px-4 py-3 font-bold text-neutral-500 uppercase">Customer ULID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {isSearchingCustomers ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-neutral-400">
                              Searching customers...
                            </td>
                          </tr>
                        ) : customerResults.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-neutral-400">
                              No customers matched your search.
                            </td>
                          </tr>
                        ) : (
                          customerResults.map((c) => (
                            <tr key={c.ulid} className="hover:bg-neutral-50">
                              <td className="px-4 py-2.5 font-bold text-neutral-900">
                                <Link href={`/admin/customers/${c.ulid}`} className="hover:text-[#6A0FAD]">
                                  {c.name}
                                </Link>
                              </td>
                              <td className="px-4 py-2.5">
                                <button
                                  type="button"
                                  onClick={() => copyText(c.phone, `phone-${c.ulid}`)}
                                  className="inline-flex items-center gap-1.5 font-mono font-bold px-2 py-1 rounded-lg bg-neutral-100 text-neutral-800 hover:bg-purple-50 hover:text-[#6A0FAD] transition-colors"
                                >
                                  {c.phone}
                                  {copiedKey === `phone-${c.ulid}` ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3 opacity-60" />
                                  )}
                                </button>
                              </td>
                              <td className="px-4 py-2.5 font-bold text-neutral-700">
                                {c.remaining_bowl_count || 0} remaining
                              </td>
                              <td className="px-4 py-2.5 font-bold text-neutral-700">
                                ₹{Number(c.wallet_balance || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-2.5">
                                <button
                                  type="button"
                                  onClick={() => copyText(c.ulid, `ulid-${c.ulid}`)}
                                  className="inline-flex items-center gap-1 font-mono text-[11px] text-neutral-500 hover:text-[#6A0FAD]"
                                >
                                  {c.ulid}
                                  {copiedKey === `ulid-${c.ulid}` ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3 opacity-60" />
                                  )}
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeRefTab === "history" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-neutral-500">
                      Recent background Celery import jobs (retained in Redis for 24 hours).
                    </p>
                    <button
                      type="button"
                      onClick={fetchRecentJobs}
                      disabled={isLoadingHistory}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6A0FAD] hover:underline"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? "animate-spin" : ""}`} />
                      Refresh List
                    </button>
                  </div>

                  <div className="border border-neutral-200 rounded-2xl overflow-hidden max-h-[320px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-50 sticky top-0 border-b border-neutral-200">
                        <tr>
                          <th className="px-4 py-3 font-bold text-neutral-500 uppercase">Status</th>
                          <th className="px-4 py-3 font-bold text-neutral-500 uppercase">File</th>
                          <th className="px-4 py-3 font-bold text-neutral-500 uppercase">Rows</th>
                          <th className="px-4 py-3 font-bold text-neutral-500 uppercase">Saved Orders</th>
                          <th className="px-4 py-3 font-bold text-neutral-500 uppercase">Uploaded By</th>
                          <th className="px-4 py-3 font-bold text-neutral-500 uppercase text-right">Inspect</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {recentJobs.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-6 text-center text-neutral-400">
                              No bulk legacy upload jobs found yet.
                            </td>
                          </tr>
                        ) : (
                          recentJobs.map((job) => (
                            <tr key={job.job_id} className="hover:bg-neutral-50">
                              <td className="px-4 py-3">{renderStatusBadge(job.status)}</td>
                              <td className="px-4 py-3 font-semibold text-neutral-800">
                                {job.filename || job.job_id}
                              </td>
                              <td className="px-4 py-3 text-neutral-600">{job.total_rows}</td>
                              <td className="px-4 py-3 font-bold text-neutral-800">
                                {job.created_orders}
                              </td>
                              <td className="px-4 py-3 text-neutral-500">{job.uploaded_by || "Admin"}</td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (typeof window !== "undefined") {
                                      sessionStorage.setItem(ACTIVE_JOB_STORAGE_KEY, job.job_id);
                                    }
                                    fetchJobById(job.job_id);
                                  }}
                                  className="px-3 py-1 rounded-lg bg-purple-50 text-[#6A0FAD] font-bold hover:bg-purple-100 transition-colors"
                                >
                                  View Details
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
