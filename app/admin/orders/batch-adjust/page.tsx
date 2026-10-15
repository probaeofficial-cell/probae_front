"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Sliders, ArrowLeft, Search, RefreshCw, CheckCircle2, 
  AlertCircle, Wallet, ArrowRight, ShieldAlert, Sparkles,
  Calendar, Layers, Check, X, Filter, Trash2
} from "lucide-react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { BowlLoader } from "@/components/admin/BowlLoader";
import { endpoints } from "@/lib/apiService";

interface PreviewOrder {
  order_id: number;
  order_ulid: string;
  order_number: string;
  target_date: string;
  status: string;
  customer: {
    id: number | null;
    ulid: string | null;
    name: string;
    phone: string | null;
    current_wallet: number;
    projected_wallet: number;
  };
  current_billed_price: number;
  existing_charge: number;
  new_billed_price: number;
  wallet_change: number;
  has_transaction: boolean;
  transaction_ref: string | null;
  items_count: number;
}

export default function BatchAdjustOrdersPage() {
  const [orderNumbersInput, setOrderNumbersInput] = useState<string>("");
  const [newAmount, setNewAmount] = useState<number>(0);
  const [adjustmentMode, setAdjustmentMode] = useState<"RECONCILE" | "DIRECT_DEBIT" | "ZERO_OUT">("RECONCILE");

  // Filter & Search picker state
  const [pickerDate, setPickerDate] = useState<string>(
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0]
  );
  const [pickerSearch, setPickerSearch] = useState<string>("");
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [selectedOrderNumbers, setSelectedOrderNumbers] = useState<string[]>([]);
  const [isPickerLoading, setIsPickerLoading] = useState<boolean>(false);

  // Preview & Submission states
  const [previewOrders, setPreviewOrders] = useState<PreviewOrder[]>([]);
  const [unmatchedNumbers, setUnmatchedNumbers] = useState<string[]>([]);
  const [totalWalletImpact, setTotalWalletImpact] = useState<number>(0);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);

  // Success / Error Modal
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [successResult, setSuccessResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch orders for quick-selection picker
  const loadPickerOrders = async () => {
    setIsPickerLoading(true);
    try {
      const res = await endpoints.orders.list({
        target_date: pickerDate || undefined,
        search: pickerSearch.trim() || undefined,
        limit: 100,
        page: 1,
      }) as any;
      setAvailableOrders(res?.orders || []);
    } catch (err) {
      console.error("Failed to load orders for picker:", err);
    } finally {
      setIsPickerLoading(false);
    }
  };

  useEffect(() => {
    loadPickerOrders();
  }, [pickerDate]);

  // Combine manual textarea input and checkbox selections
  const getCombinedOrderNumbers = (): string[] => {
    const rawTokens = orderNumbersInput
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const set = new Set([...rawTokens, ...selectedOrderNumbers]);
    return Array.from(set);
  };

  const handleToggleOrderSelection = (orderNum: string) => {
    setSelectedOrderNumbers((prev) =>
      prev.includes(orderNum) ? prev.filter((n) => n !== orderNum) : [...prev, orderNum]
    );
  };

  // Run Preview
  const handlePreview = async () => {
    const allNumbers = getCombinedOrderNumbers();
    if (allNumbers.length === 0) {
      setErrorMessage("Please enter or select at least one order number.");
      return;
    }

    setErrorMessage(null);
    setIsPreviewLoading(true);
    setSuccessResult(null);

    try {
      const res = await endpoints.orders.previewBulkAdjust({
        order_numbers: allNumbers,
        new_amount: Number(newAmount) || 0,
        adjustment_mode: adjustmentMode,
      }) as any;

      if (res?.success) {
        setPreviewOrders(res.orders || []);
        setUnmatchedNumbers(res.unmatched || []);
        setTotalWalletImpact(res.total_wallet_impact || 0);
      } else {
        setErrorMessage(res?.message || "Failed to generate preview.");
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || err?.message || "Error generating adjustment preview.");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Apply Changes
  const handleApplyChanges = async () => {
    const allNumbers = getCombinedOrderNumbers();
    if (allNumbers.length === 0) return;

    setIsApplying(true);
    setErrorMessage(null);

    try {
      const res = await endpoints.orders.bulkAdjustPrice({
        order_numbers: allNumbers,
        new_amount: Number(newAmount) || 0,
        adjustment_mode: adjustmentMode,
        reason: "Admin Bulk Order & Wallet Adjustment Utility",
      }) as any;

      if (res?.success) {
        setSuccessResult(res);
        setShowConfirmModal(false);
        // Clear inputs
        setPreviewOrders([]);
        setSelectedOrderNumbers([]);
        setOrderNumbersInput("");
        loadPickerOrders();
      } else {
        setErrorMessage(res?.message || "Failed to execute adjustments.");
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || err?.message || "Execution failed.");
    } finally {
      setIsApplying(false);
    }
  };

  const combinedCount = getCombinedOrderNumbers().length;

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        <Header />
        <Breadcrumbs segments={["Admin", "Orders & KDS", "Batch Price & Wallet Adjustment"]} />

        <div className="mt-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          {/* ── Top Notice Bar ────────────────────────────────────────── */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider">
                  Admin Maintenance Utility: Batch Order & Wallet Synchronizer
                </h4>
                <p className="text-xs text-amber-700 mt-0.5 font-medium leading-relaxed">
                  Bulk set order amounts (e.g. to ₹0) and automatically synchronize the transaction ledger and customer wallet balances.
                  This screen is self-contained and can be removed or commented out at any time.
                </p>
              </div>
            </div>
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1 text-xs font-bold text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 px-3 py-1.5 rounded-xl shrink-0 shadow-sm transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Orders
            </Link>
          </div>

          {/* ── Error Banner ──────────────────────────────────────────── */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-center justify-between text-red-700 text-sm font-bold">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                <span>{errorMessage}</span>
              </div>
              <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Success Banner ────────────────────────────────────────── */}
          {successResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-6 text-emerald-800">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <h3 className="text-base font-black text-emerald-900">
                  {successResult.message || "Adjustment Completed Successfully!"}
                </h3>
              </div>
              {successResult.updated_orders && successResult.updated_orders.length > 0 && (
                <div className="mt-3 max-h-48 overflow-y-auto bg-white/70 rounded-xl p-3 border border-emerald-100 text-xs font-medium space-y-1.5">
                  {successResult.updated_orders.map((u: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between py-1 border-b border-emerald-100/50 last:border-0">
                      <span className="font-bold text-neutral-900">{u.order_number} ({u.customer_name})</span>
                      <span className="text-neutral-600">
                        Price: ₹{u.old_price} → <strong className="text-emerald-700">₹{u.new_price}</strong> | Wallet: ₹{u.old_wallet} → <strong className="text-emerald-700">₹{u.new_wallet}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Control Configuration Section ─────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
            {/* Left: Input Order Numbers & Mode (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-black text-neutral-700 uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#6A0FAD]" /> Step 1: Provide Order Numbers
                  </label>
                  <span className="text-xs font-bold text-neutral-400">
                    {combinedCount} order{combinedCount === 1 ? "" : "s"} selected
                  </span>
                </div>

                <p className="text-xs text-neutral-500 mb-2">
                  Paste or type order numbers (e.g. <code>#26-10001, #26-10002</code> or ULIDs), separated by commas or line breaks:
                </p>

                <textarea
                  rows={4}
                  value={orderNumbersInput}
                  onChange={(e) => setOrderNumbersInput(e.target.value)}
                  placeholder="Paste order numbers here, e.g.:&#10;#26-10001&#10;#26-10002&#10;ORD-20261015-001"
                  className="w-full border border-neutral-200 rounded-xl p-3 text-sm font-mono focus:border-[#6A0FAD] focus:ring-2 focus:ring-[#6A0FAD]/20 outline-none transition-all shadow-inner bg-neutral-50"
                />

                {selectedOrderNumbers.length > 0 && (
                  <div className="mt-3 flex items-center justify-between bg-violet-50/70 p-2.5 rounded-xl border border-violet-100">
                    <span className="text-xs font-bold text-violet-900">
                      + {selectedOrderNumbers.length} orders chosen from picker below
                    </span>
                    <button
                      onClick={() => setSelectedOrderNumbers([])}
                      className="text-xs text-violet-600 hover:text-red-600 font-bold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Clear Picker Picks
                    </button>
                  </div>
                )}
              </div>

              {/* Mode & Target Price */}
              <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
                <label className="text-xs font-black text-neutral-700 uppercase tracking-wider block mb-3">
                  Step 2: Target Price & Wallet Strategy
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-xs font-bold text-neutral-600 block mb-1.5">New Order Price (₹)</span>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-sm">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newAmount}
                        onChange={(e) => setNewAmount(parseFloat(e.target.value) || 0)}
                        className="w-full pl-8 pr-4 py-2.5 border border-neutral-200 rounded-xl text-base font-extrabold text-neutral-900 focus:border-[#6A0FAD] focus:ring-2 focus:ring-[#6A0FAD]/20 outline-none shadow-sm"
                      />
                    </div>
                    <span className="text-[11px] text-neutral-400 mt-1 block">
                      Setting to 0.00 makes orders free & refunds charges.
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-neutral-600 block mb-1.5">Adjustment Mode</span>
                    <select
                      value={adjustmentMode}
                      onChange={(e: any) => setAdjustmentMode(e.target.value)}
                      className="w-full px-3 py-2.5 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-800 bg-white focus:border-[#6A0FAD] focus:ring-2 focus:ring-[#6A0FAD]/20 outline-none shadow-sm cursor-pointer"
                    >
                      <option value="RECONCILE">Reconcile Wallet (Recommended)</option>
                      <option value="ZERO_OUT">Zero-Out & Full Refund</option>
                      <option value="DIRECT_DEBIT">Direct Debit (Charge Wallet)</option>
                    </select>
                    <span className="text-[11px] text-neutral-400 mt-1 block">
                      {adjustmentMode === "RECONCILE" && "Wallet is credited if price drops, debited if price increases."}
                      {adjustmentMode === "ZERO_OUT" && "Zeroes out order and credits previous charge back to customer."}
                      {adjustmentMode === "DIRECT_DEBIT" && "Deducts the entered amount directly from customer wallet."}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-neutral-100">
                  <button
                    onClick={handlePreview}
                    disabled={isPreviewLoading || combinedCount === 0}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#6A0FAD] hover:bg-[#580c92] text-white font-bold text-sm shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPreviewLoading ? <BowlLoader className="w-4 h-4 text-white" /> : <RefreshCw className="w-4 h-4" />}
                    Preview Adjustments
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Interactive Order Picker (5 cols) */}
            <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm flex flex-col h-full">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <label className="text-xs font-black text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" /> Quick Order Selector
                </label>
                <button
                  onClick={loadPickerOrders}
                  className="text-xs font-bold text-neutral-400 hover:text-neutral-700 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>

              <div className="flex items-center gap-2 mb-3 shrink-0">
                <input
                  type="date"
                  value={pickerDate}
                  onChange={(e) => setPickerDate(e.target.value)}
                  className="border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-neutral-700 outline-none flex-1 shadow-sm"
                />
                <input
                  type="text"
                  placeholder="Filter name / #..."
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadPickerOrders()}
                  className="border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-neutral-700 outline-none flex-1 shadow-sm"
                />
              </div>

              {/* Order List */}
              <div className="flex-1 overflow-y-auto max-h-[300px] border border-neutral-100 rounded-xl p-2 bg-neutral-50 space-y-1.5 custom-scrollbar">
                {isPickerLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center text-neutral-400">
                    <BowlLoader className="w-6 h-6 text-[#6A0FAD]" />
                    <span className="text-xs font-bold mt-2">Loading orders...</span>
                  </div>
                ) : availableOrders.length === 0 ? (
                  <div className="py-10 text-center text-xs text-neutral-400">
                    No orders found for {pickerDate}.
                  </div>
                ) : (
                  availableOrders.map((ord: any) => {
                    const ordNum = ord.order_number || ord.ulid;
                    const isSelected = selectedOrderNumbers.includes(ordNum);
                    return (
                      <div
                        key={ord.id}
                        onClick={() => handleToggleOrderSelection(ordNum)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors border ${
                          isSelected
                            ? "bg-purple-50/80 border-[#6A0FAD]/40 text-[#6A0FAD]"
                            : "bg-white border-neutral-200 hover:border-neutral-300 text-neutral-700"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              isSelected ? "bg-[#6A0FAD] border-[#6A0FAD] text-white" : "border-neutral-300"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="font-mono font-bold">{ordNum}</span>
                          <span className="text-neutral-500 truncate max-w-[120px]">
                            {ord.customer?.name}
                          </span>
                        </div>
                        <span className="font-black text-neutral-800 shrink-0">
                          ₹{ord.billed_price || 0}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-400 pt-2 border-t border-neutral-100 shrink-0">
                <span>{availableOrders.length} orders shown</span>
                <button
                  onClick={() => {
                    const allNums = availableOrders.map((o) => o.order_number || o.ulid);
                    setSelectedOrderNumbers(allNums);
                  }}
                  className="text-[#6A0FAD] font-bold hover:underline"
                >
                  Select All
                </button>
              </div>
            </div>
          </div>

          {/* ── Preview Results Table ─────────────────────────────────── */}
          {previewOrders.length > 0 && (
            <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden mb-8">
              {/* Table Header / Summary */}
              <div className="p-5 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-50">
                <div>
                  <h3 className="text-base font-extrabold text-neutral-900 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Adjustment Preview ({previewOrders.length} Orders)
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Review price adjustments and projected customer wallet changes before applying.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block">
                      Net Wallet Delta
                    </span>
                    <span className={`text-base font-black ${totalWalletImpact >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                      {totalWalletImpact >= 0 ? `+₹${totalWalletImpact.toFixed(2)}` : `-₹${Math.abs(totalWalletImpact).toFixed(2)}`}
                    </span>
                  </div>

                  <button
                    onClick={() => setShowConfirmModal(true)}
                    disabled={isApplying}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md transition-all flex items-center gap-2"
                  >
                    Apply Adjustments Now <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Unmatched Warning */}
              {unmatchedNumbers.length > 0 && (
                <div className="p-3.5 bg-amber-50 border-b border-amber-200 flex items-center gap-2 text-xs text-amber-800 font-semibold">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Unmatched Order Numbers ({unmatchedNumbers.length}): <strong>{unmatchedNumbers.join(", ")}</strong> (not found in database, skipped).
                  </span>
                </div>
              )}

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px] text-xs">
                  <thead>
                    <tr className="bg-neutral-100/70 border-b border-neutral-200 text-neutral-600 font-bold uppercase tracking-wider">
                      <th className="px-4 py-3">Order #</th>
                      <th className="px-4 py-3">Target Date</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3 text-right">Old Price</th>
                      <th className="px-4 py-3 text-right">New Price</th>
                      <th className="px-4 py-3 text-right">Current Wallet</th>
                      <th className="px-4 py-3 text-right">Projected Wallet</th>
                      <th className="px-4 py-3 text-center">Wallet Delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {previewOrders.map((p) => {
                      const isPositive = p.wallet_change > 0;
                      const isNegative = p.wallet_change < 0;
                      return (
                        <tr key={p.order_id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-mono font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded-md">
                              {p.order_number}
                            </span>
                            <span className="block text-[10px] text-neutral-400 mt-0.5">{p.status}</span>
                          </td>
                          <td className="px-4 py-3 text-neutral-600 font-semibold">
                            {p.target_date}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-neutral-900 block">{p.customer?.name}</span>
                            <span className="text-[11px] text-neutral-400">{p.customer?.phone || "—"}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-neutral-600 line-through">
                            ₹{p.current_billed_price.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-[#6A0FAD] text-sm">
                            ₹{p.new_billed_price.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-neutral-700">
                            ₹{p.customer.current_wallet.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-neutral-900">
                            ₹{p.customer.projected_wallet.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full font-black text-[11px] ${
                                isPositive
                                  ? "bg-emerald-100 text-emerald-800"
                                  : isNegative
                                  ? "bg-red-100 text-red-800"
                                  : "bg-neutral-100 text-neutral-600"
                              }`}
                            >
                              {isPositive ? `+₹${p.wallet_change.toFixed(2)}` : isNegative ? `-₹${Math.abs(p.wallet_change).toFixed(2)}` : "₹0.00"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Confirmation Modal ────────────────────────────────────────── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-neutral-900 mb-1">Confirm Batch Adjustment</h3>
            <p className="text-sm text-neutral-600 mb-4 leading-relaxed">
              Are you sure you want to update <strong>{previewOrders.length} orders</strong> to{" "}
              <strong>₹{newAmount.toFixed(2)}</strong>?
              <br />
              This will update the transaction ledger and adjust the wallet balances for these customers accordingly.
            </p>

            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 mb-6 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-neutral-500">Total Orders:</span>
                <span className="font-bold text-neutral-800">{previewOrders.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Target Order Price:</span>
                <span className="font-black text-[#6A0FAD]">₹{newAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Adjustment Mode:</span>
                <span className="font-bold text-neutral-800">{adjustmentMode}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-neutral-200">
                <span className="text-neutral-600 font-bold">Net Wallet Impact:</span>
                <span className={`font-black ${totalWalletImpact >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                  {totalWalletImpact >= 0 ? `+₹${totalWalletImpact.toFixed(2)}` : `-₹${Math.abs(totalWalletImpact).toFixed(2)}`}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isApplying}
                className="px-4 py-2 rounded-xl text-neutral-600 font-bold text-sm hover:bg-neutral-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyChanges}
                disabled={isApplying}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
              >
                {isApplying ? <BowlLoader className="w-4 h-4 text-white" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirm & Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
