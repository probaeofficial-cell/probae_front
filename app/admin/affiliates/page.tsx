"use client";

import { BowlLoader } from "@/components/admin/BowlLoader";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { endpoints } from "@/lib/apiService";
import {
  Users,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Eye,
  Plus,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Scale,
} from "lucide-react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ProbaeSearch } from "@/components/admin/ProbaeSearch";
import { AssignAffiliateModal } from "@/components/admin/AssignAffiliateModal";
import { AssignCustomerToAffiliateModal } from "@/components/admin/AssignCustomerToAffiliateModal";
import { AffiliatePreviewModal } from "@/components/admin/AffiliatePreviewModal";
import { ProbaeButton } from "@/components/admin/ProbaeButton";

export default function AffiliatesPage() {
  const router = useRouter();
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals state
  const [isAffiliateModalOpen, setIsAffiliateModalOpen] = useState(false);
  const [isAssignReferralModalOpen, setIsAssignReferralModalOpen] = useState(false);
  const [selectedAffiliateForReferral, setSelectedAffiliateForReferral] = useState<any>(null);

  const [previewAffiliateUlid, setPreviewAffiliateUlid] = useState<string | null>(null);

  const fetchAffiliates = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await endpoints.customers.list({
        page: pageNum,
        limit: 10,
        is_affiliate: true,
        search,
      });
      const data = res as any;
      if (data.success) {
        setAffiliates(data.customers || []);
        setTotalCount(data.totalCount || 0);
        setTotalPages(Math.ceil((data.totalCount || 0) / (data.limit || 10)) || 1);
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

  // Aggregate stats from current list
  const totalReferralsSum = affiliates.reduce((acc, a) => acc + (a.referral_count || 0), 0);
  const totalReceivedSum = affiliates.reduce((acc, a) => acc + (a.total_received || 0), 0);

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        <Header />
        <Breadcrumbs segments={["Admin", "Affiliates"]} />

        <div className="mt-4 flex-1 flex flex-col min-h-0">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 shrink-0">
            {/* 1. Total Affiliates */}
            <div className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 text-[#6A0FAD] rounded-2xl flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Active Affiliates</p>
                <p className="text-2xl font-black text-neutral-900">{totalCount || affiliates.length}</p>
              </div>
            </div>

            {/* 2. Total Referrals */}
            <div className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Referred Customers</p>
                <p className="text-2xl font-black text-neutral-900">{totalReferralsSum}</p>
              </div>
            </div>

            {/* 3. Total Received from Referrals */}
            <div className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 text-[#16A34A] rounded-2xl flex items-center justify-center shrink-0">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Total Received</p>
                <p className="text-2xl font-black text-[#16A34A]">
                  ₹{Number(totalReceivedSum).toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4 shrink-0">
            <ProbaeSearch
              value={search}
              onChange={setSearch}
              placeholder="Search affiliates by name, phone or email..."
              isLoading={loading}
            />

            <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
              <button
                onClick={() => {
                  setSelectedAffiliateForReferral(null);
                  setIsAssignReferralModalOpen(true);
                }}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-purple-200 bg-purple-50 text-[#6A0FAD] text-sm font-bold hover:bg-purple-100 transition-colors shadow-sm"
              >
                <UserPlus className="w-4 h-4" /> Assign Customer
              </button>

              <ProbaeButton
                onClick={() => setIsAffiliateModalOpen(true)}
                className="flex-1 md:flex-none !w-auto flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> New Affiliate
              </ProbaeButton>
            </div>
          </div>

          {/* Main Table */}
          <div className="flex-1 overflow-x-auto min-h-0 bg-white rounded-2xl border border-neutral-200 shadow-sm">
            <table className="w-full min-w-[760px] text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 bg-[#F8F9FA]">
                  <th className="px-5 py-3.5 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                    Affiliate Partner
                  </th>
                  <th className="px-4 py-3.5 text-xs font-bold text-neutral-500 uppercase tracking-wider text-center">
                    Status
                  </th>
                  <th className="px-4 py-3.5 text-xs font-bold text-neutral-500 uppercase tracking-wider text-center">
                    Referrals
                  </th>
                  <th className="px-4 py-3.5 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                    Affiliate Food Cost
                  </th>
                  <th className="px-4 py-3.5 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                    Total Received
                  </th>
                  <th className="px-4 py-3.5 text-xs font-bold text-neutral-500 uppercase tracking-wider text-center">
                    Net Balance
                  </th>
                  <th className="px-5 py-3.5 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {loading && affiliates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <BowlLoader className="w-8 h-8 text-[#6A0FAD] mx-auto" />
                      <p className="text-xs text-neutral-400 mt-2">Loading affiliates...</p>
                    </td>
                  </tr>
                ) : affiliates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-neutral-500 font-medium">
                      No affiliates found matching your search.
                    </td>
                  </tr>
                ) : (
                  affiliates.map((aff) => {
                    const affCost = aff.affiliate_cost ?? 0;
                    const fixedCost = aff.fixed_price ?? 0;
                    const rawPackCost = aff.raw_packaging_price ?? 0;
                    const totalRec = aff.total_received ?? 0;
                    const netBal = aff.net_balance ?? totalRec - affCost;
                    const isProfitable = netBal >= 0;

                    return (
                      <tr
                        key={aff.ulid}
                        onClick={() => setPreviewAffiliateUlid(aff.ulid)}
                        className="hover:bg-purple-50/30 transition-colors cursor-pointer group"
                      >
                        {/* Affiliate Name & Details */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-purple-100 text-[#6A0FAD] font-black text-xs flex items-center justify-center shrink-0">
                              {aff.name ? aff.name.charAt(0).toUpperCase() : "A"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-neutral-900 group-hover:text-[#6A0FAD] transition-colors truncate">
                                {aff.name}
                              </p>
                              <p className="text-xs text-neutral-400 truncate">{aff.email || aff.phone}</p>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              aff.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-neutral-100 text-neutral-700"
                            }`}
                          >
                            {aff.status}
                          </span>
                        </td>

                        {/* Referrals Count */}
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-purple-100 text-[#6A0FAD] font-bold text-xs">
                            {aff.referral_count || 0}
                          </span>
                        </td>

                        {/* Affiliate Food Cost */}
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-black text-neutral-900">
                              ₹{Number(affCost).toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                            </p>
                            <p className="text-[11px] text-neutral-500 font-medium">
                              Fixed: <strong className="text-purple-700">₹{Number(fixedCost).toFixed(0)}</strong> | Raw+Pack:{" "}
                              <strong className="text-emerald-700">₹{Number(rawPackCost).toFixed(0)}</strong>
                            </p>
                          </div>
                        </td>

                        {/* Total Received from Referrals */}
                        <td className="px-4 py-4">
                          <p className="font-black text-[#16A34A]">
                            ₹{Number(totalRec).toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                          </p>
                          <p className="text-[10px] text-neutral-400">Total customer deposits</p>
                        </td>

                        {/* Net Balance / ROI */}
                        <td className="px-4 py-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black ${
                              isProfitable
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {isProfitable ? (
                              <TrendingUp className="w-3 h-3 text-emerald-700" />
                            ) : (
                              <TrendingDown className="w-3 h-3 text-red-600" />
                            )}
                            {isProfitable ? "+" : ""}₹{Number(netBal).toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Preview Eye */}
                            <button
                              onClick={() => setPreviewAffiliateUlid(aff.ulid)}
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-400 hover:text-[#6A0FAD] hover:bg-purple-100 transition-colors"
                              title="Preview affiliate breakdown & referrals"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Assign Customer Button */}
                            <button
                              onClick={() => {
                                setSelectedAffiliateForReferral({
                                  ulid: aff.ulid,
                                  name: aff.name,
                                });
                                setIsAssignReferralModalOpen(true);
                              }}
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Assign a customer to this affiliate"
                            >
                              <UserPlus className="w-4 h-4" />
                            </button>

                            {/* Full Customer Profile */}
                            <button
                              onClick={() => router.push(`/admin/customers/${aff.ulid}`)}
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="View full customer profile"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between shrink-0 mt-5">
            <span className="text-xs font-bold text-neutral-400">
              Showing Page {page} of {totalPages} ({totalCount} total affiliates)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Modal to Make Customer an Affiliate */}
      <AssignAffiliateModal
        isOpen={isAffiliateModalOpen}
        onClose={() => setIsAffiliateModalOpen(false)}
        onSuccess={() => fetchAffiliates(1)}
      />

      {/* 2. Modal to Assign a Customer Under an Affiliate */}
      <AssignCustomerToAffiliateModal
        isOpen={isAssignReferralModalOpen}
        onClose={() => {
          setIsAssignReferralModalOpen(false);
          setSelectedAffiliateForReferral(null);
        }}
        onSuccess={() => fetchAffiliates(page)}
        preselectedAffiliate={selectedAffiliateForReferral}
      />

      {/* 3. Rich Affiliate Preview Modal */}
      <AffiliatePreviewModal
        isOpen={!!previewAffiliateUlid}
        onClose={() => setPreviewAffiliateUlid(null)}
        affiliateUlid={previewAffiliateUlid}
        onRefresh={() => fetchAffiliates(page)}
      />
    </div>
  );
}
