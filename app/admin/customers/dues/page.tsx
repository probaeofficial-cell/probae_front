"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ProbaeSearch } from "@/components/admin/ProbaeSearch";
import { BowlLoader } from "@/components/admin/BowlLoader";
import { endpoints } from "@/lib/apiService";

type DueCustomer = {
  ulid: string;
  name: string;
  phone: string;
  email?: string | null;
  wallet_balance: number | string;
  status?: string;
  subscription_status?: string;
  created_at?: string;
};

const PAGE_SIZE = 20;
const formatMoney = (value: number) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 2,
}).format(value);

export default function CustomerDuesPage() {
  const [customers, setCustomers] = useState<DueCustomer[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchDues = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await endpoints.customers.list({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch,
        only_dues: true,
      }) as any;
      if (!result?.success) throw new Error("Could not load customer dues.");
      setCustomers(result.customers ?? []);
      setTotalCount(Number(result.totalCount ?? 0));
    } catch (err) {
      console.error("Failed to load customer dues:", err);
      setError("Could not load customer dues. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => { void fetchDues(); }, [fetchDues]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[#E6E6E6]">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-tl-3xl bg-white p-4 shadow-[0_0_15px_rgba(0,0,0,0.05)] sm:p-8">
        <Header />
        <Breadcrumbs segments={["Admin", "Customers", "Dues"]} />

        <main className="mt-4 flex min-h-0 flex-1 flex-col gap-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Customer dues</h1>
              <p className="mt-1 text-sm text-neutral-500">Customers with an outstanding wallet balance.</p>
            </div>
            <div className="w-full sm:max-w-md">
              <ProbaeSearch value={search} onChange={setSearch} placeholder="Search by name or phone..." isLoading={loading} hideSort hideFilter />
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-[#F3F4F6]">
                  <tr className="border-b border-neutral-200">
                    {["Customer", "Phone", "Email", "Account status", "Due amount", ""].map((label, i) => (
                      <th key={`${label}-${i}`} className={`whitespace-nowrap px-5 py-4 text-xs font-bold uppercase tracking-wider text-neutral-500 ${i === 4 ? "text-right" : ""}`}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {loading ? (
                    <tr><td colSpan={6} className="px-5 py-12 text-center"><BowlLoader className="mx-auto h-9 w-9 text-[#6A0FAD]" /></td></tr>
                  ) : error ? (
                    <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-red-600">{error}<button onClick={() => void fetchDues()} className="ml-2 font-semibold underline">Retry</button></td></tr>
                  ) : customers.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-neutral-500">{debouncedSearch ? "No customers with dues match your search." : "No customer dues found."}</td></tr>
                  ) : customers.map((customer) => {
                    const balance = Number(customer.wallet_balance) || 0;
                    return (
                      <tr key={customer.ulid} className="transition-colors hover:bg-neutral-50">
                        <td className="px-5 py-4">
                          <Link href={`/admin/customers/${customer.ulid}`} className="font-semibold text-neutral-900 hover:text-[#6A0FAD]">{customer.name}</Link>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-sm text-neutral-600">{customer.phone}</td>
                        <td className="px-5 py-4 text-sm text-neutral-600">{customer.email || "—"}</td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <div className="flex flex-col items-start gap-1">
                            <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">{(customer.status || "UNKNOWN").replaceAll("_", " ")}</span>
                            {customer.subscription_status && customer.subscription_status !== "NONE" && customer.subscription_status.toUpperCase() !== (customer.status || "").toUpperCase() && <span className="text-xs text-neutral-500">Subscription: {customer.subscription_status.replaceAll("_", " ")}</span>}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-right font-bold text-red-600">{formatMoney(Math.abs(balance))}</td>
                        <td className="px-5 py-4 text-right"><Link aria-label={`View ${customer.name}`} href={`/admin/customers/${customer.ulid}`} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition hover:bg-purple-50 hover:text-[#6A0FAD]"><Eye className="h-4 w-4" /></Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-neutral-100 px-4 py-3 sm:px-5">
              <span className="text-xs text-neutral-500 sm:text-sm">{totalCount} customers with dues · Page {page} of {totalPages}</span>
              <div className="flex items-center gap-2">
                <button aria-label="Previous page" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f8f5fb] text-neutral-600 transition hover:bg-[#f1edf7] disabled:opacity-40"><ChevronLeft className="h-5 w-5" /></button>
                <button aria-label="Next page" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f8f5fb] text-neutral-600 transition hover:bg-[#f1edf7] disabled:opacity-40"><ChevronRight className="h-5 w-5" /></button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
