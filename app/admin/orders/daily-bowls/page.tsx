"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  Coffee, Calendar, Clock, ChevronLeft, ChevronRight, Search, 
  Filter, Package, User, Layers, Sparkles, RefreshCw, X, 
  LayoutGrid, Table as TableIcon, MapPin, Flame, Phone
} from "lucide-react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { BowlLoader } from "@/components/admin/BowlLoader";
import { endpoints } from "@/lib/apiService";
import { getMediaUrl } from "@/lib/utils";

interface ScheduledBowlItem {
  id: number;
  ulid: string;
  day_index: number;
  meal_slot: string;
  target_date: string;
  customer: {
    id: number;
    ulid: string;
    name: string;
    phone: string | null;
    remaining_bowl_count: number;
    zone_name: string | null;
  } | null;
  plan: {
    id: number;
    ulid: string;
    name: string;
    category: string;
    duration: string;
    plan_type: string;
  } | null;
  bowl: {
    id: number;
    ulid: string;
    name: string;
    category_name: string | null;
    image_filename: string | null;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    base_price: number;
    packaging_name: string | null;
  } | null;
  target_calories: number;
}

interface MealSlotInfo {
  slug: string;
  name: string;
  time_from: string | null;
  time_to: string | null;
  color_code: string | null;
  count: number;
}

interface SummaryData {
  total_bowls: number;
  unique_bowls_count: number;
  unique_customers_count: number;
  core_bowls: number;
  pro_bowls: number;
  custom_plan_bowls: number;
  total_day_bowls: number;
  top_bowls: Array<{
    id: number;
    name: string;
    image_filename: string | null;
    quantity: number;
  }>;
}

