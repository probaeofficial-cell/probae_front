"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
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

  return <div className="flex h-full flex-col bg-[#E6E6E6]"><div className="flex h-full min-h-0 flex-col overflow-hidden rounded-tl-3xl bg-white p-4 shadow-[0_0_15px_rgba(0,0,0,0.05)] sm:p-8">
    <Header /><Breadcrumbs segments={["Admin", "Enquiries"]} />
    <div className="mb-5 mt-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-bold text-neutral-900">Enquiries</h1><p className="mt-1 text-sm text-neutral-500">Review plan and custom bowl enquiries.</p></div><div className="flex items-center gap-3"><select aria-label="Filter enquiries by status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as "" | EnquiryStatus); setPage(1); }} className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700"><option value="">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select><button onClick={() => void loadEnquiries()} disabled={loading} className="rounded-xl border border-neutral-200 bg-white p-2.5 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50" aria-label="Refresh enquiries"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button></div></div>
    {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-neutral-100 bg-white shadow-sm"><table className="w-full min-w-[900px] text-left"><thead className="sticky top-0 bg-neutral-50"><tr className="border-b border-neutral-100">{["Name", "Phone", "Email", "Plan Interest", "Status", "Date"].map((label) => <th key={label} className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-neutral-500">{label}</th>)}</tr></thead><tbody className="divide-y divide-neutral-100">
      {loading ? <tr><td colSpan={6} className="px-6 py-12 text-center"><BowlLoader className="mx-auto h-8 w-8 text-[#6A0FAD]" /></td></tr> : items.length === 0 ? <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-neutral-500">No enquiries found.</td></tr> : items.map((item) => <tr key={item.ulid} className="hover:bg-neutral-50/70"><td className="px-5 py-4"><p className="font-semibold text-neutral-900">{item.name}</p>{item.message && <p title={item.message} className="mt-1 max-w-[220px] truncate text-xs text-neutral-500">{item.message}</p>}</td><td className="px-5 py-4 whitespace-nowrap"><a href={`tel:${item.phone}`} className="text-sm text-neutral-700 hover:text-[#6A0FAD]">{item.phone}</a></td><td className="px-5 py-4 text-sm text-neutral-600">{item.email || "—"}</td><td className="px-5 py-4 text-sm text-neutral-700">{item.plan_interest || "Custom bowl"}</td><td className="px-5 py-4"><select aria-label={`Status for ${item.name}`} value={item.status} disabled={updating === item.ulid} onChange={(event) => void updateStatus(item.ulid, event.target.value as EnquiryStatus)} className={`rounded-full border-0 px-3 py-1.5 text-xs font-bold outline-none disabled:opacity-60 ${statusStyles[item.status]}`}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></td><td className="px-5 py-4 whitespace-nowrap text-sm text-neutral-600">{item.created_at ? new Date(item.created_at).toLocaleDateString() : "—"}</td></tr>)}
    </tbody></table></div>
    <div className="mt-4 flex shrink-0 items-center justify-between"><span className="text-sm font-medium text-neutral-500">{total ? `Page ${page} of ${totalPages} · ${total} enquiries` : "0 enquiries"}</span><div className="flex gap-2"><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading} aria-label="Previous page" className="rounded-full bg-[#f8f5fb] p-2.5 text-neutral-600 disabled:opacity-40"><ChevronLeft className="h-5 w-5" /></button><button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages || loading} aria-label="Next page" className="rounded-full bg-[#f8f5fb] p-2.5 text-neutral-600 disabled:opacity-40"><ChevronRight className="h-5 w-5" /></button></div></div>
  </div></div>;
}
