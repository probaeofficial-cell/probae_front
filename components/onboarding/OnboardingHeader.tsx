"use client";

import React from "react";
import { ArrowLeft } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

export interface OnboardingHeaderProps {
  title: string;
  stepNumber?: number;
  totalSteps?: number;
  onBack?: () => void;
  variant?: "light" | "purple" | "cream" | "green";
  showStepBadge?: boolean;
}

export function OnboardingHeader({
  title,
  stepNumber = 1,
  totalSteps = 10,
  onBack,
  variant = "light",
  showStepBadge = true,
}: OnboardingHeaderProps) {
  const isDarkBg = variant === "purple" || variant === "green";
  const stepText = `${String(stepNumber).padStart(2, "0")} of ${String(totalSteps).padStart(2, "0")}`;

  const waveColor =
    variant === "purple"
      ? "#D8B4FE"
      : variant === "green"
      ? "#FDE047"
      : "#E6683B";

  return (
    <div className="w-full flex items-center justify-between px-5 pt-5 pb-2 relative z-20 shrink-0">
      {/* Left Back Arrow */}
      <div className="w-16 flex items-center justify-start">
        {onBack && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic("selection");
              onBack();
            }}
            aria-label="Go back"
            className={`w-9 h-9 rounded-full flex items-center justify-center transition active:scale-90 cursor-pointer border ${
              isDarkBg
                ? "bg-white/15 hover:bg-white/25 border-white/30 text-white"
                : "bg-white hover:bg-neutral-50 border-[#E6683B]/40 text-[#E6683B] shadow-xs"
            }`}
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* Center Section Title + Wavy Underline */}
      <div className="flex flex-col items-center justify-center text-center">
        <span
          className={`text-sm sm:text-base font-extrabold tracking-tight ${
            isDarkBg ? "text-white" : "text-[#6C0EAD]"
          }`}
        >
          {title}
        </span>
        {/* Double Wavy Underline SVG matching client mockup */}
        <svg
          width="54"
          height="10"
          viewBox="0 0 54 10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mt-0.5"
        >
          <path
            d="M1 3C4.5 0.5 7.5 0.5 11 3C14.5 5.5 17.5 5.5 21 3C24.5 0.5 27.5 0.5 31 3C34.5 5.5 37.5 5.5 41 3C44.5 0.5 47.5 0.5 53 3"
            stroke={waveColor}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M1 7.5C4.5 5 7.5 5 11 7.5C14.5 10 17.5 10 21 7.5C24.5 5 27.5 5 31 7.5C34.5 10 37.5 10 41 7.5C44.5 5 47.5 5 53 7.5"
            stroke={waveColor}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Right Step Indicator Pill */}
      <div className="w-16 flex items-center justify-end">
        {showStepBadge && (
          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-md whitespace-nowrap ${
              isDarkBg
                ? "bg-white/15 text-white/90 border border-white/20"
                : "bg-[#FCEADE] text-[#E6683B]"
            }`}
          >
            {stepText}
          </span>
        )}
      </div>
    </div>
  );
}
