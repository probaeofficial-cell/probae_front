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
import { useAuth } from "@/lib/AuthContext";
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

type SampleCategory = {
  ulid: string;
  name: string;
};

type SampleVendor = {
  ulid: string;
  code: string;
  name: string;
};

type ValidUnit = {
  value: string;
  label: string;
};

type SampleData = {
  today_ist: string;
  existing_raw_materials_count: number;
  rule_summary: string;
  valid_units: ValidUnit[];
  columns: SampleColumn[];
  categories: SampleCategory[];
  vendors: SampleVendor[];
  sample_rows: Record<string, any>[];
};

type ValidationErrorRow = {
  row_number: number;
  name: string;
  item_code: string;
  unit: string;
  errors: string[];
};

type BulkRawMaterialJob = {
  job_id: string;
  filename: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  status: "QUEUED" | "VALIDATING" | "IMPORTING" | "COMPLETED" | "VALIDATION_FAILED" | "FAILED" | "CANCELLED";
  phase: string;
  message: string;
  total_rows: number;
  validated_rows: number;
  processed_rows: number;
  created_materials: number;
  valid_rows: number;
  failed_rows: number;
  progress_pct: number;
  validation_progress_pct: number;
  import_progress_pct: number;
  errors: ValidationErrorRow[];
  total_error_count?: number;
  summary?: {
    total_created: number;
    with_macros_count: number;
    without_macros_count: number;
    with_initial_stock_count: number;
    categories_used: string[];
    vendors_used: string[];
    sample_created_materials?: Array<{
      row_number: number;
      ulid: string;
      name: string;
      item_code: string;
      unit: string;
      standard_price: number;
      actual_price: number | null;
      calories: number | null;
      protein: number | null;
      carbs: number | null;
      fat: number | null;
      fiber: number | null;
      category: string;
      vendor: string;
    }>;
  } | null;
};

const ACTIVE_JOB_STORAGE_KEY = "probae_bulk_raw_material_active_job_id";

