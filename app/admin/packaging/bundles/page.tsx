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
  Plus
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Header } from "@/components/admin/Header";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { ProbaeSearch } from "@/components/admin/ProbaeSearch";
import { endpoints } from "@/lib/apiService";
import { Packaging } from "@/lib/types";
import { ConfirmationModal } from "@/components/ConfirmationModal";

export default function PackagingBundlesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [bundles, setBundles] = useState<Packaging[]>([]);
  const [totalBundles, setTotalBundles] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Packaging | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const fetchBundles = useCallback(async () => {
    if (!user) return;
        if (page === 1) {
      setIsLoading(true);
    } else {
      setIsFetchingNextPage(true);
      await new Promise(r => setTimeout(r, 2000));
    }
    try {
      const data = await endpoints.packaging.getBundles(page, pageSize, debouncedSearch);
      setBundles(prev => {
        const newItems = data.items || [];
        if (page === 1) return newItems;
        const existingIds = new Set(prev.map((item: any) => item.id || item.ulid));
        const uniqueNewItems = newItems.filter((item: any) => !existingIds.has(item.id || item.ulid));
        return [...prev, ...uniqueNewItems];
      });
      setTotalBundles(data.total || 0);
    } catch (error: any) {
      console.error("Error loading packaging bundles:", error);
      showToast(error.message || "Failed to load packaging bundles", "error");
    } finally {
      setIsLoading(false);
      setIsFetchingNextPage(false);
    }
  }, [user, page, pageSize, debouncedSearch]);

  useEffect(() => {
    fetchBundles();
  }, [fetchBundles]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const totalPages = Math.ceil(totalBundles / pageSize);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom = Math.abs(e.currentTarget.scrollHeight - e.currentTarget.scrollTop - e.currentTarget.clientHeight) < 2;
    if (bottom && !isLoading && !isFetchingNextPage && page < totalPages) {
      setPage(prev => prev + 1);
    }
  };

  const handleDelete = (item: Packaging, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await endpoints.packaging.deleteBundle(itemToDelete.ulid);
      showToast(`Packaging Set "${itemToDelete.name}" deleted successfully`, "success");
      fetchBundles();
    } catch (error: any) {
      console.error("Error deleting packaging bundle:", error);
      showToast(error.message || "Failed to delete bundle", "error");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
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
          <span className="text-neutral-800 font-bold">Packaging Sets</span>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden p-1 sm:p-2">
          <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-center shrink-0">
            <ProbaeSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search packaging sets..."
             isLoading={isLoading} />
            <ProbaeButton onClick={() => router.push("/admin/packaging/bundles/add")} className="w-full sm:w-auto px-8 shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              Add Packaging Set
            </ProbaeButton>
          </div>

          {!isLoading && totalBundles > 0 && (
            <div className="text-xs text-neutral-400 font-medium px-2 mb-3 mt-[-12px]">
              Showing {bundles.length} of {totalBundles}
            </div>
          )}
          <div className="flex-1 overflow-y-auto pr-2 pb-6 scrollbar-thin" onScroll={handleScroll}>
            {isLoading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3">
                <BowlLoader className="w-8 h-8 text-[#7c3aed] animate-spin" />
                <span className="text-neutral-500 text-sm font-medium">Loading packaging sets...</span>
              </div>
            ) : bundles.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center bg-white border border-neutral-100 rounded-[32px] p-8 text-center max-w-lg mx-auto shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-400 mb-4">
                  <Package className="w-8 h-8" />
                </div>
                <h3 className="text-neutral-800 font-bold text-lg">No packaging sets found</h3>
                <p className="text-neutral-500 text-sm mt-2 max-w-sm">
                  {debouncedSearch 
                    ? `No results match your search "${debouncedSearch}".` 
                    : "No packaging sets are available. Click 'Add Packaging Set' to create one."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {bundles.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => router.push(`/admin/packaging/bundles/${item.ulid}`)}
                    className="bg-white rounded-[24px] p-6 shadow-sm border border-neutral-100/50 flex flex-col gap-4 relative group cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-[18px] font-bold text-[#111111] leading-tight">{item.name}</h3>
                            {item.code && (
                              <span className="px-2 py-0.5 bg-neutral-100 text-neutral-600 text-[10px] font-bold rounded-full">
                                {item.code}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-500 font-medium">{item.components.length} Components</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/admin/packaging/bundles/${item.ulid}`); }}
                          className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 flex items-center justify-center shadow-sm transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(item, e)}
                          className="w-8 h-8 rounded-full bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center shadow-sm transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 bg-neutral-50 rounded-xl p-3">
                      {item.components.slice(0, 3).map((link, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <span className="text-neutral-700">{link.component.name}</span>
                          <span className="font-semibold text-neutral-900">x{link.quantity}</span>
                        </div>
                      ))}
                      {item.components.length > 3 && (
                        <div className="text-xs text-neutral-500 text-center font-medium mt-1">
                          +{item.components.length - 3} more...
                        </div>
                      )}
                    </div>
                    
                    <div className="pt-2 flex justify-between items-center border-t border-neutral-100">
                      <span className="text-sm font-semibold text-neutral-500">Total Cost</span>
                      <span className="text-lg font-bold text-[#7c3aed]">₹{item.total_cost}</span>
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
        title="Delete Packaging Set"
        message={itemToDelete ? <>Are you sure you want to delete <span className="font-semibold text-white">{itemToDelete.name}</span>? This might affect bowls using this packaging.</> : "Are you sure?"}
        confirmText="Delete"
        type="delete"
        isLoading={isDeleting}
      />
    </div>
  );
}
