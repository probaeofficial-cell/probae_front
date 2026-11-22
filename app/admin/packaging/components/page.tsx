"use client";
import { BowlLoader } from "@/components/admin/BowlLoader";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  CheckCircle2, 
  Pencil, 
  Trash2, 
  Box, 
  Plus, 
  X, 
  BarChart3, 
  Tag, 
  Layers,
  ArrowRight,
  Search
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { Header } from "@/components/admin/Header";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { ProbaeSearch } from "@/components/admin/ProbaeSearch";
import { endpoints } from "@/lib/apiService";
import { PackagingComponent, ChildStickerSummary, Bowl } from "@/lib/types";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import AsyncBowlSelect from "@/components/admin/AsyncBowlSelect";
import { useQueryClient } from "@tanstack/react-query";
import { fetchCatalogueQuery } from "@/lib/queryHooks";
import { queryKeys } from "@/lib/queryKeys";

export default function PackagingComponentsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  // ─── State Variables ───────────────────────────────────────────────────────
  const [components, setComponents] = useState<PackagingComponent[]>([]);
  const [totalComponents, setTotalComponents] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(48);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  // Child sticker filter query
  const [childFilterQuery, setChildFilterQuery] = useState("");

  // Expandable state for parent components
  const [expandedParents, setExpandedParents] = useState<Record<number, boolean>>({});

  // Notifications State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modal State for Delete
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<PackagingComponent | ChildStickerSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal State for Add/Edit
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PackagingComponent | ChildStickerSummary | null>(null);
  const [selectedBowl, setSelectedBowl] = useState<Bowl | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    cost: "",
    is_child_sticker: false,
    stock_threshold: "50",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Side Effects ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/admin/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 600);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchComponents = useCallback(async () => {
    if (!user) return;
    if (page === 1) {
      setIsLoading(true);
    } else {
      setIsFetchingNextPage(true);
    }
    try {
      const data = await fetchCatalogueQuery(queryClient, queryKeys.packaging.components(user.id, [page, pageSize, debouncedSearch, "", "", false]), () => endpoints.packagingComponents.getComponents(page, pageSize, debouncedSearch), 30_000);
      setComponents(prev => {
        const newItems = data.items || [];
        if (page === 1) return newItems;
        const existingIds = new Set(prev.map((item: any) => item.id || item.ulid));
        const uniqueNewItems = newItems.filter((item: any) => !existingIds.has(item.id || item.ulid));
        return [...prev, ...uniqueNewItems];
      });
      setTotalComponents(data.total || 0);
    } catch (error: any) {
      console.error("Error loading packaging components:", error);
      showToast(error.message || "Failed to load components", "error");
    } finally {
      setIsLoading(false);
      setIsFetchingNextPage(false);
    }
  }, [user, page, pageSize, debouncedSearch, queryClient]);

  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const totalPages = Math.ceil(totalComponents / pageSize);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop - e.currentTarget.clientHeight <= 10;
    if (bottom && !isLoading && !isFetchingNextPage && page < totalPages) {
      setPage(prev => prev + 1);
    }
  };

  // Find parent sticker component
  const stickerParent = components.find(c => c.is_parent || c.name.trim().toLowerCase() === "sticker");
  const [persistedParent, setPersistedParent] = useState<PackagingComponent | null>(null);

  useEffect(() => {
    if (stickerParent) {
      setPersistedParent(stickerParent);
    }
  }, [stickerParent]);

  const activeParent = stickerParent || persistedParent;

  // Collect all child stickers from parent + direct items in components
  const allChildStickersMap = new Map<number | string, any>();
  if (activeParent?.children) {
    activeParent.children.forEach(c => allChildStickersMap.set(c.id || c.ulid, c));
  }
  components.forEach(item => {
    if (item.parent_id) {
      if (!allChildStickersMap.has(item.id || item.ulid)) {
        allChildStickersMap.set(item.id || item.ulid, item);
      }
    }
  });
  const allChildStickers = Array.from(allChildStickersMap.values());

  const isSearching = debouncedSearch.trim().length > 0;
  const activeSearch = (childFilterQuery || debouncedSearch).trim().toLowerCase();

  const matchingChildStickers = allChildStickers.filter(c => {
    if (!activeSearch) return true;
    return Boolean(c.name && c.name.toLowerCase().includes(activeSearch));
  });

  // Standard non-sticker components
  const standardComponents = components.filter(
    item => !item.is_parent && item.name.trim().toLowerCase() !== "sticker" && !item.parent_id
  );

  // Auto-expand parent Sticker when searching
  useEffect(() => {
    if (isSearching && activeParent) {
      setExpandedParents(prev => ({ ...prev, [activeParent.id]: true }));
    }
  }, [isSearching, activeParent?.id]);

  const toggleParentExpand = (id: number) => {
    setExpandedParents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // ─── Delete Handlers ───────────────────────────────────────────────────────
  const handleDelete = (item: PackagingComponent | ChildStickerSummary) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await endpoints.packagingComponents.deleteComponent(itemToDelete.ulid);
      await queryClient.invalidateQueries({ queryKey: queryKeys.packaging.root });
      showToast(`Item "${itemToDelete.name}" deleted successfully`, "success");
      fetchComponents();
    } catch (error: any) {
      console.error("Error deleting component:", error);
      showToast(error.message || "Failed to delete component", "error");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  // ─── Form Handlers ─────────────────────────────────────────────────────────
  const openAddModal = (asStickerChild: boolean = false) => {
    setEditingItem(null);
    setSelectedBowl(null);
    setFormData({
      name: "",
      cost: asStickerChild ? (activeParent && activeParent.cost ? String(activeParent.cost) : "0.25") : "",
      is_child_sticker: asStickerChild,
      stock_threshold: "50",
    });
    setIsFormModalOpen(true);
  };

  const openEditModal = (item: PackagingComponent | ChildStickerSummary) => {
    setEditingItem(item);
    setSelectedBowl(null);
    const isChild = Boolean(item.parent_id);
    setFormData({
      name: item.name,
      cost: String(item.cost),
      is_child_sticker: isChild,
      stock_threshold: String(item.stock_threshold ?? 50),
    });
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.cost === "") return;
    if (formData.is_child_sticker && !editingItem && !selectedBowl) {
      showToast("Please select the bowl for this sticker subcomponent", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingItem) {
        const payload: any = {
          name: formData.name.trim(),
          cost: parseFloat(formData.cost),
          stock_threshold: parseFloat(formData.stock_threshold) || 0,
        };
        if (formData.is_child_sticker) {
          if (activeParent) {
            payload.parent_id = activeParent.id;
          }
        }
        await endpoints.packagingComponents.updateComponent(editingItem.ulid, payload);
        showToast("Packaging component updated successfully", "success");
      } else {
        const payload: any = {
          name: formData.name.trim(),
          cost: parseFloat(formData.cost),
          stock_threshold: parseFloat(formData.stock_threshold) || 0,
        };
        if (formData.is_child_sticker) {
          if (!activeParent) {
            showToast("Parent Sticker component not found. Please contact support.", "error");
            setIsSubmitting(false);
            return;
          }
          payload.parent_id = activeParent.id;
        }
        await endpoints.packagingComponents.createComponent(payload);
        showToast("Packaging component created successfully", "success");
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.packaging.root });
      setIsFormModalOpen(false);
      fetchComponents();
    } catch (error: any) {
      showToast(error.message || "Failed to save component", "error");
    } finally {
      setIsSubmitting(false);
    }
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
          {toast.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      <div className="p-4 sm:p-8 h-full flex flex-col bg-[#E6E6E6] overflow-hidden">
        <Header />

        <div className="text-[13px] text-neutral-500 font-medium select-none pl-1 mb-4 flex items-center gap-2">
          <span>Packaging</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-neutral-900 font-bold">Items & Stickers</span>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden p-1 sm:p-2">
          <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-center shrink-0">
            <ProbaeSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search packaging components or sticker subcomponents..."
              isLoading={isLoading} 
            />
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Link href="/admin/packaging/components/stock">
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#6A0FAD]/10 text-[#6A0FAD] font-bold text-sm hover:bg-[#6A0FAD]/20 transition-colors shrink-0">
                  <BarChart3 className="w-4 h-4" />
                  Stock Management
                </button>
              </Link>
              <ProbaeButton onClick={() => openAddModal(false)} className="w-full sm:w-auto px-6 shrink-0">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </ProbaeButton>
            </div>
          </div>

          {!isLoading && totalComponents > 0 && (
            <div className="text-xs text-neutral-400 font-medium px-2 mb-3 mt-[-12px]">
              Showing {components.length} of {totalComponents}
            </div>
          )}

          <div className="flex-1 overflow-y-auto pr-2 pb-6 scrollbar-thin" onScroll={handleScroll}>
            {isLoading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3">
                <BowlLoader className="w-8 h-8 text-[#7c3aed]" />
                <span className="text-neutral-500 text-sm font-medium">Loading items...</span>
              </div>
            ) : (!activeParent && matchingChildStickers.length === 0 && standardComponents.length === 0) ? (
              <div className="h-64 flex flex-col items-center justify-center bg-white border border-neutral-100 rounded-[32px] p-8 text-center max-w-lg mx-auto shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-400 mb-4">
                  <Box className="w-8 h-8" />
                </div>
                <h3 className="text-neutral-900 font-bold text-lg">No items found</h3>
                <p className="text-neutral-500 text-sm mt-2 max-w-sm">
                  {debouncedSearch 
                    ? `No results match your search "${debouncedSearch}".` 
                    : "No packaging items are available. Click 'Add Item' to create one."}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {/* 1. Parent Sticker Card (Featured Hierarchy Section) */}
                {stickerParent && (
                  <div className="bg-gradient-to-br from-white to-purple-50/40 rounded-[28px] p-6 shadow-sm border-2 border-purple-200/80 transition-all">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-purple-100/70 pb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-[#6A0FAD] text-white flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
                          <Layers className="w-7 h-7" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-neutral-900 text-xl tracking-tight">Sticker</span>
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-purple-100 text-[#6A0FAD] border border-purple-200">
                              Parent Grouping
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 mt-0.5 font-medium">
                            Aggregate dynamic inventory across all sticker subcomponents
                          </p>
                        </div>
                      </div>

                      {/* Parent Stock & Metrics */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="bg-white/90 px-4 py-2 rounded-2xl border border-purple-100 flex flex-col items-center shadow-2xs">
                          <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Total Aggregate Stock</span>
                          <span className="text-xl font-black text-[#6A0FAD]">
                            {Number(stickerParent.current_stock || 0)} <span className="text-xs text-neutral-400 font-bold">pcs</span>
                          </span>
                        </div>

                        <div className="bg-white/90 px-4 py-2 rounded-2xl border border-purple-100 flex flex-col items-center shadow-2xs">
                          <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Unit Cost</span>
                          <span className="text-xl font-black text-neutral-800">
                            ₹{Number(stickerParent.cost || 0.25).toFixed(2)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="px-3 py-1.5 rounded-xl bg-purple-100/80 text-[#6A0FAD] font-bold text-xs border border-purple-200">
                            {allChildStickers.length} Children
                          </span>
                          {(() => {
                            const lowCount = allChildStickers.filter(c => c.stock_status === "LOW_STOCK").length;
                            const outCount = allChildStickers.filter(c => c.stock_status === "OUT_OF_STOCK").length;
                            return (
                              <>
                                {lowCount > 0 && (
                                  <span className="px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-700 font-bold text-xs border border-amber-200">
                                    {lowCount} Low
                                  </span>
                                )}
                                {outCount > 0 && (
                                  <span className="px-2.5 py-1.5 rounded-xl bg-red-50 text-red-600 font-bold text-xs border border-red-200">
                                    {outCount} Out of Stock
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(stickerParent)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-purple-200 text-[#6A0FAD] text-xs font-bold hover:bg-purple-50 transition-colors shadow-2xs"
                            title="Edit Parent Sticker Unit Cost"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit Unit Cost
                          </button>
                          <button
                            onClick={() => openAddModal(true)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#6A0FAD] text-white text-xs font-bold shadow-md shadow-purple-500/20 hover:bg-[#580d8f] transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Child Sticker
                          </button>
                          <button
                            onClick={() => toggleParentExpand(stickerParent.id)}
                            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-purple-200 text-[#6A0FAD] text-xs font-bold hover:bg-purple-50 transition-colors"
                          >
                            {(expandedParents[stickerParent.id] || isSearching) ? (
                              <>Hide Children <ChevronUp className="w-3.5 h-3.5" /></>
                            ) : (
                              <>View Children ({allChildStickers.length}) <ChevronDown className="w-3.5 h-3.5" /></>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Child Stickers List */}
                    {(expandedParents[stickerParent.id] || isSearching) && (() => {
                      return (
                        <div className="mt-4 pt-2 flex flex-col gap-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                            <span className="text-xs font-black text-neutral-400 uppercase tracking-wider">
                              Sticker Subcomponents ({matchingChildStickers.length}{matchingChildStickers.length !== allChildStickers.length ? ` of ${allChildStickers.length}` : ""})
                            </span>
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                                <input
                                  type="text"
                                  placeholder="Filter child stickers..."
                                  value={childFilterQuery}
                                  onChange={(e) => setChildFilterQuery(e.target.value)}
                                  className="w-48 pl-8 pr-7 py-1.5 bg-white border border-purple-200 rounded-xl text-xs font-medium text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20"
                                />
                                {childFilterQuery && (
                                  <button
                                    type="button"
                                    onClick={() => setChildFilterQuery("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <Link href="/admin/packaging/components/stock" className="text-xs font-bold text-[#6A0FAD] hover:underline flex items-center gap-1 shrink-0">
                                Replenish Stock <ArrowRight className="w-3 h-3" />
                              </Link>
                            </div>
                          </div>

                          {allChildStickers.length === 0 ? (
                            <div className="p-6 bg-white rounded-2xl border border-dashed border-purple-200 text-center text-neutral-400 text-sm font-medium">
                              No sticker subcomponents added yet. Add one named after the bowl to track its sticker stock.
                            </div>
                          ) : matchingChildStickers.length === 0 ? (
                            <div className="p-6 bg-white rounded-2xl border border-dashed border-purple-200 text-center text-neutral-400 text-sm font-medium">
                              No child stickers match &quot;{childFilterQuery || debouncedSearch}&quot;.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {matchingChildStickers.map(child => (
                                <div
                                  key={child.id || child.ulid}
                                  className="bg-white rounded-2xl p-4 border border-purple-100 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                                >
                                  <div>
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 text-[#6A0FAD] flex items-center justify-center font-black text-sm shrink-0">
                                          <Tag className="w-4 h-4" />
                                        </div>
                                        <div>
                                          <h4 className="font-bold text-neutral-900 text-sm leading-tight">{child.name}</h4>
                                          <div className="text-[11px] font-bold text-neutral-500 mt-0.5">
                                            Bowl name: <span className="text-[#6A0FAD]">{child.name}</span>
                                          </div>
                                        </div>
                                      </div>
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                        child.stock_status === "OUT_OF_STOCK"
                                          ? "bg-red-50 text-red-600 border-red-200"
                                          : child.stock_status === "LOW_STOCK"
                                          ? "bg-amber-50 text-amber-700 border-amber-200"
                                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      }`}>
                                        {String(child.stock_status || "IN_STOCK").replace("_", " ")}
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-neutral-100 text-center">
                                      <div>
                                        <span className="text-[10px] text-neutral-400 font-bold block uppercase">Stock</span>
                                        <span className={`text-sm font-black ${
                                          Number(child.current_stock) <= 0 ? "text-red-600" : "text-neutral-900"
                                        }`}>
                                          {Number(child.current_stock)} pcs
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-[10px] text-neutral-400 font-bold block uppercase">Threshold</span>
                                        <span className="text-sm font-bold text-neutral-600">
                                          {Number(child.stock_threshold)} pcs
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-[10px] text-neutral-400 font-bold block uppercase">Unit Cost</span>
                                        <span className="text-sm font-bold text-neutral-600">
                                          ₹{Number(child.cost).toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-neutral-50">
                                    <button
                                      onClick={() => openEditModal(child)}
                                      className="p-1.5 text-neutral-400 hover:text-[#6A0FAD] hover:bg-purple-50 rounded-lg transition-colors"
                                      title="Edit Child Sticker"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(child)}
                                      className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Delete Child Sticker"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* 1b. Standalone Matching Child Stickers (when parent card not returned, but stickers match) */}
                {!stickerParent && matchingChildStickers.length > 0 && (
                  <div className="bg-gradient-to-br from-white to-purple-50/40 rounded-[28px] p-6 shadow-sm border-2 border-purple-200/80 transition-all flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-[#6A0FAD] text-white flex items-center justify-center font-black text-sm shrink-0">
                          <Tag className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-black text-neutral-900 text-lg">Matching Sticker Subcomponents</h3>
                          <p className="text-xs text-neutral-500 font-medium">Found {matchingChildStickers.length} sub-stickers matching &quot;{debouncedSearch}&quot;</p>
                        </div>
                      </div>
                      <Link href="/admin/packaging/components/stock" className="text-xs font-bold text-[#6A0FAD] hover:underline flex items-center gap-1 shrink-0">
                        Replenish Stock <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {matchingChildStickers.map(child => (
                        <div
                          key={child.id || child.ulid}
                          className="bg-white rounded-2xl p-4 border border-purple-100 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 text-[#6A0FAD] flex items-center justify-center font-black text-sm shrink-0">
                                  <Tag className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-neutral-900 text-sm leading-tight">{child.name}</h4>
                                  <div className="text-[11px] font-bold text-neutral-500 mt-0.5">
                                    Bowl name: <span className="text-[#6A0FAD]">{child.name}</span>
                                  </div>
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                child.stock_status === "OUT_OF_STOCK"
                                  ? "bg-red-50 text-red-600 border-red-200"
                                  : child.stock_status === "LOW_STOCK"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}>
                                {String(child.stock_status || "IN_STOCK").replace("_", " ")}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-neutral-100 text-center">
                              <div>
                                <span className="text-[10px] text-neutral-400 font-bold block uppercase">Stock</span>
                                <span className={`text-sm font-black ${
                                  Number(child.current_stock) <= 0 ? "text-red-600" : "text-neutral-900"
                                }`}>
                                  {Number(child.current_stock)} pcs
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-neutral-400 font-bold block uppercase">Threshold</span>
                                <span className="text-sm font-bold text-neutral-600">
                                  {Number(child.stock_threshold)} pcs
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-neutral-400 font-bold block uppercase">Unit Cost</span>
                                <span className="text-sm font-bold text-neutral-600">
                                  ₹{Number(child.cost).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-neutral-50">
                            <button
                              onClick={() => openEditModal(child)}
                              className="p-1.5 text-neutral-400 hover:text-[#6A0FAD] hover:bg-purple-50 rounded-lg transition-colors"
                              title="Edit Child Sticker"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(child)}
                              className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Child Sticker"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Standard Packaging Components Grid */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-black text-neutral-400 uppercase tracking-wider">
                      Standard Packaging Components ({standardComponents.length})
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {standardComponents.map((item) => (
                      <div key={item.id} className="bg-white rounded-[24px] p-5 shadow-sm border border-neutral-100 flex justify-between items-center hover:shadow-md transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                            <Box className="w-6 h-6" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-neutral-900 text-lg leading-tight">{item.name}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-sm text-neutral-500 font-medium">₹{Number(item.cost).toFixed(2)}</span>
                              <span className="text-xs text-neutral-300">•</span>
                              <span className="text-xs font-bold text-neutral-600">{Number(item.current_stock || 0)} pcs</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEditModal(item)} className="p-2 text-neutral-400 hover:text-[#7c3aed] hover:bg-purple-50 rounded-lg transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(item)} className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
                <span className="text-sm text-neutral-400 font-bold">You&apos;re all caught up!</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Item"
        message={itemToDelete ? <>Are you sure you want to delete <span className="font-semibold text-white">{itemToDelete.name}</span>?</> : "Are you sure?"}
        confirmText="Delete"
        type="delete"
        isLoading={isDeleting}
      />

      {/* Form Modal (Add/Edit) */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
              <h2 className="text-xl font-bold text-neutral-900">
                {editingItem 
                  ? (editingItem.ulid === stickerParent?.ulid 
                      ? "Edit Parent Sticker" 
                      : formData.is_child_sticker ? "Edit Child Sticker" : "Edit Component")
                  : (formData.is_child_sticker ? "Add Child Sticker" : "Add Packaging Item")}
              </h2>
              <button onClick={() => setIsFormModalOpen(false)} className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="p-6 flex flex-col gap-4">
              {editingItem?.ulid === stickerParent?.ulid && (
                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3.5 text-xs text-purple-900 leading-relaxed font-medium">
                  <strong>Parent Sticker Unit Cost:</strong> This sets the baseline unit price for stickers in packaging sets. Packaging sets that include &ldquo;Sticker&rdquo; will use this cost in their total pricing calculations.
                </div>
              )}

              {/* Type selector (only when creating new) */}
              {!editingItem && (
                <div className="flex rounded-2xl bg-neutral-100 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBowl(null);
                      setFormData(prev => ({ ...prev, is_child_sticker: false }));
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      !formData.is_child_sticker 
                        ? "bg-white text-neutral-900 shadow-xs" 
                        : "text-neutral-500 hover:text-neutral-900"
                    }`}
                  >
                    Standard Item
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, is_child_sticker: true, cost: prev.cost || (stickerParent?.cost ? String(stickerParent.cost) : "0.25") }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      formData.is_child_sticker 
                        ? "bg-[#6A0FAD] text-white shadow-xs" 
                        : "text-neutral-500 hover:text-neutral-900"
                    }`}
                  >
                    Sticker Subcomponent
                  </button>
                </div>
              )}

              {formData.is_child_sticker && (
                <p className="rounded-xl bg-purple-50 p-3 text-xs text-purple-800">
                  Select the bowl to fill its exact name. The bowl&apos;s packaging set determines which sticker stock is deducted.
                </p>
              )}

              {formData.is_child_sticker && !editingItem && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider ml-1">
                    Bowl <span className="text-red-500">*</span>
                  </label>
                  <AsyncBowlSelect
                    value={selectedBowl?.ulid || ""}
                    selectedBowl={selectedBowl}
                    placeholder="Search and select a bowl..."
                    onChange={() => {}}
                    onSelectBowl={(bowl) => {
                      setSelectedBowl(bowl);
                      setFormData(prev => ({ ...prev, name: bowl.name }));
                    }}
                  />
                  <span className="ml-1 text-[11px] text-neutral-400">
                    The selected bowl name is saved as the sticker subcomponent name.
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider ml-1">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  readOnly={formData.is_child_sticker && !editingItem}
                  placeholder={formData.is_child_sticker ? "e.g. Zen Platter" : "e.g. Medium Bowl Base"}
                  className="w-full h-12 bg-neutral-50 border border-neutral-200 rounded-xl px-4 text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition-all read-only:cursor-not-allowed read-only:bg-neutral-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider ml-1">
                    Cost (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    placeholder="e.g. 0.25"
                    className="w-full h-12 bg-neutral-50 border border-neutral-200 rounded-xl px-4 text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider ml-1">
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={formData.stock_threshold}
                    onChange={(e) => setFormData({ ...formData, stock_threshold: e.target.value })}
                    placeholder="e.g. 50"
                    className="w-full h-12 bg-neutral-50 border border-neutral-200 rounded-xl px-4 text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition-all"
                  />
                </div>
              </div>

              {formData.is_child_sticker && (
                <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 text-xs text-[#6A0FAD] font-medium">
                  Parent: <strong>Sticker</strong>. Initial stock will be 0. Replenish stock via Stock Management.
                </div>
              )}

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-6 py-3 rounded-xl text-sm font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-colors"
                >
                  Cancel
                </button>
                <ProbaeButton type="submit" disabled={isSubmitting} className="px-8">
                  {isSubmitting ? (
                    <span className="flex items-center gap-2"><BowlLoader className="w-4 h-4" /> Saving...</span>
                  ) : (
                    "Save Item"
                  )}
                </ProbaeButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
