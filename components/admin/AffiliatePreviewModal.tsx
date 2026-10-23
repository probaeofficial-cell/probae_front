"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { endpoints } from "@/lib/apiService";
import {
  X,
  ExternalLink,
  Users,
  UserPlus,
  TrendingUp,
  TrendingDown,
  Scale,
  Utensils,
  Box,
  Layers,
  Calendar,
  Package,
  Trash2,
  DollarSign,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { BowlLoader } from "@/components/admin/BowlLoader";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { AssignCustomerToAffiliateModal } from "./AssignCustomerToAffiliateModal";

interface AffiliatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  affiliateUlid: string | null;
  onRefresh?: () => void;
}

export function AffiliatePreviewModal({
  isOpen,
  onClose,
  affiliateUlid,
  onRefresh,
}: AffiliatePreviewModalProps) {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [customerToUnlink, setCustomerToUnlink] = useState<any>(null);
  const [unlinkLoading, setUnlinkLoading] = useState(false);

  const fetchPreview = async () => {
    if (!affiliateUlid) return;
    setLoading(true);
    setError("");
    try {
      const res = await endpoints.customers.getAffiliatePreview(affiliateUlid);
      setData(res);
    } catch (err: any) {
      console.error("Failed to fetch affiliate preview", err);
      setError(err?.message || "Failed to load affiliate details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && affiliateUlid) {
      fetchPreview();
    } else {
      setData(null);
    }
  }, [isOpen, affiliateUlid]);

  if (!isOpen) return null;

  const handleUnlink = async () => {
    if (!customerToUnlink || !affiliateUlid) return;
    setUnlinkLoading(true);
    try {
      await endpoints.customers.unassignReferral(affiliateUlid, customerToUnlink.ulid);
      setCustomerToUnlink(null);
      fetchPreview();
      onRefresh?.();
    } catch (err) {
      console.error("Failed to unassign referral", err);
    } finally {
      setUnlinkLoading(false);
    }
  };

  const affiliate = data?.affiliate;
  const costs = data?.costs;
  const referralsSummary = data?.referrals_summary;
  const referrals = data?.referrals || [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#FAFAFA] rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-neutral-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-100 text-[#6A0FAD] flex items-center justify-center font-black text-lg shrink-0">
              {affiliate?.name ? affiliate.name.charAt(0).toUpperCase() : <Users className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-neutral-900">{affiliate?.name || "Affiliate Preview"}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-[#6A0FAD]">
                  Affiliate
                </span>
                {affiliate?.status && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      affiliate.status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {affiliate.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500">
                {affiliate?.phone} {affiliate?.email ? `• ${affiliate.email}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {affiliate?.ulid && (
              <button
                onClick={() => {
                  onClose();
                  router.push(`/admin/customers/${affiliate.ulid}`);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold transition-colors"
                title="View full customer profile"
              >
                Profile <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
              </button>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-4">
            <BowlLoader className="w-10 h-10 text-[#6A0FAD]" />
            <p className="text-sm font-semibold text-neutral-500">Calculating affiliate costs & referrals...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
            <p className="text-sm font-bold text-neutral-800">{error}</p>
            <button
              onClick={fetchPreview}
              className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin">
            {/* 1. Executive Summary Pill Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Affiliate Cost */}
              <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                    Affiliate Food Cost
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-orange-100 text-[#F97316] flex items-center justify-center">
                    <Utensils className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-neutral-900">
                  ₹{Number(costs?.combined?.total_price || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="mt-2 pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
                  <span>
                    Fixed: <strong className="text-purple-700">₹{Number(costs?.combined?.fixed_price || 0).toFixed(0)}</strong>
                  </span>
                  <span>
                    Raw+Pack: <strong className="text-emerald-700">₹{Number(costs?.combined?.raw_and_packaging_price || 0).toFixed(0)}</strong>
                  </span>
                </div>
              </div>

              {/* Total Received from Referrals */}
              <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                    Total Received from Referrals
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-[#16A34A] flex items-center justify-center">
                    <DollarSign className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-2xl font-black text-[#16A34A]">
                  ₹{Number(referralsSummary?.total_received || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="mt-2 pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
                  <span>
                    Referred: <strong className="text-neutral-900">{referralsSummary?.total_count || 0} customers</strong>
                  </span>
                  <span>
                    Orders: <strong className="text-neutral-900">{referralsSummary?.total_orders_count || 0}</strong>
                  </span>
                </div>
              </div>

              {/* Net Balance / ROI */}
              <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                    Net Affiliate ROI / Margin
                  </span>
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      (referralsSummary?.net_balance || 0) >= 0
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {(referralsSummary?.net_balance || 0) >= 0 ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                </div>
                <div
                  className={`text-2xl font-black ${
                    (referralsSummary?.net_balance || 0) >= 0 ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {(referralsSummary?.net_balance || 0) >= 0 ? "+" : ""}₹
                  {Number(referralsSummary?.net_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <div className="mt-2 pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500">Food Margin:</span>
                  <span className="font-bold text-neutral-800">
                    ₹{Number(referralsSummary?.net_food_margin || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Side-by-Side Comparison Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT COLUMN: Affiliate Cost Breakdown (5 Cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                    <Scale className="w-4 h-4 text-[#6A0FAD]" />
                    Affiliate Food & Plan Cost
                  </h3>
                  <span className="text-xs font-bold text-[#6A0FAD] bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
                    Cost to Company
                  </span>
                </div>

                {/* Primary Cost Separation Cards */}
                <div className="bg-white rounded-2xl p-5 border border-neutral-200/80 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                    <div>
                      <p className="text-xs text-neutral-500 font-medium">Total Affiliate Price</p>
                      <p className="text-xl font-black text-neutral-900">
                        ₹{Number(costs?.combined?.total_price || 0).toFixed(2)}
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-neutral-100 rounded-full text-neutral-600">
                      Orders + Plan
                    </span>
                  </div>

                  {/* Fixed Cost Card */}
                  <div className="p-4 bg-purple-50/70 border border-purple-100 rounded-2xl">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-purple-200/60 text-[#6A0FAD] flex items-center justify-center">
                          <Layers className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-purple-900">Fixed Cost Component</span>
                      </div>
                      <span className="text-base font-black text-[#6A0FAD]">
                        ₹{Number(costs?.combined?.fixed_price || 0).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-800/70 mt-1 pl-8">
                      Kitchen preparation, rent, equipment, and fixed overhead allocation.
                    </p>
                  </div>

                  {/* Raw + Packaging Price Card */}
                  <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-emerald-200/60 text-emerald-800 flex items-center justify-center">
                          <Box className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-emerald-950">Raw Material + Packaging</span>
                      </div>
                      <span className="text-base font-black text-emerald-700">
                        ₹{Number(costs?.combined?.raw_and_packaging_price || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-2 pl-8 pt-2 border-t border-emerald-200/60 grid grid-cols-2 text-[11px] text-emerald-900/80">
                      <div>
                        Raw Material: <strong className="text-emerald-950 font-bold">₹{Number(costs?.combined?.raw_price || 0).toFixed(2)}</strong>
                      </div>
                      <div>
                        Packaging: <strong className="text-emerald-950 font-bold">₹{Number(costs?.combined?.packaging_price || 0).toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Plan Cost vs Orders Cost Breakdown */}
                <div className="bg-white rounded-2xl p-5 border border-neutral-200/80 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">
                    Cost Sources Breakdown
                  </h4>

                  {/* Plan Subscription */}
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-neutral-400" />
                        <div>
                          <p className="text-xs font-bold text-neutral-900">
                            {costs?.plan_cost?.has_plan ? costs.plan_cost.plan_name : "No Active Plan"}
                          </p>
                          <p className="text-[10px] text-neutral-500">
                            {costs?.plan_cost?.total_bowls || 0} scheduled meals
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-neutral-900">
                          ₹{Number(costs?.plan_cost?.total_price || 0).toFixed(2)}
                        </p>
                        <p className="text-[10px] text-neutral-500">
                          Fixed: ₹{Number(costs?.plan_cost?.fixed_price || 0).toFixed(0)} | Raw: ₹{Number(costs?.plan_cost?.raw_and_packaging_price || 0).toFixed(0)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Executed Orders */}
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-neutral-400" />
                        <div>
                          <p className="text-xs font-bold text-neutral-900">Executed Daily Orders</p>
                          <p className="text-[10px] text-neutral-500">
                            {costs?.orders_cost?.orders_count || 0} orders fulfilled
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-neutral-900">
                          ₹{Number(costs?.orders_cost?.total_price || 0).toFixed(2)}
                        </p>
                        <p className="text-[10px] text-neutral-500">
                          Fixed: ₹{Number(costs?.orders_cost?.fixed_price || 0).toFixed(0)} | Raw: ₹{Number(costs?.orders_cost?.raw_and_packaging_price || 0).toFixed(0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Customers Registered Under Affiliate (7 Cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-neutral-900 uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#16A34A]" />
                      Customers Registered Under Affiliate
                    </h3>
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-[#16A34A] text-xs font-bold flex items-center justify-center">
                      {referrals.length}
                    </span>
                  </div>

                  <button
                    onClick={() => setIsAssignModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#6A0FAD] text-white text-xs font-bold hover:bg-[#5a0d93] transition-colors shadow-sm"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Assign Customer
                  </button>
                </div>

                {/* Revenue Highlight Card */}
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/80 font-bold uppercase tracking-wider">
                      Total Money Received from Referrals
                    </p>
                    <p className="text-2xl font-black mt-1">
                      ₹{Number(referralsSummary?.total_received || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-white/90 mt-1">
                      Across {referralsSummary?.total_orders_count || 0} delivered meal orders (₹{Number(referralsSummary?.total_delivered_revenue || 0).toFixed(0)} order volume)
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                </div>

                {/* Registered Customers List */}
                <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50/70 flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                      Referred Customer Details
                    </span>
                    <span className="text-xs font-semibold text-neutral-400">
                      Deposits & Deliveries
                    </span>
                  </div>

                  {referrals.length === 0 ? (
                    <div className="p-8 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
                        <Users className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-neutral-700">No Customers Registered Under Affiliate Yet</p>
                      <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                        Click "Assign Customer" above to connect existing customers to this affiliate partner.
                      </p>
                      <button
                        onClick={() => setIsAssignModalOpen(true)}
                        className="px-4 py-2 bg-[#6A0FAD] text-white rounded-xl text-xs font-bold hover:bg-[#5a0d93] transition-colors"
                      >
                        + Assign First Customer
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-neutral-100 max-h-[380px] overflow-y-auto scrollbar-thin">
                      {referrals.map((ref: any) => (
                        <div
                          key={ref.ulid}
                          className="p-4 hover:bg-neutral-50/70 transition-colors flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-neutral-100 text-neutral-700 font-bold text-xs flex items-center justify-center shrink-0">
                              {ref.name ? ref.name.charAt(0).toUpperCase() : "C"}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-neutral-900 truncate">{ref.name}</p>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    ref.status === "ACTIVE"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-neutral-100 text-neutral-600"
                                  }`}
                                >
                                  {ref.status}
                                </span>
                              </div>
                              <p className="text-xs text-neutral-500 truncate">
                                {ref.phone} • Plan: {ref.active_plan_name || "None"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                              <p className="text-sm font-black text-[#16A34A]">
                                ₹{Number(ref.total_paid || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                              </p>
                              <p className="text-[10px] text-neutral-400 font-medium">
                                {ref.orders_count || 0} orders (₹{Number(ref.orders_revenue || 0).toFixed(0)})
                              </p>
                            </div>

                            <button
                              onClick={() => setCustomerToUnlink(ref)}
                              className="p-2 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                              title="Unlink customer from this affiliate"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-neutral-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-neutral-500">
            {affiliate?.name ? (
              <span>
                Affiliate Partner: <strong className="text-neutral-900">{affiliate.name}</strong> ({affiliate.phone})
              </span>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>

      {/* Assign Customer to this Affiliate Modal */}
      {isAssignModalOpen && affiliate && (
        <AssignCustomerToAffiliateModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          onSuccess={() => {
            fetchPreview();
            onRefresh?.();
          }}
          preselectedAffiliate={{
            ulid: affiliate.ulid,
            name: affiliate.name,
          }}
        />
      )}

      {/* Confirmation Modal to Unlink Customer */}
      <ConfirmationModal
        isOpen={!!customerToUnlink}
        onClose={() => setCustomerToUnlink(null)}
        onConfirm={handleUnlink}
        title="Unlink Customer from Affiliate"
        message={
          customerToUnlink
            ? `Are you sure you want to remove "${customerToUnlink.name}" from ${affiliate?.name}'s affiliate referrals? Future orders and deposits will no longer be attributed to this affiliate.`
            : ""
        }
        type="warning"
        confirmText="Yes, Unlink Customer"
        cancelText="Cancel"
        isLoading={unlinkLoading}
      />
    </div>
  );
}
