"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { BowlLoader } from "@/components/admin/BowlLoader";
import { endpoints } from "@/lib/apiService";
import { useAuth } from "@/lib/AuthContext";

type EnquiryStatus = "NEW" | "CONTACTED" | "CONVERTED" | "CLOSED";
interface EnquiryItem {
  ulid: string;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  plan_interest: string | null;
  status: EnquiryStatus;
  created_at: string | null;
}

const statuses: EnquiryStatus[] = ["NEW", "CONTACTED", "CONVERTED", "CLOSED"];
const statusStyles: Record<EnquiryStatus, string> = {
  NEW: "bg-blue-100 text-blue-800",
  CONTACTED: "bg-yellow-100 text-yellow-800",
  CONVERTED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-700",
};

function EnquiryStatusSelect({
  item,
  disabled,
  onChange,
}: {
  item: EnquiryItem;
  disabled: boolean;
  onChange: (status: EnquiryStatus) => void;
}) {
  return (
    <span className="relative inline-flex w-36 shrink-0 items-center">
      <select
        aria-label={`Status for ${item.name}`}
        value={item.status}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as EnquiryStatus)}
        className={`w-full appearance-none rounded-full border-0 py-2 pl-3 pr-8 text-center text-xs font-bold leading-4 outline-none transition focus:ring-2 focus:ring-[#6A0FAD]/25 disabled:cursor-wait disabled:opacity-60 ${statusStyles[item.status]}`}
      >
        {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 h-4 w-4 text-current opacity-70" />
    </span>
  );
}

