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
  Layers,
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

type ValidDurationOption = {
  value: string;
  days_hint: string;
};

type ValidPlanTypeOption = {
  value: string;
  label: string;
};

type ExistingTierItem = {
  ulid: string;
  name: string;
  category: string;
  duration: string;
  days: number;
  plan_type: string;
  included_meal_slots?: string[];
  discount_percentage?: number;
};

type SampleData = {
  today_ist: string;
  existing_plan_tiers_count: number;
  rule_summary: string;
  valid_categories: string[];
  valid_durations: ValidDurationOption[];
  valid_plan_types: ValidPlanTypeOption[];
  valid_meal_slots: string[];
  existing_tiers: ExistingTierItem[];
  columns: SampleColumn[];
  sample_rows: Record<string, any>[];
};

type ValidationErrorRow = {
  row_number: number;
  name: string;
  category: string;
  duration: string;
  days: string;
  errors: string[];
};

type BulkPlanTierJob = {
  job_id: string;
  filename: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  status:
    | "QUEUED"
    | "VALIDATING"
    | "IMPORTING"
    | "COMPLETED"
    | "VALIDATION_FAILED"
    | "FAILED"
    | "CANCELLED";
  phase: string;
  message: string;
  total_rows: number;
  validated_rows: number;
  processed_rows: number;
  created_tiers: number;
  valid_rows: number;
  failed_rows: number;
  progress_pct: number;
  validation_progress_pct: number;
  import_progress_pct: number;
  errors: ValidationErrorRow[];
  total_error_count?: number;
  summary?: {
    total_created: number;
    standard_count: number;
    custom_count: number;
    weekly_count: number;
    monthly_count: number;
    categories_used: string[];
    sample_created_tiers?: Array<{
      row_number: number;
      ulid: string;
      name: string;
      category: string;
      duration: string;
      days: number;
      plan_type: string;
      included_meal_slots: string[];
      discount_percentage: number;
    }>;
  } | null;
};

const ACTIVE_JOB_STORAGE_KEY = "probae_bulk_plan_tier_active_job_id";

