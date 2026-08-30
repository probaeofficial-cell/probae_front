"use client";
import { BowlLoader } from "@/components/admin/BowlLoader";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Filter, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  Wheat,
  AlertTriangle,
  CheckCircle2,
  Pencil,
  Trash2
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { ProbaeSearch } from "@/components/admin/ProbaeSearch";
import { endpoints } from "@/lib/apiService";
import { getMediaUrl } from "@/lib/utils";
import { RawMaterial } from "@/lib/types";
import { ConfirmationModal } from "@/components/ConfirmationModal";

export default function CalorieManagementPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // ─── State Variables ───────────────────────────────────────────────────────
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [totalMaterials, setTotalMaterials] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(6); // 6 items per page as shown in screenshot
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [systemSettings, setSystemSettings] = useState({ R2_BASE_URL: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  // Notifications State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modal State
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [materialToClear, setMaterialToClear] = useState<RawMaterial | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  // ─── Side Effects ──────────────────────────────────────────────────────────
  // Auth validation
  useEffect(() => {
    setIsTyping(true);
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
      setIsTyping(false);
    }, 1000);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load Raw Materials
  const fetchMaterials = useCallback(async () => {
    if (!user) return;
        if (page === 1) {
      setIsLoading(true);
    } else {
      setIsFetchingNextPage(true);
      await new Promise(r => setTimeout(r, 2000));
    }
    try {
      const data = await endpoints.rawMaterials.getRawMaterials(page, pageSize, debouncedSearch);
      const filtered = (data.items || []).filter(
        (m: RawMaterial) => m.calories !== null && m.calories !== undefined && m.calories !== 0
      );
      setMaterials(prev => {
        if (page === 1) return filtered;
        const existingIds = new Set(prev.map(item => item.id || item.ulid));
        const newItems = filtered.filter(item => !existingIds.has(item.id || item.ulid));
        return [...prev, ...newItems];
      });
      // We adjust the pagination total based on the filtered set's ratio to server's total,
      // or simply use data.total if we keep server count, but since we are showing fewer,
      // let's set totalMaterials to the length of materials or match the backend.
      setTotalMaterials(res => {
        // If there is no search filter and we get fewer than page size, adjust total count
        return data.total || 0;
      });
    } catch (error: any) {
      console.error("Error loading raw materials:", error);
      showToast(error.message || "Failed to load raw materials", "error");
    } finally {
      setIsLoading(false);
      setIsFetchingNextPage(false);
    }
  }, [user, page, pageSize, debouncedSearch]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  // ─── Toast Helper ─────────────────────────────────────────────────────────
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // ─── Event Handlers ────────────────────────────────────────────────────────
  // Pagination
  const totalPages = Math.ceil(totalMaterials / pageSize);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom = Math.abs(e.currentTarget.scrollHeight - e.currentTarget.scrollTop - e.currentTarget.clientHeight) < 2;
    if (bottom && !isLoading && !isFetchingNextPage && page < totalPages) {
      setPage(prev => prev + 1);
    }
  };
  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };
  const handleNextPage = () => {
    if (page < totalPages) setPage(page + 1);
  };

  // Delete/Reset Macros handler
  const handleResetMacros = (material: RawMaterial, e: React.MouseEvent) => {
    e.stopPropagation();
    setMaterialToClear(material);
    setIsClearModalOpen(true);
  };

  const confirmResetMacros = async () => {
    if (!materialToClear) return;
    setIsClearing(true);
    try {
      await endpoints.rawMaterials.updateMacros(materialToClear.ulid, {
        calories: 0,
        protein: 0,
        carbs: 0,
        fiber: 0,
        fat: 0,
        micros: []
      });
      showToast(`Nutritional macros for ${materialToClear.name} cleared successfully`, "success");
      fetchMaterials();
    } catch (error: any) {
      console.error("Error clearing macros:", error);
      showToast(error.message || "Failed to clear macros", "error");
    } finally {
      setIsClearing(false);
      setIsClearModalOpen(false);
      setMaterialToClear(null);
    }
  };

  // Color generator for circular image backgrounds
  const getGradientForImage = (id: number) => {
    const gradients = [
      "from-green-100 to-emerald-200",
      "from-sky-100 to-blue-200",
      "from-amber-100 to-orange-200",
      "from-lime-100 to-green-200",
      "from-rose-100 to-pink-200",
      "from-purple-100 to-indigo-200",
      "from-yellow-100 to-amber-200"
    ];
    return gradients[id % gradients.length];
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fafafa]">
        <div className="animate-pulse text-neutral-500 font-medium">Loading session...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl transition-all border animate-fade-in ${
          toast.type === "success" 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
            : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Main Page Layout */}
      <div className="p-4 sm:p-8 h-full flex flex-col bg-[#E6E6E6] overflow-hidden">
        {/* Header Bar */}
        <Header />

        {/* Breadcrumbs indicating position */}
        <div className="text-[13px] text-neutral-500 font-medium select-none pl-1 mb-4">
          <span>Raw Material</span> <span className="text-neutral-400 font-normal">/</span> <span className="text-neutral-700 font-semibold">Calorie Mgt</span>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden p-1 sm:p-2">
          {/* Sub Header / Search Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-center shrink-0">
            {/* Search Input using ProbaeSearch Component */}
            <ProbaeSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search for your order"
             isLoading={isTyping || isLoading} />

            {/* Add Raw Material button using ProbaeButton */}
            <ProbaeButton
              onClick={() => router.push("/admin/raw-materials/calorie-management/add-macros")}
              className="w-full sm:w-auto px-8 shrink-0"
            >
              Add Raw Material
            </ProbaeButton>
          </div>

          {/* Grid Content Area */}
          {!isLoading && totalMaterials > 0 && (
            <div className="text-xs text-neutral-400 font-medium px-2 mb-3 mt-[-12px]">
              Showing {materials.length} of {totalMaterials}
            </div>
          )}
          <div className="flex-1 overflow-y-auto pr-2 pb-6 scrollbar-thin" onScroll={handleScroll}>
            {isLoading || isTyping ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3">
                <BowlLoader className="w-8 h-8 text-[#6b21a8]" />
                <span className="text-neutral-500 text-sm font-medium">Loading materials...</span>
              </div>
            ) : materials.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center bg-white border border-neutral-100 rounded-[32px] p-8 text-center max-w-lg mx-auto shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-400 mb-4">
                  <Wheat className="w-8 h-8" />
                </div>
                <h3 className="text-neutral-800 font-bold text-lg">No raw materials found</h3>
                <p className="text-neutral-500 text-sm mt-2 max-w-sm">
                  {debouncedSearch 
                    ? `No results match your search "${debouncedSearch}". Try another query.` 
                    : "No raw materials are available. Please create raw materials in Cost Management first."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {materials.map((material) => {
                  const mediaUrl = getMediaUrl(systemSettings?.R2_BASE_URL, material.image_filename);
                  
                  return (
                    <div
                      key={material.id}
                      onClick={() => router.push(`/admin/raw-materials/calorie-management/preview/${material.ulid}`)}
                      className="bg-white rounded-[32px] p-6 shadow-sm border border-neutral-100/50 flex flex-col gap-4 relative group cursor-pointer hover:shadow-md transition-shadow"
                    >
                      {/* Image section with ID overlay and action overlays */}
                      <div className="h-[120px] w-full rounded-[20px] overflow-hidden relative bg-[#fafafa] flex items-center justify-center shrink-0 border border-neutral-100">
                        {mediaUrl ? (
                          <img
                            src={mediaUrl}
                            alt={material.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className={`w-full h-full ${material.id % 2 === 0 ? "bg-[#b0ecd2]" : "bg-[#fde4cf]"} flex items-center justify-center`}>
                            <Wheat className="w-16 h-16 text-black/20" />
                          </div>
                        )}

                        {/* ID Badge on top-left (dynamic width capsule) */}
                        <div className="absolute top-3 left-3 h-8 px-2.5 min-w-[32px] bg-white rounded-full flex items-center justify-center shadow-sm select-none">
                          <span className="text-[12px] font-bold text-neutral-800">A{material.id}</span>
                        </div>

                        {/* Edit/Delete semi-transparent circles on top-right */}
                        <div className="absolute top-3 right-3 flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/admin/raw-materials/calorie-management/edit-macros/${material.ulid}`);
                            }}
                            className="w-8 h-8 rounded-full bg-white/30 backdrop-blur-md text-white hover:bg-white/40 flex items-center justify-center shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            title="Edit Macros"
                          >
                            <Pencil className="w-3.5 h-3.5 fill-current" />
                          </button>
                          <button
                            onClick={(e) => handleResetMacros(material, e)}
                            className="w-8 h-8 rounded-full bg-white/30 backdrop-blur-md text-white hover:bg-white/40 flex items-center justify-center shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            title="Clear Macros"
                          >
                            <Trash2 className="w-3.5 h-3.5 fill-current" />
                          </button>
                        </div>
                      </div>

                      {/* Info and Macros row */}
                      <div className="flex justify-between items-start gap-2">
                        {/* Left Column: Name & Calorie Badge */}
                        <div className="flex flex-col justify-start w-[45%] shrink-0 pt-1 pr-2">
                          <h3 className="text-[22px] font-bold text-[#111111] leading-tight">
                            {material.name}
                          </h3>
                          <div className="bg-[#4CAF50] text-white px-3 py-1.5 rounded-lg text-[13px] font-bold w-fit shadow-sm select-none mt-2">
                            {material.calories || 0} Kcal
                          </div>
                        </div>

                        {/* Right Column: Macro labels + badges & Micronutrients list */}
                        <div className="flex-1 flex flex-col items-start pt-1">
                          {/* 4 Macros Badges */}
                          <div className="flex gap-1 justify-between w-full">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[10px] text-[#333333] font-medium tracking-tight select-none">Protein</span>
                              <div className="bg-[#6A0FAD] text-white text-[10px] font-medium min-w-[30px] px-1 h-[22px] rounded-[8px] flex items-center justify-center select-none shadow-sm">
                                {material.protein || 0}g
                              </div>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[10px] text-[#333333] font-medium tracking-tight select-none">Carb</span>
                              <div className="bg-[#6A0FAD] text-white text-[10px] font-medium min-w-[30px] px-1 h-[22px] rounded-[8px] flex items-center justify-center select-none shadow-sm">
                                {material.carbs || 0}g
                              </div>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[10px] text-[#333333] font-medium tracking-tight select-none">Fiber</span>
                              <div className="bg-[#6A0FAD] text-white text-[10px] font-medium min-w-[30px] px-1 h-[22px] rounded-[8px] flex items-center justify-center select-none shadow-sm">
                                {material.fiber || 0}g
                              </div>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[10px] text-[#333333] font-medium tracking-tight select-none">Fat</span>
                              <div className="bg-[#6A0FAD] text-white text-[10px] font-medium min-w-[30px] px-1 h-[22px] rounded-[8px] flex items-center justify-center select-none shadow-sm">
                                {material.fat || 0}g
                              </div>
                            </div>
                          </div>

                          {/* Micros list display */}
                          <div className="w-full text-left mt-3">
                            <span className="text-[11px] text-[#111111] font-bold block mb-0.5">Micros</span>
                            <p className="text-[11px] text-neutral-500 font-medium line-clamp-1">
                              {material.micros && material.micros.length > 0 
                                ? material.micros.join(",") 
                                : "None"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {isFetchingNextPage && (
              <div className="py-6 flex justify-center items-center w-full">
                <BowlLoader className="w-6 h-6 text-[#6b21a8]" />
                <span className="ml-2 text-sm text-neutral-500 font-medium">Loading more...</span>
              </div>
            )}
            {!isLoading && !isFetchingNextPage && page >= totalPages && totalPages > 0 && (
              <div className="py-8 flex flex-col justify-center items-center w-full animate-in fade-in zoom-in duration-500">
                <div className="w-10 h-10 rounded-full bg-green-50 text-green-500 flex items-center justify-center mb-3 shadow-sm ring-4 ring-green-50/50">
                  <svg className="w-6 h-6 animate-[bounce_2s_ease-in-out_infinite]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm text-neutral-400 font-bold">You're all caught up!</span>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          
        </div>
      </div>

      <ConfirmationModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={confirmResetMacros}
        title="Clear Macros"
        message={
          materialToClear ? (
            <>
              Are you sure you want to clear macros for <span className="font-semibold text-white">{materialToClear.name}</span>? This will reset all nutritional values to zero.
            </>
          ) : (
            "Are you sure you want to clear macros for this material?"
          )
        }
        type="warning"
        confirmText="Yes, Clear Macros"
        cancelText="Cancel"
        isLoading={isClearing}
      />
    </div>
  );
}
