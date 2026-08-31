"use client";
import { BowlLoader } from "@/components/admin/BowlLoader";
import React, { useState } from "react";
import { X, Plus, Minus, Check, Edit2 } from "lucide-react";
import { endpoints } from "@/lib/apiService";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { PackagingComponent } from "@/lib/types";

interface Props {
  component: PackagingComponent;
  onClose: () => void;
  onSuccess: (updated: PackagingComponent) => void;
}

export function PackagingStockAdjustmentModal({ component, onClose, onSuccess }: Props) {
  const [adjustment, setAdjustment] = useState(0);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isEditingThreshold, setIsEditingThreshold] = useState(false);
  const [thresholdValue, setThresholdValue] = useState(Number(component.stock_threshold || 0));
  const [isUpdatingThreshold, setIsUpdatingThreshold] = useState(false);

  const handleUpdateThreshold = async () => {
    setIsUpdatingThreshold(true);
    try {
      const updated = await endpoints.packaging.updateComponentStockThreshold(component.ulid, { stock_threshold: thresholdValue });
      onSuccess(updated);
      setIsEditingThreshold(false);
    } catch (err) {
      console.error("Failed to update threshold", err);
    } finally {
      setIsUpdatingThreshold(false);
    }
  };

  const handleSubmit = async () => {
    if (adjustment === 0) return onClose();
    setIsSubmitting(true);
    try {
      const updated = await endpoints.packaging.adjustComponentStock(component.ulid, {
        quantity_change: adjustment,
        description: description || undefined,
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      console.error("Failed to adjust stock", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStock = Number(component.current_stock || 0);
  const totalStock = currentStock + adjustment;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        className="bg-white rounded-[32px] w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden border border-neutral-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-100/50">
          <h2 className="text-xl font-extrabold text-neutral-800 tracking-tight">Adjust Stock</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-6">
          {/* Component Info */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-16 h-16 rounded-full bg-purple-50 border-4 border-purple-100 flex items-center justify-center text-2xl font-black text-purple-300">
              {component.name.charAt(0).toUpperCase()}
            </div>
            <h3 className="text-lg font-bold text-neutral-800">{component.name}</h3>
          </div>

          {/* Stock Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-green-100/50 relative group">
              <span className="text-xs font-bold text-green-600/70 uppercase tracking-wider mb-1">Threshold</span>
              {isEditingThreshold ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    value={thresholdValue}
                    onChange={e => setThresholdValue(Number(e.target.value))}
                    className="w-16 h-8 text-center font-black text-green-700 bg-white border border-green-200 rounded-lg focus:outline-none focus:border-green-400"
                  />
                  <button
                    onClick={handleUpdateThreshold}
                    disabled={isUpdatingThreshold}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-green-200 text-green-700 hover:bg-green-300 disabled:opacity-50"
                  >
                    {isUpdatingThreshold ? <BowlLoader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-green-700">{Number(component.stock_threshold || 0)}</span>
                  <button
                    onClick={() => setIsEditingThreshold(true)}
                    className="w-6 h-6 flex items-center justify-center rounded-md bg-green-100 text-green-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-green-200"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
            <div className="bg-green-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-green-100/50">
              <span className="text-xs font-bold text-green-600/70 uppercase tracking-wider mb-1">Current Stock</span>
              <span className="text-xl font-black text-green-700">{currentStock}</span>
            </div>
          </div>

          {/* Adjustment Stepper */}
          <div className="flex flex-col items-center gap-2 mt-2">
            <label className="text-sm font-bold text-neutral-500">Adjust Quantity</label>
            <div className="flex items-center gap-6">
              <button
                onClick={() => setAdjustment(prev => prev - 1)}
                className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 active:scale-95 transition-all"
              >
                <Minus className="w-6 h-6" />
              </button>
              <div className="flex items-baseline gap-1 min-w-[80px] justify-center">
                <span className="text-4xl font-black text-neutral-800">{adjustment > 0 ? `+${adjustment}` : adjustment}</span>
                <span className="text-xl font-bold text-neutral-400">pcs</span>
              </div>
              <button
                onClick={() => setAdjustment(prev => prev + 1)}
                className="w-12 h-12 rounded-2xl bg-[#6b21a8] flex items-center justify-center text-white shadow-lg shadow-purple-500/30 hover:bg-[#581c87] active:scale-95 transition-all"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
            <div className="text-lg font-bold mt-4 flex items-center justify-center gap-1.5">
              <span className="text-neutral-400">Total Stock:</span>
              <span className={totalStock < 0 ? "text-red-500 font-black" : "text-[#6b21a8] font-black"}>{totalStock}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-neutral-700">Description <span className="text-neutral-400 font-medium">(Optional)</span></label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Received new shipment"
              className="w-full h-12 px-4 bg-neutral-100/70 border border-transparent rounded-2xl focus:outline-none focus:bg-white focus:border-neutral-200 transition-all text-sm font-medium text-neutral-800"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-100 bg-neutral-50/50 flex gap-3">
          <button
            className="flex-1 bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 font-bold text-base rounded-[20px] px-4 py-3.5 transition-all"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <ProbaeButton className="flex-1" onClick={handleSubmit} disabled={isSubmitting || totalStock < 0}>
            {isSubmitting ? <BowlLoader className="w-5 h-5 animate-spin" /> : "Save"}
          </ProbaeButton>
        </div>
      </div>
    </div>
  );
}
