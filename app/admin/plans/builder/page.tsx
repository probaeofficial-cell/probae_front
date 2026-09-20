"use client";

import { useState, useEffect, useCallback } from "react";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { Header } from "@/components/admin/Header";
import { Plus, Search, Edit2, Trash2, Copy, Eye, X } from "lucide-react";
import { BowlLoader } from "@/components/admin/BowlLoader";
import { ProbaeSearch } from "@/components/admin/ProbaeSearch";
import { endpoints } from "@/lib/apiService";
import { ProbaeButton } from "@/components/ProbaeButton";
import { useRouter } from "next/navigation";
import { ConfirmationModal } from "@/components/ConfirmationModal";

export default function PlanTierList() {
  const router = useRouter();
  const [tiers, setTiers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalTiers, setTotalTiers] = useState(0);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  const [filterCategory, setFilterCategory] = useState("");
  const [filterDuration, setFilterDuration] = useState("");

  const [previewTier, setPreviewTier] = useState<any>(null);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [isLoadingSubscribers, setIsLoadingSubscribers] = useState(false);

  useEffect(() => {
    setIsTyping(true);
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
      setIsTyping(false);
    }, 1000);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Modal states
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: "success" | "warning" | "error" | "info" | "delete";
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ isOpen: false, type: "info", title: "", message: "" });

  const fetchTiers = useCallback(async () => {
    if (page === 1) {
      setIsLoading(true);
    } else {
      setIsFetchingNextPage(true);
    }
    
    try {
      const res: any = await endpoints.planTiers.list({
        page,
        limit: pageSize,
        search: debouncedSearch,
        category: filterCategory,
        duration: filterDuration
      });
      if (res.success) {
        setTiers(prev => {
          const newItems = res.tiers || [];
          if (page === 1) return newItems;
          const existingIds = new Set(prev.map(item => item._id));
          const uniqueNewItems = newItems.filter((item: any) => !existingIds.has(item._id));
          return [...prev, ...uniqueNewItems];
        });
        setTotalTiers(res.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsFetchingNextPage(false);
    }
  }, [page, pageSize, debouncedSearch, filterCategory, filterDuration]);

  useEffect(() => {
    fetchTiers();
  }, [fetchTiers]);

  useEffect(() => {
    setPage(1);
  }, [filterCategory, filterDuration]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom = Math.abs(e.currentTarget.scrollHeight - e.currentTarget.scrollTop - e.currentTarget.clientHeight) < 2;
    if (bottom && !isLoading && !isFetchingNextPage && (page * pageSize < totalTiers)) {
      setPage(prev => prev + 1);
    }
  };

  const handleEdit = (tier: any) => {
    router.push(`/admin/plans/builder/${tier._id}`);
  };

  const handleDuplicate = (tier: any) => {
    sessionStorage.setItem('duplicate_tier', JSON.stringify(tier));
    router.push("/admin/plans/builder/new");
  };

  const handlePreview = async (tier: any) => {
    setPreviewTier(tier);
    setIsLoadingSubscribers(true);
    setSubscribers([]);
    try {
      const res: any = await endpoints.customers.list({ plan_id: tier._id, limit: 50 });
      if (res && res.items) {
        setSubscribers(res.items);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingSubscribers(false);
    }
  };

  const handleDelete = (ulid: string) => {
    setModalState({
      isOpen: true,
      type: "delete",
      title: "Delete Plan Tier",
      message: "Are you sure you want to delete this plan tier? This action cannot be undone.",
      onConfirm: async () => {
        try {
          await endpoints.planTiers.delete(ulid);
          fetchTiers();
          setModalState(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          console.error(err);
          setModalState({
            isOpen: true,
            type: "error",
            title: "Error",
            message: "Failed to delete plan tier.",
            onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false }))
          });
        }
      }
    });
  };


  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        <Header />
        
        <div className="mt-4 flex flex-col flex-1 min-h-0">
          <Breadcrumbs segments={["Plans", "Plan Tiers"]} />
          
          <div className="flex items-center justify-between mb-8 shrink-0">
            <div>
              <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Plan Tiers</h1>
              <p className="text-sm font-medium text-neutral-500 mt-1">Manage subscription packages and rules</p>
            </div>
            <ProbaeButton 
              onClick={() => router.push("/admin/plans/builder/new")} 
              className="!w-auto flex items-center gap-2 h-[48px]"
            >
              <Plus className="w-4 h-4" /> Create New Tier
            </ProbaeButton>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-center shrink-0 bg-white p-4 rounded-3xl border border-neutral-200">
            <ProbaeSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search plan tiers..."
              isLoading={isTyping || isLoading}
              hideSort={true}
              hideFilter={true}
            />
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm font-bold rounded-xl px-4 py-2.5 h-[44px] focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD] flex-1 sm:w-40"
              >
                <option value="">All Categories</option>
                <option value="Core">Core</option>
                <option value="Pro">Pro</option>
                <option value="Performance">Performance</option>
              </select>

              <select
                value={filterDuration}
                onChange={(e) => setFilterDuration(e.target.value)}
                className="bg-neutral-50 border border-neutral-200 text-neutral-900 text-sm font-bold rounded-xl px-4 py-2.5 h-[44px] focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD] flex-1 sm:w-40"
              >
                <option value="">All Durations</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col flex-1 min-h-0 bg-white border border-neutral-200 rounded-3xl overflow-hidden">
            {!isLoading && totalTiers > 0 && (
              <div className="px-6 py-3 border-b border-neutral-100 bg-neutral-50/50 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                Showing {tiers.length} of {totalTiers} Tiers
              </div>
            )}
            
            <div className="flex-1 overflow-auto scrollbar-thin" onScroll={handleScroll}>
              <table className="w-full text-left border-collapse">
                <thead className="bg-white sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase">Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase">Category</th>
                    <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase">Type</th>
                    <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase">Duration & Days</th>
                    <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="p-16">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <BowlLoader className="w-8 h-8 text-[#6A0FAD]" />
                          <span className="text-neutral-500 text-sm font-medium">Loading plan tiers...</span>
                        </div>
                      </td>
                    </tr>
                  ) : tiers.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-neutral-400 font-medium">No tiers found.</td></tr>
                  ) : (
                    tiers.map(t => (
                      <tr key={t._id} className="hover:bg-neutral-50 transition-colors group">
                        <td className="px-6 py-4 font-bold text-neutral-900">{t.name}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-neutral-100 text-neutral-600 rounded-full text-xs font-bold">{t.category}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${t.plan_type === 'CUSTOM' ? 'bg-[#6A0FAD]/10 text-[#6A0FAD]' : 'bg-blue-50 text-blue-600'}`}>
                            {t.plan_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-neutral-600">
                          {t.duration} • {t.days} Days
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => handlePreview(t)} title="Preview & Subscribers" className="p-2 text-neutral-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDuplicate(t)} title="Duplicate" className="p-2 text-neutral-400 hover:text-green-500 hover:bg-green-50 rounded-xl transition-colors">
                              <Copy className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleEdit(t)} title="Edit" className="p-2 text-neutral-400 hover:text-[#6A0FAD] hover:bg-[#6A0FAD]/10 rounded-xl transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(t._id)} title="Delete" className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                  {isFetchingNextPage && (
                    <tr>
                      <td colSpan={5} className="p-6">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <BowlLoader className="w-6 h-6 text-[#6A0FAD]" />
                          <span className="text-neutral-500 text-xs font-medium">Loading more tiers...</span>
                        </div>
                      </td>
                    </tr>
                  )}

                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      <ConfirmationModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={modalState.onConfirm || (() => setModalState(prev => ({ ...prev, isOpen: false })))}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
      />

      {previewTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
              <div>
                <h2 className="text-xl font-black text-neutral-900">{previewTier.name}</h2>
                <p className="text-sm font-medium text-neutral-500">{previewTier.category} • {previewTier.duration} ({previewTier.days} Days)</p>
              </div>
              <button onClick={() => setPreviewTier(null)} className="p-2 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-900 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Plan Type</p>
                  <p className="font-bold text-neutral-900">{previewTier.plan_type}</p>
                </div>
                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Discount</p>
                  <p className="font-bold text-neutral-900">{previewTier.discount_percentage}%</p>
                </div>
                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 col-span-2">
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Included Meals</p>
                  <div className="flex gap-2 mt-2">
                    {previewTier.included_meal_slots?.map((slot: string) => (
                      <span key={slot} className="px-3 py-1 bg-[#6A0FAD]/10 text-[#6A0FAD] text-xs font-bold rounded-full">{slot.toUpperCase()}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-4 border-b pb-2">Subscribers ({subscribers.length})</h3>
                {isLoadingSubscribers ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-8">
                    <BowlLoader className="w-6 h-6 text-[#6A0FAD]" />
                    <span className="text-neutral-500 text-sm font-medium">Loading subscribers...</span>
                  </div>
                ) : subscribers.length === 0 ? (
                  <p className="text-sm font-medium text-neutral-400">No active subscribers for this plan.</p>
                ) : (
                  <div className="space-y-3">
                    {subscribers.map(sub => (
                      <div key={sub._id} className="flex justify-between items-center p-3 rounded-xl border border-neutral-100 hover:bg-neutral-50">
                        <div>
                          <p className="font-bold text-neutral-900">{sub.name}</p>
                          <p className="text-xs font-medium text-neutral-500">{sub.phone}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${sub.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600'}`}>
                          {sub.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
