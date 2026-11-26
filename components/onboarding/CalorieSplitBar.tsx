"use client";

import React, { useRef } from "react";
import { triggerHaptic } from "@/lib/haptics";

export interface CalorieSplitBarProps {
  slots: string[];
  totalCalories: number;
  split: Record<string, number>;
  onChange: (nextSplit: Record<string, number>) => void;
}

const SLOT_META: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  breakfast: { label: "Breakfast", bg: "bg-[#FDE047]", text: "text-neutral-900" },
  morning_snack: { label: "AM Snack", bg: "bg-[#FDBA74]", text: "text-neutral-900" },
  lunch: { label: "Lunch", bg: "bg-[#E6683B]", text: "text-white" },
  snack: { label: "Snack", bg: "bg-[#41A64E]", text: "text-white" },
  evening_snack: { label: "PM Snack", bg: "bg-[#41A64E]", text: "text-white" },
  dinner: { label: "Dinner", bg: "bg-[#6C0EAD]", text: "text-white" },
};

const MIN_PCT = 10;

export function CalorieSplitBar({
  slots,
  totalCalories,
  split,
  onChange,
}: CalorieSplitBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastStepRef = useRef<string>("");

  const handleDragStart = (dividerIndex: number, startClientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const width = container.getBoundingClientRect().width;
    if (width <= 0) return;

    const leftSlot = slots[dividerIndex];
    const rightSlot = slots[dividerIndex + 1];
    const startLeftPct = split[leftSlot] ?? Math.round(100 / slots.length);
    const startRightPct = split[rightSlot] ?? Math.round(100 / slots.length);
    const combinedPct = startLeftPct + startRightPct;

    const onMove = (clientX: number) => {
      const deltaPx = clientX - startClientX;
      const deltaPct = Math.round((deltaPx / width) * 100);
      let nextLeft = startLeftPct + deltaPct;
      nextLeft = Math.max(MIN_PCT, Math.min(combinedPct - MIN_PCT, nextLeft));
      const nextRight = combinedPct - nextLeft;

      const stepKey = `${leftSlot}:${nextLeft}`;
      if (stepKey !== lastStepRef.current) {
        lastStepRef.current = stepKey;
        triggerHaptic("digit");
        onChange({
          ...split,
          [leftSlot]: nextLeft,
          [rightSlot]: nextRight,
        });
      }
    };

    const handleMouseMove = (ev: MouseEvent) => onMove(ev.clientX);
    const handleTouchMove = (ev: TouchEvent) => {
      if (ev.touches[0]) onMove(ev.touches[0].clientX);
    };

    const cleanup = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", cleanup);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", cleanup);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", cleanup);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", cleanup);
  };

  return (
    <div className="w-full max-w-[340px] mx-auto select-none">
      {/* Main Segmented Bar */}
      <div
        ref={containerRef}
        className="w-full h-52 sm:h-56 rounded-2xl overflow-hidden flex items-stretch relative shadow-md border border-neutral-100 bg-neutral-100"
      >
        {slots.map((slot, idx) => {
          const pct = split[slot] ?? Math.round(100 / slots.length);
          const kcal = Math.round((totalCalories * pct) / 100);
          const meta = SLOT_META[slot] || {
            label: slot,
            bg: "bg-[#6C0EAD]",
            text: "text-white",
          };

          return (
            <React.Fragment key={slot}>
              <div
                style={{ width: `${pct}%` }}
                className={`${meta.bg} ${meta.text} relative flex flex-col items-center justify-center transition-[width] duration-75 overflow-hidden px-1`}
              >
                {/* Vertical rotated label matching client mockup */}
                <span className="-rotate-90 whitespace-nowrap font-extrabold text-xs sm:text-sm tracking-wide">
                  {meta.label}
                </span>

                {/* Live % & kcal pill at bottom */}
                <div className="absolute bottom-2.5 inset-x-0 flex flex-col items-center pointer-events-none">
                  <span className="text-[11px] font-black leading-none tabular-nums">
                    {Math.round(pct)}%
                  </span>
                  <span className="text-[9px] font-bold opacity-80 tabular-nums mt-0.5">
                    {kcal} kcal
                  </span>
                </div>
              </div>

              {/* Draggable Divider Handle between adjacent slots */}
              {idx < slots.length - 1 && (
                <div
                  onMouseDown={(e) => {
                    e.preventDefault();
                    triggerHaptic("selection");
                    handleDragStart(idx, e.clientX);
                  }}
                  onTouchStart={(e) => {
                    if (e.touches[0]) {
                      triggerHaptic("selection");
                      handleDragStart(idx, e.touches[0].clientX);
                    }
                  }}
                  role="separator"
                  aria-orientation="vertical"
                  aria-label={`Adjust split between ${slot} and ${slots[idx + 1]}`}
                  className="w-0 relative z-20 flex items-center justify-center cursor-ew-resize touch-none"
                >
                  <div className="w-6 h-12 rounded-full bg-white shadow-md border border-neutral-200 flex items-center justify-center gap-0.5 hover:scale-110 active:scale-95 transition-transform">
                    <span className="w-[2px] h-4 bg-neutral-400 rounded-full" />
                    <span className="w-[2px] h-4 bg-neutral-400 rounded-full" />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Summary Pills below bar */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {slots.map((slot) => {
          const pct = Math.round(split[slot] ?? Math.round(100 / slots.length));
          const kcal = Math.round((totalCalories * pct) / 100);
          const meta = SLOT_META[slot] || { label: slot, bg: "bg-neutral-200", text: "text-neutral-800" };
          return (
            <div
              key={slot}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 border border-neutral-200/80 text-[11px] font-bold text-neutral-700"
            >
              <span className={`w-2.5 h-2.5 rounded-full ${meta.bg}`} />
              <span>{meta.label}:</span>
              <span className="text-neutral-900 tabular-nums">{kcal} kcal</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
