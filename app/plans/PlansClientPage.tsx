"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ThemeWrapper from "@/components/user/ThemeWrapper";
import Header from "@/components/user/Header";
import BottomNav from "@/components/user/BottomNav";
import PlanCard, { type PlanData } from "@/components/user/PlanCard";
import { endpoints } from "@/lib/apiService";

type Category = "" | "Core" | "Pro";

export default function PlansClientPage({ initialPlans, totalPages: initialTotalPages }: { initialPlans: PlanData[]; totalPages: number }) {
  const [plans, setPlans] = useState(initialPlans);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [category, setCategory] = useState<Category>("");
  const [loading, setLoading] = useState(false);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    let active = true;
    setLoading(true);
    endpoints.public.getPlans(page, 9, category).then((data: { plans?: PlanData[]; total_pages?: number }) => {
      if (active) { setPlans(Array.isArray(data.plans) ? data.plans : []); setTotalPages(Math.max(1, Number(data.total_pages) || 1)); }
    }).catch((error: unknown) => {
      console.error("Failed to load plans:", error);
      if (active) setPlans([]);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [category, page]);

  function selectCategory(next: Category) { setCategory(next); setPage(1); }

  return <ThemeWrapper><div className="min-h-screen bg-white pb-24 font-sans md:pb-0"><Header /><main className="mx-auto max-w-7xl px-4 pb-16 pt-32 md:px-8 md:pt-40">
    <header className="mb-10 text-center"><p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-[#F97316]">ProBae nutrition</p><h1 className="text-4xl font-extrabold text-neutral-900 md:text-5xl">Choose your plan</h1><p className="mx-auto mt-4 max-w-xl text-neutral-500">Structured nutrition programs designed around your lifestyle and goals.</p></header>
    <div className="mb-8 flex justify-center gap-2">{([ ["", "All"], ["Core", "Core"], ["Pro", "Pro"] ] as const).map(([value, label]) => <button key={label} type="button" onClick={() => selectCategory(value)} aria-pressed={category === value} className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${category === value ? "bg-[#F97316] text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}>{label}</button>)}</div>
    {loading ? <div className="py-20 text-center text-neutral-500">Loading plans…</div> : plans.length ? <div className="grid grid-cols-1 gap-6 px-0 sm:grid-cols-2 lg:grid-cols-3 md:px-4">{plans.map((plan) => <PlanCard key={plan.ulid} plan={plan} />)}</div> : <div className="rounded-2xl bg-neutral-50 py-16 text-center text-neutral-500">No plans available in this category yet.</div>}
    <div className="mt-10 flex items-center justify-center gap-5"><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading} className="rounded-full bg-neutral-100 p-3 disabled:opacity-40" aria-label="Previous page"><ChevronLeft /></button><span className="text-sm font-semibold text-neutral-600">Page {page} of {totalPages}</span><button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages || loading} className="rounded-full bg-neutral-100 p-3 disabled:opacity-40" aria-label="Next page"><ChevronRight /></button></div>
  </main><BottomNav /></div></ThemeWrapper>;
}