export default function DailyBowlsSchedulePage() {
  const getTodayStr = () => {
    return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0];
  };

  const [targetDate, setTargetDate] = useState<string>(getTodayStr());
  const [selectedSlot, setSelectedSlot] = useState<string>("ALL");
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(12);
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [planCategoryFilter, setPlanCategoryFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const [items, setItems] = useState<ScheduledBowlItem[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [dayInfo, setDayInfo] = useState<{ weekday_name?: string; weekday_index?: number; month_day?: number }>({});
  const [summary, setSummary] = useState<SummaryData>({
    total_bowls: 0,
    unique_bowls_count: 0,
    unique_customers_count: 0,
    core_bowls: 0,
    pro_bowls: 0,
    custom_plan_bowls: 0,
    total_day_bowls: 0,
    top_bowls: []
  });
  const [availableSlots, setAvailableSlots] = useState<MealSlotInfo[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // System settings for image CDN stitching
  const [systemSettings, setSystemSettings] = useState<{ R2_BASE_URL: string }>({ R2_BASE_URL: "" });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load system settings
  useEffect(() => {
    endpoints.settings.getSystemSettings().then((data: any) => {
      if (data?.R2_BASE_URL) {
        setSystemSettings({ R2_BASE_URL: data.R2_BASE_URL });
      }
    }).catch(console.error);
  }, []);

  // Fetch tentative daily bowls from CustomerMealSchedule
  const fetchDailyBowls = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const res = await endpoints.orders.dailyBowls({
        target_date: targetDate,
        meal_slot: selectedSlot === "ALL" ? undefined : selectedSlot,
        page,
        limit,
        search: debouncedSearch.trim() || undefined,
        plan_category: planCategoryFilter === "ALL" ? undefined : planCategoryFilter,
      }) as any;

      if (res?.success) {
        setItems(res.items || []);
        setTotalItems(res.total_items || 0);
        setTotalPages(res.total_pages || 1);
        if (res.day_info) setDayInfo(res.day_info);
        if (res.summary) setSummary(res.summary);
        if (res.available_meal_slots) setAvailableSlots(res.available_meal_slots);
      }
    } catch (err) {
      console.error("Failed to fetch daily scheduled bowls:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDailyBowls();
  }, [targetDate, selectedSlot, page, limit, debouncedSearch, planCategoryFilter]);

  // Date navigators
  const shiftDate = (days: number) => {
    const current = new Date(targetDate);
    current.setDate(current.getDate() + days);
    setTargetDate(current.toISOString().split("T")[0]);
    setPage(1);
  };

  const handleQuickDate = (type: "today" | "tomorrow") => {
    const now = new Date();
    if (type === "tomorrow") {
      now.setDate(now.getDate() + 1);
    }
    setTargetDate(now.toISOString().split("T")[0]);
    setPage(1);
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        <Header />
        <Breadcrumbs segments={["Admin", "Orders & KDS", "Daily Bowls"]} />

        <div className="mt-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          {/* ── Page Header ────────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Daily Bowls Schedule</h1>
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#6A0FAD]/10 text-[#6A0FAD]">
                  Tentative Schedule
                </span>
              </div>
              <p className="text-neutral-500 font-medium mt-1">
                Tentative customer bowl schedule directly from subscription rotations by date and meal slot
              </p>
            </div>

            {/* View Switcher & Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <Link
                href="/admin/plans/menu-blueprint"
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-sm transition-colors"
              >
                Menu Rotations
              </Link>

              <button
                onClick={() => fetchDailyBowls(true)}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-bold text-sm shadow-sm transition-colors disabled:opacity-50"
                title="Refresh schedule"
              >
                <RefreshCw className={`w-4 h-4 text-[#6A0FAD] ${isRefreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* ── Date & Meal Slot Control Bar ────────────────────────────── */}
          <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-4 sm:p-5 mb-6 shadow-sm">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              {/* Date Controls */}
              <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                <div className="flex items-center bg-white border border-neutral-200 rounded-xl px-2.5 py-1.5 shadow-sm">
                  <button
                    onClick={() => shiftDate(-1)}
                    className="p-1 hover:bg-neutral-100 rounded-lg text-neutral-600 transition-colors"
                    title="Previous day"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => {
                      if (e.target.value) {
                        setTargetDate(e.target.value);
                        setPage(1);
                      }
                    }}
                    className="bg-transparent text-sm font-bold text-neutral-800 px-2 outline-none cursor-pointer"
                  />
                  <button
                    onClick={() => shiftDate(1)}
                    className="p-1 hover:bg-neutral-100 rounded-lg text-neutral-600 transition-colors"
                    title="Next day"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleQuickDate("today")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors ${
                      targetDate === getTodayStr()
                        ? "bg-[#6A0FAD] text-white shadow-sm"
                        : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => handleQuickDate("tomorrow")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors ${
                      (() => {
                        const tm = new Date();
                        tm.setDate(tm.getDate() + 1);
                        return targetDate === tm.toISOString().split("T")[0];
                      })()
                        ? "bg-[#6A0FAD] text-white shadow-sm"
                        : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    Tomorrow
                  </button>
                </div>

                {dayInfo.weekday_name && (
                  <span className="text-xs font-bold text-neutral-600 bg-white border border-neutral-200/80 px-3 py-1.5 rounded-xl shadow-xs">
                    📅 {dayInfo.weekday_name} (Day {dayInfo.weekday_index})
                  </span>
                )}
              </div>

              {/* Day Total Indicator */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Day Total Scheduled
                  </span>
                  <span className="text-xl font-black text-neutral-900">
                    {summary.total_day_bowls} <span className="text-xs font-semibold text-neutral-500">Bowls</span>
                  </span>
                </div>
              </div>
            </div>

            {/* ── Meal Slot Filter Tabs ─────────────────────────────────── */}
            <div className="mt-4 pt-4 border-t border-neutral-200/70">
              <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
                <button
                  onClick={() => {
                    setSelectedSlot("ALL");
                    setPage(1);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                    selectedSlot === "ALL"
                      ? "bg-[#6A0FAD] text-white shadow-md shadow-[#6A0FAD]/20"
                      : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100 hover:border-neutral-300"
                  }`}
                >
                  <Coffee className="w-4 h-4" />
                  <span>All Meal Slots</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                    selectedSlot === "ALL" ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-700"
                  }`}>
                    {summary.total_day_bowls}
                  </span>
                </button>

                {availableSlots.map((slot) => {
                  const isActive = selectedSlot.toLowerCase() === slot.slug.toLowerCase();
                  return (
                    <button
                      key={slot.slug}
                      onClick={() => {
                        setSelectedSlot(slot.slug);
                        setPage(1);
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                        isActive
                          ? "bg-[#6A0FAD] text-white shadow-md shadow-[#6A0FAD]/20"
                          : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100 hover:border-neutral-300"
                      }`}
                    >
                      <span>{slot.name}</span>
                      {slot.time_from && slot.time_to && (
                        <span className={`text-[11px] font-normal ${isActive ? "text-white/80" : "text-neutral-400"}`}>
                          ({slot.time_from.slice(0, 5)} - {slot.time_to.slice(0, 5)})
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                        isActive ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-700"
                      }`}>
                        {slot.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Summary Metrics Cards ───────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  {selectedSlot === "ALL" ? "Total Scheduled (Day)" : `${selectedSlot} Scheduled`}
                </span>
                <span className="w-8 h-8 rounded-xl bg-violet-50 text-[#6A0FAD] flex items-center justify-center">
                  <Coffee className="w-4 h-4" />
                </span>
              </div>
              <div className="text-3xl font-black text-neutral-900 tracking-tight">
                {summary.total_bowls}
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs font-semibold text-neutral-500">
                <span className="text-[#6A0FAD]">{summary.core_bowls} Core</span>
                <span>•</span>
                <span className="text-purple-600">{summary.pro_bowls} Pro</span>
                {summary.custom_plan_bowls > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-amber-600">{summary.custom_plan_bowls} Custom</span>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Active Customers
                </span>
                <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </span>
              </div>
              <div className="text-3xl font-black text-emerald-700 tracking-tight">
                {summary.unique_customers_count}
              </div>
              <p className="text-xs text-neutral-400 mt-2 font-medium">
                Distinct customers scheduled for meal
              </p>
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Unique Bowl Recipes
                </span>
                <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </span>
              </div>
              <div className="text-3xl font-black text-blue-600 tracking-tight">
                {summary.unique_bowls_count}
              </div>
              <p className="text-xs text-neutral-400 mt-2 font-medium">
                Distinct bowl varieties scheduled
              </p>
            </div>

            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Active Meal Slot
                </span>
                <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-amber-600 tracking-tight truncate">
                {selectedSlot === "ALL" ? "All Slots" : selectedSlot}
              </div>
              <p className="text-xs text-neutral-400 mt-2 font-medium">
                {summary.total_bowls} bowls scheduled in view
              </p>
            </div>
          </div>

          {/* ── Top Scheduled Bowls Breakdown Chips ─────────────────────── */}
          {summary.top_bowls && summary.top_bowls.length > 0 && (
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 mb-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-[#ff751f]" />
                <span className="text-xs font-black uppercase tracking-wider text-neutral-700">
                  Top Scheduled Bowls ({summary.top_bowls.length} recipes)
                </span>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                {summary.top_bowls.map((tb) => (
                  <button
                    key={tb.id}
                    onClick={() => {
                      setSearchInput(tb.name);
                      setPage(1);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                      searchInput === tb.name
                        ? "bg-[#6A0FAD] text-white border-[#6A0FAD]"
                        : "bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-800"
                    }`}
                  >
                    <span>{tb.name}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                      searchInput === tb.name ? "bg-white/20 text-white" : "bg-[#6A0FAD]/10 text-[#6A0FAD]"
                    }`}>
                      ×{tb.quantity}
                    </span>
                  </button>
                ))}
                {searchInput && (
                  <button
                    onClick={() => setSearchInput("")}
                    className="text-xs text-neutral-400 hover:text-neutral-700 font-semibold underline ml-1"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Search & Filter Controls ────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search customer, phone, bowl, plan..."
                className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-800 outline-none focus:border-[#6A0FAD] focus:ring-2 focus:ring-[#6A0FAD]/20 transition-all bg-white"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dropdown Filters & Grid/Table Switch */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={planCategoryFilter}
                onChange={(e) => {
                  setPlanCategoryFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 bg-white border border-neutral-200 rounded-xl text-xs font-bold text-neutral-700 outline-none shadow-sm cursor-pointer hover:border-neutral-300"
              >
                <option value="ALL">All Plan Categories</option>
                <option value="Core">Core Plans</option>
                <option value="Pro">Pro Plans</option>
              </select>

              <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === "grid" ? "bg-white text-[#6A0FAD] shadow-sm" : "text-neutral-500 hover:text-neutral-800"
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-lg transition-colors ${
                    viewMode === "table" ? "bg-white text-[#6A0FAD] shadow-sm" : "text-neutral-500 hover:text-neutral-800"
                  }`}
                  title="Table View"
                >
                  <TableIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Content Area: Grid / Table / Loading / Empty ────────────── */}
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center bg-white rounded-2xl border border-neutral-200">
              <BowlLoader className="w-10 h-10 text-[#6A0FAD]" />
              <p className="text-sm font-bold text-neutral-500 mt-4">Loading tentative schedule...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 px-6 text-center bg-white rounded-2xl border border-neutral-200 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-violet-50 text-[#6A0FAD] flex items-center justify-center mb-4">
                <Coffee className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-neutral-900 mb-1">No Bowls Scheduled</h3>
              <p className="text-sm text-neutral-500 max-w-md">
                No active customer subscriptions have bowls scheduled for <strong>{targetDate}</strong>
                {selectedSlot !== "ALL" && ` in ${selectedSlot}`}.
              </p>
            </div>
          ) : viewMode === "grid" ? (
            /* ── GRID VIEW ─────────────────────────────────────────────── */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
              {items.map((item) => {
                const imageUrl = item.bowl?.image_filename
                  ? getMediaUrl(systemSettings.R2_BASE_URL, item.bowl.image_filename)
                  : null;

                return (
                  <div
                    key={item.ulid}
                    className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group"
                  >
                    {/* Bowl Image & Badges */}
                    <div className="relative h-44 bg-neutral-100 overflow-hidden">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.bowl?.name || "Bowl"}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 bg-neutral-100">
                          <Coffee className="w-12 h-12 stroke-[1.5]" />
                          <span className="text-xs font-medium mt-1">No Image</span>
                        </div>
                      )}

                      {/* Meal Slot & Plan Badges */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-black/75 text-white backdrop-blur-sm">
                          {item.meal_slot}
                        </span>
                        {item.plan?.category && (
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider backdrop-blur-sm ${
                            item.plan.category.toLowerCase().includes("pro")
                              ? "bg-[#6A0FAD] text-white"
                              : "bg-emerald-600 text-white"
                          }`}>
                            {item.plan.category}
                          </span>
                        )}
                      </div>

                      {/* Remaining Bowls Badge */}
                      {item.customer && (
                        <div className="absolute bottom-2.5 right-2.5">
                          <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-white/95 text-neutral-800 shadow-sm backdrop-blur-sm">
                            {item.customer.remaining_bowl_count} bowls left
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content Details */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Bowl Name */}
                        <h3 className="font-extrabold text-neutral-900 text-base line-clamp-1 mb-2">
                          {item.bowl?.name || "Scheduled Bowl"}
                        </h3>

                        {/* Customer Information Card */}
                        <div className="bg-neutral-50 rounded-xl p-3 mb-3 border border-neutral-100">
                          <div className="flex items-center gap-1.5 text-xs font-black text-neutral-900 truncate">
                            <User className="w-3.5 h-3.5 text-[#6A0FAD] shrink-0" />
                            <span className="truncate">{item.customer?.name || "Customer"}</span>
                          </div>

                          {item.customer?.phone && (
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500 mt-1">
                              <Phone className="w-3 h-3 text-neutral-400 shrink-0" />
                              <span>{item.customer.phone}</span>
                            </div>
                          )}

                          {item.customer?.zone_name && (
                            <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-1">
                              <MapPin className="w-3 h-3 text-neutral-400 shrink-0" />
                              <span className="truncate">{item.customer.zone_name}</span>
                            </div>
                          )}
                        </div>

                        {/* Nutritional Breakdown */}
                        <div className="grid grid-cols-4 gap-1.5 bg-neutral-100/70 p-2 rounded-xl text-center mb-3">
                          <div>
                            <span className="text-[9px] font-bold text-neutral-400 block uppercase">Cals</span>
                            <span className="text-xs font-black text-neutral-800">
                              {Math.round(item.target_calories || item.bowl?.calories || 0)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-neutral-400 block uppercase">Prot</span>
                            <span className="text-xs font-black text-emerald-700">
                              {Math.round(item.bowl?.protein || 0)}g
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-neutral-400 block uppercase">Carb</span>
                            <span className="text-xs font-black text-blue-700">
                              {Math.round(item.bowl?.carbs || 0)}g
                            </span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-neutral-400 block uppercase">Fat</span>
                            <span className="text-xs font-black text-amber-700">
                              {Math.round(item.bowl?.fats || 0)}g
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Plan Tag & Category */}
                      <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-2 border-t border-neutral-100">
                        <span className="truncate max-w-[130px] font-semibold text-neutral-600">
                          {item.plan?.name || "Subscription"}
                        </span>
                        <span className="font-bold text-[#6A0FAD]">
                          {item.plan?.plan_type === "CUSTOM" ? "Custom Rotation" : "Standard Rotation"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── TABLE VIEW ────────────────────────────────────────────── */
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[850px]">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                      <th className="px-4 py-3.5">Customer</th>
                      <th className="px-4 py-3.5">Meal Slot</th>
                      <th className="px-4 py-3.5">Scheduled Bowl</th>
                      <th className="px-4 py-3.5">Plan</th>
                      <th className="px-4 py-3.5 text-center">Calories & Macros</th>
                      <th className="px-4 py-3.5 text-right">Bowls Left</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-sm">
                    {items.map((item) => {
                      const imageUrl = item.bowl?.image_filename
                        ? getMediaUrl(systemSettings.R2_BASE_URL, item.bowl.image_filename)
                        : null;

                      return (
                        <tr key={item.ulid} className="hover:bg-neutral-50/60 transition-colors">
                          {/* Customer */}
                          <td className="px-4 py-3">
                            <div className="font-bold text-neutral-900">{item.customer?.name || "Unknown"}</div>
                            <div className="text-xs text-neutral-400">
                              {item.customer?.phone || "—"} {item.customer?.zone_name ? `· ${item.customer.zone_name}` : ""}
                            </div>
                          </td>

                          {/* Meal Slot */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-neutral-100 text-neutral-800">
                              {item.meal_slot}
                            </span>
                          </td>

                          {/* Bowl Image & Name */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200">
                                {imageUrl ? (
                                  <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Coffee className="w-5 h-5 text-neutral-400 m-auto mt-2.5" />
                                )}
                              </div>
                              <div>
                                <div className="font-extrabold text-neutral-900">{item.bowl?.name || "Bowl"}</div>
                                <div className="text-xs text-neutral-400">
                                  {item.bowl?.category_name || "Meal Prep"}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Plan */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-bold text-neutral-800 text-xs">{item.plan?.name || "Plan"}</div>
                            <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.plan?.category?.toLowerCase().includes("pro")
                                ? "bg-purple-100 text-purple-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}>
                              {item.plan?.category || "Standard"}
                            </span>
                          </td>

                          {/* Calories & Macros */}
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <div className="font-extrabold text-neutral-900">
                              {Math.round(item.target_calories || item.bowl?.calories || 0)} kcal
                            </div>
                            <div className="text-[11px] font-semibold text-neutral-400">
                              P: {Math.round(item.bowl?.protein || 0)}g · C: {Math.round(item.bowl?.carbs || 0)}g · F: {Math.round(item.bowl?.fats || 0)}g
                            </div>
                          </td>

                          {/* Remaining Bowls */}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <span className="font-black text-neutral-900 text-xs">
                              {item.customer?.remaining_bowl_count || 0}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Pagination Controls ─────────────────────────────────────── */}
          {items.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-500">
                <span>
                  Showing {Math.min((page - 1) * limit + 1, totalItems)} to {Math.min(page * limit, totalItems)} of {totalItems} scheduled bowls
                </span>
                <span className="text-neutral-300">|</span>
                <label className="flex items-center gap-1.5">
                  <span className="font-semibold">Per page:</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="bg-white border border-neutral-200 rounded-lg px-2 py-1 text-xs font-bold text-neutral-700 outline-none cursor-pointer"
                  >
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                    <option value={48}>48</option>
                  </select>
                </label>
              </div>

              {/* Page Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-xl border border-neutral-200 bg-white text-neutral-700 text-xs font-bold hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = page;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (page <= 3) pageNum = i + 1;
                    else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = page - 2 + i;

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 rounded-xl text-xs font-bold transition-colors ${
                          page === pageNum
                            ? "bg-[#6A0FAD] text-white shadow-sm"
                            : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-xl border border-neutral-200 bg-white text-neutral-700 text-xs font-bold hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
