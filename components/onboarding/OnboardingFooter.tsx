"use client";

import React from "react";
import { triggerHaptic } from "@/lib/haptics";

export interface OnboardingFooterProps {
  onBack?: () => void;
  onContinue: () => void;
  backLabel?: string;
  continueLabel?: string;
  continueDisabled?: boolean;
  isLoading?: boolean;
  variant?: "light" | "purple" | "dark-back";
}

export function OnboardingFooter({
  onBack,
  onContinue,
  backLabel = "Back",
  continueLabel = "Continue",
  continueDisabled = false,
  isLoading = false,
  variant = "light",
}: OnboardingFooterProps) {
  const isPurpleBg = variant === "purple";
  const isDarkBack = variant === "dark-back";

  return (
    <div className="w-full px-6 pb-6 pt-3 flex items-center justify-center gap-3 relative z-20 shrink-0">
      {onBack && (
        <button
          type="button"
          onClick={() => {
            triggerHaptic("selection");
            onBack();
          }}
          className={`flex-1 max-w-[150px] py-3.5 rounded-xl font-bold text-sm transition active:scale-95 cursor-pointer shadow-sm ${
            isDarkBack
              ? "bg-[#1A1A1A] hover:bg-neutral-800 text-white"
              : "bg-[#E6683B] hover:bg-[#d55a2e] text-white"
          }`}
        >
          {backLabel}
        </button>
      )}

      <button
        type="button"
        disabled={continueDisabled || isLoading}
        onClick={() => {
          triggerHaptic("impact");
          onContinue();
        }}
        className={`flex-1 max-w-[160px] py-3.5 rounded-xl font-bold text-sm transition active:scale-95 cursor-pointer shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
          isPurpleBg
            ? "bg-[#A882D6] hover:bg-[#b896e2] text-white border border-white/20"
            : "bg-[#6C0EAD] hover:bg-[#5a0b92] text-white"
        }`}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          continueLabel
        )}
      </button>
    </div>
  );
}