export default function BulkRawMaterialsUploadPage() {
  const { user, isLoading: authLoading } = useAuth();

  const [sampleData, setSampleData] = useState<SampleData | null>(null);
  const [isLoadingSample, setIsLoadingSample] = useState(true);
  const [isDownloadingCsv, setIsDownloadingCsv] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeJob, setActiveJob] = useState<BulkRawMaterialJob | null>(null);
  const [recentJobs, setRecentJobs] = useState<BulkRawMaterialJob[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [queuedSeconds, setQueuedSeconds] = useState(0);
  const [errorFilter, setErrorFilter] = useState("");

  const [activeRefTab, setActiveRefTab] = useState<"lookup" | "columns" | "history">("lookup");
  const [refSearch, setRefSearch] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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
      const data = await endpoints.rawMaterials.getBulkSample();
      setSampleData(data);
    } catch (err) {
      console.error("Failed to fetch raw material bulk sample metadata:", err);
    } finally {
      setIsLoadingSample(false);
    }
  }, []);

  const fetchRecentJobs = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await endpoints.rawMaterials.listBulkJobs(15);
      if (res?.jobs) {
        setRecentJobs(res.jobs);
      }
    } catch (err) {
      console.error("Failed to fetch recent bulk raw material jobs:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const fetchJobById = useCallback(async (jobId: string) => {
    try {
      const res = await endpoints.rawMaterials.getBulkJob(jobId);
      if (res?.job) {
        setActiveJob(res.job);
        return res.job as BulkRawMaterialJob;
      }
    } catch (err: any) {
      if (err?.status === 404 && typeof window !== "undefined") {
        sessionStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
      } else {
        console.error("Failed to poll bulk raw material job status:", err);
      }
    }
    return null;
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchSampleData();
    fetchRecentJobs();

    if (typeof window !== "undefined") {
      const savedJobId = sessionStorage.getItem(ACTIVE_JOB_STORAGE_KEY);
      if (savedJobId) {
        fetchJobById(savedJobId);
      }
    }
  }, [user, fetchSampleData, fetchRecentJobs, fetchJobById]);

  useEffect(() => {
    if (!activeJob?.job_id) return;
    if (!isJobRunning(activeJob.status)) return;

    const interval = setInterval(async () => {
      const updated = await fetchJobById(activeJob.job_id);
      if (updated && !isJobRunning(updated.status)) {
        fetchRecentJobs();
        if (updated.status === "COMPLETED") {
          fetchSampleData();
        }
      }
    }, 900);

    return () => clearInterval(interval);
  }, [activeJob?.job_id, activeJob?.status, fetchJobById, fetchRecentJobs, fetchSampleData]);

  useEffect(() => {
    if (activeJob?.status !== "QUEUED" || !activeJob?.created_at) {
      setQueuedSeconds(0);
      return;
    }
    const computeElapsed = () => {
      const createdMs = Date.parse(activeJob.created_at);
      if (Number.isNaN(createdMs)) return 0;
      return Math.max(0, Math.floor((Date.now() - createdMs) / 1000));
    };
    setQueuedSeconds(computeElapsed());
    const timer = setInterval(() => {
      setQueuedSeconds(computeElapsed());
    }, 1000);
    return () => clearInterval(timer);
  }, [activeJob?.job_id, activeJob?.status, activeJob?.created_at]);

  const handleDownloadXlsxTemplate = () => {
    if (!sampleData) return;

    const headers = sampleData.columns.map((c) => c.header);
    const dataSheetRows = [
      headers,
      ...sampleData.sample_rows.map((row) => headers.map((h) => row[h] ?? "")),
    ];
    const wsData = XLSX.utils.aoa_to_sheet(dataSheetRows);
    wsData["!cols"] = headers.map((h) => ({
      wch: h === "description" || h === "micros" ? 30 : h === "name" ? 24 : 18,
    }));

    const maxRefRows = Math.max(
      sampleData.categories.length,
      sampleData.vendors.length,
      sampleData.valid_units.length
    );
    const refRows: any[][] = [
      ["Category Name (Exact Match)", "", "Vendor Code", "Vendor Name", "", "Valid Unit", "Unit Meaning"],
    ];
    for (let i = 0; i < maxRefRows; i++) {
      const cat = sampleData.categories[i];
      const vnd = sampleData.vendors[i];
      const unit = sampleData.valid_units[i];
      refRows.push([
        cat ? cat.name : "",
        "",
        vnd ? vnd.code : "",
        vnd ? vnd.name : "",
        "",
        unit ? unit.value : "",
        unit ? unit.label : "",
      ]);
    }
    const wsRef = XLSX.utils.aoa_to_sheet(refRows);
    wsRef["!cols"] = [
      { wch: 28 },
      { wch: 4 },
      { wch: 16 },
      { wch: 26 },
      { wch: 4 },
      { wch: 12 },
      { wch: 32 },
    ];

    const instrRows: any[][] = [
      ["Bulk Raw Materials + Macros Upload - Instructions"],
      ["Rules", sampleData.rule_summary],
      ["Date (IST)", sampleData.today_ist],
      ["Valid Units", sampleData.valid_units.map((u) => u.label).join(" | ")],
      [],
      ["Column Name", "Required?", "Description", "Example"],
      ...sampleData.columns.map((c) => [c.header, c.required, c.description, c.example]),
    ];
    const wsInstr = XLSX.utils.aoa_to_sheet(instrRows);
    wsInstr["!cols"] = [{ wch: 24 }, { wch: 20 }, { wch: 70 }, { wch: 26 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsData, "Bulk_Raw_Materials");
    XLSX.utils.book_append_sheet(wb, wsRef, "Categories_&_Vendors");
    XLSX.utils.book_append_sheet(wb, wsInstr, "Instructions");
    XLSX.writeFile(wb, `Probae_Bulk_Raw_Materials_Sample_${sampleData.today_ist}.xlsx`);
  };

  const handleDownloadCsvTemplate = async () => {
    setIsDownloadingCsv(true);
    try {
      const blob = await endpoints.rawMaterials.downloadBulkSampleCsv();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bulk_raw_materials_sample.csv";
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
      ["Row Number", "Name", "Item Code", "Unit", "Validation Errors"],
      ...activeJob.errors.map((e) => [
        e.row_number,
        e.name,
        e.item_code,
        e.unit,
        (e.errors || []).join(" | "),
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const csvOut = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csvOut], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bulk_raw_materials_errors_${activeJob.job_id}.csv`;
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
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const firstSheetName = wb.SheetNames[0];
    if (!firstSheetName) {
      throw new Error("The selected .xls file has no worksheets.");
    }
    const ws = wb.Sheets[firstSheetName];
    const outWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(outWb, ws, "Bulk_Raw_Materials");
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
      const res = await endpoints.rawMaterials.uploadBulkRawMaterials(preparedFile);

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
          created_materials: 0,
          valid_rows: 0,
          failed_rows: 0,
          progress_pct: 0,
          validation_progress_pct: 0,
          import_progress_pct: 0,
          errors: [],
          summary: null,
        });
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        await fetchJobById(res.job_id);
        fetchRecentJobs();
      }
    } catch (err: any) {
      setUploadError(err?.detail || err?.message || "Failed to upload bulk raw materials file.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelActiveJob = async () => {
    if (!activeJob?.job_id || isCancelling) return;
    setIsCancelling(true);
    try {
      const res = await endpoints.rawMaterials.cancelBulkJob(activeJob.job_id);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
      }
      if (res?.job) {
        setActiveJob(res.job);
      } else {
        setActiveJob(null);
      }
      fetchRecentJobs();
    } catch {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
      }
      setActiveJob(null);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDismissJobPanel = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
    }
    setActiveJob(null);
  };

  const qLower = refSearch.trim().toLowerCase();
  const filteredCategories = (sampleData?.categories || []).filter((c) =>
    !qLower || c.name.toLowerCase().includes(qLower)
  );
  const filteredVendors = (sampleData?.vendors || []).filter(
    (v) =>
      !qLower ||
      v.name.toLowerCase().includes(qLower) ||
      v.code.toLowerCase().includes(qLower)
  );

  const filteredErrors = (activeJob?.errors || []).filter((err) => {
    const q = errorFilter.trim().toLowerCase();
    if (!q) return true;
    return (
      String(err.row_number).includes(q) ||
      (err.name || "").toLowerCase().includes(q) ||
      (err.item_code || "").toLowerCase().includes(q) ||
      (err.errors || []).some((m) => m.toLowerCase().includes(q))
    );
  });

  const renderStatusBadge = (status: BulkRawMaterialJob["status"]) => {
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
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-600 border border-neutral-300">
            <X className="w-3.5 h-3.5" /> Cancelled
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

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fafafa]">
        <div className="animate-pulse text-neutral-500 font-medium">Loading session...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-y-auto custom-scrollbar">
        <Header />
        <Breadcrumbs segments={["Raw Material", "Bulk Upload"]} />

        <div className="space-y-6 pb-8">
          {/* Header Banner */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-[#6A0FAD]/5 via-purple-50/40 to-emerald-50/40 border border-purple-100 rounded-3xl p-6">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-black text-neutral-900">
                  Bulk Raw Material + Macros Upload
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wide">
                  Create-Only &bull; Atomic
                </span>
              </div>
              <p className="text-sm text-neutral-600 mt-1.5 max-w-3xl">
                Upload raw materials, pricing, yield configuration, initial stock, and full
                nutritional macros (<span className="font-semibold text-neutral-800">Calories, Protein, Carbs, Fiber, Fat, Micros</span>)
                in one sheet. A Celery worker validates every row first; if any row fails, zero rows are written.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleDownloadXlsxTemplate}
                disabled={isLoadingSample || !sampleData}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6A0FAD] text-white text-xs font-bold shadow-sm hover:bg-[#580b91] disabled:opacity-50 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download Excel Template (.xlsx)
              </button>
              <button
                type="button"
                onClick={handleDownloadCsvTemplate}
                disabled={isDownloadingCsv || isLoadingSample}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-neutral-700 border border-neutral-200 text-xs font-bold shadow-sm hover:bg-neutral-50 disabled:opacity-50 transition cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                {isDownloadingCsv ? "Downloading..." : "Download CSV Sample"}
              </button>
            </div>
          </div>

          {/* Step 1 + Step 2 Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Safety Guarantees */}
            <div className="xl:col-span-5 bg-neutral-50/70 border border-neutral-200/80 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-wider text-neutral-700 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#6A0FAD]" />
                  Validation & Safety Rules
                </h2>
                {sampleData && (
                  <span className="text-[11px] font-semibold text-neutral-500">
                    In DB: <strong className="text-neutral-800">{sampleData.existing_raw_materials_count}</strong> items
                  </span>
                )}
              </div>

              <div className="space-y-2.5 text-xs text-neutral-600">
                <div className="flex items-start gap-2.5 bg-white p-3 rounded-2xl border border-neutral-100">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-[#6A0FAD] font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <p>
                    <strong className="text-neutral-800">Strict create-only uniqueness:</strong>{" "}
                    Every <code className="bg-neutral-100 px-1 py-0.5 rounded">name</code> and
                    optional <code className="bg-neutral-100 px-1 py-0.5 rounded">item_code</code>{" "}
                    must be unique against both the database and other rows in your sheet.
                  </p>
                </div>

                <div className="flex items-start gap-2.5 bg-white p-3 rounded-2xl border border-neutral-100">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-[#6A0FAD] font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <p>
                    <strong className="text-neutral-800">Macros per 1 unit:</strong>{" "}
                    Enter <code className="bg-neutral-100 px-1 py-0.5 rounded">calories</code>,{" "}
                    <code className="bg-neutral-100 px-1 py-0.5 rounded">protein</code>,{" "}
                    <code className="bg-neutral-100 px-1 py-0.5 rounded">carbs</code>,{" "}
                    <code className="bg-neutral-100 px-1 py-0.5 rounded">fiber</code>, and{" "}
                    <code className="bg-neutral-100 px-1 py-0.5 rounded">fat</code>{" "}
                    per <strong className="text-neutral-800">1 unit</strong> (<code className="bg-neutral-100 px-1 py-0.5 rounded">1 kg</code>,{" "}
                    <code className="bg-neutral-100 px-1 py-0.5 rounded">1 l</code>,{" "}
                    <code className="bg-neutral-100 px-1 py-0.5 rounded">1 g</code>, or{" "}
                    <code className="bg-neutral-100 px-1 py-0.5 rounded">1 ml</code>), matching Calorie MGT.
                  </p>
                </div>

                <div className="flex items-start gap-2.5 bg-white p-3 rounded-2xl border border-neutral-100">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-[#6A0FAD] font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <p>
                    <strong className="text-neutral-800">Strict Category & Vendor lookup:</strong>{" "}
                    Optional <code className="bg-neutral-100 px-1 py-0.5 rounded">category</code> and{" "}
                    <code className="bg-neutral-100 px-1 py-0.5 rounded">vendor</code> must match existing records (or stay blank) so typos never create junk entries.
                  </p>
                </div>

                <div className="flex items-start gap-2.5 bg-white p-3 rounded-2xl border border-neutral-100">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-[#6A0FAD] font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </span>
                  <p>
                    <strong className="text-neutral-800">Auto yield & all-or-nothing Celery transaction:</strong>{" "}
                    Supply <code className="bg-neutral-100 px-1 py-0.5 rounded">yield_grams</code> to auto-calculate{" "}
                    <code className="bg-neutral-100 px-1 py-0.5 rounded">yield_%</code> and{" "}
                    <code className="bg-neutral-100 px-1 py-0.5 rounded">actual_price</code>. Any error aborts with 0 writes.
                  </p>
                </div>
              </div>
            </div>

            {/* File Upload Zone */}
            <div className="xl:col-span-7 bg-white border border-neutral-200 rounded-3xl p-6 flex flex-col justify-between space-y-5 shadow-sm">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-neutral-700 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-[#6A0FAD]" />
                  Upload Filled Sheet (.xlsx / .xls / .csv)
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Up to 5,000 rows and 10 MB per upload. Runs asynchronously via Celery with live progress tracking.
                </p>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFileSelect(e.dataTransfer.files?.[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition cursor-pointer ${
                  isDragging
                    ? "border-[#6A0FAD] bg-purple-50/50"
                    : selectedFile
                    ? "border-emerald-300 bg-emerald-50/30"
                    : "border-neutral-200 hover:border-[#6A0FAD]/50 hover:bg-neutral-50/60"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files?.[0])}
                />

                {selectedFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-neutral-900">{selectedFile.name}</p>
                    <p className="text-xs text-neutral-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB &bull; Ready to validate and import
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 mt-1"
                    >
                      <X className="w-3.5 h-3.5" /> Remove file
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#6A0FAD] flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-neutral-800">
                      Drop your Excel or CSV file here, or click to browse
                    </p>
                    <p className="text-xs text-neutral-400">
                      Supports Probae template (.xlsx, .xls, .csv)
                    </p>
                  </div>
                )}
              </div>

              {uploadError && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="text-xs text-neutral-500">
                  {isJobRunning(activeJob?.status) ? (
                    <span className="text-amber-700 font-medium">
                      Background Celery job active for{" "}
                      <strong className="text-neutral-800">{activeJob?.filename || activeJob?.job_id}</strong>{" "}
                      ({activeJob?.status}).{" "}
                      {activeJob?.status === "QUEUED" && queuedSeconds >= 6
                        ? "Worker has not picked it up yet — make sure Celery worker is restarted, or click Cancel / Reset."
                        : "Removing a selected file will not stop an already-submitted job."}
                    </span>
                  ) : (
                    <span>
                      Use <strong className="text-neutral-700">Categories_&_Vendors</strong> sheet inside the template to avoid typos.
                    </span>
                  )}
                </div>
                <div className="w-full sm:w-auto flex flex-wrap items-center gap-2.5">
                  {isJobRunning(activeJob?.status) && (
                    <button
                      type="button"
                      onClick={handleCancelActiveJob}
                      disabled={isCancelling}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 disabled:opacity-50 transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      {isCancelling ? "Cancelling..." : "Cancel / Reset"}
                    </button>
                  )}
                  <div className="sm:min-w-[230px]">
                    <ProbaeButton
                      type="button"
                      onClick={handleStartUpload}
                      disabled={!selectedFile || isUploading || isJobRunning(activeJob?.status)}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Uploading &amp; Queuing...
                        </>
                      ) : isJobRunning(activeJob?.status) ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Celery Task Running...
                        </>
                      ) : (
                        <>
                          <Database className="w-4 h-4" /> Validate &amp; Import Raw Materials
                        </>
                      )}
                    </ProbaeButton>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Live Celery Job Progress Panel */}
          {activeJob && (
            <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    {renderStatusBadge(activeJob.status)}
                    <span className="text-xs font-mono text-neutral-500">
                      Job ID: {activeJob.job_id}
                    </span>
                    {activeJob.filename && (
                      <span className="text-xs font-semibold text-neutral-700 bg-neutral-100 px-2.5 py-0.5 rounded-lg">
                        {activeJob.filename}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-neutral-800 mt-2">
                    {activeJob.message}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {activeJob.status === "COMPLETED" && (
                    <>
                      <Link
                        href="/admin/raw-materials/cost-management"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
                      >
                        Cost MGT <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                      <Link
                        href="/admin/raw-materials/calorie-management"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#6A0FAD] text-white text-xs font-bold hover:bg-[#580b91] transition"
                      >
                        Calorie MGT <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => fetchJobById(activeJob.job_id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-600 hover:bg-neutral-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isJobRunning(activeJob.status) ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                  {isJobRunning(activeJob.status) ? (
                    <button
                      type="button"
                      onClick={handleCancelActiveJob}
                      disabled={isCancelling}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      {isCancelling ? "Cancelling..." : "Cancel Job"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleDismissJobPanel}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-500 hover:bg-neutral-50 cursor-pointer"
                      title="Clear active job panel"
                    >
                      <X className="w-3.5 h-3.5" /> Dismiss
                    </button>
                  )}
                </div>
              </div>

              {activeJob.status === "QUEUED" && queuedSeconds >= 6 && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <p className="font-bold">
                      Still waiting in Celery queue ({queuedSeconds}s elapsed)
                    </p>
                    <p className="text-amber-800 mt-0.5">
                      Ensure the Celery worker (<code className="bg-amber-100 px-1 py-0.5 rounded">celery -A app.core.celery_app worker</code>) is running and has been restarted after pulling the latest backend changes so it recognizes <code className="bg-amber-100 px-1 py-0.5 rounded">bulk_import_raw_materials</code>, or click <strong>Cancel Job</strong> to reset.
                    </p>
                  </div>
                </div>
              )}

              {/* Progress Bars */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-neutral-700">Overall Progress</span>
                    <span className="text-[#6A0FAD]">{activeJob.progress_pct || 0}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-neutral-100 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        activeJob.status === "COMPLETED"
                          ? "bg-emerald-500"
                          : activeJob.status === "VALIDATION_FAILED"
                          ? "bg-amber-500"
                          : activeJob.status === "FAILED"
                          ? "bg-rose-500"
                          : "bg-[#6A0FAD]"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(2, activeJob.progress_pct || 0))}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div className="bg-neutral-50 rounded-2xl p-3 border border-neutral-100">
                    <p className="text-[11px] font-bold text-neutral-400 uppercase">Total Rows</p>
                    <p className="text-lg font-black text-neutral-900">{activeJob.total_rows}</p>
                  </div>
                  <div className="bg-neutral-50 rounded-2xl p-3 border border-neutral-100">
                    <p className="text-[11px] font-bold text-neutral-400 uppercase">Validated</p>
                    <p className="text-lg font-black text-blue-700">
                      {activeJob.validated_rows} / {activeJob.total_rows}
                    </p>
                  </div>
                  <div className="bg-neutral-50 rounded-2xl p-3 border border-neutral-100">
                    <p className="text-[11px] font-bold text-neutral-400 uppercase">Failed Rows</p>
                    <p className={`text-lg font-black ${activeJob.failed_rows > 0 ? "text-amber-600" : "text-neutral-700"}`}>
                      {activeJob.failed_rows}
                    </p>
                  </div>
                  <div className="bg-neutral-50 rounded-2xl p-3 border border-neutral-100">
                    <p className="text-[11px] font-bold text-neutral-400 uppercase">Created Materials</p>
                    <p className="text-lg font-black text-emerald-700">{activeJob.created_materials}</p>
                  </div>
                </div>
              </div>

              {/* Validation Error Table */}
              {activeJob.errors && activeJob.errors.length > 0 && (
                <div className="border border-amber-200 bg-amber-50/40 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-black text-amber-900">
                        Row Validation Errors ({activeJob.total_error_count || activeJob.errors.length} failing row(s))
                      </h3>
                      <p className="text-xs text-amber-800">
                        No raw materials were created. Fix the flagged rows in your sheet and re-upload.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={errorFilter}
                          onChange={(e) => setErrorFilter(e.target.value)}
                          placeholder="Filter errors..."
                          className="pl-8 pr-3 py-1.5 text-xs bg-white border border-amber-200 rounded-xl focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleExportErrorReport}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> Export Error CSV
                      </button>
                    </div>
                  </div>

                  <div className="max-h-80 overflow-auto rounded-xl border border-amber-200 bg-white">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-amber-50 sticky top-0 border-b border-amber-100 text-[11px] uppercase text-amber-900 font-bold">
                        <tr>
                          <th className="py-2.5 px-3">Row #</th>
                          <th className="py-2.5 px-3">Name</th>
                          <th className="py-2.5 px-3">Item Code</th>
                          <th className="py-2.5 px-3">Unit</th>
                          <th className="py-2.5 px-3">Errors</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {filteredErrors.map((err, i) => (
                          <tr key={`${err.row_number}-${i}`} className="hover:bg-amber-50/30">
                            <td className="py-2.5 px-3 font-bold text-neutral-900 whitespace-nowrap">
                              Row {err.row_number}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-neutral-700">
                              {err.name || "—"}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-neutral-600">
                              {err.item_code || "—"}
                            </td>
                            <td className="py-2.5 px-3 text-neutral-600">
                              {err.unit || "—"}
                            </td>
                            <td className="py-2.5 px-3 text-rose-700 font-medium">
                              <ul className="list-disc pl-4 space-y-0.5">
                                {(err.errors || []).map((msg, j) => (
                                  <li key={j}>{msg}</li>
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

              {/* Completion Summary */}
              {activeJob.status === "COMPLETED" && activeJob.summary && (
                <div className="border border-emerald-200 bg-emerald-50/40 rounded-2xl p-5 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white p-3.5 rounded-2xl border border-emerald-100">
                      <p className="text-[11px] font-bold text-neutral-400 uppercase">Total Created</p>
                      <p className="text-xl font-black text-emerald-700">
                        {activeJob.summary.total_created}
                      </p>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-emerald-100">
                      <p className="text-[11px] font-bold text-neutral-400 uppercase">With Macros</p>
                      <p className="text-xl font-black text-[#6A0FAD]">
                        {activeJob.summary.with_macros_count}
                      </p>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-emerald-100">
                      <p className="text-[11px] font-bold text-neutral-400 uppercase">Opening Stock Logs</p>
                      <p className="text-xl font-black text-neutral-900">
                        {activeJob.summary.with_initial_stock_count}
                      </p>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-emerald-100">
                      <p className="text-[11px] font-bold text-neutral-400 uppercase">Categories Linked</p>
                      <p className="text-xl font-black text-neutral-800">
                        {activeJob.summary.categories_used?.length || 0}
                      </p>
                    </div>
                  </div>

                  {activeJob.summary.sample_created_materials &&
                    activeJob.summary.sample_created_materials.length > 0 && (
                      <div className="overflow-auto max-h-72 rounded-xl border border-emerald-200 bg-white">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="bg-emerald-50 sticky top-0 border-b border-emerald-100 text-[11px] uppercase text-emerald-900 font-bold">
                            <tr>
                              <th className="py-2.5 px-3">Row</th>
                              <th className="py-2.5 px-3">Name</th>
                              <th className="py-2.5 px-3">Code</th>
                              <th className="py-2.5 px-3">Unit</th>
                              <th className="py-2.5 px-3">Std / Actual Price</th>
                              <th className="py-2.5 px-3">Calories</th>
                              <th className="py-2.5 px-3">Macros (P/C/F/Fb)</th>
                              <th className="py-2.5 px-3">Category / Vendor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100">
                            {activeJob.summary.sample_created_materials.map((rm) => (
                              <tr key={rm.ulid} className="hover:bg-emerald-50/20">
                                <td className="py-2 px-3 text-neutral-500">#{rm.row_number}</td>
                                <td className="py-2 px-3 font-bold text-neutral-900">{rm.name}</td>
                                <td className="py-2 px-3 font-mono text-neutral-600">{rm.item_code || "—"}</td>
                                <td className="py-2 px-3 uppercase font-semibold text-neutral-700">{rm.unit}</td>
                                <td className="py-2 px-3 font-semibold text-neutral-800">
                                  &#8377;{rm.standard_price}
                                  {rm.actual_price !== null ? ` / ₹${rm.actual_price}` : ""}
                                </td>
                                <td className="py-2 px-3 font-semibold text-emerald-700">
                                  {rm.calories !== null ? `${rm.calories} kcal` : "—"}
                                </td>
                                <td className="py-2 px-3 text-neutral-600">
                                  {rm.protein ?? "—"} / {rm.carbs ?? "—"} / {rm.fat ?? "—"} / {rm.fiber ?? "—"}
                                </td>
                                <td className="py-2 px-3 text-neutral-600">
                                  {[rm.category, rm.vendor].filter(Boolean).join(" • ") || "—"}
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
          )}

          {/* Reference Section: Categories/Vendors Lookup, Columns Guide, Recent Jobs */}
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveRefTab("lookup")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeRefTab === "lookup"
                      ? "bg-[#6A0FAD] text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70"
                  }`}
                >
                  Valid Categories &amp; Vendors
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRefTab("columns")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeRefTab === "columns"
                      ? "bg-[#6A0FAD] text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70"
                  }`}
                >
                  Template Columns &amp; Format Guide
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveRefTab("history");
                    fetchRecentJobs();
                  }}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeRefTab === "history"
                      ? "bg-[#6A0FAD] text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70"
                  }`}
                >
                  <History className="w-3.5 h-3.5" /> Recent Celery Jobs
                </button>
              </div>
            </div>

            {activeRefTab === "lookup" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative max-w-md flex-1">
                    <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={refSearch}
                      onChange={(e) => setRefSearch(e.target.value)}
                      placeholder="Filter existing categories or vendors..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-medium focus:outline-none focus:border-[#6A0FAD]"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    {(sampleData?.valid_units || []).map((u) => (
                      <span
                        key={u.value}
                        className="px-2.5 py-1 rounded-lg bg-purple-50 text-[#6A0FAD] font-bold border border-purple-100"
                      >
                        unit: {u.value}
                      </span>
                    ))}
                  </div>
                </div>

                {isLoadingSample ? (
                  <div className="py-10 flex justify-center">
                    <BowlLoader className="w-7 h-7 text-[#6A0FAD]" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Categories */}
                    <div className="border border-neutral-200 rounded-2xl overflow-hidden">
                      <div className="bg-neutral-50 px-4 py-2.5 border-b border-neutral-200 text-xs font-bold text-neutral-700">
                        Categories ({filteredCategories.length})
                      </div>
                      <div className="max-h-60 overflow-auto divide-y divide-neutral-100">
                        {filteredCategories.length === 0 ? (
                          <p className="p-4 text-xs text-neutral-400">No matching categories.</p>
                        ) : (
                          filteredCategories.map((c) => (
                            <div
                              key={c.ulid}
                              className="flex items-center justify-between px-4 py-2 text-xs hover:bg-neutral-50"
                            >
                              <span className="font-semibold text-neutral-800">{c.name}</span>
                              <button
                                type="button"
                                onClick={() => copyText(c.name, `cat-${c.ulid}`)}
                                className="text-neutral-400 hover:text-[#6A0FAD] cursor-pointer"
                                title="Copy Category Name"
                              >
                                {copiedKey === `cat-${c.ulid}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Vendors */}
                    <div className="border border-neutral-200 rounded-2xl overflow-hidden">
                      <div className="bg-neutral-50 px-4 py-2.5 border-b border-neutral-200 text-xs font-bold text-neutral-700">
                        Vendors ({filteredVendors.length})
                      </div>
                      <div className="max-h-60 overflow-auto divide-y divide-neutral-100">
                        {filteredVendors.length === 0 ? (
                          <p className="p-4 text-xs text-neutral-400">No matching vendors.</p>
                        ) : (
                          filteredVendors.map((v) => (
                            <div
                              key={v.ulid}
                              className="flex items-center justify-between px-4 py-2 text-xs hover:bg-neutral-50"
                            >
                              <div>
                                <span className="font-mono font-bold text-[#6A0FAD] mr-2">
                                  {v.code}
                                </span>
                                <span className="font-semibold text-neutral-800">{v.name}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => copyText(v.code, `vnd-${v.ulid}`)}
                                className="text-neutral-400 hover:text-[#6A0FAD] cursor-pointer"
                                title="Copy Vendor Code"
                              >
                                {copiedKey === `vnd-${v.ulid}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeRefTab === "columns" && (
              <div className="overflow-auto max-h-96 rounded-2xl border border-neutral-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-neutral-50 sticky top-0 border-b border-neutral-200 text-[11px] uppercase text-neutral-500 font-bold">
                    <tr>
                      <th className="py-2.5 px-4">Column Header</th>
                      <th className="py-2.5 px-4">Required?</th>
                      <th className="py-2.5 px-4">Description</th>
                      <th className="py-2.5 px-4">Example</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {(sampleData?.columns || []).map((col) => (
                      <tr key={col.key} className="hover:bg-neutral-50/50">
                        <td className="py-2.5 px-4 font-mono font-bold text-[#6A0FAD] whitespace-nowrap">
                          {col.header}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-neutral-700 whitespace-nowrap">
                          {col.required}
                        </td>
                        <td className="py-2.5 px-4 text-neutral-600">{col.description}</td>
                        <td className="py-2.5 px-4 font-mono text-neutral-500">
                          {col.example || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeRefTab === "history" && (
              <div className="overflow-auto max-h-80 rounded-2xl border border-neutral-200">
                {isLoadingHistory ? (
                  <div className="py-10 flex justify-center">
                    <BowlLoader className="w-6 h-6 text-[#6A0FAD]" />
                  </div>
                ) : recentJobs.length === 0 ? (
                  <div className="py-10 text-center text-xs text-neutral-400 font-medium">
                    No recent raw material bulk upload jobs found in Redis (retained for 24 hours).
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-neutral-50 sticky top-0 border-b border-neutral-200 text-[11px] uppercase text-neutral-500 font-bold">
                      <tr>
                        <th className="py-2.5 px-4">File</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4">Rows</th>
                        <th className="py-2.5 px-4">Created</th>
                        <th className="py-2.5 px-4">By</th>
                        <th className="py-2.5 px-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {recentJobs.map((j) => (
                        <tr key={j.job_id} className="hover:bg-neutral-50/60">
                          <td className="py-2.5 px-4 font-semibold text-neutral-800">
                            {j.filename || j.job_id}
                          </td>
                          <td className="py-2.5 px-4">{renderStatusBadge(j.status)}</td>
                          <td className="py-2.5 px-4 text-neutral-600">{j.total_rows}</td>
                          <td className="py-2.5 px-4 font-bold text-emerald-700">
                            {j.created_materials}
                          </td>
                          <td className="py-2.5 px-4 text-neutral-500">
                            {j.uploaded_by || "Admin"}
                          </td>
                          <td className="py-2.5 px-4">
                            <button
                              type="button"
                              onClick={() => {
                                if (typeof window !== "undefined") {
                                  sessionStorage.setItem(ACTIVE_JOB_STORAGE_KEY, j.job_id);
                                }
                                fetchJobById(j.job_id);
                              }}
                              className="text-xs font-bold text-[#6A0FAD] hover:underline cursor-pointer"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
