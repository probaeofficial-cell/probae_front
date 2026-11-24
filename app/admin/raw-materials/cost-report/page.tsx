"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, Search, ShoppingBasket, Soup } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { endpoints } from "@/lib/apiService";
import { queryKeys } from "@/lib/queryKeys";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { BowlLoader } from "@/components/admin/BowlLoader";

type Period = "today" | "this-week" | "last-week" | "this-month" | "last-month" | "custom";
const PAGE_SIZE = 15;

function toLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function mondayOf(date: Date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

function getDateRange(period: Period, customStart: string, customEnd: string) {
  const today = new Date();
  if (period === "custom") return { start: customStart, end: customEnd };
  if (period === "today") return { start: toLocalIsoDate(today), end: toLocalIsoDate(today) };
  if (period === "this-week") return { start: toLocalIsoDate(mondayOf(today)), end: toLocalIsoDate(today) };
  if (period === "last-week") {
    const start = mondayOf(today);
    start.setDate(start.getDate() - 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start: toLocalIsoDate(start), end: toLocalIsoDate(end) };
  }
  if (period === "last-month") {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { start: toLocalIsoDate(start), end: toLocalIsoDate(end) };
  }
  return {
    start: toLocalIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
    end: toLocalIsoDate(today),
  };
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value || 0);
}

function quantity(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 4 }).format(value || 0);
}

