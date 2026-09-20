"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { endpoints } from "@/lib/apiService";
import { Search, Loader2, Users, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ProbaeSearch } from "@/components/admin/ProbaeSearch";
import { AssignAffiliateModal } from "@/components/admin/AssignAffiliateModal";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { Plus } from "lucide-react";

export default function AffiliatesPage() {
  const router = useRouter();
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchAffiliates = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await endpoints.customers.list({ page: pageNum, limit: 10, is_affiliate: true, search });
      const data = res as any;
      if (data.success) {
        setAffiliates(data.customers || []);
        setTotalPages(Math.ceil(data.totalCount / data.limit) || 1);
      }
    } catch (error) {
      console.error("Failed to fetch affiliates", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1);
      fetchAffiliates(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    if (page > 1) {
      fetchAffiliates(page);
    }
  }, [page]);

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        <Header />
        <Breadcrumbs segments={["Admin", "Affiliates"]} />
        
        <div className="mt-4 flex-1 flex flex-col min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 shrink-0">
            <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm flex flex-col justify-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-neutral-500">Total Active Affiliates</p>
                  <p className="text-3xl font-black text-neutral-900">{affiliates.length}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 shrink-0">
            <ProbaeSearch
              value={search}
              onChange={setSearch}
              placeholder="Search affiliates by name or phone..."
              isLoading={loading}
            />
            <ProbaeButton onClick={() => setIsModalOpen(true)} className="!w-auto flex items-center gap-2">
              <Plus className="w-4 h-4" /> Assign Affiliate
            </ProbaeButton>
          </div>

          <div className="flex-1 overflow-x-auto min-h-0 bg-white rounded-2xl border border-neutral-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 bg-[#F3F4F6]">
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap first:rounded-tl-2xl">Affiliate Name & Email</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap text-center">Total Referrals</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap text-right last:rounded-tr-2xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {loading && affiliates.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-[#6A0FAD] mx-auto" />
                    </td>
                  </tr>
                ) : affiliates.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-neutral-500 font-medium text-sm">
                      No affiliates found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  affiliates.map((aff) => (
                    <tr key={aff.ulid} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-neutral-900">{aff.name}</span>
                          <span className="text-xs text-neutral-500">{aff.email || aff.phone}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          aff.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-800'
                        }`}>
                          {aff.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="inline-flex items-center justify-center min-w-[32px] h-8 px-2 rounded-full bg-purple-100 text-purple-700 font-bold text-sm">
                          {aff.referral_count || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => router.push(`/admin/customers/${aff.ulid}`)}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between shrink-0 mt-6">
            <span className="text-sm text-neutral-500 font-medium">Page {page} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-[#f8f5fb] text-neutral-600 hover:bg-[#f1edf7] disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-[#f8f5fb] text-neutral-600 hover:bg-[#f1edf7] disabled:opacity-50 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
      <AssignAffiliateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchAffiliates(1)}
      />
    </div>
  );
}
