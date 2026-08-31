"use client";
import { BowlLoader } from "@/components/admin/BowlLoader";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  Package,
  AlertTriangle,
  CheckCircle2,
  Pencil,
  Trash2,
  Box,
  Plus,
  X,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { Header } from "@/components/admin/Header";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { ProbaeSearch } from "@/components/admin/ProbaeSearch";
import { endpoints } from "@/lib/apiService";
import { PackagingComponent } from "@/lib/types";
import { ConfirmationModal } from "@/components/ConfirmationModal";

export default function PackagingComponentsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // ─── State Variables ───────────────────────────────────────────────────────
  const [components, setComponents] = useState<PackagingComponent[]>([]);
  const [totalComponents, setTotalComponents] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  // Notifications State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modal State for Delete
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<PackagingComponent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal State for Add/Edit
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PackagingComponent | null>(null);
  const [formData, setFormData] = useState({ name: "", cost: "" });
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
    }, 800);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchComponents = useCallback(async () => {
    if (!user) return;
        if (page === 1) {
      setIsLoading(true);
    } else {
      setIsFetchingNextPage(true);
      await new Promise(r => setTimeout(r, 2000));
    }
    try {
      const data = await endpoints.packagingComponents.getComponents(page, pageSize, debouncedSearch);
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
  }, [user, page, pageSize, debouncedSearch]);

  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const totalPages = Math.ceil(totalComponents / pageSize);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom = Math.abs(e.currentTarget.scrollHeight - e.currentTarget.scrollTop - e.currentTarget.clientHeight) < 2;
    if (bottom && !isLoading && !isFetchingNextPage && page < totalPages) {
      setPage(prev => prev + 1);
    }
  };

  // ─── Delete Handlers ───────────────────────────────────────────────────────
  const handleDelete = (item: PackagingComponent) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await endpoints.packagingComponents.deleteComponent(itemToDelete.ulid);
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
  const openAddModal = () => {
    setEditingItem(null);
    setFormData({ name: "", cost: "" });
    setIsFormModalOpen(true);
  };

  const openEditModal = (item: PackagingComponent) => {
    setEditingItem(item);
    setFormData({ name: item.name, cost: String(item.cost) });
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.cost) return;

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await endpoints.packagingComponents.updateComponent(editingItem.ulid, {
          name: formData.name,
          cost: parseFloat(formData.cost)
        });
        showToast("Packaging component updated successfully", "success");
      } else {
        await endpoints.packagingComponents.createComponent({
          name: formData.name,
          cost: parseFloat(formData.cost)
        });
        showToast("Packaging component created successfully", "success");
      }
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
          <span className="text-neutral-800 font-bold">Items</span>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden p-1 sm:p-2">
          <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-center shrink-0">
            <ProbaeSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search items by name..."
             isLoading={isLoading} />
            <Link href="/admin/packaging/components/stock">
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#6A0FAD]/10 text-[#6A0FAD] font-bold text-sm hover:bg-[#6A0FAD]/20 transition-colors shrink-0">
                <BarChart3 className="w-4 h-4" />
                Stock Management
              </button>
            </Link>
            <ProbaeButton onClick={openAddModal} className="w-full sm:w-auto px-8 shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </ProbaeButton>
          </div>

          {!isLoading && totalComponents > 0 && (
            <div className="text-xs text-neutral-400 font-medium px-2 mb-3 mt-[-12px]">
              Showing {components.length} of {totalComponents}
            </div>
          )}
          <div className="flex-1 overflow-y-auto pr-2 pb-6 scrollbar-thin" onScroll={handleScroll}>
            {isLoading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3">
                <BowlLoader className="w-8 h-8 text-[#7c3aed] animate-spin" />
                <span className="text-neutral-500 text-sm font-medium">Loading items...</span>
              </div>
            ) : components.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center bg-white border border-neutral-100 rounded-[32px] p-8 text-center max-w-lg mx-auto shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-400 mb-4">
                  <Box className="w-8 h-8" />
                </div>
                <h3 className="text-neutral-800 font-bold text-lg">No items found</h3>
                <p className="text-neutral-500 text-sm mt-2 max-w-sm">
                  {debouncedSearch 
                    ? `No results match your search "${debouncedSearch}".` 
                    : "No packaging items are available. Click 'Add Item' to create one."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {components.map((item) => (
                  <div key={item.id} className="bg-white rounded-[24px] p-5 shadow-sm border border-neutral-100 flex justify-between items-center hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                        <Box className="w-6 h-6" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-neutral-800 text-lg leading-tight">{item.name}</span>
                        <span className="text-sm text-neutral-500 font-medium">₹{item.cost}</span>
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
            )}
            {isFetchingNextPage && (
              <div className="py-6 flex justify-center items-center w-full">
                <BowlLoader className="w-6 h-6 text-[#7c3aed] animate-spin" />
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
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Item"
        message={itemToDelete ? <>Are you sure you want to delete <span className="font-semibold text-white">{itemToDelete.name}</span>?</> : "Are you sure?"}
        confirmText="Delete"
        type="delete"
        isLoading={isDeleting}
      />

      {/* Form Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
              <h2 className="text-xl font-bold text-neutral-800">
                {editingItem ? "Edit Item" : "Add Item"}
              </h2>
              <button onClick={() => setIsFormModalOpen(false)} className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-neutral-700 ml-1">Item Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Medium Bowl Base"
                  className="w-full h-12 bg-neutral-50 border border-neutral-200 rounded-xl px-4 text-sm font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition-all"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-neutral-700 ml-1">Cost (₹)</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  placeholder="e.g. 15.50"
                  className="w-full h-12 bg-neutral-50 border border-neutral-200 rounded-xl px-4 text-sm font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition-all"
                />
              </div>

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
                    <span className="flex items-center gap-2"><BowlLoader className="w-4 h-4 animate-spin" /> Saving...</span>
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