export default function RawMaterialCostReportPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("this-month");
  const [customStart, setCustomStart] = useState(() => toLocalIsoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [customEnd, setCustomEnd] = useState(() => toLocalIsoDate(new Date()));
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const range = useMemo(() => getDateRange(period, customStart, customEnd), [period, customStart, customEnd]);
  const datesValid = Boolean(range.start && range.end && range.start <= range.end);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => setPage(1), [range.start, range.end, debouncedSearch]);

  const reportQuery = useQuery({
    queryKey: queryKeys.rawMaterials.costReport(user?.id ?? "anonymous", [range.start, range.end, debouncedSearch, page, PAGE_SIZE]),
    queryFn: () => endpoints.rawMaterials.getCostReport({ startDate: range.start, endDate: range.end, search: debouncedSearch, page, size: PAGE_SIZE }),
    enabled: Boolean(user && datesValid),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  const report = reportQuery.data;
  const totalPages = Math.max(1, Math.ceil((report?.total || 0) / PAGE_SIZE));

  return (
    <div className="h-full overflow-y-auto bg-[#f8f7fb] text-neutral-900">
      <Header />
      <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <Breadcrumbs segments={["Raw Materials", "Cost Report"]} />
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Raw Material Cost Report</h1>
            <p className="mt-1 max-w-2xl text-sm text-neutral-500 sm:text-base">Compare purchase spend and quantity with the raw-material cost and quantity used in bowls for the selected period.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 sm:text-sm">
            <CalendarDays className="h-4 w-4 text-[#6A0FAD]" />
            {range.start && range.end ? `${range.start} — ${range.end}` : "Choose a valid date range"}
          </div>
        </div>

        <section className="mb-5 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(190px,0.8fr)_minmax(220px,1fr)_minmax(220px,1fr)_minmax(240px,1.2fr)] lg:items-end">
            <label className="text-sm font-semibold text-neutral-700">
              Period
              <select value={period} onChange={(event) => setPeriod(event.target.value as Period)} className="mt-1.5 block w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100">
                <option value="today">Today</option>
                <option value="this-week">This week</option>
                <option value="last-week">Last week</option>
                <option value="this-month">This month</option>
                <option value="last-month">Last month</option>
                <option value="custom">Custom dates</option>
              </select>
            </label>
            {period === "custom" ? (
              <>
                <label className="text-sm font-semibold text-neutral-700">From<input type="date" value={customStart} max={customEnd || undefined} onChange={(event) => setCustomStart(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100" /></label>
                <label className="text-sm font-semibold text-neutral-700">To<input type="date" value={customEnd} min={customStart || undefined} onChange={(event) => setCustomEnd(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100" /></label>
              </>
            ) : <div className="hidden lg:block" />}
            <label className="relative text-sm font-semibold text-neutral-700">
              Search raw materials
              <Search className="pointer-events-none absolute left-3 top-[2.45rem] h-4 w-4 text-neutral-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or item code" className="mt-1.5 block w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100" />
            </label>
          </div>
          {!datesValid && <p className="mt-3 text-sm font-medium text-red-600">The end date must be on or after the start date.</p>}
        </section>

        <section className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><ShoppingBasket className="h-5 w-5" /></span>
              <div><p className="text-sm font-semibold text-neutral-500">Raw material purchases</p><p className="mt-1 text-2xl font-black sm:text-3xl">{money(report?.summary.purchased_cost || 0)}</p></div>
            </div>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-[#6A0FAD]"><Soup className="h-5 w-5" /></span>
              <div><p className="text-sm font-semibold text-neutral-500">Raw material cost in bowls</p><p className="mt-1 text-2xl font-black sm:text-3xl">{money(report?.summary.bowl_cost || 0)}</p></div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex flex-col gap-1 border-b border-neutral-100 px-4 py-4 sm:px-5">
            <h2 className="font-bold">Per raw material</h2>
            <p className="text-xs text-neutral-500 sm:text-sm">Purchase totals use purchase records; bowl use counts non-cancelled orders by target date. Quantities are shown in each material’s catalog unit.</p>
          </div>
          {reportQuery.isLoading ? (
            <div className="flex justify-center py-16"><BowlLoader className="h-8 w-8 text-[#6A0FAD]" /></div>
          ) : reportQuery.isError ? (
            <div className="px-4 py-12 text-center text-sm font-medium text-red-600">{reportQuery.error instanceof Error ? reportQuery.error.message : "Could not load the cost report."}<button onClick={() => void reportQuery.refetch()} className="ml-2 underline">Try again</button></div>
          ) : !report?.items.length ? (
            <div className="px-4 py-14 text-center text-sm text-neutral-500">No raw materials match this period and search.</div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500"><tr><th className="px-5 py-3">Raw material</th><th className="px-5 py-3 text-right">Bought quantity</th><th className="px-5 py-3 text-right">Purchase cost</th><th className="px-5 py-3 text-right">Used in bowls</th><th className="px-5 py-3 text-right">Bowl raw-material cost</th></tr></thead>
                  <tbody className="divide-y divide-neutral-100">{report.items.map((item) => <tr key={item.id} className="hover:bg-neutral-50/70"><td className="px-5 py-4"><div className="font-bold text-neutral-900">{item.name}</div>{item.item_code && <div className="mt-0.5 text-xs text-neutral-500">{item.item_code}</div>}</td><td className="px-5 py-4 text-right font-semibold tabular-nums">{quantity(item.purchased_quantity)} {item.unit}</td><td className="px-5 py-4 text-right font-semibold tabular-nums">{money(item.purchased_cost)}</td><td className="px-5 py-4 text-right font-semibold tabular-nums">{quantity(item.bowl_quantity)} {item.unit}</td><td className="px-5 py-4 text-right font-bold text-[#6A0FAD] tabular-nums">{money(item.bowl_cost)}</td></tr>)}</tbody>
                </table>
              </div>
              <div className="divide-y divide-neutral-100 md:hidden">{report.items.map((item) => <article key={item.id} className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{item.name}</h3>{item.item_code && <p className="text-xs text-neutral-500">{item.item_code}</p>}</div><span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold uppercase text-neutral-600">{item.unit}</span></div><div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-amber-50/70 p-3"><p className="text-xs text-neutral-500">Bought quantity</p><p className="mt-1 font-bold tabular-nums">{quantity(item.purchased_quantity)} {item.unit}</p></div><div className="rounded-xl bg-amber-50/70 p-3"><p className="text-xs text-neutral-500">Purchase cost</p><p className="mt-1 font-bold tabular-nums">{money(item.purchased_cost)}</p></div><div className="rounded-xl bg-purple-50/70 p-3"><p className="text-xs text-neutral-500">Used in bowls</p><p className="mt-1 font-bold tabular-nums">{quantity(item.bowl_quantity)} {item.unit}</p></div><div className="rounded-xl bg-purple-50/70 p-3"><p className="text-xs text-neutral-500">Bowl material cost</p><p className="mt-1 font-bold text-[#6A0FAD] tabular-nums">{money(item.bowl_cost)}</p></div></div></article>)}</div>
            </>
          )}
          <div className="flex flex-col gap-3 border-t border-neutral-100 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-neutral-500">{report?.total ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, report.total)} of ${report.total}` : "0 materials"}</p>
            <div className="flex items-center justify-end gap-2">
              <button disabled={page <= 1 || reportQuery.isFetching} onClick={() => setPage((current) => Math.max(1, current - 1))} className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" />Previous</button>
              <span className="min-w-16 text-center text-xs font-semibold text-neutral-500">{page} / {totalPages}</span>
              <button disabled={page >= totalPages || reportQuery.isFetching} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-40">Next<ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </section>
        {report?.cost_allocation_note && <p className="mt-3 px-1 text-xs leading-relaxed text-neutral-500">Note: {report.cost_allocation_note}</p>}
      </div>
    </div>
  );
}
