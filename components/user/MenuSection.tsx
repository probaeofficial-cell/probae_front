"use client";

import React, { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, Salad } from "lucide-react";
import TopPickCard from "./TopPickCard";
import BowlListItem from "./BowlListItem";
import BowlModal from "./BowlModal";
import { endpoints } from "@/lib/apiService";

interface MenuSectionProps {
  // SSR-provided initial data
  initialBowls: any[];
  initialTotal: number;
  initialTotalPages: number;
  initialCategories: any[]; // [{ name, meal_type, slug, ... }]
}

// Map backend meal_type code → category pill label
const MEAL_TYPE_LABEL: Record<string, string> = {
  B: "Breakfast",
  L: "Lunch",
  D: "Dinner",
  S: "Snack",
};

export default function MenuSection({
  initialBowls,
  initialTotal,
  initialTotalPages,
  initialCategories,
}: MenuSectionProps) {
  const [bowls, setBowls]           = useState<any[]>(initialBowls);
  const [total, setTotal]           = useState(initialTotal);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [page, setPage]             = useState(1);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeMealType, setActiveMealType]      = useState(""); // "" = All
  const [selectedBowl, setSelectedBowl]          = useState<any | null>(null);
  const [loading, setLoading]       = useState(false);

  const LIMIT = 10;

  // Build category pills: "All" + one per backend category
  const categories = [
    "All",
    ...initialCategories.map((c: any) => MEAL_TYPE_LABEL[c.meal_type] || c.name),
  ];

  // Map display label → meal_type code for API call
  const labelToMealType: Record<string, string> = { All: "" };
  initialCategories.forEach((c: any) => {
    const label = MEAL_TYPE_LABEL[c.meal_type] || c.name;
    labelToMealType[label] = c.meal_type;
  });

  const fetchBowls = useCallback(
    async (nextPage: number, mealType: string) => {
      setLoading(true);
      try {
        const data = await endpoints.public.getMenu(nextPage, LIMIT, mealType);
        // Normalise field names to match what TopPickCard / BowlListItem expect
        const normalised = (data.bowls || []).map((b: any) => ({
          ...b,
          _id: b.ulid,
          baseCalories: b.macros?.calories ?? 0,
          basePrice: b.price || 0, // price is not public
          imageId: b.image_url ? { url: b.image_url } : undefined,
        }));
        setBowls(normalised);
        setTotal(data.total ?? 0);
        setTotalPages(data.total_pages ?? 1);
        setPage(nextPage);
      } catch (err) {
        console.error("Failed to fetch bowls:", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleCategoryChange = (cat: string) => {
    if (cat === selectedCategory) return;
    setSelectedCategory(cat);
    const mealType = labelToMealType[cat] ?? "";
    setActiveMealType(mealType);
    fetchBowls(1, mealType);
  };

  // Top picks = first 5 from current page
  const topPicks = bowls.slice(0, 5);

  // ── Infinite-scroll sentinel for the list (triggers next page) ──────────
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!node) return;
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && page < totalPages && !loading) {
            // Append next page
            (async () => {
              setLoading(true);
              try {
                const data = await endpoints.public.getMenu(page + 1, LIMIT, activeMealType);
                const normalised = (data.bowls || []).map((b: any) => ({
                  ...b,
                  _id: b.ulid,
                  baseCalories: b.macros?.calories ?? 0,
                  basePrice: b.price || 0,
                  imageId: b.image_url ? { url: b.image_url } : undefined,
                }));
                setBowls((prev) => [...prev, ...normalised]);
                setPage(data.page);
                setTotalPages(data.total_pages ?? 1);
              } catch (e) {
                console.error(e);
              } finally {
                setLoading(false);
              }
            })();
          }
        },
        { rootMargin: "200px", threshold: 0.1 }
      );
      observerRef.current.observe(node);
    },
    [page, totalPages, loading, activeMealType]
  );

  const hasMore = page < totalPages;

  return (
    <section
      id="menu-section"
      className="bg-white/70 backdrop-blur-3xl rounded-t-[40px] pt-32 md:pt-40 pb-24 md:pb-32 flex flex-col relative z-20 min-h-screen shadow-[0_-10px_40px_rgba(0,0,0,0.03)] border-t border-white/50"
    >
      {/* Back Button */}
      <div className="px-6 md:px-12 mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-primary bg-primary/10 hover:bg-primary/20 transition-colors px-5 py-2.5 rounded-xl font-bold w-fit text-sm"
        >
          <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
          Back to Home
        </Link>
      </div>

      {/* Today's Top Picks */}
      <div className="mb-12">
        <h2 className="text-xl font-bold text-gray-900 px-6 md:px-12 mb-6">
          Today's Top Picks
        </h2>

        {/* Horizontal Scroll */}
        <div className="w-full overflow-x-auto hide-scrollbar snap-x snap-mandatory px-6 md:px-12 pb-8">
          <div className="flex gap-4 w-max">
            {topPicks.map((bowl, index) => (
              <TopPickCard
                key={bowl._id}
                bowl={bowl}
                index={index}
                onClick={() => setSelectedBowl(bowl)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* All Bowls */}
      <div className="px-6 md:px-12 flex-1 flex flex-col">
        <h2 className="text-xl font-bold text-gray-900 mb-6">All Bowls</h2>

        {/* Filter Pills — from backend categories */}
        <div className="w-full overflow-x-auto hide-scrollbar mb-6">
          <div className="flex gap-2 w-max pb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                  selectedCategory === cat
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-white text-gray-600 border-gray-200/60 hover:bg-gray-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Vertical List */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100/50 flex-1 flex flex-col">
          {/* Loading skeleton while initial filter fetch is in progress */}
          {loading && bowls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-sm text-gray-400 font-medium">Loading bowls…</span>
            </div>
          ) : bowls.length > 0 ? (
            <div className="flex flex-col flex-1">
              {bowls.map((bowl, index) => {
                const isLast = index === bowls.length - 1;
                return (
                  <div key={bowl._id} ref={isLast ? lastElementRef : null}>
                    <BowlListItem
                      bowl={bowl}
                      onClick={() => setSelectedBowl(bowl)}
                    />
                  </div>
                );
              })}

              {/* Infinite scroll status */}
              {hasMore || loading ? (
                <div className="flex justify-center items-center gap-2 mt-6 pt-6 pb-4 border-t border-gray-100 text-gray-400 text-sm font-medium">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  Loading more bowls…
                </div>
              ) : (
                /* "Caught up" — CSS animation replaces framer-motion */
                <div className="flex flex-col items-center justify-center mt-8 pt-8 pb-4 border-t border-gray-100/50 px-2 gap-3 animate-fade-in-up">
                  <div className="animate-pop-in">
                    <CheckCircle2 className="w-10 h-10 text-[#10B981]" strokeWidth={2} />
                  </div>
                  <span className="text-gray-500 font-bold tracking-tight text-sm text-center">
                    You're all caught up!
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-[350px] bg-white border border-gray-100 rounded-3xl flex flex-col items-center justify-center text-center p-8 shadow-sm mt-4">
              <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-4 border border-purple-100/50">
                <Salad className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 tracking-tight">
                No Bowls Here!
              </h3>
              <p className="text-sm text-gray-500 max-w-[250px]">
                We couldn't find any bowls in this category right now. Try selecting another one.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal / Bottom Sheet */}
      <BowlModal bowl={selectedBowl} onClose={() => setSelectedBowl(null)} />
    </section>
  );
}
