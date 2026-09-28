"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Salad,
  Sun,
  Utensils,
  Moon,
  Info,
} from "lucide-react";
import { endpoints } from "@/lib/apiService";

interface MenuClientSectionProps {
  initialBowls: any[];
  initialTotal: number;
  initialTotalPages: number;
  initialCategories: any[];
}

const MEAL_TYPE_META: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
  B: { label: "Breakfast", color: "#F97316", Icon: Sun },
  L: { label: "Lunch",     color: "#16A34A", Icon: Utensils },
  D: { label: "Dinner",    color: "#7C3AED", Icon: Moon },
  S: { label: "Snack",     color: "#EAB308", Icon: Utensils },
};

function BowlListRow({ bowl, onClick }: { bowl: any; onClick: () => void }) {
  const mealType = bowl.mealTypes?.[0] || "B";
  const meta = MEAL_TYPE_META[mealType] || MEAL_TYPE_META.B;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 transition-colors text-left"
    >
      {/* Thumbnail */}
      <div className="relative w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-gray-100">
        {bowl.imageId?.url ? (
          <Image src={bowl.imageId.url} alt={bowl.name} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Salad className="w-7 h-7 text-gray-300" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900 text-sm truncate">{bowl.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: meta.color }}
          >
            {meta.label}
          </span>
          {bowl.macros?.calories ? (
            <span className="text-[11px] text-gray-400 font-medium">
              {Math.round(bowl.macros.calories)} kcal
            </span>
          ) : null}
        </div>
      </div>

      {/* Macro pills */}
      <div className="hidden sm:flex gap-1.5 shrink-0">
        {[
          { k: "protein", label: "P" },
          { k: "carbs",   label: "C" },
          { k: "fat",     label: "F" },
        ].map(({ k, label }) => (
          <div key={k} className="flex flex-col items-center bg-gray-100 rounded-lg px-2 py-1 min-w-[40px]">
            <span className="text-[9px] font-bold text-gray-400 uppercase">{label}</span>
            <span className="text-xs font-bold text-gray-700">
              {Math.round(bowl.macros?.[k] || 0)}g
            </span>
          </div>
        ))}
      </div>

      <Info className="w-4 h-4 text-gray-300 shrink-0" />
    </button>
  );
}

function BowlDetailSheet({ bowl, onClose }: { bowl: any; onClose: () => void }) {
  const mealType = bowl?.mealTypes?.[0] || "B";
  const meta = MEAL_TYPE_META[mealType] || MEAL_TYPE_META.B;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!bowl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header banner */}
        <div className="w-full h-16 flex items-center justify-between px-6" style={{ backgroundColor: meta.color }}>
          <div className="flex items-center gap-2">
            <meta.Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
            <span className="text-white font-extrabold text-sm uppercase tracking-widest">{meta.label}</span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white font-bold text-xl leading-none">✕</button>
        </div>

        {/* Image */}
        {bowl.imageId?.url && (
          <div className="relative w-full h-52">
            <Image src={bowl.imageId.url} alt={bowl.name} fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-white/60 to-transparent" />
          </div>
        )}

        <div className="p-6 pt-4">
          <h3 className="font-extrabold text-gray-900 text-xl mb-1">{bowl.name}</h3>
          {bowl.description && <p className="text-gray-500 text-sm mb-4">{bowl.description}</p>}

          {/* Calories */}
          <div className="text-center bg-gray-50 rounded-2xl py-4 mb-4 border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Per Serving</p>
            <span className="text-4xl font-black text-gray-900">{Math.round(bowl.macros?.calories || 0)}</span>
            <span className="text-lg text-gray-400 font-medium ml-1">kcal</span>
          </div>

          {/* Macros grid */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { k: "protein", label: "Protein" },
              { k: "carbs",   label: "Carbs" },
              { k: "fat",     label: "Fats" },
              { k: "fiber",   label: "Fiber" },
            ].map(({ k, label }) => (
              <div key={k} className="bg-gray-50 rounded-xl p-3 flex flex-col items-center border border-gray-100">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</span>
                <span className="font-bold text-gray-900 text-base">{Math.round(bowl.macros?.[k] || 0)}g</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MenuClientSection({
  initialBowls,
  initialTotal,
  initialTotalPages,
  initialCategories,
}: MenuClientSectionProps) {
  const [bowls, setBowls]             = useState<any[]>(initialBowls);
  const [total, setTotal]             = useState(initialTotal);
  const [totalPages, setTotalPages]   = useState(initialTotalPages);
  const [page, setPage]               = useState(1);
  const [activeMealType, setActiveMealType] = useState(""); // "" = All
  const [loading, setLoading]         = useState(false);
  const [selectedBowl, setSelectedBowl] = useState<any | null>(null);

  const LIMIT = 10;

  const fetchBowls = useCallback(async (nextPage: number, mealType: string) => {
    setLoading(true);
    try {
      const data = await endpoints.public.getMenu(nextPage, LIMIT, mealType);
      setBowls(data.bowls || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
      setPage(nextPage);
    } catch (err) {
      console.error("Failed to fetch bowls:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCategoryChange = (mealType: string) => {
    if (mealType === activeMealType) return;
    setActiveMealType(mealType);
    fetchBowls(1, mealType);
  };

  // Top picks = first 5 from current results (already paginated by backend)
  const topPicks = bowls.slice(0, 5);

  // Build filter pill list: "All" + one per category from backend
  const uniqueMealCategories = Array.from(
    new Map(initialCategories.map((category: any) => [category.meal_type || category.slug || category.name, category])).values()
  );
  const filterPills = [
    { label: "All", mealType: "", color: "" },
    ...uniqueMealCategories.map((c: any) => ({
      label: MEAL_TYPE_META[c.meal_type]?.label || c.name,
      mealType: c.meal_type,
      color: MEAL_TYPE_META[c.meal_type]?.color || "#6A0FAD",
    })),
  ];

  return (
    <section className="bg-white rounded-t-[40px] pt-28 md:pt-36 pb-24 flex flex-col min-h-screen">

      {/* Back Button */}
      <div className="px-6 md:px-12 mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[#6A0FAD] bg-[#6A0FAD]/10 hover:bg-[#6A0FAD]/20 transition-colors px-5 py-2.5 rounded-xl font-bold w-fit text-sm"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
          Back to Home
        </Link>
      </div>

      {/* Today's Top Picks */}
      <div className="mb-10">
        <h2 className="text-lg font-bold text-gray-900 px-6 md:px-12 mb-5">Today's Top Picks</h2>
        <div className="w-full overflow-x-auto hide-scrollbar snap-x snap-mandatory px-6 md:px-12 pb-4">
          <div className="flex gap-4 w-max">
            {topPicks.map((bowl, idx) => {
              const mealType = bowl.mealTypes?.[0] || "B";
              const meta = MEAL_TYPE_META[mealType] || MEAL_TYPE_META.B;
              return (
                <button
                  key={bowl.ulid}
                  onClick={() => setSelectedBowl(bowl)}
                  className="relative w-[160px] h-[200px] rounded-2xl overflow-hidden shadow-md snap-center shrink-0 hover:scale-[1.02] transition-transform"
                >
                  {bowl.imageId?.url ? (
                    <Image src={bowl.imageId.url} alt={bowl.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <Salad className="w-10 h-10 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div
                      className="text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full text-white w-fit mb-1"
                      style={{ backgroundColor: meta.color }}
                    >
                      {meta.label}
                    </div>
                    <p className="text-white font-bold text-xs leading-tight line-clamp-2">{bowl.name}</p>
                  </div>
                </button>
              );
            })}
            {topPicks.length === 0 && !loading && (
              <p className="text-gray-400 text-sm py-4">No bowls available.</p>
            )}
          </div>
        </div>
      </div>

      {/* All Bowls */}
      <div className="px-6 md:px-12 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">All Bowls</h2>
          <span className="text-sm text-gray-400 font-medium">{total} bowls</span>
        </div>

        {/* Filter Pills — from backend categories */}
        <div className="w-full overflow-x-auto hide-scrollbar mb-5">
          <div className="flex gap-2 w-max pb-1">
            {filterPills.map((pill) => {
              const isActive = activeMealType === pill.mealType;
              return (
                <button
                  key={pill.mealType || "all"}
                  onClick={() => handleCategoryChange(pill.mealType)}
                  className="px-4 py-2 rounded-full text-sm font-semibold transition-all border"
                  style={
                    isActive && pill.color
                      ? { backgroundColor: `${pill.color}15`, color: pill.color, borderColor: `${pill.color}40` }
                      : isActive
                      ? { backgroundColor: "#6A0FAD15", color: "#6A0FAD", borderColor: "#6A0FAD40" }
                      : {}
                  }
                >
                  {!isActive && (
                    <span className="bg-white text-gray-600 border-gray-200 hover:bg-gray-50" />
                  )}
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bowl List */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm divide-y divide-gray-100 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#6A0FAD]" />
              <span className="text-sm text-gray-400 font-medium">Loading bowls...</span>
            </div>
          ) : bowls.length > 0 ? (
            <>
              <div className="p-2">
                {bowls.map((bowl) => (
                  <BowlListRow key={bowl.ulid} bowl={bowl} onClick={() => setSelectedBowl(bowl)} />
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-5 py-4">
                <button
                  disabled={page <= 1}
                  onClick={() => fetchBowls(page - 1, activeMealType)}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-[#6A0FAD] bg-[#6A0FAD]/10 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#6A0FAD]/20 transition-colors"
                >
                  ← Previous
                </button>
                <span className="text-sm text-gray-500 font-medium">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => fetchBowls(page + 1, activeMealType)}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-[#6A0FAD] bg-[#6A0FAD]/10 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#6A0FAD]/20 transition-colors"
                >
                  Next →
                </button>
              </div>

              {/* Caught up indicator */}
              {page >= totalPages && (
                <div className="flex flex-col items-center justify-center py-6 border-t border-gray-100 gap-2">
                  <CheckCircle2 className="w-8 h-8 text-[#10B981]" strokeWidth={2} />
                  <span className="text-gray-400 font-bold text-sm">You've seen all bowls!</span>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-4">
                <Salad className="w-8 h-8 text-purple-300" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">No Bowls Found</h3>
              <p className="text-sm text-gray-400 max-w-[220px]">
                No bowls in this category right now. Try selecting another one.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bowl Detail Sheet */}
      {selectedBowl && (
        <BowlDetailSheet bowl={selectedBowl} onClose={() => setSelectedBowl(null)} />
      )}
    </section>
  );
}
