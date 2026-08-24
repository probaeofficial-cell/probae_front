"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  Utensils,
  AlertTriangle,
  CheckCircle2,
  Pencil,
  Trash2,
  Eye,
  X
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Header } from "@/components/admin/Header";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { ProbaeSearch } from "@/components/admin/ProbaeSearch";
import { endpoints } from "@/lib/apiService";
import { getMediaUrl } from "@/lib/utils";
import { BowlCategory } from "@/lib/types";
import { ConfirmationModal } from "@/components/ConfirmationModal";

export default function BowlCategoriesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // ─── State Variables ───────────────────────────────────────────────────────
  const [categories, setCategories] = useState<BowlCategory[]>([]);
  const [totalCategories, setTotalCategories] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(6); // 6 items per page
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [systemSettings, setSystemSettings] = useState({ R2_BASE_URL: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  // Modal State for viewing bowls in a category
  const [selectedCategoryForModal, setSelectedCategoryForModal] = useState<BowlCategory | null>(null);

  // Notifications State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<BowlCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Side Effects ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/admin/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchSystemSettings() {
      try {
        const data = await endpoints.settings.getSystemSettings();
        if (data && data.R2_BASE_URL !== undefined) {
          setSystemSettings({ R2_BASE_URL: data.R2_BASE_URL });
        }
      } catch (error) {
        console.error("Error fetching system settings:", error);
      }
    }
    if (user) {
      fetchSystemSettings();
    }
  }, [user]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); 
    }, 1500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchCategories = useCallback(async () => {
    if (!user) return;
        if (page === 1) {
      setIsLoading(true);
    } else {
      setIsFetchingNextPage(true);
      await new Promise(r => setTimeout(r, 2000));
    }
    try {
      const data = await endpoints.bowlCategories.getBowlCategories(page, pageSize, debouncedSearch);
      setCategories(prev => {
        const newItems = data.items || [];
        if (page === 1) return newItems;
        const existingIds = new Set(prev.map((item: any) => item.id || item.ulid));
        const uniqueNewItems = newItems.filter((item: any) => !existingIds.has(item.id || item.ulid));
        return [...prev, ...uniqueNewItems];
      });
      setTotalCategories(data.total || 0);
    } catch (error: any) {
      console.error("Error loading categories:", error);
      showToast(error.message || "Failed to load bowl categories", "error");
    } finally {
      setIsLoading(false);
      setIsFetchingNextPage(false);
    }
  }, [user, page, pageSize, debouncedSearch]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // ─── Toast Helper ─────────────────────────────────────────────────────────
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // ─── Event Handlers ────────────────────────────────────────────────────────
  const totalPages = Math.ceil(totalCategories / pageSize);

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

  const handleDelete = (category: BowlCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToDelete(category);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await endpoints.bowlCategories.deleteBowlCategory(itemToDelete.ulid);
      showToast(`Category ${itemToDelete.name} deleted successfully`, "success");
      fetchCategories();
    } catch (error: any) {
      console.error("Error deleting category:", error);
      showToast(error.message || "Failed to delete category", "error");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

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

      <div className="p-4 sm:p-8 h-full flex flex-col bg-[#E6E6E6] overflow-hidden">
        <Header />

        <div className="text-[13px] text-neutral-500 font-medium select-none pl-1 mb-4">
          <span>Bowl Categories</span>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden p-1 sm:p-2">
          <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-center shrink-0">
            <ProbaeSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search for your category"
            />
            <ProbaeButton
              onClick={() => router.push("/admin/bowls/categories/add")}
              className="w-full sm:w-auto px-8 shrink-0"
            >
              Add Bowl Category
            </ProbaeButton>
          </div>

          {!isLoading && totalCategories > 0 && (
            <div className="text-xs text-neutral-400 font-medium px-2 mb-3 mt-[-12px]">
              Showing {categories.length} of {totalCategories}
            </div>
          )}
          <div className="flex-1 overflow-y-auto pr-2 pb-6 scrollbar-thin" onScroll={handleScroll}>
            {isLoading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-[#7c3aed] animate-spin" />
                <span className="text-neutral-500 text-sm font-medium">Loading categories...</span>
              </div>
            ) : categories.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center bg-white border border-neutral-100 rounded-[32px] p-8 text-center max-w-lg mx-auto shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-400 mb-4">
                  <Utensils className="w-8 h-8" />
                </div>
                <h3 className="text-neutral-800 font-bold text-lg">No categories found</h3>
                <p className="text-neutral-500 text-sm mt-2 max-w-sm">
                  {debouncedSearch 
                    ? `No results match your search "${debouncedSearch}". Try another query.` 
                    : "No categories are available. Click 'Add Bowl Category' to create one."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {categories.map((item) => {
                  const mediaUrl = getMediaUrl(systemSettings?.R2_BASE_URL, item.image_filename);
                  
                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-[32px] shadow-sm border border-neutral-100/50 flex flex-col relative group transition-all duration-300 hover:shadow-md cursor-pointer"
                    >
                      {/* Main Card Content */}
                      <div 
                        className="p-6 flex flex-col gap-4"
                        onClick={() => router.push(`/admin/bowls/categories/preview/${item.ulid}`)}
                      >
                        {/* Image section */}
                        <div className="h-[120px] w-full rounded-[24px] overflow-hidden relative bg-[#fafafa] flex items-center justify-center shrink-0 border border-neutral-100">
                          {mediaUrl ? (
                            <img
                              src={mediaUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                e.currentTarget.nextElementSibling?.classList.remove("hidden");
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br ${getGradientForImage(
                              item.id
                            )} ${mediaUrl ? "hidden" : ""}`}
                          >
                            <span className="text-4xl">🥘</span>
                            <span className="text-xs font-bold text-neutral-600/50 mt-1 uppercase tracking-wider">No Image</span>
                          </div>

                          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm border border-neutral-200">
                            <span className="text-xs font-bold text-neutral-800 font-mono">
                              {item.code || `CAT-${item.id.toString().padStart(4, "0")}`}
                            </span>
                          </div>

                          <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/admin/bowls/categories/${item.ulid}`);
                              }}
                              className="w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-neutral-600 hover:text-blue-600 hover:bg-blue-50 transition-colors shadow-sm"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(item, e)}
                              className="w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-neutral-600 hover:text-red-600 hover:bg-red-50 transition-colors shadow-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Text Content */}
                        <div className="flex flex-col gap-1.5">
                          <h3 className="text-lg font-bold text-neutral-800 line-clamp-1">{item.name}</h3>
                          <p className="text-[13px] text-neutral-500 line-clamp-2 leading-relaxed min-h-[40px]">
                            {item.description || "No description provided."}
                          </p>
                        </div>
                        
                        {/* View Bowls Button */}
                        <div className="pt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCategoryForModal(item);
                            }}
                            className="w-full py-2.5 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm transition-colors border bg-neutral-50 text-[#7c3aed] border-[#7c3aed]/20 hover:bg-[#7c3aed]/10"
                          >
                            <Eye className="w-4 h-4" />
                            <span>View Bowls</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {isFetchingNextPage && (
              <div className="py-6 flex justify-center items-center w-full">
                <Loader2 className="w-6 h-6 text-[#7c3aed] animate-spin" />
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
        </div>
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Delete Bowl Category"
        message={`Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`}
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
      />

      {/* Modal for viewing bowls */}
      {selectedCategoryForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in"
            onClick={() => setSelectedCategoryForModal(null)}
          />
          <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-neutral-100 max-h-[85vh]">
            <div className="p-6 sm:p-8 flex-1 overflow-y-auto scrollbar-thin">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-neutral-900">{selectedCategoryForModal.name}</h3>
                  <p className="text-sm font-medium text-neutral-500 mt-1 uppercase tracking-wider">Bowls in Category</p>
                </div>
                <button
                  onClick={() => setSelectedCategoryForModal(null)}
                  className="w-10 h-10 bg-neutral-100 hover:bg-neutral-200 rounded-full flex items-center justify-center text-neutral-500 transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {selectedCategoryForModal.bowls && selectedCategoryForModal.bowls.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {selectedCategoryForModal.bowls.map((bowl) => (
                    <div key={bowl.id} className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 flex flex-col hover:bg-neutral-100 transition-colors">
                      <div className="text-xs font-mono text-neutral-400 font-bold mb-1">{bowl.code || `B-${bowl.id}`}</div>
                      <div className="font-bold text-neutral-800">{bowl.name}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-8 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-neutral-300 mb-4 shadow-sm">
                    <Utensils className="w-8 h-8" />
                  </div>
                  <span className="font-semibold text-neutral-600">No bowls in this Category</span>
                  <p className="text-sm text-neutral-400 mt-2 max-w-[200px]">Add some bowls to this category to see them here.</p>
                </div>
              )}
          </div>
            <div className="p-4 sm:p-6 bg-neutral-50 border-t border-neutral-100 flex justify-end">
              <button
                onClick={() => setSelectedCategoryForModal(null)}
                className="px-6 py-2.5 rounded-xl font-bold text-sm bg-white border-2 border-neutral-200 text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
