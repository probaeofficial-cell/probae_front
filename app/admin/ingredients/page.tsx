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
  Utensils,
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
import { Ingredient } from "@/lib/types";
import { ConfirmationModal } from "@/components/ConfirmationModal";

export default function IngredientsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // ─── State Variables ───────────────────────────────────────────────────────
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [totalIngredients, setTotalIngredients] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(6); // 6 items per page
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [systemSettings, setSystemSettings] = useState({ R2_BASE_URL: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  // Notifications State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Ingredient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Load Ingredients
  const fetchIngredients = useCallback(async () => {
    if (!user) return;
        if (page === 1) {
      setIsLoading(true);
    } else {
      setIsFetchingNextPage(true);
      await new Promise(r => setTimeout(r, 2000));
    }
    try {
      const data = await endpoints.ingredients.getIngredients(page, pageSize, debouncedSearch);
      setIngredients(prev => {
        const newItems = data.items || [];
        if (page === 1) return newItems;
        const existingIds = new Set(prev.map((item: any) => item.id || item.ulid));
        const uniqueNewItems = newItems.filter((item: any) => !existingIds.has(item.id || item.ulid));
        return [...prev, ...uniqueNewItems];
      });
      setTotalIngredients(data.total || 0);
    } catch (error: any) {
      console.error("Error loading ingredients:", error);
      showToast(error.message || "Failed to load ingredients", "error");
    } finally {
      setIsLoading(false);
      setIsFetchingNextPage(false);
    }
  }, [user, page, pageSize, debouncedSearch]);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  // ─── Toast Helper ─────────────────────────────────────────────────────────
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // ─── Event Handlers ────────────────────────────────────────────────────────
  // Pagination
  const totalPages = Math.ceil(totalIngredients / pageSize);

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

  // Delete handler
  const handleDelete = (ingredient: Ingredient, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToDelete(ingredient);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await endpoints.ingredients.deleteIngredient(itemToDelete.ulid);
      showToast(`Ingredient ${itemToDelete.name} deleted successfully`, "success");
      fetchIngredients();
    } catch (error: any) {
      console.error("Error deleting ingredient:", error);
      showToast(error.message || "Failed to delete ingredient", "error");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
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
          <span>Components</span>
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

            {/* Add Components button using ProbaeButton */}
            <ProbaeButton
              onClick={() => router.push("/admin/ingredients/add")}
              className="w-full sm:w-auto px-8 shrink-0"
            >
              Add Components
            </ProbaeButton>
          </div>

          {/* Grid Content Area */}
          {!isLoading && totalIngredients > 0 && (
            <div className="text-xs text-neutral-400 font-medium px-2 mb-3 mt-[-12px]">
              Showing {ingredients.length} of {totalIngredients}
            </div>
          )}
          <div className="flex-1 overflow-y-auto pr-2 pb-6 scrollbar-thin" onScroll={handleScroll}>
            {isLoading || isTyping ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3">
                <BowlLoader className="w-8 h-8 text-[#7c3aed]" />
                <span className="text-neutral-500 text-sm font-medium">Loading ingredients...</span>
              </div>
            ) : ingredients.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center bg-white border border-neutral-100 rounded-[32px] p-8 text-center max-w-lg mx-auto shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-400 mb-4">
                  <Utensils className="w-8 h-8" />
                </div>
                <h3 className="text-neutral-800 font-bold text-lg">No ingredients found</h3>
                <p className="text-neutral-500 text-sm mt-2 max-w-sm">
                  {debouncedSearch 
                    ? `No results match your search "${debouncedSearch}". Try another query.` 
                    : "No ingredients are available. Click 'Add Components' to create one."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {ingredients.map((item) => {
                  const mediaUrl = getMediaUrl(systemSettings?.R2_BASE_URL, item.image_filename);
                  
                  return (
                    <div
                      key={item.id}
                      onClick={() => router.push(`/admin/ingredients/preview/${item.ulid}`)}
                      className="bg-white rounded-[32px] p-6 shadow-sm border border-neutral-100/50 flex flex-col gap-4 relative group cursor-pointer hover:shadow-md transition-shadow"
                    >
                      {/* Image section with ID overlay and action overlays */}
                      <div className="h-[120px] w-full rounded-[24px] overflow-hidden relative bg-[#fafafa] flex items-center justify-center shrink-0 border border-neutral-100">
                        {mediaUrl ? (
                          <img
                            src={mediaUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className={`w-full h-full ${item.id % 2 === 0 ? "bg-[#b0ecd2]" : "bg-[#fde4cf]"} flex items-center justify-center`}>
                            <Utensils className="w-16 h-16 text-black/20" />
                          </div>
                        )}

                        {/* ID Badge on top-left (dynamic width capsule) */}
                        <div className="absolute top-3 left-3 h-8 px-2.5 min-w-[32px] bg-white rounded-full flex items-center justify-center shadow-sm select-none">
                          <span className="text-[12px] font-bold text-neutral-800">A{item.id}</span>
                        </div>

                        {/* Edit/Delete semi-transparent circles on top-right */}
                        <div className="absolute top-3 right-3 flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/admin/ingredients/${item.ulid}`);
                            }}
                            className="w-8 h-8 rounded-full bg-white/30 backdrop-blur-md text-white hover:bg-white/40 flex items-center justify-center shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            title="Edit Component"
                          >
                            <Pencil className="w-3.5 h-3.5 fill-current" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(item, e)}
                            className="w-8 h-8 rounded-full bg-white/30 backdrop-blur-md text-white hover:bg-white/40 flex items-center justify-center shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
                            title="Delete Component"
                          >
                            <Trash2 className="w-3.5 h-3.5 fill-current" />
                          </button>
                        </div>
                      </div>

                      {/* Info and Macros row */}
                      <div className="flex flex-col gap-1">
                        {/* Title */}
                        <h3 className="text-[22px] font-bold text-[#111111] leading-tight pt-1 line-clamp-2 mb-2">
                          {item.name}
                        </h3>
                        
                        {/* Badges: Kcal and Price */}
                        <div className="flex items-center gap-3">
                          <div className="bg-[#4CAF50] text-white px-4 py-1.5 rounded-lg text-[13px] font-bold shadow-sm select-none">
                            {Math.round(item.total_calories || 0)} Kcal
                          </div>
                          <div className="bg-[#212121] text-white px-4 py-1.5 rounded-lg text-[13px] font-bold shadow-sm select-none">
                            ₹{Math.round(item.total_price || 0)} / {Math.round(item.total_weight || 0)}g
                          </div>
                        </div>

                        {/* Macros Badges */}
                        <div className="flex gap-6 justify-start w-full mt-3">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] text-[#333333] font-medium tracking-tight select-none">Protein</span>
                            <div className="bg-[#6A0FAD] text-white text-[10px] font-medium min-w-[30px] px-1 h-[22px] rounded-[8px] flex items-center justify-center select-none shadow-sm">
                              {Math.round(item.total_protein || 0)}g
                            </div>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] text-[#333333] font-medium tracking-tight select-none">Carb</span>
                            <div className="bg-[#6A0FAD] text-white text-[10px] font-medium min-w-[30px] px-1 h-[22px] rounded-[8px] flex items-center justify-center select-none shadow-sm">
                              {Math.round(item.total_carbs || 0)}g
                            </div>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] text-[#333333] font-medium tracking-tight select-none">Fiber</span>
                            <div className="bg-[#6A0FAD] text-white text-[10px] font-medium min-w-[30px] px-1 h-[22px] rounded-[8px] flex items-center justify-center select-none shadow-sm">
                              {Math.round(item.total_fiber || 0)}g
                            </div>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[10px] text-[#333333] font-medium tracking-tight select-none">Fat</span>
                            <div className="bg-[#6A0FAD] text-white text-[10px] font-medium min-w-[30px] px-1 h-[22px] rounded-[8px] flex items-center justify-center select-none shadow-sm">
                              {Math.round(item.total_fat || 0)}g
                            </div>
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
                <BowlLoader className="w-6 h-6 text-[#7c3aed]" />
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
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Component"
        message={
          itemToDelete ? (
            <>
              Are you sure you want to delete <span className="font-semibold text-white">{itemToDelete.name}</span>? This action cannot be undone.
            </>
          ) : (
            "Are you sure?"
          )
        }
        confirmText="Delete"
        type="delete"
        isLoading={isDeleting}
      />
    </div>
  );
}
