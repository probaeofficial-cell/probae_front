import { BowlLoader } from "@/components/admin/BowlLoader";
import React, { useState, useEffect } from "react";
import { X, Minus, Plus, Loader2, Edit2, Check } from "lucide-react";
import { RawMaterial } from "@/lib/types";
import { endpoints } from "@/lib/apiService";
import { getMediaUrl } from "@/lib/utils";
import { ProbaeButton } from "@/components/admin/ProbaeButton";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  material: RawMaterial;
  onSuccess: (updatedMaterial: RawMaterial) => void;
  systemSettings: any;
}

export function StockAdjustmentModal({ isOpen, onClose, material, onSuccess, systemSettings }: Props) {
  const [adjustment, setAdjustment] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingThreshold, setIsEditingThreshold] = useState(false);
  const [thresholdValue, setThresholdValue] = useState(Number(material.stock_threshold || 0));
  const [isUpdatingThreshold, setIsUpdatingThreshold] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAdjustment(0);
      setDescription("");
      setIsEditingThreshold(false);
      setThresholdValue(Number(material.stock_threshold || 0));
    }
  }, [isOpen, material]);

  if (!isOpen) return null;

  const handleUpdateThreshold = async () => {
    setIsUpdatingThreshold(true);
    try {
      const updated = await endpoints.rawMaterials.updateStockThreshold(material.ulid, {
        stock_threshold: thresholdValue
      });
      onSuccess(updated);
      setIsEditingThreshold(false);
    } catch (err) {
      console.error("Failed to update threshold", err);
    } finally {
      setIsUpdatingThreshold(false);
    }
  };

  const handleIncrement = () => setAdjustment(prev => prev + 1);
  const handleDecrement = () => setAdjustment(prev => prev - 1);

  const handleSubmit = async () => {
    if (adjustment === 0) return onClose();
    setIsSubmitting(true);
    try {
      const updated = await endpoints.rawMaterials.adjustStock(material.ulid, {
        quantity_change: adjustment,
        description: description || undefined
      });
      onSuccess(updated);
      onClose();
    } catch (err) {
      console.error("Failed to adjust stock", err);
      // could show an error toast here
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStock = Number(material.current_stock || 0);
  const totalStock = currentStock + adjustment;
  const mediaUrl = getMediaUrl(systemSettings?.R2_BASE_URL, material.image_filename);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
      <div 
        className="bg-white rounded-[32px] w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden relative border border-neutral-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-100/50">
          <h2 className="text-xl font-extrabold text-neutral-800 tracking-tight">Add Stock</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-6">
          
          {/* Material Info */}
          <div className="flex flex-col items-center text-center gap-3">
             <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center border-4 border-neutral-100 relative bg-neutral-50 shrink-0">
                {mediaUrl ? (
                  <img src={mediaUrl} alt={material.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-2xl font-black text-neutral-300">
                    {material.name.charAt(0).toUpperCase()}
                  </div>
                )}
             </div>
             <div>
               <h3 className="text-lg font-bold text-neutral-800">{material.name}</h3>
               {material.category && <p className="text-sm font-medium text-neutral-400">{material.category.name}</p>}
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-green-100/50 relative group">
                <span className="text-xs font-bold text-green-600/70 uppercase tracking-wider mb-1">Threshold</span>
                
                {isEditingThreshold ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input 
                      type="number"
                      value={thresholdValue}
                      onChange={(e) => setThresholdValue(Number(e.target.value))}
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
                    <span className="text-xl font-black text-green-700">{Number(material.stock_threshold || 0)}{material.unit}</span>
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
                <span className="text-xl font-black text-green-700">{currentStock}{material.unit}</span>
            </div>
          </div>

          {/* Adjustment Controls */}
          <div className="flex flex-col items-center gap-2 mt-2">
            <label className="text-sm font-bold text-neutral-500">Add Stock</label>
            <div className="flex items-center gap-6">
                <button 
                  onClick={handleDecrement}
                  className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 active:scale-95 transition-all"
                >
                  <Minus className="w-6 h-6" />
                </button>
                
                <div className="flex items-baseline gap-1 min-w-[80px] justify-center">
                   <span className="text-4xl font-black text-neutral-800">{adjustment > 0 ? `+${adjustment}` : adjustment}</span>
                   <span className="text-xl font-bold text-neutral-400">{material.unit}</span>
                </div>

                <button 
                  onClick={handleIncrement}
                  className="w-12 h-12 rounded-2xl bg-[#6b21a8] flex items-center justify-center text-white shadow-lg shadow-purple-500/30 hover:bg-[#581c87] hover:shadow-xl active:scale-95 transition-all"
                >
                  <Plus className="w-6 h-6" />
                </button>
            </div>
            <div className="text-lg font-bold mt-4 flex items-center justify-center gap-1.5">
              <span className="text-neutral-400">Total Stock:</span>
              <span className={totalStock < 0 ? "text-red-500 font-black" : "text-[#6b21a8] font-black"}>{totalStock}{material.unit}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-neutral-700">Description <span className="text-neutral-400 font-medium">(Optional)</span></label>
            <input 
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Received new shipment"
              className="w-full h-12 px-4 bg-neutral-100/70 border border-transparent rounded-2xl focus:outline-none focus:ring-0 focus:bg-white focus:border-neutral-200 transition-all text-sm font-medium"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-100 bg-neutral-50/50 flex gap-3">
          <button className="flex-1 bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 font-bold text-base rounded-[20px] px-4 py-3.5 transition-all outline-none" onClick={onClose} disabled={isSubmitting}>
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
