"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, ChevronLeft, ChevronRight, Eye, Edit, Trash2, Search, Copy } from "lucide-react";
import { Header } from "@/components/admin/Header";
import { ProbaeSearch } from "@/components/admin/ProbaeSearch";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { endpoints } from "@/lib/apiService";
import { useRouter } from "next/navigation";
import { ConfirmationModal } from "@/components/ConfirmationModal";

export default function PlansPage() {
  const router = useRouter();
  const [tiers, setTiers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isDuplicatingId, setIsDuplicatingId] = useState<string | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchTiers = useCallback(async (pageNum: number) => {
    setIsLoading(true);
    try {
      const data = await endpoints.planTiers.list({ page: pageNum, limit: 10, search: debouncedSearch }) as any;
      if (data.success) {
        setTiers(data.tiers);
        setTotalPages(Math.ceil(data.totalCount / data.limit) || 1);
      }
    } catch (error) {
      console.error("Failed to fetch tiers:", error);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchTiers(page);
  }, [fetchTiers, page]);

  const getTotalDeliveredDays = (duration: string, daysPerWeek: number) => {
    if (duration.toLowerCase() === "monthly") return (daysPerWeek * 4) + 2;
    return daysPerWeek;
  };

  const handleDelete = async () => {
    if (!isDeletingId) return;
    try {
      await endpoints.planTiers.delete(isDeletingId);
      setIsDeletingId(null);
      fetchTiers(page);
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleDuplicateConfirm = async () => {
    if (!isDuplicatingId) return;
    try {
      const tierToCopy = tiers.find(t => t.ulid === isDuplicatingId);
      if (!tierToCopy) return;
      
      const payload = {
        name: `${tierToCopy.name} (Copy)`,
        category: tierToCopy.category,
        duration: tierToCopy.duration,
        days: tierToCopy.days,
        mealType: tierToCopy.mealType,
        discountPrice: tierToCopy.discountPrice,
        totalPrice: tierToCopy.totalPrice,
        selections: tierToCopy.selections?.map((s: any) => ({
          type: s.type,
          bowls: s.bowls.map((b: any) => b.ulid || b._id || b.id).filter(Boolean)
        })) || []
      };
      
      await endpoints.planTiers.create(payload);
      fetchTiers(page);
    } catch (err) {
      console.error("Failed to duplicate tier", err);
    } finally {
      setIsDuplicatingId(null);
    }
  };

  return (
    <div
      className="flex flex-col flex-1 h-full bg-[#E6E6E6]"
    >
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        <Header />
        <Breadcrumbs segments={["Admin", "Plan Tiers"]} />
        <div className="mt-4 flex-1 flex flex-col min-h-0">
        
        <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-center shrink-0">
          <ProbaeSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search plans..."
          />
          <ProbaeButton onClick={() => router.push("/admin/plans/builder/new")} className="w-full sm:w-auto shrink-0">
            <Plus className="w-4 h-4 mr-2" />
            Create Plan
          </ProbaeButton>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-2xl pt-2 pb-6 px-6 sm:pt-2 sm:pb-8 sm:px-8">
          <div className="flex-1 overflow-auto bg-white rounded-2xl border border-neutral-100 shadow-sm">
          <table className="w-full text-left text-sm text-neutral-600">
            <thead className="text-xs uppercase bg-[#F3F4F6] text-neutral-500 sticky top-0 z-10 font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4 rounded-tl-xl border-b border-neutral-200">Plan Name</th>
                <th className="px-6 py-4 border-b border-neutral-200">Category</th>
                <th className="px-6 py-4 border-b border-neutral-200">Duration / Days</th>
                <th className="px-6 py-4 border-b border-neutral-200">Meal Type</th>
                <th className="px-6 py-4 border-b border-neutral-200">Price</th>
                <th className="px-6 py-4 rounded-tr-xl border-b border-neutral-200 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-10">Loading plans...</td></tr>
              ) : tiers.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-neutral-400">No Plan Tiers found</td></tr>
              ) : (
                tiers.map((tier) => (
                  <tr key={tier.ulid} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-neutral-900">{tier.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 text-xs font-bold rounded-full bg-[#f8f5fb] text-[#6b21a8]">
                        {tier.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="capitalize font-medium text-neutral-800">{tier.duration.toLowerCase()}</span>
                        <span className="text-xs text-neutral-500">{getTotalDeliveredDays(tier.duration, tier.days)} Days</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {tier.mealType.split(" + ").map((m: string, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 bg-neutral-100 rounded text-[11px] font-bold text-neutral-600 whitespace-nowrap">
                            {m}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {tier.discountPrice > 0 ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-emerald-600">₹{tier.discountPrice.toFixed(2)}</span>
                          <span className="text-xs text-neutral-400 line-through">₹{tier.totalPrice?.toFixed(2)}</span>
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-neutral-900">₹{tier.totalPrice?.toFixed(2)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setIsDuplicatingId(tier.ulid); }}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-emerald-500 hover:bg-emerald-50 transition-colors"
                          title="Duplicate Tier"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/admin/plans/preview/${tier.ulid}`)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-[#6b21a8] hover:bg-[#6b21a8]/10 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/admin/plans/builder/${tier.ulid}`)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setIsDeletingId(tier.ulid)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between shrink-0">
          <span className="text-sm text-neutral-500 font-medium">Page {page} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-[#f8f5fb] text-neutral-600 hover:bg-[#f1edf7] disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isLoading}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-[#f8f5fb] text-neutral-600 hover:bg-[#f1edf7] disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <ConfirmationModal
        isOpen={!!isDuplicatingId}
        onClose={() => setIsDuplicatingId(null)}
        onConfirm={handleDuplicateConfirm}
        title="Duplicate Plan Tier"
        message="Are you sure you want to duplicate this plan tier? A new copy will be created with the same settings."
        type="info"
        confirmText="Duplicate"
      />
    </div>
      </div>

        </div>
      <ConfirmationModal
        isOpen={!!isDeletingId}
        onClose={() => setIsDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete Plan Tier"
        message="Are you sure you want to delete this plan tier? This action cannot be undone."
        type="delete"
      />
    </div>
      </div>
  );
}