export default function BulkPlanTiersUploadPage() {
  const { user, isLoading: authLoading } = useAuth();

  const [sampleData, setSampleData] = useState<SampleData | null>(null);
  const [isLoadingSample, setIsLoadingSample] = useState(true);
  const [isDownloadingCsv, setIsDownloadingCsv] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeJob, setActiveJob] = useState<BulkPlanTierJob | null>(null);
  const [recentJobs, setRecentJobs] = useState<BulkPlanTierJob[]>([]);
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
      const data = await endpoints.planTiers.getBulkSample();
      setSampleData(data);
    } catch (err) {
      console.error("Failed to fetch plan tier bulk sample metadata:", err);
    } finally {
      setIsLoadingSample(false);
    }
  }, []);

  const fetchRecentJobs = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await endpoints.planTiers.listBulkJobs(15);
      if (res?.jobs) {
        setRecentJobs(res.jobs);
      }
    } catch (err) {
      console.error("Failed to fetch recent bulk plan tier jobs:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const fetchJobById = useCallback(async (jobId: string) => {
    try {
      const res = await endpoints.planTiers.getBulkJob(jobId);
      if (res?.job) {
        setActiveJob(res.job);
        return res.job as BulkPlanTierJob;
      }
    } catch (err: any) {
      if (err?.status === 404 && typeof window !== "undefined") {
        sessionStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
      } else {
        console.error("Failed to poll bulk plan tier job status:", err);
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
      wch: h === "name" ? 38 : h === "included_meal_slots" ? 28 : 18,
    }));

    const maxRefRows = Math.max(
      sampleData.valid_categories.length,
      sampleData.valid_durations.length,
      sampleData.valid_plan_types.length,
      sampleData.valid_meal_slots.length,
      sampleData.existing_tiers.length
    );
    const refRows: any[][] = [
      [
        "Valid Categories",
        "Duration (Days Hint)",
        "Plan Types",
        "Valid Meal Slots",
        "",
        "Existing Active Tier Name",
        "Category",
        "Duration",
        "Days",
      ],
    ];
    for (let i = 0; i < maxRefRows; i++) {
      const cat = sampleData.valid_categories[i];
      const dur = sampleData.valid_durations[i];
      const pt = sampleData.valid_plan_types[i];
      const slot = sampleData.valid_meal_slots[i];
      const ex = sampleData.existing_tiers[i];
      refRows.push([
        cat || "",
        dur ? `${dur.value} (${dur.days_hint})` : "",
        pt ? pt.value : "",
        slot || "",
        "",
        ex ? ex.name : "",
        ex ? ex.category : "",
        ex ? ex.duration : "",
        ex ? ex.days : "",
      ]);
    }
    const wsRef = XLSX.utils.aoa_to_sheet(refRows);
    wsRef["!cols"] = [
      { wch: 18 },
      { wch: 32 },
      { wch: 14 },
      { wch: 18 },
      { wch: 4 },
      { wch: 34 },
      { wch: 14 },
      { wch: 12 },
      { wch: 8 },
    ];

    const instrRows: any[][] = [
      ["Bulk Plan Tiers Upload - Instructions"],
      ["Rules", sampleData.rule_summary],
      ["Date (IST)", sampleData.today_ist],
      ["Valid Categories", sampleData.valid_categories.join(", ")],
      ["Valid Durations", sampleData.valid_durations.map((d) => `${d.value} (${d.days_hint})`).join(" | ")],
      ["Valid Plan Types", sampleData.valid_plan_types.map((p) => p.label).join(" | ")],
      ["Valid Meal Slots", sampleData.valid_meal_slots.join(", ")],
      [],
      ["Column Name", "Required?", "Description", "Example"],
      ...sampleData.columns.map((c) => [c.header, c.required, c.description, c.example]),
    ];
    const wsInstr = XLSX.utils.aoa_to_sheet(instrRows);
    wsInstr["!cols"] = [{ wch: 24 }, { wch: 22 }, { wch: 74 }, { wch: 36 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsData, "Bulk_Plan_Tiers");
    XLSX.utils.book_append_sheet(wb, wsRef, "Options_&_Existing");
    XLSX.utils.book_append_sheet(wb, wsInstr, "Instructions");
    XLSX.writeFile(wb, `Probae_Bulk_Plan_Tiers_Sample_${sampleData.today_ist}.xlsx`);
  };

  const handleDownloadCsvTemplate = async () => {
    setIsDownloadingCsv(true);
    try {
      const blob = await endpoints.planTiers.downloadBulkSampleCsv();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bulk_plan_tiers_sample.csv";
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
      ["Row Number", "Name", "Category", "Duration", "Days", "Validation Errors"],
      ...activeJob.errors.map((e) => [
        e.row_number,
        e.name,
        e.category,
        e.duration,
        e.days,
        (e.errors || []).join(" | "),
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const csvOut = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csvOut], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bulk_plan_tiers_errors_${activeJob.job_id}.csv`;
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
    XLSX.utils.book_append_sheet(outWb, ws, "Bulk_Plan_Tiers");
    const xlsxBytes = XLSX.write(outWb, { type: "array", bookType: "xlsx" });
    const newName = file.name.replace(/\.xls$/i, ".xlsx");
    return new File([xlsxBytes], newName, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  };

  const handleStartUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError("Please choose a .xlsx, .xls, or .csv file before importing.");
      fileInputRef.current?.focus();
      return;
    }
    if (isUploading || isJobRunning(activeJob?.status)) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const preparedFile = await normalizeUploadFile(selectedFile);
      const res = await endpoints.planTiers.uploadBulkPlanTiers(preparedFile);

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
          created_tiers: 0,
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
      setUploadError(err?.detail || err?.message || "Failed to upload bulk plan tiers file.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelActiveJob = async () => {
    if (!activeJob?.job_id || isCancelling) return;
    setIsCancelling(true);
    try {
      const res = await endpoints.planTiers.cancelBulkJob(activeJob.job_id);
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
  const filteredExistingTiers = (sampleData?.existing_tiers || []).filter(
    (t) =>
      !qLower ||
      t.name.toLowerCase().includes(qLower) ||
      t.category.toLowerCase().includes(qLower) ||
      t.duration.toLowerCase().includes(qLower)
  );

  const filteredErrors = (activeJob?.errors || []).filter((err) => {
    const q = errorFilter.trim().toLowerCase();
    if (!q) return true;
    return (
      String(err.row_number).includes(q) ||
      (err.name || "").toLowerCase().includes(q) ||
      (err.category || "").toLowerCase().includes(q) ||
      (err.duration || "").toLowerCase().includes(q) ||
      (err.errors || []).some((m) => m.toLowerCase().includes(q))
    );
  });

  const getProgressFillColor = (status: BulkPlanTierJob["status"]) => {
    switch (status) {
      case "COMPLETED":
        return "#10b981";
      case "VALIDATION_FAILED":
        return "#f59e0b";
      case "FAILED":
        return "#f43f5e";
      case "CANCELLED":
        return "#6b7280";
      default:
        return "#6a0fad";
    }
  };

  const renderStatusBadge = (status: BulkPlanTierJob["status"]) => {
    switch (status) {
      case "QUEUED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-700 border border-neutral-200">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" /> Queued in Celery
          </span>
        );
      case "VALIDATING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Phase 1: Validating
          </span>
        );
      case "IMPORTING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-[#6A0FAD] border border-purple-200">
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Phase 2: Saving to DB
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Import Completed
          </span>
        );
      case "VALIDATION_FAILED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> Validation Failed (0 Saved)
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-600 border border-neutral-300">
            <X className="w-3.5 h-3.5" aria-hidden="true" /> Cancelled
          </span>
        );
      case "FAILED":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" /> Failed (Rolled Back)
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
        <Breadcrumbs segments={["Plans", "Bulk Upload"]} />

        <div className="space-y-6 pb-8">
          {/* Header Banner */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-[#6A0FAD]/5 via-purple-50/40 to-indigo-50/40 border border-purple-100 rounded-3xl p-6">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-black text-neutral-900">
                  Bulk Plan Tiers Upload
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wide">
                  Create-Only &bull; Atomic
                </span>
              </div>
              <p className="text-sm text-neutral-600 mt-1.5 max-w-3xl">
                Create multiple subscription plan tiers (
                <span className="font-semibold text-neutral-800">
                  Category, Duration, Days, Plan Type, Meal Slots, Discount %
                </span>
                ) from one sheet. A Celery worker validates every row before writing; if any row
                fails, zero plan tiers are created.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleDownloadXlsxTemplate}
                disabled={isLoadingSample || !sampleData}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6A0FAD] text-white text-xs font-bold shadow-sm hover:bg-[#580b91] disabled:opacity-50 transition cursor-pointer"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                Download Excel Template (.xlsx)
              </button>
              <button
                type="button"
                onClick={handleDownloadCsvTemplate}
                disabled={isDownloadingCsv || isLoadingSample}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-neutral-700 border border-neutral-200 text-xs font-bold shadow-sm hover:bg-neutral-50 disabled:opacity-50 transition cursor-pointer"
              >
                <FileText className="w-4 h-4" aria-hidden="true" />
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
                  <ShieldCheck className="w-4 h-4 text-[#6A0FAD]" aria-hidden="true" />
                  Validation &amp; Safety Rules
                </h2>
                {sampleData && (
                  <span className="text-[11px] font-semibold text-neutral-500">
                    Active Tiers:{" "}
                    <strong className="text-neutral-800">
                      {sampleData.existing_plan_tiers_count}
                    </strong>
                  </span>
                )}
              </div>

              <div className="space-y-2.5 text-xs text-neutral-600">
                <div className="flex items-start gap-2.5 bg-white p-3 rounded-2xl border border-neutral-100">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-[#6A0FAD] font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <p>
                    <strong className="text-neutral-800">Strict active name uniqueness:</strong>{" "}
                    Every <code className="bg-neutral-100 px-1 py-0.5 rounded">name</code> must be
                    unique across active plan tiers in the database and within your file. Reserved{" "}
                    <code className="bg-neutral-100 px-1 py-0.5 rounded">Bespoke Custom Plan</code>{" "}
                    cannot be created here.
                  </p>
                </div>

                <div className="flex items-start gap-2.5 bg-white p-3 rounded-2xl border border-neutral-100">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-[#6A0FAD] font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <p>
                    <strong className="text-neutral-800">Duration &amp; delivered days check:</strong>{" "}
                    <code className="bg-neutral-100 px-1 py-0.5 rounded">WEEKLY</code> requires{" "}
                    <strong className="text-neutral-800">1–7 days</strong> (typically 5, 6, 7).{" "}
                    <code className="bg-neutral-100 px-1 py-0.5 rounded">MONTHLY</code> expects{" "}
                    <strong className="text-neutral-800">8–31 delivered days</strong> (typically
                    22, 26, 30).
                  </p>
                </div>

                <div className="flex items-start gap-2.5 bg-white p-3 rounded-2xl border border-neutral-100">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-[#6A0FAD] font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <p>
                    <strong className="text-neutral-800">Valid category, type &amp; slots:</strong>{" "}
                    Category (<code className="bg-neutral-100 px-1 py-0.5 rounded">Core</code>,{" "}
                    <code className="bg-neutral-100 px-1 py-0.5 rounded">Pro</code>,{" "}
                    <code className="bg-neutral-100 px-1 py-0.5 rounded">Performance</code>),{" "}
                    <code className="bg-neutral-100 px-1 py-0.5 rounded">plan_type</code> (
                    <code className="bg-neutral-100 px-1 py-0.5 rounded">STANDARD</code> /{" "}
                    <code className="bg-neutral-100 px-1 py-0.5 rounded">CUSTOM</code>), and comma-separated{" "}
                    <code className="bg-neutral-100 px-1 py-0.5 rounded">included_meal_slots</code>{" "}
                    are validated strictly.
                  </p>
                </div>

                <div className="flex items-start gap-2.5 bg-white p-3 rounded-2xl border border-neutral-100">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-[#6A0FAD] font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </span>
                  <p>
                    <strong className="text-neutral-800">All-or-nothing Celery transaction:</strong>{" "}
                    Phase 1 validates 100% of rows; Phase 2 inserts all tiers in a single transaction
                    after re-checking active names. Any error aborts with 0 writes.
                  </p>
                </div>
              </div>
            </div>

            {/* File Upload Form */}
            <form
              aria-labelledby="bulk-plan-upload-heading"
              onSubmit={handleStartUpload}
              noValidate
              className="xl:col-span-7 bg-white border border-neutral-200 rounded-3xl p-6 flex flex-col justify-between space-y-5 shadow-sm"
            >
              <div>
                <h2
                  id="bulk-plan-upload-heading"
                  className="text-sm font-black uppercase tracking-wider text-neutral-700 flex items-center gap-2"
                >
                  <Upload className="w-4 h-4 text-[#6A0FAD]" aria-hidden="true" />
                  Upload Filled Sheet (.xlsx / .xls / .csv)
                </h2>
                <p id="bulk-plan-file-help" className="text-xs text-neutral-500 mt-1">
                  Up to 5,000 rows and 10 MB per upload. Runs asynchronously via Celery with live
                  progress tracking.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    id="bulk-plan-tiers-file"
                    name="file"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    aria-describedby="bulk-plan-file-help"
                    aria-invalid={uploadError ? "true" : undefined}
                    className="peer sr-only"
                    onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  />
                  <label
                    htmlFor="bulk-plan-tiers-file"
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
                    className={`block border-2 border-dashed rounded-2xl p-8 text-center transition cursor-pointer peer-focus-visible:ring-2 peer-focus-visible:ring-[#6A0FAD] peer-focus-visible:ring-offset-2 ${
                      isDragging
                        ? "border-[#6A0FAD] bg-purple-50/50"
                        : selectedFile
                        ? "border-emerald-300 bg-emerald-50/30"
                        : "border-neutral-300 hover:border-[#6A0FAD]/60 hover:bg-neutral-50/60"
                    }`}
                  >
                    {selectedFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <FileSpreadsheet className="w-6 h-6" aria-hidden="true" />
                        </div>
                        <p className="text-sm font-bold text-neutral-900">{selectedFile.name}</p>
                        <p className="text-xs text-neutral-500">
                          {(selectedFile.size / 1024).toFixed(1)} KB &bull; Ready to validate and
                          import (click to choose a different file)
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#6A0FAD] flex items-center justify-center">
                          <Upload className="w-6 h-6" aria-hidden="true" />
                        </div>
                        <p className="text-sm font-bold text-neutral-800">
                          Drop your Excel or CSV file here, or click to browse
                        </p>
                        <p className="text-xs text-neutral-500">
                          Supports Probae template (.xlsx, .xls, .csv)
                        </p>
                      </div>
                    )}
                  </label>
                </div>

                {selectedFile && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden="true" /> Remove selected file
                    </button>
                  </div>
                )}
              </div>

              {uploadError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="text-xs text-neutral-500">
                  {isJobRunning(activeJob?.status) ? (
                    <span className="text-amber-700 font-medium">
                      Background Celery job active for{" "}
                      <strong className="text-neutral-800">
                        {activeJob?.filename || activeJob?.job_id}
                      </strong>{" "}
                      ({activeJob?.status}).{" "}
                      {activeJob?.status === "QUEUED" && queuedSeconds >= 6
                        ? "Worker has not picked it up yet — make sure Celery worker is restarted, or click Cancel / Reset."
                        : "Removing a selected file will not stop an already-submitted job."}
                    </span>
                  ) : (
                    <span>
                      Check <strong className="text-neutral-700">Options_&amp;_Existing</strong>{" "}
                      inside the Excel template to avoid duplicate names.
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
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                      {isCancelling ? "Cancelling..." : "Cancel / Reset"}
                    </button>
                  )}
                  <div className="sm:min-w-[230px]">
                    <ProbaeButton
                      type="submit"
                      className="w-full"
                      disabled={isUploading || isJobRunning(activeJob?.status)}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Uploading
                          &amp; Queuing...
                        </>
                      ) : isJobRunning(activeJob?.status) ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Celery
                          Task Running...
                        </>
                      ) : (
                        <>
                          <Layers className="w-4 h-4" aria-hidden="true" /> Validate &amp; Import
                          Plan Tiers
                        </>
                      )}
                    </ProbaeButton>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Live Celery Job Progress Panel */}
          {activeJob && (
            <section
              aria-labelledby="active-job-status-heading"
              className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm space-y-5"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h2 id="active-job-status-heading" className="sr-only">
                    Bulk Plan Tiers Import Progress
                  </h2>
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
                  <p
                    role="status"
                    aria-live="polite"
                    className="text-sm font-semibold text-neutral-800 mt-2"
                  >
                    {activeJob.message}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {activeJob.status === "COMPLETED" && (
                    <Link
                      href="/admin/plans/builder"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#6A0FAD] text-white text-xs font-bold hover:bg-[#580b91] transition"
                    >
                      View Plan Tiers <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => fetchJobById(activeJob.job_id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-600 hover:bg-neutral-50 cursor-pointer"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${
                        isJobRunning(activeJob.status) ? "animate-spin" : ""
                      }`}
                      aria-hidden="true"
                    />
                    Refresh
                  </button>
                  {isJobRunning(activeJob.status) ? (
                    <button
                      type="button"
                      onClick={handleCancelActiveJob}
                      disabled={isCancelling}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                      {isCancelling ? "Cancelling..." : "Cancel Job"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleDismissJobPanel}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-500 hover:bg-neutral-50 cursor-pointer"
                      title="Clear active job panel"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden="true" /> Dismiss
                    </button>
                  )}
                </div>
              </div>

              {activeJob.status === "QUEUED" && queuedSeconds >= 6 && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  <AlertTriangle
                    className="w-4 h-4 shrink-0 mt-0.5 text-amber-600"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-bold">
                      Still waiting in Celery queue ({queuedSeconds}s elapsed)
                    </p>
                    <p className="text-amber-800 mt-0.5">
                      Ensure the Celery worker (
                      <code className="bg-amber-100 px-1 py-0.5 rounded">
                        celery -A app.core.celery_app worker
                      </code>
                      ) is running and has been restarted after pulling the latest backend changes so
                      it recognizes{" "}
                      <code className="bg-amber-100 px-1 py-0.5 rounded">
                        bulk_import_plan_tiers
                      </code>
                      , or click <strong>Cancel Job</strong> to reset.
                    </p>
                  </div>
                </div>
              )}

              {/* Semantic Progress Bar */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <label htmlFor="bulk-plan-tiers-progress" className="text-neutral-700">
                      Overall Progress
                    </label>
                    <span className="text-[#6A0FAD]">
                      {activeJob.status === "QUEUED"
                        ? "Waiting for worker..."
                        : `${activeJob.progress_pct || 0}%`}
                    </span>
                  </div>
                  <progress
                    id="bulk-plan-tiers-progress"
                    className="probae-progress"
                    max={100}
                    {...(activeJob.status !== "QUEUED"
                      ? { value: Math.min(100, Math.max(0, activeJob.progress_pct || 0)) }
                      : {})}
                    style={
                      {
                        "--progress-bar-fill": getProgressFillColor(activeJob.status),
                      } as React.CSSProperties
                    }
                  />
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
                    <p
                      className={`text-lg font-black ${
                        activeJob.failed_rows > 0 ? "text-amber-600" : "text-neutral-700"
                      }`}
                    >
                      {activeJob.failed_rows}
                    </p>
                  </div>
                  <div className="bg-neutral-50 rounded-2xl p-3 border border-neutral-100">
                    <p className="text-[11px] font-bold text-neutral-400 uppercase">
                      Created Tiers
                    </p>
                    <p className="text-lg font-black text-emerald-700">{activeJob.created_tiers}</p>
                  </div>
                </div>
              </div>

              {/* Validation Error Table */}
              {activeJob.errors && activeJob.errors.length > 0 && (
                <div className="border border-amber-200 bg-amber-50/40 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-black text-amber-900">
                        Row Validation Errors (
                        {activeJob.total_error_count || activeJob.errors.length} failing row(s))
                      </h3>
                      <p className="text-xs text-amber-800">
                        No plan tiers were created. Fix the flagged rows in your sheet and
                        re-upload.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <search className="relative">
                        <label htmlFor="plan-bulk-error-filter" className="sr-only">
                          Filter validation errors
                        </label>
                        <Search
                          className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                          aria-hidden="true"
                        />
                        <input
                          id="plan-bulk-error-filter"
                          type="search"
                          value={errorFilter}
                          onChange={(e) => setErrorFilter(e.target.value)}
                          placeholder="Filter errors..."
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          className="pl-8 pr-3 py-1.5 text-xs bg-white border border-amber-200 rounded-xl focus:outline-none focus:border-amber-500"
                        />
                      </search>
                      <button
                        type="button"
                        onClick={handleExportErrorReport}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" aria-hidden="true" /> Export Error CSV
                      </button>
                    </div>
                  </div>

                  <div
                    tabIndex={0}
                    role="region"
                    aria-labelledby="plan-errors-table-caption"
                    className="max-h-80 overflow-auto rounded-xl border border-amber-200 bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    <table className="w-full text-left border-collapse text-xs">
                      <caption id="plan-errors-table-caption" className="sr-only">
                        Plan tier bulk upload row validation errors
                      </caption>
                      <thead className="bg-amber-50 sticky top-0 border-b border-amber-100 text-[11px] uppercase text-amber-900 font-bold">
                        <tr>
                          <th scope="col" className="py-2.5 px-3">
                            Row #
                          </th>
                          <th scope="col" className="py-2.5 px-3">
                            Name
                          </th>
                          <th scope="col" className="py-2.5 px-3">
                            Category
                          </th>
                          <th scope="col" className="py-2.5 px-3">
                            Duration / Days
                          </th>
                          <th scope="col" className="py-2.5 px-3">
                            Errors
                          </th>
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
                            <td className="py-2.5 px-3 text-neutral-600">
                              {err.category || "—"}
                            </td>
                            <td className="py-2.5 px-3 text-neutral-600 whitespace-nowrap">
                              {[err.duration, err.days].filter(Boolean).join(" / ") || "—"}
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
                      <p className="text-[11px] font-bold text-neutral-400 uppercase">
                        Total Created
                      </p>
                      <p className="text-xl font-black text-emerald-700">
                        {activeJob.summary.total_created}
                      </p>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-emerald-100">
                      <p className="text-[11px] font-bold text-neutral-400 uppercase">
                        Standard vs Custom
                      </p>
                      <p className="text-xl font-black text-[#6A0FAD]">
                        {activeJob.summary.standard_count} / {activeJob.summary.custom_count}
                      </p>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-emerald-100">
                      <p className="text-[11px] font-bold text-neutral-400 uppercase">
                        Weekly vs Monthly
                      </p>
                      <p className="text-xl font-black text-neutral-900">
                        {activeJob.summary.weekly_count} / {activeJob.summary.monthly_count}
                      </p>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-emerald-100">
                      <p className="text-[11px] font-bold text-neutral-400 uppercase">Categories</p>
                      <p className="text-sm font-black text-neutral-800 mt-1">
                        {activeJob.summary.categories_used?.join(", ") || "—"}
                      </p>
                    </div>
                  </div>

                  {activeJob.summary.sample_created_tiers &&
                    activeJob.summary.sample_created_tiers.length > 0 && (
                      <div
                        tabIndex={0}
                        role="region"
                        aria-labelledby="plan-created-table-caption"
                        className="overflow-auto max-h-72 rounded-xl border border-emerald-200 bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                      >
                        <table className="w-full text-left border-collapse text-xs">
                          <caption id="plan-created-table-caption" className="sr-only">
                            Created plan tiers preview
                          </caption>
                          <thead className="bg-emerald-50 sticky top-0 border-b border-emerald-100 text-[11px] uppercase text-emerald-900 font-bold">
                            <tr>
                              <th scope="col" className="py-2.5 px-3">
                                Row
                              </th>
                              <th scope="col" className="py-2.5 px-3">
                                Name
                              </th>
                              <th scope="col" className="py-2.5 px-3">
                                Category
                              </th>
                              <th scope="col" className="py-2.5 px-3">
                                Duration &amp; Days
                              </th>
                              <th scope="col" className="py-2.5 px-3">
                                Plan Type
                              </th>
                              <th scope="col" className="py-2.5 px-3">
                                Included Meal Slots
                              </th>
                              <th scope="col" className="py-2.5 px-3">
                                Discount
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100">
                            {activeJob.summary.sample_created_tiers.map((t) => (
                              <tr key={t.ulid} className="hover:bg-emerald-50/20">
                                <td className="py-2 px-3 text-neutral-500">#{t.row_number}</td>
                                <td className="py-2 px-3 font-bold text-neutral-900">{t.name}</td>
                                <td className="py-2 px-3">
                                  <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-bold">
                                    {t.category}
                                  </span>
                                </td>
                                <td className="py-2 px-3 font-semibold text-neutral-700 whitespace-nowrap">
                                  {t.duration} &bull; {t.days} Days
                                </td>
                                <td className="py-2 px-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-full font-bold ${
                                      t.plan_type === "CUSTOM"
                                        ? "bg-[#6A0FAD]/10 text-[#6A0FAD]"
                                        : "bg-blue-50 text-blue-700"
                                    }`}
                                  >
                                    {t.plan_type}
                                  </span>
                                </td>
                                <td className="py-2 px-3">
                                  <div className="flex flex-wrap gap-1">
                                    {(t.included_meal_slots || []).map((slot) => (
                                      <span
                                        key={slot}
                                        className="px-2 py-0.5 rounded bg-purple-50 text-[#6A0FAD] font-bold uppercase text-[10px]"
                                      >
                                        {slot}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-2 px-3 font-bold text-emerald-700">
                                  {t.discount_percentage}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                </div>
              )}
            </section>
          )}

          {/* Reference Section: Options & Existing Tiers, Columns Guide, Recent Jobs */}
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3">
              <div
                role="group"
                aria-label="Reference views"
                className="flex flex-wrap items-center gap-2"
              >
                <button
                  type="button"
                  aria-pressed={activeRefTab === "lookup"}
                  onClick={() => setActiveRefTab("lookup")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeRefTab === "lookup"
                      ? "bg-[#6A0FAD] text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70"
                  }`}
                >
                  Valid Options &amp; Existing Tiers
                </button>
                <button
                  type="button"
                  aria-pressed={activeRefTab === "columns"}
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
                  aria-pressed={activeRefTab === "history"}
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
                  <History className="w-3.5 h-3.5" aria-hidden="true" /> Recent Celery Jobs
                </button>
              </div>
            </div>

            {activeRefTab === "lookup" && (
              <div className="space-y-4">
                {isLoadingSample ? (
                  <div className="py-10 flex justify-center">
                    <BowlLoader className="w-7 h-7 text-[#6A0FAD]" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Valid Categories */}
                      <div className="border border-neutral-200 rounded-2xl overflow-hidden">
                        <div className="bg-neutral-50 px-4 py-2.5 border-b border-neutral-200 text-xs font-bold text-neutral-700">
                          Valid Categories
                        </div>
                        <div className="p-3 flex flex-wrap gap-2">
                          {(sampleData?.valid_categories || []).map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => copyText(cat, `cat-${cat}`)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-50 text-[#6A0FAD] border border-purple-100 text-xs font-bold hover:bg-purple-100 cursor-pointer"
                              title={`Copy category ${cat}`}
                            >
                              {cat}
                              {copiedKey === `cat-${cat}` ? (
                                <Check className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                              ) : (
                                <Copy className="w-3 h-3 opacity-60" aria-hidden="true" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Valid Durations & Plan Types */}
                      <div className="border border-neutral-200 rounded-2xl overflow-hidden">
                        <div className="bg-neutral-50 px-4 py-2.5 border-b border-neutral-200 text-xs font-bold text-neutral-700">
                          Durations &amp; Plan Types
                        </div>
                        <div className="p-3 space-y-2 text-xs">
                          {(sampleData?.valid_durations || []).map((d) => (
                            <div key={d.value} className="flex items-center justify-between gap-2">
                              <span className="font-mono font-bold text-neutral-800">
                                {d.value}
                              </span>
                              <span className="text-neutral-500">{d.days_hint}</span>
                            </div>
                          ))}
                          <div className="border-t border-neutral-100 pt-2 flex flex-wrap gap-2">
                            {(sampleData?.valid_plan_types || []).map((pt) => (
                              <span
                                key={pt.value}
                                className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold"
                              >
                                {pt.value}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Valid Meal Slots */}
                      <div className="border border-neutral-200 rounded-2xl overflow-hidden">
                        <div className="bg-neutral-50 px-4 py-2.5 border-b border-neutral-200 text-xs font-bold text-neutral-700">
                          Valid Meal Slots
                        </div>
                        <div className="p-3 flex flex-wrap gap-2">
                          {(sampleData?.valid_meal_slots || []).map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => copyText(slot, `slot-${slot}`)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs font-bold hover:bg-emerald-100 cursor-pointer"
                              title={`Copy meal slot ${slot}`}
                            >
                              {slot}
                              {copiedKey === `slot-${slot}` ? (
                                <Check className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                              ) : (
                                <Copy className="w-3 h-3 opacity-60" aria-hidden="true" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                      <search className="relative max-w-md flex-1">
                        <label htmlFor="existing-tiers-filter" className="sr-only">
                          Filter existing active plan tiers
                        </label>
                        <Search
                          className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                          aria-hidden="true"
                        />
                        <input
                          id="existing-tiers-filter"
                          type="search"
                          value={refSearch}
                          onChange={(e) => setRefSearch(e.target.value)}
                          placeholder="Filter existing active plan tiers..."
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 text-xs font-medium focus:outline-none focus:border-[#6A0FAD]"
                        />
                      </search>
                      <span className="text-xs font-semibold text-neutral-500">
                        Showing {filteredExistingTiers.length} active plan tier(s) (duplicates fail
                        validation)
                      </span>
                    </div>

                    <div
                      tabIndex={0}
                      role="region"
                      aria-labelledby="existing-tiers-caption"
                      className="max-h-72 overflow-auto rounded-2xl border border-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6A0FAD]"
                    >
                      {filteredExistingTiers.length === 0 ? (
                        <p className="p-6 text-center text-xs text-neutral-400">
                          No matching active plan tiers.
                        </p>
                      ) : (
                        <table className="w-full text-left border-collapse text-xs">
                          <caption id="existing-tiers-caption" className="sr-only">
                            Existing active plan tiers reference list
                          </caption>
                          <thead className="bg-neutral-50 sticky top-0 border-b border-neutral-200 text-[11px] uppercase text-neutral-500 font-bold">
                            <tr>
                              <th scope="col" className="py-2.5 px-4">
                                Tier Name
                              </th>
                              <th scope="col" className="py-2.5 px-4">
                                Category
                              </th>
                              <th scope="col" className="py-2.5 px-4">
                                Duration &amp; Days
                              </th>
                              <th scope="col" className="py-2.5 px-4">
                                Plan Type
                              </th>
                              <th scope="col" className="py-2.5 px-4">
                                Slots
                              </th>
                              <th scope="col" className="py-2.5 px-4">
                                Discount
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100">
                            {filteredExistingTiers.map((t) => (
                              <tr key={t.ulid} className="hover:bg-neutral-50/70">
                                <td className="py-2.5 px-4 font-bold text-neutral-900">{t.name}</td>
                                <td className="py-2.5 px-4 text-neutral-700 font-semibold">
                                  {t.category}
                                </td>
                                <td className="py-2.5 px-4 text-neutral-600 whitespace-nowrap">
                                  {t.duration} &bull; {t.days} Days
                                </td>
                                <td className="py-2.5 px-4 font-bold text-neutral-700">
                                  {t.plan_type}
                                </td>
                                <td className="py-2.5 px-4 text-neutral-600">
                                  {(t.included_meal_slots || []).join(", ") || "—"}
                                </td>
                                <td className="py-2.5 px-4 font-semibold text-neutral-700">
                                  {t.discount_percentage ?? 0}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeRefTab === "columns" && (
              <div
                tabIndex={0}
                role="region"
                aria-labelledby="plan-columns-caption"
                className="overflow-auto max-h-96 rounded-2xl border border-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6A0FAD]"
              >
                <table className="w-full text-left border-collapse text-xs">
                  <caption id="plan-columns-caption" className="sr-only">
                    Plan tier bulk upload template columns and format guide
                  </caption>
                  <thead className="bg-neutral-50 sticky top-0 border-b border-neutral-200 text-[11px] uppercase text-neutral-500 font-bold">
                    <tr>
                      <th scope="col" className="py-2.5 px-4">
                        Column Header
                      </th>
                      <th scope="col" className="py-2.5 px-4">
                        Required?
                      </th>
                      <th scope="col" className="py-2.5 px-4">
                        Description
                      </th>
                      <th scope="col" className="py-2.5 px-4">
                        Example
                      </th>
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
              <div
                tabIndex={0}
                role="region"
                aria-labelledby="plan-jobs-caption"
                className="overflow-auto max-h-80 rounded-2xl border border-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6A0FAD]"
              >
                {isLoadingHistory ? (
                  <div className="py-10 flex justify-center">
                    <BowlLoader className="w-6 h-6 text-[#6A0FAD]" />
                  </div>
                ) : recentJobs.length === 0 ? (
                  <div className="py-10 text-center text-xs text-neutral-400 font-medium">
                    No recent plan tier bulk upload jobs found in Redis (retained for 24 hours).
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <caption id="plan-jobs-caption" className="sr-only">
                      Recent Celery plan tier bulk upload jobs
                    </caption>
                    <thead className="bg-neutral-50 sticky top-0 border-b border-neutral-200 text-[11px] uppercase text-neutral-500 font-bold">
                      <tr>
                        <th scope="col" className="py-2.5 px-4">
                          File
                        </th>
                        <th scope="col" className="py-2.5 px-4">
                          Status
                        </th>
                        <th scope="col" className="py-2.5 px-4">
                          Rows
                        </th>
                        <th scope="col" className="py-2.5 px-4">
                          Created
                        </th>
                        <th scope="col" className="py-2.5 px-4">
                          By
                        </th>
                        <th scope="col" className="py-2.5 px-4">
                          Action
                        </th>
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
                            {j.created_tiers}
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
