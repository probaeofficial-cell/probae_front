"use client";
import { BowlLoader } from "@/components/admin/BowlLoader";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Package, 
  ChevronRight, 
  ChevronLeft, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  BarChart3, 
  ListOrdered, 
  Plus, 
  ArrowDownToLine, 
  Layers, 
  Tag, 
  ShieldAlert 
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ProbaeSearch } from "@/components/admin/ProbaeSearch";
import { endpoints } from "@/lib/apiService";
import { PackagingComponent, ChildStickerSummary } from "@/lib/types";
import { PackagingStockAdjustmentModal } from "@/components/admin/packaging/PackagingStockAdjustmentModal";
import { PackagingStockLogModal } from "@/components/admin/packaging/PackagingStockLogModal";

export default function PackagingComponentStockPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [components, setComponents] = useState<PackagingComponent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Filter Tab: "ALL" | "LOW_OR_OUT" | "OUT_OF_STOCK"
  const [filterTab, setFilterTab] = useState<"ALL" | "LOW_OR_OUT" | "OUT_OF_STOCK">("ALL");

  // Expandable Parent Rows State
  const [expandedParents, setExpandedParents] = useState<Record<number, boolean>>({});

  // Modals
  const [selectedComponent, setSelectedComponent] = useState<PackagingComponent | ChildStickerSummary | null>(null);
  const [modalInitialMode, setModalInitialMode] = useState<"stock_in" | "adjust">("stock_in");
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/admin/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 600);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchComponents = useCallback(async () => {
    setIsLoading(true);
    try {
      const statusParam = filterTab === "ALL" ? undefined : filterTab;
      const data = await endpoints.packaging.getComponents(page, pageSize, debouncedSearch, statusParam) as any;
      setComponents(data.items || []);
      setTotal(data.total || 0);

      // Default expand parent Sticker if it exists
      const parent = (data.items || []).find((c: PackagingComponent) => c.is_parent || c.name.toLowerCase() === "sticker");
      if (parent) {
        setExpandedParents(prev => ({ [parent.id]: true, ...prev }));
      }
    } catch (err) {
      console.error("Failed to fetch packaging components", err);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, debouncedSearch, filterTab]);

  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  const totalPages = Math.ceil(total / pageSize);

  const getStockStatus = (stock: number, threshold: number) => {
    if (stock <= 0) return { label: "Out of Stock", color: "text-red-600", bg: "bg-red-50 border-red-200", icon: <XCircle className="w-3.5 h-3.5 text-red-500" /> };
    if (threshold > 0 && stock <= threshold) return { label: "Low Stock", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> };
    return { label: "In Stock", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> };
  };

  const toggleParent = (id: number) => {
    setExpandedParents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenReplenish = (comp: PackagingComponent | ChildStickerSummary) => {
    setSelectedComponent(comp);
    setModalInitialMode("stock_in");
    setIsAdjustModalOpen(true);
  };

  const handleOpenAdjust = (comp: PackagingComponent | ChildStickerSummary) => {
    setSelectedComponent(comp);
    setModalInitialMode("adjust");
    setIsAdjustModalOpen(true);
  };

  const handleOpenLogs = (comp: PackagingComponent | ChildStickerSummary) => {
    setSelectedComponent(comp);
    setIsLogModalOpen(true);
  };

  const handleAdjustSuccess = (updated: any) => {
    // Refresh to get latest computed aggregates and statuses across parent/children
    fetchComponents();
  };

  // Metrics computation for banner & table rendering
  const stickerParent = components.find(c => c.is_parent || c.name.toLowerCase() === "sticker");

  // Collect all child stickers from parent + direct items in components
  const allChildStickersMap = new Map<number | string, ChildStickerSummary | PackagingComponent>();
  if (stickerParent?.children) {
    stickerParent.children.forEach(ch => allChildStickersMap.set(ch.id || ch.ulid, ch));
  }
  components.forEach(comp => {
    if (comp.parent_id) {
      if (!allChildStickersMap.has(comp.id || comp.ulid)) {
        allChildStickersMap.set(comp.id || comp.ulid, comp as any);
      }
    }
  });
  const allChildStickers = Array.from(allChildStickersMap.values());

  // Child sticker names are the corresponding bowl names.
  const isSearching = debouncedSearch.trim().length > 0;
  const searchLower = debouncedSearch.trim().toLowerCase();

  const matchesSearch = (item: { name?: string }) => {
    if (!isSearching) return true;
    const nameMatch = item.name ? item.name.toLowerCase().includes(searchLower) : false;
    return nameMatch;
  };

  const matchingChildStickers = allChildStickers.filter(matchesSearch);

  // Standard non-sticker components:
  const standardComponents = components.filter(
    comp => !comp.is_parent && comp.name.trim().toLowerCase() !== "sticker" && !comp.parent_id
  );

  // Auto-expand parent Sticker when searching
  useEffect(() => {
    if (isSearching && stickerParent) {
      setExpandedParents(prev => ({ ...prev, [stickerParent.id]: true }));
    }
  }, [isSearching, stickerParent?.id]);

  // Calculate total out-of-stock items across all components (including sticker children)
  let outOfStockCount = 0;
  let lowStockCount = 0;
  standardComponents.forEach(c => {
    if (Number(c.current_stock) <= 0) outOfStockCount++;
    else if (Number(c.stock_threshold) > 0 && Number(c.current_stock) <= Number(c.stock_threshold)) lowStockCount++;
  });
  allChildStickers.forEach(ch => {
    if (Number(ch.current_stock) <= 0) outOfStockCount++;
    else if (Number(ch.stock_threshold) > 0 && Number(ch.current_stock) <= Number(ch.stock_threshold)) lowStockCount++;
  });

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        <Header />
        <Breadcrumbs segments={["Admin", "Packaging", "Components", "Stock Management"]} />

        <div className="mt-4 flex-1 flex flex-col min-h-0">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5 shrink-0">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.push("/admin/packaging/components")}
                className="w-10 h-10 shrink-0 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 hover:text-black transition-colors shadow-sm"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Packaging Stock</h1>
                <p className="text-neutral-500 font-medium mt-0.5 text-sm">
                  Monitor sticker hierarchy & replenishments with dynamic parent aggregation
                </p>
              </div>
            </div>
            <ProbaeSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search components, stickers, or bowls..."
              hideSort
              hideFilter
            />
          </div>

          {/* Quick Metrics & Filter Tabs */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 shrink-0">
            {/* Filter Pills */}
            <div className="flex rounded-2xl bg-neutral-100 p-1">
              <button
                onClick={() => { setFilterTab("ALL"); setPage(1); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  filterTab === "ALL"
                    ? "bg-white text-neutral-900 shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                All Components
              </button>
              <button
                onClick={() => { setFilterTab("LOW_OR_OUT"); setPage(1); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  filterTab === "LOW_OR_OUT"
                    ? "bg-amber-100 text-amber-900 shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Low & Out of Stock
                {lowStockCount + outOfStockCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-200 text-amber-900">
                    {lowStockCount + outOfStockCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => { setFilterTab("OUT_OF_STOCK"); setPage(1); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  filterTab === "OUT_OF_STOCK"
                    ? "bg-red-100 text-red-900 shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <XCircle className="w-3.5 h-3.5 text-red-600" />
                Out of Stock Only
                {outOfStockCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-red-200 text-red-900">
                    {outOfStockCount}
                  </span>
                )}
              </button>
            </div>

            {/* Quick Stats Chips */}
            <div className="flex items-center gap-2 text-xs font-bold">
              {stickerParent && (
                <div className="bg-purple-50 text-[#6A0FAD] border border-purple-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Sticker Aggregate: <strong>{Number(stickerParent.current_stock || 0)} pcs</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Content Table */}
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-2xs">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <BowlLoader className="w-10 h-10 text-[#6A0FAD]" />
              </div>
            ) : (!stickerParent && matchingChildStickers.length === 0 && standardComponents.length === 0) ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
                <Package className="w-16 h-16 text-neutral-200" />
                <div className="text-center">
                  <p className="font-black text-neutral-500 text-lg">No components match this view</p>
                  <p className="text-neutral-400 text-xs mt-1">
                    {filterTab !== "ALL" ? "All items have sufficient inventory!" : "Try adjusting your search criteria."}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-50 border-b border-neutral-200 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3.5 text-left font-black text-neutral-500 uppercase tracking-wider text-xs">Component / Item</th>
                        <th className="px-6 py-3.5 text-center font-black text-neutral-500 uppercase tracking-wider text-xs">Hierarchy / Bowl</th>
                        <th className="px-6 py-3.5 text-center font-black text-neutral-500 uppercase tracking-wider text-xs">Threshold</th>
                        <th className="px-6 py-3.5 text-center font-black text-neutral-500 uppercase tracking-wider text-xs">Current Stock</th>
                        <th className="px-6 py-3.5 text-center font-black text-neutral-500 uppercase tracking-wider text-xs">Status</th>
                        <th className="px-6 py-3.5 text-right font-black text-neutral-500 uppercase tracking-wider text-xs">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {/* 1. Parent Sticker Row (when viewing ALL) */}
                      {stickerParent && filterTab === "ALL" && (
                        <React.Fragment key={stickerParent.ulid}>
                          <tr className="bg-purple-50/50 hover:bg-purple-50 transition-colors border-b-2 border-purple-100">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => toggleParent(stickerParent.id)}
                                  className="w-8 h-8 rounded-lg bg-white border border-purple-200 text-[#6A0FAD] flex items-center justify-center hover:bg-purple-100 transition-colors"
                                  title={expandedParents[stickerParent.id] ? "Collapse child stickers" : "Expand child stickers"}
                                >
                                  {expandedParents[stickerParent.id] ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                                <div className="w-9 h-9 rounded-xl bg-[#6A0FAD] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm shadow-purple-500/20">
                                  <Layers className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-neutral-900 text-base">{stickerParent.name}</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-[#6A0FAD] border border-purple-200">
                                      Parent Grouping
                                    </span>
                                  </div>
                                  <span className="text-xs text-neutral-500 font-medium">
                                    {isSearching
                                      ? `${matchingChildStickers.length} of ${allChildStickers.length} Child Stickers matching "${debouncedSearch}"`
                                      : `${allChildStickers.length} Child Stickers`}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-purple-700 border border-purple-200">
                                {isSearching ? `${matchingChildStickers.length} Matching Bowls` : `All Bowls (${allChildStickers.length})`}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-xs font-semibold text-neutral-400 italic">Dynamic</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex flex-col items-center">
                                <span className="text-2xl font-black text-[#6A0FAD]">
                                  {Number(stickerParent.current_stock || 0)}
                                </span>
                                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                                  Aggregate pcs
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {(() => {
                                const outCount = allChildStickers.filter(c => c.stock_status === "OUT_OF_STOCK").length;
                                const lowCount = allChildStickers.filter(c => c.stock_status === "LOW_STOCK").length;
                                if (outCount > 0) {
                                  return (
                                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-bold bg-red-50 text-red-600 border-red-200">
                                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                                      {outCount} Out of Stock
                                    </div>
                                  );
                                }
                                if (lowCount > 0) {
                                  return (
                                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-bold bg-amber-50 text-amber-700 border-amber-200">
                                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                      {lowCount} Low Stock
                                    </div>
                                  );
                                }
                                return (
                                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-bold bg-emerald-50 text-emerald-700 border-emerald-200">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    All In Stock
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <span 
                                  className="text-[11px] font-bold text-neutral-400 bg-neutral-100 px-2.5 py-1.5 rounded-xl select-none"
                                  title="Parent stock is dynamically calculated and cannot be adjusted directly"
                                >
                                  Dynamic Aggregate
                                </span>
                                <button
                                  onClick={() => handleOpenLogs(stickerParent)}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                                >
                                  <ListOrdered className="w-3.5 h-3.5" />
                                  Logs
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Nested Child Stickers under Parent */}
                          {(expandedParents[stickerParent.id] || isSearching) && (
                            matchingChildStickers.length === 0 ? (
                              <tr className="bg-purple-50/20">
                                <td colSpan={6} className="px-6 py-4 text-center text-xs text-neutral-400 font-medium">
                                  No child stickers match &quot;{debouncedSearch}&quot;
                                </td>
                              </tr>
                            ) : (
                              matchingChildStickers.map(child => {
                                const status = getStockStatus(Number(child.current_stock), Number(child.stock_threshold));
                                return (
                                  <tr key={child.ulid} className="bg-purple-50/20 hover:bg-purple-50/40 transition-colors">
                                    <td className="px-6 py-3.5 pl-14">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-2 h-2 rounded-full bg-[#6A0FAD]" />
                                        <div className="w-8 h-8 rounded-lg bg-purple-100/70 border border-purple-200 flex items-center justify-center text-xs font-bold text-[#6A0FAD]">
                                          <Tag className="w-3.5 h-3.5" />
                                        </div>
                                        <div>
                                          <div className="font-bold text-neutral-900 text-sm">{child.name}</div>
                                          <div className="text-[11px] text-neutral-400">₹{Number(child.cost).toFixed(2)} / sticker</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-3.5 text-center">
                                      <span className="font-bold text-xs text-[#6A0FAD] bg-purple-100/60 px-2.5 py-0.5 rounded-md border border-purple-200">
                                        {child.name}
                                      </span>
                                    </td>
                                    <td className="px-6 py-3.5 text-center">
                                      <span className="font-bold text-neutral-600 text-xs">{Number(child.stock_threshold)} pcs</span>
                                    </td>
                                    <td className="px-6 py-3.5 text-center">
                                      <span className={`text-base font-black ${
                                        Number(child.current_stock) <= 0 
                                          ? "text-red-500" 
                                          : Number(child.current_stock) <= Number(child.stock_threshold) && Number(child.stock_threshold) > 0 
                                          ? "text-amber-600" 
                                          : "text-neutral-900"
                                      }`}>
                                        {Number(child.current_stock)}
                                      </span>
                                      <span className="text-xs text-neutral-400 ml-1">pcs</span>
                                    </td>
                                    <td className="px-6 py-3.5 text-center">
                                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${status.bg} ${status.color}`}>
                                        {status.icon}
                                        {status.label}
                                      </div>
                                    </td>
                                    <td className="px-6 py-3.5">
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          onClick={() => handleOpenReplenish(child)}
                                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#6A0FAD] text-white hover:bg-[#580d8f] transition-all shadow-xs"
                                        >
                                          <ArrowDownToLine className="w-3.5 h-3.5" />
                                          Stock In
                                        </button>
                                        <button
                                          onClick={() => handleOpenAdjust(child)}
                                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-100 text-[#6A0FAD] hover:bg-purple-200 transition-colors"
                                        >
                                          <BarChart3 className="w-3.5 h-3.5" />
                                          Adjust
                                        </button>
                                        <button
                                          onClick={() => handleOpenLogs(child)}
                                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                                        >
                                          <ListOrdered className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )
                          )}
                        </React.Fragment>
                      )}

                      {/* 1b. Standalone Child Stickers (when parent not returned or when viewing search results) */}
                      {!stickerParent && filterTab === "ALL" && matchingChildStickers.map(child => {
                        const status = getStockStatus(Number(child.current_stock), Number(child.stock_threshold));
                        return (
                          <tr key={child.ulid} className="hover:bg-neutral-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-sm font-black text-[#6A0FAD] shrink-0">
                                  <Tag className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="font-bold text-neutral-900 text-sm">{child.name}</div>
                                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-0.5">
                                    <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.2 rounded border border-purple-100">
                                      Parent: Sticker
                                    </span>
                                    <span>• ₹{Number(child.cost).toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="font-bold text-xs text-[#6A0FAD] bg-purple-100/60 px-2.5 py-1 rounded-lg border border-purple-200">
                                {child.name}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="font-bold text-neutral-600 text-xs">{Number(child.stock_threshold)} pcs</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`text-xl font-black ${Number(child.current_stock) <= 0 ? "text-red-500" : "text-amber-600"}`}>
                                {Number(child.current_stock)}
                              </span>
                              <span className="text-xs text-neutral-400 ml-1">pcs</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${status.bg} ${status.color}`}>
                                {status.icon}
                                {status.label}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenReplenish(child)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#6A0FAD] text-white hover:bg-[#580d8f] transition-all shadow-xs"
                                >
                                  <ArrowDownToLine className="w-3.5 h-3.5" />
                                  Stock In
                                </button>
                                <button
                                  onClick={() => handleOpenAdjust(child)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-100 text-[#6A0FAD] hover:bg-purple-200 transition-colors"
                                >
                                  <BarChart3 className="w-3.5 h-3.5" />
                                  Adjust
                                </button>
                                <button
                                  onClick={() => handleOpenLogs(child)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                                >
                                  <ListOrdered className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {/* 2. When Filtering by Low/Out of Stock */}
                      {filterTab !== "ALL" && matchingChildStickers
                        .filter(child => {
                          const stock = Number(child.current_stock || 0);
                          const thresh = Number(child.stock_threshold || 0);
                          if (filterTab === "OUT_OF_STOCK") return stock <= 0;
                          return stock <= 0 || (thresh > 0 && stock <= thresh);
                        })
                        .map(child => {
                          const status = getStockStatus(Number(child.current_stock), Number(child.stock_threshold));
                          return (
                            <tr key={child.ulid} className="hover:bg-neutral-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-sm font-black text-[#6A0FAD] shrink-0">
                                    <Tag className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="font-bold text-neutral-900 text-sm">{child.name}</div>
                                    <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-0.5">
                                      <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.2 rounded border border-purple-100">
                                        Parent: Sticker
                                      </span>
                                      <span>• ₹{Number(child.cost).toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="font-bold text-xs text-[#6A0FAD] bg-purple-100/60 px-2.5 py-1 rounded-lg border border-purple-200">
                                  {child.name}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="font-bold text-neutral-600 text-xs">{Number(child.stock_threshold)} pcs</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`text-xl font-black ${Number(child.current_stock) <= 0 ? "text-red-500" : "text-amber-600"}`}>
                                  {Number(child.current_stock)}
                                </span>
                                <span className="text-xs text-neutral-400 ml-1">pcs</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${status.bg} ${status.color}`}>
                                  {status.icon}
                                  {status.label}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleOpenReplenish(child)}
                                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#6A0FAD] text-white hover:bg-[#580d8f] transition-all shadow-xs"
                                  >
                                    <ArrowDownToLine className="w-3.5 h-3.5" />
                                    Add Stock
                                  </button>
                                  <button
                                    onClick={() => handleOpenLogs(child)}
                                    className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                                  >
                                    <ListOrdered className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                      {/* 3. Standard Non-Sticker Components */}
                      {standardComponents
                        .filter(comp => {
                          if (filterTab === "ALL") return true;
                          const stock = Number(comp.current_stock || 0);
                          const thresh = Number(comp.stock_threshold || 0);
                          if (filterTab === "OUT_OF_STOCK") return stock <= 0;
                          return stock <= 0 || (thresh > 0 && stock <= thresh);
                        })
                        .map(comp => {
                          const status = getStockStatus(Number(comp.current_stock), Number(comp.stock_threshold));
                          return (
                            <tr key={comp.ulid} className="hover:bg-neutral-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-sm font-black text-orange-400 shrink-0">
                                    <Package className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="font-bold text-neutral-900">{comp.name}</div>
                                    <div className="text-xs text-neutral-400">₹{Number(comp.cost).toFixed(2)} / unit</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-xs font-medium text-neutral-400">—</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="font-bold text-neutral-600">{Number(comp.stock_threshold)} pcs</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`text-xl font-black ${
                                  Number(comp.current_stock) <= 0 
                                    ? "text-red-500" 
                                    : Number(comp.current_stock) <= Number(comp.stock_threshold) && Number(comp.stock_threshold) > 0 
                                    ? "text-amber-500" 
                                    : "text-green-600"
                                }`}>
                                  {Number(comp.current_stock)}
                                </span>
                                <span className="text-xs text-neutral-400 ml-1">pcs</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${status.bg} ${status.color}`}>
                                  {status.icon}
                                  {status.label}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleOpenReplenish(comp)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#6A0FAD] text-white hover:bg-[#580d8f] transition-all shadow-xs"
                                  >
                                    <ArrowDownToLine className="w-3.5 h-3.5" />
                                    Stock In
                                  </button>
                                  <button
                                    onClick={() => handleOpenAdjust(comp)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                                  >
                                    <BarChart3 className="w-3.5 h-3.5" />
                                    Adjust
                                  </button>
                                  <button
                                    onClick={() => handleOpenLogs(comp)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                                  >
                                    <ListOrdered className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between shrink-0 p-4 border-t border-neutral-200">
                  <span className="text-sm text-neutral-500 font-medium">Page {page} of {totalPages} · {total} components</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-[#f8f5fb] text-neutral-600 hover:bg-[#f1edf7] disabled:opacity-50 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages || totalPages === 0}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-[#f8f5fb] text-neutral-600 hover:bg-[#f1edf7] disabled:opacity-50 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {isAdjustModalOpen && selectedComponent && (
        <PackagingStockAdjustmentModal
          component={selectedComponent}
          initialMode={modalInitialMode}
          onClose={() => setIsAdjustModalOpen(false)}
          onSuccess={handleAdjustSuccess}
        />
      )}
      {isLogModalOpen && selectedComponent && (
        <PackagingStockLogModal
          component={selectedComponent}
          onClose={() => setIsLogModalOpen(false)}
        />
      )}
    </div>
  );
}
