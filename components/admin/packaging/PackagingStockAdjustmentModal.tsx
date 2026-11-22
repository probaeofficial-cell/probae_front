"use client";
import { BowlLoader } from "@/components/admin/BowlLoader";
import React, { useState } from "react";
import { X, Plus, Minus, Check, Edit2, ArrowDownToLine, SlidersHorizontal, Info } from "lucide-react";
import { endpoints } from "@/lib/apiService";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { PackagingComponent, ChildStickerSummary } from "@/lib/types";
import { useInvalidateLowStockCount } from "@/lib/queryHooks";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

interface Props {
  component: PackagingComponent | ChildStickerSummary;
  onClose: () => void;
  onSuccess: (updated: any) => void;
  initialMode?: "stock_in" | "adjust";
}

export function PackagingStockAdjustmentModal({ 
  component, 
  onClose, 
  onSuccess,
  initialMode = "stock_in" 
}: Props) {
  const invalidateLowStock = useInvalidateLowStockCount();
  const queryClient = useQueryClient();
  const isParent = Boolean(('is_parent' in component && component.is_parent) || component.name.trim().toLowerCase() === "sticker" && !('parent_id' in component && component.parent_id));

  // Tabs: "stock_in" (Replenishment) vs "adjust" (Manual Adjustment)
  const [activeTab, setActiveTab] = useState<"stock_in" | "adjust">(isParent ? "stock_in" : initialMode);

  // Stock In (Replenish) Form State
  const [stockInQty, setStockInQty] = useState<number | "">(100);
  const [referenceType, setReferenceType] = useState<string>("PURCHASE_ORDER");
  const [referenceId, setReferenceId] = useState<string>("");
  const [stockInRemarks, setStockInRemarks] = useState<string>("");

  // Adjustment Form State
  const [adjustment, setAdjustment] = useState<number | "">(0);
  const [adjustmentDescription, setAdjustmentDescription] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Threshold editing
  const [isEditingThreshold, setIsEditingThreshold] = useState(false);
  const [thresholdValue, setThresholdValue] = useState(Number(component.stock_threshold || 0));
  const [isUpdatingThreshold, setIsUpdatingThreshold] = useState(false);

  const currentStock = Number(component.current_stock || 0);

  const handleUpdateThreshold = async () => {
    setIsUpdatingThreshold(true);
    setErrorMessage(null);
    try {
      const updated = await endpoints.packaging.updateComponentStockThreshold(component.ulid, { stock_threshold: thresholdValue });
      onSuccess(updated);
      await invalidateLowStock();
      await queryClient.invalidateQueries({ queryKey: queryKeys.packaging.root });
      setIsEditingThreshold(false);
    } catch (err: any) {
      console.error("Failed to update threshold", err);
      setErrorMessage(err.message || "Failed to update threshold");
    } finally {
      setIsUpdatingThreshold(false);
    }
  };

  const handleStockInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = typeof stockInQty === "number" ? stockInQty : parseInt(String(stockInQty), 10);
    if (!qty || qty <= 0) {
      setErrorMessage("Quantity must be greater than zero");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const updated = await endpoints.packaging.stockIn(component.ulid, {
        quantity: qty,
        reference_type: referenceType,
        reference_id: referenceId.trim() || undefined,
        remarks: stockInRemarks.trim() || undefined,
      });
      onSuccess(updated);
      await invalidateLowStock();
      await queryClient.invalidateQueries({ queryKey: queryKeys.packaging.root });
      onClose();
    } catch (err: any) {
      console.error("Failed to replenish stock", err);
      setErrorMessage(err.message || "Failed to replenish stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalAdj = typeof adjustment === "number" ? adjustment : (parseInt(String(adjustment), 10) || 0);
    if (finalAdj === 0) return onClose();

    if (currentStock + finalAdj < 0) {
      setErrorMessage(`Cannot reduce stock below 0 (available: ${currentStock})`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const updated = await endpoints.packaging.adjustComponentStock(component.ulid, {
        quantity_change: finalAdj,
        description: adjustmentDescription || undefined,
        reference_type: "ADJUSTMENT",
      });
      onSuccess(updated);
      await invalidateLowStock();
      await queryClient.invalidateQueries({ queryKey: queryKeys.packaging.root });
      onClose();
    } catch (err: any) {
      console.error("Failed to adjust stock", err);
      setErrorMessage(err.message || "Failed to adjust stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  const numericAdj = typeof adjustment === "number" ? adjustment : (parseInt(String(adjustment), 10) || 0);
  const totalStockAfterAdjust = currentStock + numericAdj;

  const numericStockIn = typeof stockInQty === "number" ? stockInQty : (parseInt(String(stockInQty), 10) || 0);
  const totalStockAfterStockIn = currentStock + numericStockIn;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
      <div
        className="bg-white rounded-[32px] w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden border border-neutral-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-100">
          <div>
            <h2 className="text-xl font-extrabold text-neutral-800 tracking-tight">
              {isParent ? "Sticker Stock Overview" : activeTab === "stock_in" ? "Replenish Stock" : "Adjust Stock"}
            </h2>
            <p className="text-xs text-neutral-500 font-medium mt-0.5">
              {component.name}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Parent Warning if Opened for Parent */}
        {isParent ? (
          <div className="p-6 flex flex-col gap-4">
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-start gap-3 text-purple-900">
              <Info className="w-5 h-5 text-[#6A0FAD] shrink-0 mt-0.5" />
              <div className="text-xs font-medium leading-relaxed">
                <strong>Sticker is an aggregate parent component.</strong>
                <p className="mt-1 text-purple-700">
                  Parent stock ({currentStock} pcs) is dynamically calculated from the sum of all individual child stickers. To replenish or adjust stock, please select the specific child sticker component (e.g. Bowl A Sticker).
                </p>
              </div>
            </div>

            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-[#6A0FAD] text-white hover:bg-[#580d8f] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 flex flex-col gap-5">
            {/* Mode Tabs */}
            <div className="flex rounded-2xl bg-neutral-100 p-1">
              <button
                type="button"
                onClick={() => { setActiveTab("stock_in"); setErrorMessage(null); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === "stock_in"
                    ? "bg-[#6A0FAD] text-white shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <ArrowDownToLine className="w-4 h-4" />
                Stock In (Replenish)
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("adjust"); setErrorMessage(null); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === "adjust"
                    ? "bg-[#6A0FAD] text-white shadow-xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Manual Adjustment
              </button>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            {/* Stock Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-neutral-50 rounded-2xl p-3.5 flex flex-col items-center justify-center border border-neutral-100">
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-0.5">Current Stock</span>
                <span className={`text-xl font-black ${currentStock <= 0 ? "text-red-500" : "text-neutral-900"}`}>
                  {currentStock} <span className="text-xs font-normal text-neutral-400">pcs</span>
                </span>
              </div>

              <div className="bg-neutral-50 rounded-2xl p-3.5 flex flex-col items-center justify-center border border-neutral-100 relative group">
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-0.5">Threshold</span>
                {isEditingThreshold ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <input
                      type="number"
                      value={thresholdValue}
                      onChange={e => setThresholdValue(Number(e.target.value))}
                      className="w-16 h-7 text-center font-bold text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:border-[#6A0FAD]"
                    />
                    <button
                      onClick={handleUpdateThreshold}
                      disabled={isUpdatingThreshold}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#6A0FAD] text-white hover:bg-[#580d8f] disabled:opacity-50"
                    >
                      {isUpdatingThreshold ? <BowlLoader className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl font-black text-neutral-700">{Number(component.stock_threshold || 0)} <span className="text-xs font-normal text-neutral-400">pcs</span></span>
                    <button
                      onClick={() => setIsEditingThreshold(true)}
                      className="w-5 h-5 flex items-center justify-center rounded-md bg-neutral-200/60 text-neutral-600 opacity-60 hover:opacity-100 transition-opacity"
                      title="Edit Threshold"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* TAB 1: Stock In (Replenishment) */}
            {activeTab === "stock_in" && (
              <form onSubmit={handleStockInSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider ml-1">
                    Quantity Received <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      value={stockInQty}
                      onChange={e => setStockInQty(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                      placeholder="e.g. 200"
                      className="w-full h-12 bg-neutral-50 border border-neutral-200 rounded-xl px-4 text-lg font-black text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition-all pr-12"
                    />
                    <span className="absolute right-4 text-xs font-black text-neutral-400 uppercase">pcs</span>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className="text-[10px] font-black text-neutral-400 mr-1 uppercase">Quick:</span>
                    {[50, 100, 200, 500].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setStockInQty(amt)}
                        className="px-2.5 py-1 text-xs font-bold text-[#6A0FAD] bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-all"
                      >
                        +{amt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider ml-1">
                      Reference Type
                    </label>
                    <select
                      value={referenceType}
                      onChange={e => setReferenceType(e.target.value)}
                      className="w-full h-11 bg-neutral-50 border border-neutral-200 rounded-xl px-3 text-xs font-semibold text-neutral-800 focus:outline-none focus:border-[#6A0FAD]"
                    >
                      <option value="PURCHASE_ORDER">Purchase Order (PO)</option>
                      <option value="VENDOR_DELIVERY">Vendor Delivery</option>
                      <option value="MANUAL">Manual Stock In</option>
                      <option value="AUDIT">Physical Audit</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider ml-1">
                      Reference / PO #
                    </label>
                    <input
                      type="text"
                      value={referenceId}
                      onChange={e => setReferenceId(e.target.value)}
                      placeholder="e.g. PO-2026-001"
                      className="w-full h-11 bg-neutral-50 border border-neutral-200 rounded-xl px-3 text-xs font-semibold text-neutral-800 focus:outline-none focus:border-[#6A0FAD]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider ml-1">
                    Remarks / Supplier Notes <span className="text-neutral-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={stockInRemarks}
                    onChange={e => setStockInRemarks(e.target.value)}
                    placeholder="e.g. Fresh sticker batch received from vendor"
                    className="w-full h-11 bg-neutral-50 border border-neutral-200 rounded-xl px-3 text-xs font-medium text-neutral-800 focus:outline-none focus:border-[#6A0FAD]"
                  />
                </div>

                {/* Stock Transition Live Banner */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 to-emerald-50/50 border border-purple-100 text-xs font-bold mt-1">
                  <span className="text-neutral-600">
                    Stock Preview: <span className="font-mono text-neutral-900">{currentStock}</span> → <span className="text-emerald-600 font-mono">+{numericStockIn}</span>
                  </span>
                  <span className="text-sm font-black text-[#6A0FAD]">
                    Result: {totalStockAfterStockIn} pcs
                  </span>
                </div>

                <div className="flex justify-end gap-3 mt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <ProbaeButton type="submit" disabled={isSubmitting || numericStockIn <= 0} className="px-6">
                    {isSubmitting ? <BowlLoader className="w-4 h-4" /> : "Replenish Stock"}
                  </ProbaeButton>
                </div>
              </form>
            )}

            {/* TAB 2: Manual Adjustment */}
            {activeTab === "adjust" && (
              <form onSubmit={handleAdjustmentSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center justify-between w-full">
                    <label className="text-xs font-black text-neutral-500 uppercase tracking-wider">
                      Stock Adjustment (+ / -)
                    </label>
                    <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                      Type directly or use + / -
                    </span>
                  </div>

                  <div className="flex items-center gap-3 w-full justify-center">
                    <button
                      type="button"
                      onClick={() => setAdjustment(prev => (typeof prev === "number" ? prev : 0) - 1)}
                      className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 active:scale-95 transition-all shrink-0"
                    >
                      <Minus className="w-5 h-5" />
                    </button>

                    <div className="relative flex items-center justify-center flex-1 max-w-[200px]">
                      <input
                        type="number"
                        step="1"
                        value={adjustment}
                        onChange={e => {
                          const val = e.target.value;
                          setAdjustment(val === "" || val === "-" ? (val as any) : parseInt(val, 10) || 0);
                        }}
                        className="w-full h-12 text-center text-2xl font-black text-neutral-900 bg-neutral-50 border-2 border-neutral-200 focus:border-[#6A0FAD] rounded-2xl outline-none"
                      />
                      <span className="absolute right-3 text-xs font-black text-neutral-400 uppercase">pcs</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAdjustment(prev => (typeof prev === "number" ? prev : 0) + 1)}
                      className="w-12 h-12 rounded-2xl bg-[#6A0FAD] flex items-center justify-center text-white hover:bg-[#580d8f] active:scale-95 transition-all shrink-0 shadow-md shadow-purple-500/20"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Quick Presets */}
                  <div className="flex flex-wrap items-center justify-center gap-1.5 w-full">
                    <span className="text-[10px] font-black text-neutral-400 mr-1 uppercase">Quick:</span>
                    {[10, 50, 100].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAdjustment(prev => (typeof prev === "number" ? prev : 0) + amt)}
                        className="px-2 py-0.5 text-xs font-bold text-[#6A0FAD] bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-all"
                      >
                        +{amt}
                      </button>
                    ))}
                    {[-10, -50].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAdjustment(prev => (typeof prev === "number" ? prev : 0) + amt)}
                        className="px-2 py-0.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all"
                      >
                        {amt}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setAdjustment(0)}
                      className="px-2 py-0.5 text-xs font-bold text-neutral-500 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded-lg transition-all"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 mt-1">
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider ml-1">
                    Reason / Description
                  </label>
                  <input
                    type="text"
                    value={adjustmentDescription}
                    onChange={e => setAdjustmentDescription(e.target.value)}
                    placeholder="e.g. Physical inventory count correction"
                    className="w-full h-11 bg-neutral-50 border border-neutral-200 rounded-xl px-3 text-xs font-medium text-neutral-800 focus:outline-none focus:border-[#6A0FAD]"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs font-bold mt-1">
                  <span className="text-neutral-500">Total Stock After Adjustment:</span>
                  <span className={`text-sm font-black ${totalStockAfterAdjust < 0 ? "text-red-600" : "text-[#6A0FAD]"}`}>
                    {totalStockAfterAdjust} pcs
                  </span>
                </div>

                <div className="flex justify-end gap-3 mt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <ProbaeButton type="submit" disabled={isSubmitting || totalStockAfterAdjust < 0 || numericAdj === 0} className="px-6">
                    {isSubmitting ? <BowlLoader className="w-4 h-4" /> : "Save Adjustment"}
                  </ProbaeButton>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
