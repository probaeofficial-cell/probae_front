"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { triggerHaptic } from "@/lib/haptics";

export interface TumblerPickerProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
}

const ITEM_HEIGHT = 48;

export function TumblerPicker({
  value,
  onChange,
  min = 14,
  max = 99,
}: TumblerPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const lastValueRef = useRef(value);

  const numbers = React.useMemo(() => {
    const arr: number[] = [];
    for (let i = min; i <= max; i++) arr.push(i);
    return arr;
  }, [min, max]);

  // Sync scroll position when mounted or when external value changes without user scrolling
  useEffect(() => {
    const el = containerRef.current;
    if (!el || isScrollingRef.current) return;
    const idx = Math.max(0, Math.min(numbers.length - 1, value - min));
    el.scrollTop = idx * ITEM_HEIGHT;
  }, [value, min, numbers.length]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    isScrollingRef.current = true;
    const idx = Math.round(el.scrollTop / ITEM_HEIGHT);
    const clampedIdx = Math.max(0, Math.min(numbers.length - 1, idx));
    const nextVal = numbers[clampedIdx];
    if (nextVal !== lastValueRef.current) {
      lastValueRef.current = nextVal;
      triggerHaptic("digit");
      onChange(nextVal);
    }
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 120);
  }, [numbers, onChange]);

  const scrollToValue = (targetVal: number) => {
    const el = containerRef.current;
    if (!el) return;
    const idx = Math.max(0, Math.min(numbers.length - 1, targetVal - min));
    el.scrollTo({ top: idx * ITEM_HEIGHT, behavior: "smooth" });
    if (targetVal !== lastValueRef.current) {
      lastValueRef.current = targetVal;
      triggerHaptic("digit");
      onChange(targetVal);
    }
  };

  return (
    <div className="relative w-full max-w-[240px] mx-auto h-[336px] select-none flex items-center justify-center">
      {/* Center Active Purple Pill Overlay */}
      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-[132px] h-[52px] bg-[#6C0EAD] rounded-2xl shadow-lg flex items-center justify-between z-10">
        {/* Left inward-pointing purple triangle */}
        <div
          className="-ml-3 w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[12px] border-l-[#9333EA]"
        />
        {/* Right inward-pointing purple triangle */}
        <div
          className="-mr-3 w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-r-[12px] border-r-[#9333EA]"
        />
      </div>

      {/* Scrollable Tumbler List */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full h-full overflow-y-auto snap-y snap-mandatory no-scrollbar relative z-20"
        style={{
          paddingTop: ITEM_HEIGHT * 3,
          paddingBottom: ITEM_HEIGHT * 3,
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {numbers.map((num) => {
          const distance = Math.abs(num - value);
          const isActive = distance === 0;
          const opacityClass =
            isActive
              ? "text-white font-black text-2xl scale-110"
              : distance === 1
              ? "text-neutral-800 font-bold text-xl"
              : distance === 2
              ? "text-neutral-400 font-semibold text-base"
              : "text-neutral-300 font-medium text-sm";

          return (
            <button
              key={num}
              type="button"
              onClick={() => scrollToValue(num)}
              style={{ height: ITEM_HEIGHT }}
              className={`w-full flex items-center justify-center snap-center transition-all duration-150 cursor-pointer ${opacityClass}`}
            >
              {num}
            </button>
          );
        })}
      </div>
    </div>
  );
}