export default function EnquiriesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<EnquiryItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"" | EnquiryStatus>("");
  const [error, setError] = useState("");
  const totalPages = Math.max(1, Math.ceil(total / 20));

  const loadEnquiries = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await endpoints.enquiries.list(page, 20, statusFilter);
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total) || 0);
    } catch (loadError: unknown) {
      console.error("Failed to load enquiries:", loadError);
      setError(loadError instanceof Error ? loadError.message : "Could not load enquiries.");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { void loadEnquiries(); }, [loadEnquiries]);

  async function updateStatus(ulid: string, status: EnquiryStatus) {
    setUpdating(ulid);
    setError("");
    try {
      await endpoints.enquiries.updateStatus(ulid, status);
      setItems((current) => current.map((item) => item.ulid === ulid ? { ...item, status } : item));
      if (statusFilter && statusFilter !== status) await loadEnquiries();
    } catch (updateError: unknown) {
      setError(updateError instanceof Error ? updateError.message : "Could not update enquiry status.");
    } finally {
      setUpdating(null);
    }
  }

  if (authLoading) return <div className="flex h-full items-center justify-center"><BowlLoader className="h-8 w-8 text-[#6A0FAD]" /></div>;
  if (!user) return null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#E6E6E6]">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-tl-3xl bg-white p-3 shadow-[0_0_15px_rgba(0,0,0,0.05)] sm:p-5 lg:p-8">
        <Header />
        <Breadcrumbs segments={["Admin", "Enquiries"]} />

        <div className="mb-4 mt-4 flex shrink-0 flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">Enquiries</h1>
            <p className="mt-1 text-sm text-neutral-500">Review plan and custom bowl enquiries.</p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
            <select aria-label="Filter enquiries by status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as "" | EnquiryStatus); setPage(1); }} className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium text-neutral-700 sm:flex-none sm:px-4">
              <option value="">All statuses</option>
              {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <button type="button" onClick={() => void loadEnquiries()} disabled={loading} className="shrink-0 rounded-xl border border-neutral-200 bg-white p-2.5 text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-50" aria-label="Refresh enquiries">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {error && <p role="alert" className="mb-3 shrink-0 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-neutral-100 bg-neutral-50/50 p-3 shadow-sm sm:p-4">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center"><BowlLoader className="h-8 w-8 text-[#6A0FAD]" /></div>
          ) : items.length === 0 ? (
            <div className="flex min-h-48 items-center justify-center text-center text-sm text-neutral-500">No enquiries found.</div>
          ) : (
            <>
              {/* Compact stacked cards on phones and tablets. */}
              <div className="space-y-3 lg:hidden">
                {items.map((item) => (
                  <article key={item.ulid} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="break-words font-bold text-neutral-900">{item.name}</h2>
                        <p className="mt-1 break-words text-sm text-neutral-600">{item.plan_interest || "Custom bowl"}</p>
                      </div>
                      <span className="shrink-0 pt-0.5 text-xs text-neutral-500">{item.created_at ? new Date(item.created_at).toLocaleDateString() : "—"}</span>
                    </div>
                    {item.message && <p className="mt-3 break-words rounded-xl bg-neutral-50 p-3 text-sm leading-relaxed text-neutral-600">{item.message}</p>}
                    <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                      <a href={`tel:${item.phone}`} className="break-all text-neutral-700 hover:text-[#6A0FAD]">{item.phone}</a>
                      {item.email ? <a href={`mailto:${item.email}`} className="break-all text-neutral-700 hover:text-[#6A0FAD]">{item.email}</a> : <span className="text-neutral-400">No email provided</span>}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-neutral-100 pt-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Status</span>
                      <EnquiryStatusSelect item={item} disabled={updating === item.ulid} onChange={(status) => void updateStatus(item.ulid, status)} />
                    </div>
                  </article>
                ))}
              </div>

              {/* Fixed column widths and centered status control keep desktop rows aligned. */}
              <div className="hidden overflow-x-auto rounded-xl bg-white lg:block">
                <table className="w-full table-fixed text-left">
                  <colgroup><col className="w-[20%]" /><col className="w-[15%]" /><col className="w-[20%]" /><col className="w-[20%]" /><col className="w-[13%]" /><col className="w-[12%]" /></colgroup>
                  <thead className="sticky top-0 z-10 bg-neutral-50">
                    <tr className="border-b border-neutral-100">
                      {["Name", "Phone", "Email", "Plan Interest", "Status", "Date"].map((label) => <th key={label} className={`px-3 py-4 text-xs font-bold uppercase tracking-wider text-neutral-500 xl:px-5 ${label === "Status" || label === "Date" ? "text-center" : "text-left"}`}>{label}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {items.map((item) => (
                      <tr key={item.ulid} className="align-middle transition-colors hover:bg-neutral-50/70">
                        <td className="px-3 py-4 xl:px-5"><p className="truncate font-semibold text-neutral-900" title={item.name}>{item.name}</p>{item.message && <p title={item.message} className="mt-1 truncate text-xs text-neutral-500">{item.message}</p>}</td>
                        <td className="px-3 py-4 xl:px-5"><a href={`tel:${item.phone}`} className="block truncate text-sm text-neutral-700 hover:text-[#6A0FAD]" title={item.phone}>{item.phone}</a></td>
                        <td className="px-3 py-4 xl:px-5"><span className="block truncate text-sm text-neutral-600" title={item.email || "—"}>{item.email || "—"}</span></td>
                        <td className="px-3 py-4 xl:px-5"><span className="block truncate text-sm text-neutral-700" title={item.plan_interest || "Custom bowl"}>{item.plan_interest || "Custom bowl"}</span></td>
                        <td className="px-3 py-4 text-center align-middle xl:px-5">
                          <div className="flex justify-center">
                            <EnquiryStatusSelect item={item} disabled={updating === item.ulid} onChange={(status) => void updateStatus(item.ulid, status)} />
                          </div>
                        </td>
                        <td className="px-3 py-4 text-center align-middle text-sm text-neutral-600 xl:px-5">{item.created_at ? new Date(item.created_at).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-3 pt-1 sm:mt-4">
          <span className="text-xs font-medium text-neutral-500 sm:text-sm">{total ? `Page ${page} of ${totalPages} · ${total} enquiries` : "0 enquiries"}</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading} aria-label="Previous page" className="rounded-full bg-[#f8f5fb] p-2.5 text-neutral-600 transition hover:bg-[#f1edf7] disabled:opacity-40"><ChevronLeft className="h-5 w-5" /></button>
            <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages || loading} aria-label="Next page" className="rounded-full bg-[#f8f5fb] p-2.5 text-neutral-600 transition hover:bg-[#f1edf7] disabled:opacity-40"><ChevronRight className="h-5 w-5" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
