"use client";

import { useState } from "react";
import { endpoints } from "@/lib/apiService";
import { X, CheckCircle2, UserPlus, Users } from "lucide-react";
import AsyncCustomerSelect from "./AsyncCustomerSelect";
import { ProbaeButton } from "./ProbaeButton";

interface AssignCustomerToAffiliateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedAffiliate?: {
    ulid: string;
    name: string;
  } | null;
}

export function AssignCustomerToAffiliateModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedAffiliate,
}: AssignCustomerToAffiliateModalProps) {
  const [affiliateId, setAffiliateId] = useState<number | 0>(0);
  const [affiliateUlid, setAffiliateUlid] = useState(preselectedAffiliate?.ulid || "");
  const [affiliateName, setAffiliateName] = useState(preselectedAffiliate?.name || "");

  const [customerId, setCustomerId] = useState<number | 0>(0);
  const [customerUlid, setCustomerUlid] = useState("");
  const [customerName, setCustomerName] = useState("");

  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const effectiveAffiliateUlid = preselectedAffiliate?.ulid || affiliateUlid;
  const effectiveAffiliateName = preselectedAffiliate?.name || affiliateName;

  const handleAssign = async () => {
    if (!effectiveAffiliateUlid || !customerUlid) {
      setErrorMsg("Please select both an affiliate and a customer.");
      return;
    }
    setErrorMsg("");
    setLoading(true);
    try {
      await endpoints.customers.assignReferral(effectiveAffiliateUlid, customerUlid);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onSuccess();
        onClose();
        setCustomerId(0);
        setCustomerUlid("");
        setCustomerName("");
      }, 1500);
    } catch (err: any) {
      console.error("Failed to assign customer to affiliate", err);
      setErrorMsg(err?.message || "Failed to assign customer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-100 bg-[#FBFBFC]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-[#6A0FAD] flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Assign Customer to Affiliate</h2>
              <p className="text-xs text-neutral-500">Connect a customer under an affiliate referral partner</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {showSuccess ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-lg font-bold text-neutral-900">Customer Assigned Successfully!</p>
            <p className="text-sm text-neutral-500 text-center">
              {customerName ? `"${customerName}" is now registered under ` : "Registered under "}
              <span className="font-semibold text-neutral-800">{effectiveAffiliateName}</span>.
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
                {errorMsg}
              </div>
            )}

            {/* Target Affiliate */}
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                Affiliate Partner
              </label>
              {preselectedAffiliate ? (
                <div className="flex items-center gap-3 p-3.5 bg-purple-50/60 border border-purple-100 rounded-2xl">
                  <div className="w-8 h-8 rounded-full bg-purple-200/70 text-[#6A0FAD] font-bold text-xs flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-neutral-900">{preselectedAffiliate.name}</p>
                    <p className="text-xs text-[#6A0FAD] font-medium">Selected Affiliate Partner</p>
                  </div>
                </div>
              ) : (
                <AsyncCustomerSelect
                  value={affiliateId}
                  onChange={setAffiliateId}
                  onSelectFull={(opt) => {
                    setAffiliateUlid(opt.ulid);
                    setAffiliateName(opt.name);
                  }}
                />
              )}
            </div>

            {/* Customer to Assign */}
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                Customer to Register Under Affiliate
              </label>
              <AsyncCustomerSelect
                value={customerId}
                onChange={setCustomerId}
                onSelectFull={(opt) => {
                  setCustomerUlid(opt.ulid);
                  setCustomerName(opt.name);
                }}
              />
              <p className="text-xs text-neutral-400 mt-2">
                All order prices and wallet deposits from this customer will be attributed to this affiliate.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-2xl font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-colors text-sm"
              >
                Cancel
              </button>
              <ProbaeButton
                onClick={handleAssign}
                disabled={!effectiveAffiliateUlid || !customerUlid || loading}
                className="flex-1 text-sm font-bold"
              >
                {loading ? "Assigning..." : "Assign Customer"}
              </ProbaeButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
