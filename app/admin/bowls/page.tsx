"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  Coffee,
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
import { Bowl } from "@/lib/types";
import { ConfirmationModal } from "@/components/ConfirmationModal";

export default function BowlsListPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [bowls, setBowls] = useState<Bowl[]>([]);
  const [totalBowls, setTotalBowls] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Bowl | null>(null);
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

  const fetchBowls = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await endpoints.bowls.getBowls(page, pageSize, debouncedSearch);
      setBowls(data.items || []);
      setTotalBowls(data.total || 0);
    } catch (error: any) {
      console.error("Error loading bowls:", error);
      showToast(error.message || "Failed to load bowls", "error");
    } finally {
      setIsLoading(false);
    }
  }, [user, page, pageSize, debouncedSearch]);

  useEffect(() => {
    fetchBowls();
  }, [fetchBowls]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const totalPages = Math.ceil(totalBowls / pageSize);

  const handleDelete = (item: Bowl, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await endpoints.bowls.deleteBowl(itemToDelete.ulid);
      showToast(`Bowl "${itemToDelete.name}" deleted successfully`, "success");
      fetchBowls();
    } catch (error: any) {
      console.error("Error deleting bowl:", error);
      showToast(error.message || "Failed to delete bowl", "error");
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
          <span>Bowls</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-neutral-800 font-bold">Bowl List</span>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden p-1 sm:p-2">
          <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-center shrink-0">
            <ProbaeSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search bowls..."
            />
            <ProbaeButton onClick={() => router.push("/admin/bowls/builder/add")} className="w-full sm:w-auto px-8 shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              Add Bowl
            </ProbaeButton>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 pb-6 scrollbar-thin">
            {isLoading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-[#7c3aed] animate-spin" />
                <span className="text-neutral-500 text-sm font-medium">Loading bowls...</span>
              </div>
            ) : bowls.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center bg-white border border-neutral-100 rounded-[32px] p-8 text-center max-w-lg mx-auto shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-400 mb-4">
                  <Coffee className="w-8 h-8" />
                </div>
                <h3 className="text-neutral-800 font-bold text-lg">No bowls found</h3>
                <p className="text-neutral-500 text-sm mt-2 max-w-sm">
                  {debouncedSearch 
                    ? `No results match your search "${debouncedSearch}".` 
                    : "No bowls are available. Click 'Add Bowl' to create one."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {bowls.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => router.push(`/admin/bowls/builder/${item.ulid}`)}
                    className="bg-white rounded-[24px] p-6 shadow-sm border border-neutral-100/50 flex flex-col gap-4 relative group cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                          <Coffee className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-[18px] font-bold text-[#111111] leading-tight">{item.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 uppercase tracking-wide">
                              {item.bowl_type}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${item.status ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
                              {item.status ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/admin/bowls/builder/${item.ulid}`); }}
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
                    
                    <div className="pt-4 border-t border-neutral-100 grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Raw Cost</span>
                        <span className="text-sm font-bold text-neutral-800">₹{item.raw_cost}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Total Cost</span>
                        <span className="text-lg font-black text-[#7c3aed]">₹{item.total_cost}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 py-4 shrink-0 border-t border-neutral-200">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="w-10 h-10 rounded-full border border-neutral-200 bg-white flex items-center justify-center text-neutral-600 hover:border-[#7c3aed] hover:text-[#7c3aed] disabled:opacity-50 transition-colors shadow-sm"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wide">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="w-10 h-10 rounded-full border border-neutral-200 bg-white flex items-center justify-center text-neutral-600 hover:border-[#7c3aed] hover:text-[#7c3aed] disabled:opacity-50 transition-colors shadow-sm"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Bowl"
        message={itemToDelete ? <>Are you sure you want to delete <span className="font-semibold text-white">{itemToDelete.name}</span>?</> : "Are you sure?"}
        confirmText="Delete"
        type="delete"
        isLoading={isDeleting}
      />
    </div>
  );
}
