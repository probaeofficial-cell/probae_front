"use client";

import { useState } from "react";
import { endpoints } from "@/lib/apiService";
import { X, CheckCircle2 } from "lucide-react";
import AsyncCustomerSelect from "./AsyncCustomerSelect";
import { ProbaeButton } from "./ProbaeButton";

interface AssignAffiliateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignAffiliateModal({ isOpen, onClose, onSuccess }: AssignAffiliateModalProps) {
  const [customerId, setCustomerId] = useState<number | 0>(0);
  const [customerUlid, setCustomerUlid] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!isOpen) return null;

  const handleAssign = async () => {
    if (!customerUlid) return;
    setLoading(true);
    try {
      await endpoints.customers.update(customerUlid, { is_affiliate: true });
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onSuccess();
        onClose();
        setCustomerId(0);
        setCustomerUlid("");
      }, 2000);
    } catch (err) {
      console.error("Failed to assign affiliate", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div 
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-neutral-100">
          <h2 className="text-xl font-bold text-neutral-900">Assign Affiliate</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {showSuccess ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-lg font-bold text-neutral-900">Affiliate Assigned!</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-2">Select Customer</label>
              <AsyncCustomerSelect 
                value={customerId}
                onChange={setCustomerId}
                onSelectFull={(opt) => setCustomerUlid(opt.ulid)}
              />
              <p className="text-xs text-neutral-500 mt-2">
                This will grant the selected customer affiliate status, allowing you to track their referrals.
              </p>
            </div>
            <div className="flex gap-3 pt-4">
              <button 
                onClick={onClose} 
                className="flex-1 py-3.5 px-4 rounded-[20px] font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <ProbaeButton 
                onClick={handleAssign} 
                className="flex-1"
                disabled={!customerUlid || loading}
              >
                Confirm Assignment
              </ProbaeButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
