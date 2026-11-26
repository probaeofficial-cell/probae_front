"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { triggerHaptic } from "@/lib/haptics";

export interface HeightRulerProps {
  valueCm: number;
  onChange: (cm: number) => void;
  minCm?: number;
  maxCm?: number;
}

const STEP_PX = 12;

export function HeightRuler({
  valueCm,
  onChange,
  minCm = 120,
  maxCm = 220,
}: HeightRulerProps) {
  const [unit, setUnit] = useState<"cm" | "ft">("cm");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const lastValRef = useRef(valueCm);

  const ticks = React.useMemo(() => {
    const arr: number[] = [];
    for (let i = minCm; i <= maxCm; i++) arr.push(i);
    return arr;
  }, [minCm, maxCm]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || isScrollingRef.current) return;
    const idx = Math.max(0, Math.min(ticks.length - 1, valueCm - minCm));
    el.scrollTop = idx * STEP_PX;
  }, [valueCm, minCm, ticks.length]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    isScrollingRef.current = true;
    const idx = Math.round(el.scrollTop / STEP_PX);
    const clampedIdx = Math.max(0, Math.min(ticks.length - 1, idx));
    const nextCm = ticks[clampedIdx];
    if (nextCm !== lastValRef.current) {
      lastValRef.current = nextCm;
      triggerHaptic("digit");
      onChange(nextCm);
    }
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 120);
  }, [ticks, onChange]);

  const formatFeetInches = (cm: number) => {
    const totalInches = Math.round(cm / 2.54);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    return `${feet}' ${inches}"`;
  };

  return (
    <div className="w-full max-w-[280px] mx-auto bg-white rounded-3xl shadow-xl overflow-hidden select-none border border-white/20">
      {/* Top Unit Toggle Header */}
      <div className="bg-white py-3 px-4 flex items-center justify-center border-b border-orange-100/60">
        <div className="inline-flex items-center bg-[#FCEADE] p-1 rounded-lg">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("selection");
              setUnit("cm");
            }}
            className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
              unit === "cm"
                ? "bg-[#E6683B] text-white shadow-xs"
                : "text-[#E6683B] hover:bg-orange-200/40"
            }`}
          >
            cm
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("selection");
              setUnit("ft");
            }}
            className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
              unit === "ft"
                ? "bg-[#E6683B] text-white shadow-xs"
                : "text-[#E6683B] hover:bg-orange-200/40"
            }`}
          >
            ft
          </button>
        </div>
      </div>

      {/* Peach / Cream Ruler Body */}
      <div className="bg-[#FCEADE] relative h-[320px] flex items-center">
        {/* Left Active Value Display */}
        <div className="w-1/2 pl-5 pr-2 flex flex-col items-start justify-center pointer-events-none z-20">
          <span className="text-2xl sm:text-3xl font-black text-[#6C0EAD] tracking-tight">
            {unit === "cm" ? `${valueCm} cm` : formatFeetInches(valueCm)}
          </span>
          <span className="text-[11px] font-semibold text-[#6C0EAD]/60 mt-1">
            {unit === "cm" ? formatFeetInches(valueCm) : `${valueCm} cm`}
          </span>
        </div>

        {/* Center Active Horizontal Purple Line & Right Triangle Indicator */}
        <div className="pointer-events-none absolute left-[48%] right-0 top-1/2 -translate-y-1/2 flex items-center justify-end z-20">
          <div className="w-full h-[2.5px] bg-[#6C0EAD]" />
          <div className="-mr-1 w-0 h-0 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent border-r-[16px] border-r-[#6C0EAD] drop-shadow-md" />
        </div>

        {/* Scrollable Vertical Ruler */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="w-1/2 h-full overflow-y-auto snap-y snap-mandatory no-scrollbar relative z-10 pr-5"
          style={{
            paddingTop: 160 - STEP_PX / 2,
            paddingBottom: 160 - STEP_PX / 2,
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {ticks.map((cm) => {
            const isMajor = cm % 5 === 0;
            const isSelected = cm === valueCm;
            return (
              <div
                key={cm}
                style={{ height: STEP_PX }}
                onClick={() => {
                  const el = scrollRef.current;
                  if (el) {
                    el.scrollTo({ top: (cm - minCm) * STEP_PX, behavior: "smooth" });
                  }
                }}
                className="flex items-center justify-end gap-2.5 snap-center cursor-pointer"
              >
                {isMajor && !isSelected && (
                  <span className="text-xs font-bold text-neutral-700 tabular-nums">
                    {unit === "cm" ? cm : formatFeetInches(cm)}
                  </span>
                )}
                <div
                  className={`h-[1.5px] transition-all ${
                    isSelected
                      ? "w-8 bg-transparent"
                      : isMajor
                      ? "w-7 bg-neutral-700"
                      : "w-4 bg-neutral-500/60"
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
