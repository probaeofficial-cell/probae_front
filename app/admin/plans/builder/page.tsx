"use client";

import { useState, useEffect } from "react";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { Header } from "@/components/admin/Header";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import { endpoints } from "@/lib/apiService";
import { ProbaeButton } from "@/components/ProbaeButton";
import { useRouter } from "next/navigation";
import { ConfirmationModal } from "@/components/ConfirmationModal";

export default function PlanTierList() {
  const router = useRouter();
  const [tiers, setTiers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal states
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: "success" | "warning" | "error" | "info" | "delete";
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ isOpen: false, type: "info", title: "", message: "" });

  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    setIsLoading(true);
    try {
      const res: any = await endpoints.planTiers.list({ limit: 100 });
      if (res.success) {
        setTiers(res.tiers);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (tier: any) => {
    router.push(`/admin/plans/builder/${tier._id}`);
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

  const filteredTiers = tiers.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

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

          <div className="flex flex-col flex-1 min-h-0 bg-white border border-neutral-200 rounded-3xl overflow-hidden">
            <div className="p-4 border-b border-neutral-200 bg-neutral-50/50 flex justify-between items-center shrink-0">
              <div className="relative w-72">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search tiers..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-auto">
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
                    <tr><td colSpan={5} className="p-8 text-center text-neutral-400 font-medium">Loading tiers...</td></tr>
                  ) : filteredTiers.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-neutral-400 font-medium">No tiers found.</td></tr>
                  ) : (
                    filteredTiers.map(t => (
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
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleEdit(t)} className="p-2 text-neutral-400 hover:text-[#6A0FAD] hover:bg-[#6A0FAD]/10 rounded-xl transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(t._id)} className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
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
    </div>
  );
}
