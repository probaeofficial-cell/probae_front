"use client";

import { useEffect, useRef, useState } from "react";
import ThemeWrapper from "@/components/user/ThemeWrapper";
import Header from "@/components/user/Header";
import BottomNav from "@/components/user/BottomNav";
import PlanCard, { type PlanData } from "@/components/user/PlanCard";
import { BowlLoader } from "@/components/admin/BowlLoader";
import { endpoints } from "@/lib/apiService";

type Category = "" | "Core" | "Pro";
interface PlansResponse {
  plans?: PlanData[];
  total_pages?: number;
}

export default function PlansClientPage({
  initialPlans,
  totalPages: initialTotalPages,
}: {
  initialPlans: PlanData[];
  totalPages: number;
}) {
  const [plans, setPlans] = useState(initialPlans);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [category, setCategory] = useState<Category>("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const firstRender = useRef(true);
  const loadingMoreRef = useRef(false);
  const requestVersionRef = useRef(0);

  // Keep server-rendered initial plans, then replace the list when its filter changes.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    const requestVersion = ++requestVersionRef.current;
    let active = true;
    loadingMoreRef.current = false;
    setLoadingMore(false);
    setLoading(true);
    setLoadError("");
    setPlans([]);
    setPage(1);

    endpoints.public.getPlans(1, 9, category)
      .then((data: PlansResponse) => {
        if (!active || requestVersion !== requestVersionRef.current) return;
        setPlans(Array.isArray(data.plans) ? data.plans : []);
        setTotalPages(Math.max(0, Number(data.total_pages) || 0));
        setPage(1);
      })
      .catch((error: unknown) => {
        console.error("Failed to load plans:", error);
        if (active && requestVersion === requestVersionRef.current) {
          setPlans([]);
          setLoadError("We couldn’t load plans. Please try selecting the filter again.");
        }
      })
      .finally(() => {
        if (active && requestVersion === requestVersionRef.current) setLoading(false);
      });

    return () => { active = false; };
  }, [category]);

  // Load the next page as the bottom sentinel enters the viewport.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || loading || loadingMore || loadError || page >= totalPages) return;

    const observedVersion = requestVersionRef.current;
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting || loadingMoreRef.current) return;

      const nextPage = page + 1;
      loadingMoreRef.current = true;
      setLoadingMore(true);
      setLoadError("");

      endpoints.public.getPlans(nextPage, 9, category)
        .then((data: PlansResponse) => {
          if (observedVersion !== requestVersionRef.current) return;
          const nextPlans = Array.isArray(data.plans) ? data.plans : [];
          setPlans((current) => [...current, ...nextPlans]);
          setPage(nextPage);
          setTotalPages(Math.max(0, Number(data.total_pages) || 0));
        })
        .catch((error: unknown) => {
          console.error("Failed to load more plans:", error);
          if (observedVersion === requestVersionRef.current) {
            setLoadError("Couldn’t load more plans. Scroll here to try again.");
          }
        })
        .finally(() => {
          if (observedVersion === requestVersionRef.current) {
            loadingMoreRef.current = false;
            setLoadingMore(false);
          }
        });
    }, { rootMargin: "280px 0px", threshold: 0.1 });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [category, loading, loadingMore, loadError, page, totalPages]);

  function selectCategory(next: Category) {
    if (next !== category) setCategory(next);
  }

  const hasLoadedAll = !loading && !loadingMore && plans.length > 0 && page >= totalPages;

  return (
    <ThemeWrapper>
      <div className="min-h-screen bg-white pb-24 font-sans md:pb-0">
        <Header />
        <main className="mx-auto max-w-7xl px-4 pb-16 pt-32 md:px-8 md:pt-40">
          <header className="mb-10 text-center">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-[#F97316]">ProBae nutrition</p>
            <h1 className="text-4xl font-extrabold text-neutral-900 md:text-5xl">Choose your plan</h1>
            <p className="mx-auto mt-4 max-w-xl text-neutral-500">Structured nutrition programs designed around your lifestyle and goals.</p>
          </header>

          <div className="mb-8 flex justify-center gap-2">
            {([["", "All"], ["Core", "Core"], ["Pro", "Pro"]] as const).map(([value, label]) => (
              <button key={label} type="button" onClick={() => selectCategory(value)} aria-pressed={category === value}
                className={`rounded-full px-5 py-2.5 text-sm font-bold transition ${category === value ? "bg-[#F97316] text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}>
                {label}
              </button>
            ))}
          </div>

          {loading && plans.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-neutral-500" role="status" aria-live="polite">
              <BowlLoader className="h-10 w-10 text-[#6A0FAD]" />
              <span className="text-sm font-medium">Loading plans…</span>
            </div>
          ) : plans.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 px-0 sm:grid-cols-2 lg:grid-cols-3 md:px-4">
              {plans.map((plan) => <PlanCard key={plan.ulid} plan={plan} />)}
            </div>
          ) : (
            <div className="rounded-2xl bg-neutral-50 py-16 text-center text-neutral-500">
              {loadError || "No plans available in this category yet."}
            </div>
          )}

          {plans.length > 0 && page < totalPages && (
            <div ref={sentinelRef} className="flex min-h-24 items-center justify-center py-7" role="status" aria-live="polite">
              {loadingMore && <><BowlLoader className="h-7 w-7 text-[#6A0FAD]" /><span className="ml-3 text-sm font-medium text-neutral-500">Loading more plans…</span></>}
              {loadError && <button type="button" onClick={() => { setLoadError(""); loadingMoreRef.current = false; }} className="text-sm font-semibold text-[#6A0FAD] underline underline-offset-4">Retry loading plans</button>}
            </div>
          )}

          {hasLoadedAll && (
            <div className="flex w-full animate-in flex-col items-center justify-center py-8 fade-in zoom-in duration-500">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-500 shadow-sm ring-4 ring-green-50/50">
                <svg className="h-6 w-6 animate-[bounce_2s_ease-in-out_infinite]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm font-bold text-neutral-400">You’re all caught up!</span>
            </div>
          )}
        </main>
        <BottomNav />
      </div>
    </ThemeWrapper>
  );
}
