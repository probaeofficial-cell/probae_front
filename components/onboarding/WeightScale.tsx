"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { triggerHaptic } from "@/lib/haptics";

export interface WeightScaleProps {
  valueKg: number;
  onChange: (kg: number) => void;
  minKg?: number;
  maxKg?: number;
}

const STEP_PX = 14;

export function WeightScale({
  valueKg,
  onChange,
  minKg = 35,
  maxKg = 180,
}: WeightScaleProps) {
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const lastValRef = useRef(valueKg);

  const ticks = React.useMemo(() => {
    const arr: number[] = [];
    for (let i = minKg; i <= maxKg; i++) arr.push(i);
    return arr;
  }, [minKg, maxKg]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || isScrollingRef.current) return;
    const idx = Math.max(0, Math.min(ticks.length - 1, valueKg - minKg));
    el.scrollLeft = idx * STEP_PX;
  }, [valueKg, minKg, ticks.length]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    isScrollingRef.current = true;
    const idx = Math.round(el.scrollLeft / STEP_PX);
    const clampedIdx = Math.max(0, Math.min(ticks.length - 1, idx));
    const nextKg = ticks[clampedIdx];
    if (nextKg !== lastValRef.current) {
      lastValRef.current = nextKg;
      triggerHaptic("digit");
      onChange(nextKg);
    }
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 120);
  }, [ticks, onChange]);

  // Allow mouse wheel horizontal scroll on desktop
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
    }
  };

  const toLbs = (kg: number) => Math.round(kg * 2.20462);

  return (
    <div className="w-full max-w-[300px] mx-auto bg-white rounded-3xl shadow-xl overflow-hidden select-none border border-white/20">
      {/* Top Unit Toggle Header */}
      <div className="bg-white py-3 px-4 flex items-center justify-center border-b border-orange-100/60">
        <div className="inline-flex items-center bg-[#FCEADE] p-1 rounded-lg">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("selection");
              setUnit("kg");
            }}
            className={`px-3.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
              unit === "kg"
                ? "bg-[#E6683B] text-white shadow-xs"
                : "text-[#E6683B] hover:bg-orange-200/40"
            }`}
          >
            kg
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("selection");
              setUnit("lb");
            }}
            className={`px-3.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
              unit === "lb"
                ? "bg-[#E6683B] text-white shadow-xs"
                : "text-[#E6683B] hover:bg-orange-200/40"
            }`}
          >
            lb
          </button>
        </div>
      </div>

      {/* Peach / Cream Scale Body */}
      <div className="bg-[#FCEADE] pt-8 pb-6 relative flex flex-col items-center justify-between">
        {/* Big Active Value Display */}
        <div className="flex flex-col items-center justify-center mb-6">
          <span className="text-5xl font-black text-[#6C0EAD] tracking-tight tabular-nums leading-none">
            {unit === "kg" ? valueKg : toLbs(valueKg)}
          </span>
          <span className="text-base font-extrabold text-[#6C0EAD] mt-1">
            {unit}
          </span>
        </div>

        {/* Horizontal Scrollable Ruler */}
        <div className="relative w-full h-24 flex items-end">
          {/* Center Purple Indicator Line + Bottom Upward Triangle */}
          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-4 bottom-0 flex flex-col items-center justify-end z-20">
            <div className="w-[2.5px] flex-1 bg-[#6C0EAD]" />
            <div className="-mb-1 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[16px] border-b-[#6C0EAD] drop-shadow-md" />
          </div>

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            onWheel={handleWheel}
            className="w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar flex items-end relative z-10 pb-5"
            style={{
              paddingLeft: "calc(50% - 7px)",
              paddingRight: "calc(50% - 7px)",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {ticks.map((kg) => {
              const isMajor = kg % 5 === 0;
              const isSelected = kg === valueKg;
              return (
                <div
                  key={kg}
                  style={{ width: STEP_PX, minWidth: STEP_PX }}
                  onClick={() => {
                    const el = scrollRef.current;
                    if (el) {
                      el.scrollTo({ left: (kg - minKg) * STEP_PX, behavior: "smooth" });
                    }
                  }}
                  className="flex flex-col items-center justify-end snap-center cursor-pointer relative h-full"
                >
                  {isMajor && (
                    <span
                      className={`text-xs font-bold tabular-nums mb-2 transition-opacity ${
                        isSelected ? "opacity-0" : "text-neutral-700"
                      }`}
                    >
                      {unit === "kg" ? kg : toLbs(kg)}
                    </span>
                  )}
                  <div
                    className={`w-[1.5px] transition-all ${
                      isSelected
                        ? "h-10 bg-transparent"
                        : isMajor
                        ? "h-10 bg-neutral-700"
                        : "h-6 bg-neutral-500/60"
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
