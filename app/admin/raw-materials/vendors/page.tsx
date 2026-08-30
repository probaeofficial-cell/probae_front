"use client";
import { BowlLoader } from "@/components/admin/BowlLoader";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  Building2
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { endpoints } from "@/lib/apiService";
import { Vendor } from "@/lib/types";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { ProbaeSearch } from "@/components/admin/ProbaeSearch";

export default function VendorsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // ─── State Variables ───────────────────────────────────────────────────────
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [totalVendors, setTotalVendors] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sort, setSort] = useState("A to Z");

  const handleSortClick = () => {
    const nextSort = sort === "A to Z" ? "Z to A" : sort === "Z to A" ? "Newest" : sort === "Newest" ? "Oldest" : "A to Z";
    setSort(nextSort);
    setPage(1);
  };

  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<{ ulid: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formState, setFormState] = useState({
    name: "",
    description: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [editingUlid, setEditingUlid] = useState<string | null>(null);

  // Notifications State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // ─── Side Effects ──────────────────────────────────────────────────────────
  useEffect(() => {
    setIsTyping(true);
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
      setIsTyping(false);
    }, 1000);
return () => clearTimeout(handler);
  }, [searchQuery]);// Load Vendors
  const fetchVendors = useCallback(async () => {
    if (!user) return;
    try {
          if (page === 1) {
      setIsLoading(true);
    } else {
      setIsFetchingNextPage(true);
      await new Promise(r => setTimeout(r, 2000));
    }
      const data = await endpoints.vendors.getVendors(page, pageSize, debouncedSearch, sort);
      setVendors(prev => {
        const newItems = data.items || [];
        if (page === 1) return newItems;
        const existingIds = new Set(prev.map((item: any) => item.id || item.ulid));
        const uniqueNewItems = newItems.filter((item: any) => !existingIds.has(item.id || item.ulid));
        return [...prev, ...uniqueNewItems];
      });
      setTotalVendors(data.total);
    } catch (error: any) {
      console.error("Error fetching vendors:", error);
      showToast(error.message || "Failed to fetch vendors", "error");
    } finally {
      setIsLoading(false);
      setIsFetchingNextPage(false);
    }
  }, [user, page, pageSize, debouncedSearch, sort]);

  useEffect(() => {
    if (user) {
      fetchVendors();
    }
  }, [fetchVendors, user]);

  // ─── Toast Helper ─────────────────────────────────────────────────────────
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };// ─── Actions ───────────────────────────────────────────────────────────────
  const openAddModal = () => {
    setModalMode("add");
    setEditingUlid(null);
    setFormState({
      name: "",
      description: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (vendor: Vendor, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalMode("edit");
    setEditingUlid(vendor.ulid);
    setFormState({
      name: vendor.name,
      description: vendor.description || "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name.trim()) {
      showToast("Name is required", "error");
      return;
    }

    setIsSaving(true);
    
    const payload = {
      name: formState.name,
      description: formState.description || null,
    };

    try {
      if (modalMode === "add") {
        await endpoints.vendors.createVendor(payload);
        showToast("Vendor created successfully", "success");
      } else if (editingUlid) {
        await endpoints.vendors.updateVendor(editingUlid, payload);
        showToast("Vendor updated successfully", "success");
      }
      setIsModalOpen(false);
      fetchVendors();
    } catch (error: any) {
      console.error("Save error:", error);
      showToast(error.detail || error.message || "Failed to save vendor", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteVendor = (ulid: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setVendorToDelete({ ulid, name });
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!vendorToDelete) return;
    setIsDeleting(true);
    try {
      await endpoints.vendors.deleteVendor(vendorToDelete.ulid);
      showToast("Vendor deleted successfully", "success");
      setIsDeleteModalOpen(false);
      fetchVendors();
    } catch (error: any) {
      showToast(error.message || "Failed to delete vendor", "error");
    } finally {
      setIsDeleting(false);
      setVendorToDelete(null);
    }
  };

  // Pagination
  const totalPages = Math.ceil(totalVendors / pageSize);

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

  if (authLoading || (!user && isLoading)) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <BowlLoader className="w-8 h-8 text-[#7c26d9]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] animate-fade-in-up px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 text-sm font-semibold text-white ${
          toast.type === "success" ? "bg-black" : "bg-red-500"
        }`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Layout Area */}
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        <Header />
        
        <Breadcrumbs segments={["Admin", "Raw Materials", "Vendors"]} />
          
          {/* Main List Area */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-2xl pt-2 pb-6 px-6 sm:pt-2 sm:pb-8 sm:px-8">
            {/* Sub Header / Search Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-center shrink-0">
              <ProbaeSearch
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search vendors by name or code..."
               isLoading={isTyping || isLoading}  sortByText={sort} onSortClick={handleSortClick} />

              <ProbaeButton 
                onClick={openAddModal}
                className="w-full sm:w-auto px-8 shrink-0"
              >
                Add Vendor
              </ProbaeButton>
            </div>

            {/* Table Content Area */}
            {!isLoading && totalVendors > 0 && (
            <div className="text-xs text-neutral-400 font-medium px-2 mb-3 mt-[-12px]">
              Showing {vendors.length} of {totalVendors}
            </div>
          )}
          <div className="flex-1 overflow-auto pr-2 pb-6 scrollbar-thin rounded-2xl border border-neutral-100" onScroll={handleScroll}>
              {isLoading || isTyping ? (
                <div className="h-64 flex flex-col items-center justify-center gap-3">
                  <BowlLoader className="w-8 h-8 text-[#6b21a8]" />
                  <span className="text-neutral-500 text-sm font-medium">Loading vendors...</span>
                </div>
              ) : vendors.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center bg-white border border-neutral-100 rounded-3xl p-8 text-center max-w-lg mx-auto m-6">
                  <div className="w-16 h-16 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-400 mb-4">
                    <Building2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-neutral-800 font-bold text-lg">No vendors found</h3>
                  <p className="text-neutral-500 text-sm mt-2 max-w-sm">
                    {debouncedSearch 
                      ? `No results match your search "${debouncedSearch}". Try another query.` 
                      : "Get started by adding your first vendor."}
                  </p>
                  {!debouncedSearch && (
                    <div className="mt-6 w-[200px]">
                      <ProbaeButton onClick={openAddModal}>
                        Add Vendor
                      </ProbaeButton>
                    </div>
                  )}
                </div>
              ) : (
                <table className="w-full text-left text-sm text-neutral-600">
                  <thead className="text-xs uppercase bg-[#F3F4F6] text-neutral-500 sticky top-0 z-10 font-bold tracking-wider">
                    <tr>
                      <th className="px-6 py-4 rounded-tl-xl border-b border-neutral-200">Code</th>
                      <th className="px-6 py-4 border-b border-neutral-200">Name</th>
                      <th className="px-6 py-4 border-b border-neutral-200">Description</th>
                      <th className="px-6 py-4 border-b border-neutral-200">Created At</th>
                      <th className="px-6 py-4 rounded-tr-xl border-b border-neutral-200 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {vendors.map((vendor) => (
                      <tr 
                        key={vendor.id} 
                        className="hover:bg-neutral-50/50 transition-colors group"
                      >
                        <td className="px-6 py-4 font-medium text-neutral-900">
                          <span className="bg-neutral-100 text-neutral-700 px-2.5 py-1 rounded-md text-xs font-mono font-bold tracking-tight">
                            {vendor.code}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-neutral-800">
                          {vendor.name}
                        </td>
                        <td className="px-6 py-4 text-neutral-500 max-w-[200px] truncate" title={vendor.description || ""}>
                          {vendor.description || <span className="text-neutral-400 italic">No description</span>}
                        </td>
                        <td className="px-6 py-4 text-neutral-500 font-medium">
                          {new Date(vendor.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => openEditModal(vendor, e)}
                              className="w-8 h-8 rounded-full bg-white border border-neutral-200 text-neutral-600 hover:text-black hover:border-black flex items-center justify-center shadow-sm cursor-pointer transition-all shrink-0"
                              title="Edit Vendor"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteVendor(vendor.ulid, vendor.name, e)}
                              className="w-8 h-8 rounded-full bg-white border border-neutral-200 text-red-500 hover:text-white hover:bg-red-500 hover:border-red-500 flex items-center justify-center shadow-sm cursor-pointer transition-all shrink-0"
                              title="Delete Vendor"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

      {/* ─── Add/Edit Modal ─────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div 
            className="bg-white rounded-[40px] max-w-md w-full p-8 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-neutral-100 flex flex-col gap-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Title */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-extrabold text-neutral-800">
                {modalMode === "add" ? "Add Vendor" : "Edit Vendor"}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-800 transition-colors p-1 hover:bg-neutral-50 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide">
                  Vendor Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Farms"
                  value={formState.name}
                  onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full bg-neutral-100/70 border border-transparent focus:border-neutral-200 focus:bg-white rounded-2xl px-4 py-3.5 text-sm text-neutral-800 focus:outline-none transition-all placeholder:text-neutral-400 font-medium"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide">
                  Description <span className="text-neutral-400 font-normal normal-case">(Optional)</span>
                </label>
                <textarea
                  placeholder="Vendor details, contact info, etc..."
                  value={formState.description}
                  onChange={(e) => setFormState(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full bg-neutral-100/70 border border-transparent focus:border-neutral-200 focus:bg-white rounded-2xl px-4 py-3.5 text-sm text-neutral-800 focus:outline-none transition-all placeholder:text-neutral-400 resize-none font-medium"
                />
              </div>

              {/* Footer buttons */}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-600 hover:text-black py-2.5 px-6 rounded-2xl text-sm font-bold transition-all shadow-sm cursor-pointer"
                >
                  Cancel
                </button>
                <ProbaeButton 
                  type="submit" 
                  disabled={isSaving}
                  className="rounded-2xl px-6 py-2.5"
                >
                  {isSaving ? (
                    <div className="flex items-center gap-2">
                      <BowlLoader className="w-4 h-4" /> Saving...
                    </div>
                  ) : (
                    modalMode === "add" ? "Add Vendor" : "Save Changes"
                  )}
                </ProbaeButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─────────────────────────── */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Vendor"
        message={
          <>
            Are you sure you want to delete the vendor <strong>{vendorToDelete?.name}</strong>? 
            Raw materials assigned to this vendor will have their vendor removed. This action cannot be undone.
          </>
        }
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        type="delete"
        isLoading={isDeleting}
      />
    </div>
  );
}
