"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Download, FileText, LoaderCircle, X } from "lucide-react";
import { endpoints } from "@/lib/apiService";

type ReportMode = "CUSTOMER" | "SUBSCRIPTION";

interface CustomerOrderReportProps {
  customer: any;
}

const localDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDate = (value: string) => {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
};

export function CustomerOrderReport({ customer }: CustomerOrderReportProps) {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ReportMode>("CUSTOMER");
  const [dateFrom, setDateFrom] = useState(localDate(monthStart));
  const [dateTo, setDateTo] = useState(localDate(today));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const activeSubscription = useMemo(() => {
    const subscriptions = customer.subscriptions || [];
    return subscriptions.find((subscription: any) =>
      subscription.id === customer.active_subscription_id && subscription.status === "ACTIVE",
    ) || subscriptions.find((subscription: any) => subscription.status === "ACTIVE") || null;
  }, [customer.active_subscription_id, customer.subscriptions]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLoading) setIsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen, isLoading]);

  const updateMode = (nextMode: ReportMode) => {
    setMode(nextMode);
    setError("");
    if (nextMode === "SUBSCRIPTION" && activeSubscription) {
      setDateFrom(activeSubscription.start_date_iso || dateFrom);
      setDateTo(activeSubscription.end_date_iso || localDate(new Date()));
    }
  };

  const downloadPdf = async () => {
    setError("");
    if (!dateFrom || !dateTo) return setError("Choose both a start and end date.");
    if (dateFrom > dateTo) return setError("The start date must be on or before the end date.");
    if (mode === "SUBSCRIPTION" && !activeSubscription) {
      return setError("This customer does not have a current active subscription.");
    }

    let reportFrom = dateFrom;
    let reportTo = dateTo;
    if (mode === "SUBSCRIPTION" && activeSubscription) {
      if (activeSubscription.start_date_iso && reportFrom < activeSubscription.start_date_iso) reportFrom = activeSubscription.start_date_iso;
      if (activeSubscription.end_date_iso && reportTo > activeSubscription.end_date_iso) reportTo = activeSubscription.end_date_iso;
      if (reportFrom > reportTo) return setError("The selected dates do not overlap the current subscription period.");
    }

    setIsLoading(true);
    try {
      const pdf: Blob = await endpoints.customers.downloadOrderReport(customer.ulid, {
        scope: mode,
        date_from: reportFrom,
        date_to: reportTo,
      });
      const objectUrl = URL.createObjectURL(pdf);
      const customerName = String(customer.name || "customer").trim()
        .replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `probae-${customerName || "customer"}-orders-${reportFrom}-to-${reportTo}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      setIsOpen(false);
    } catch (requestError: any) {
      setError(requestError?.message || "Could not create the PDF. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => { setIsOpen(true); setError(""); }}
        className="flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#6A0FAD]/20 bg-[#6A0FAD]/5 px-3 py-2.5 text-xs font-bold text-[#6A0FAD] transition-colors hover:bg-[#6A0FAD]/10 max-sm:flex-1 sm:px-4 sm:text-sm"
      >
        <FileText className="h-4 w-4" /> Order report
      </button>

      {isOpen && typeof document !== "undefined" && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Download customer order report"
          onMouseDown={(event) => { if (event.target === event.currentTarget && !isLoading) setIsOpen(false); }}
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-neutral-950/60 p-3 backdrop-blur-sm sm:p-6"
        >
          <div className="my-auto flex max-h-[min(92dvh,760px)] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-neutral-100 px-5 py-4 sm:px-7 sm:py-5">
              <div>
                <div className="flex items-center gap-2 text-[#6A0FAD]">
                  <CalendarDays className="h-4 w-4" />
                  <span className="text-[11px] font-black uppercase tracking-[0.16em]">Customer reports</span>
                </div>
                <h2 className="mt-1 text-xl font-black text-neutral-900">Download order report</h2>
                <p className="mt-1 text-sm text-neutral-500">A clean, paginated PDF ready to share with your client.</p>
              </div>
              <button disabled={isLoading} onClick={() => setIsOpen(false)} aria-label="Close report" className="rounded-xl p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-800 disabled:opacity-50"><X className="h-5 w-5" /></button>
            </div>

            <div className="overflow-y-auto p-5 sm:p-7">
              <div className="mb-6 rounded-2xl bg-gradient-to-br from-[#6A0FAD] to-[#3E1769] p-5 text-white">
                <p className="text-xs font-bold uppercase tracking-widest text-white/70">Report for</p>
                <h3 className="mt-2 break-words text-2xl font-black">{customer.name}</h3>
                <p className="mt-1 break-words text-sm text-white/80">{customer.phone}{customer.email ? ` · ${customer.email}` : ""}</p>
              </div>

              <p className="mb-3 text-xs font-black uppercase tracking-wider text-neutral-500">Choose report scope</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button onClick={() => updateMode("CUSTOMER")} className={`rounded-2xl border p-4 text-left transition-colors ${mode === "CUSTOMER" ? "border-[#6A0FAD] bg-[#6A0FAD]/5 ring-2 ring-[#6A0FAD]/10" : "border-neutral-200 hover:border-neutral-300"}`}>
                  <p className="font-black text-neutral-900">All customer orders</p>
                  <p className="mt-1 text-xs leading-5 text-neutral-500">Every order type placed in the selected date range.</p>
                </button>
                <button disabled={!activeSubscription} onClick={() => updateMode("SUBSCRIPTION")} className={`rounded-2xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${mode === "SUBSCRIPTION" ? "border-[#6A0FAD] bg-[#6A0FAD]/5 ring-2 ring-[#6A0FAD]/10" : "border-neutral-200 hover:border-neutral-300"}`}>
                  <p className="font-black text-neutral-900">Current subscription</p>
                  <p className="mt-1 text-xs leading-5 text-neutral-500">{activeSubscription ? `${activeSubscription.plan_name} · ${Number(activeSubscription.total_bowls_allocated || 0)} bowls allocated` : "No active subscription available"}</p>
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold uppercase tracking-wide text-neutral-500">From date
                  <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm font-medium text-neutral-800 outline-none focus:border-[#6A0FAD]" />
                </label>
                <label className="text-xs font-bold uppercase tracking-wide text-neutral-500">To date
                  <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm font-medium text-neutral-800 outline-none focus:border-[#6A0FAD]" />
                </label>
              </div>
              {mode === "SUBSCRIPTION" && activeSubscription && <p className="mt-3 text-xs text-neutral-500">Subscription period: {formatDate(activeSubscription.start_date_iso)} – {formatDate(activeSubscription.end_date_iso || localDate(new Date()))}. Orders outside this period are excluded.</p>}
              {error && <p role="alert" className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-neutral-100 bg-neutral-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
              <button disabled={isLoading} onClick={() => setIsOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-neutral-500 hover:bg-neutral-200 disabled:opacity-50">Cancel</button>
              <button onClick={downloadPdf} disabled={isLoading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6A0FAD] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#570c8d] disabled:cursor-wait disabled:opacity-60">
                {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {isLoading ? "Creating PDF…" : "Download PDF"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
