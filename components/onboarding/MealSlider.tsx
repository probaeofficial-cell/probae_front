"use client";

import React from "react";
import { triggerHaptic } from "@/lib/haptics";

export interface MealFrequencyOption {
  count: number;
  slots: string[];
  badges: { letter: string; label: string; color: string }[];
}

export const MEAL_FREQUENCY_OPTIONS: MealFrequencyOption[] = [
  {
    count: 5,
    slots: ["breakfast", "morning_snack", "lunch", "snack", "dinner"],
    badges: [
      { letter: "B", label: "Breakfast", color: "bg-[#FACC15] text-neutral-900" },
      { letter: "M", label: "Morning Snack", color: "bg-[#FB923C] text-white" },
      { letter: "L", label: "Lunch", color: "bg-[#E6683B] text-white" },
      { letter: "S", label: "Evening Snack", color: "bg-[#41A64E] text-white" },
      { letter: "D", label: "Dinner", color: "bg-[#6C0EAD] text-white" },
    ],
  },
  {
    count: 4,
    slots: ["breakfast", "lunch", "snack", "dinner"],
    badges: [
      { letter: "B", label: "Breakfast", color: "bg-[#FACC15] text-neutral-900" },
      { letter: "L", label: "Lunch", color: "bg-[#E6683B] text-white" },
      { letter: "S", label: "Evening Snack", color: "bg-[#41A64E] text-white" },
      { letter: "D", label: "Dinner", color: "bg-[#6C0EAD] text-white" },
    ],
  },
  {
    count: 3,
    slots: ["breakfast", "lunch", "dinner"],
    badges: [
      { letter: "B", label: "Breakfast", color: "bg-[#FACC15] text-neutral-900" },
      { letter: "L", label: "Lunch", color: "bg-[#E6683B] text-white" },
      { letter: "D", label: "Dinner", color: "bg-[#6C0EAD] text-white" },
    ],
  },
  {
    count: 2,
    slots: ["lunch", "dinner"],
    badges: [
      { letter: "L", label: "Lunch", color: "bg-[#E6683B] text-white" },
      { letter: "D", label: "Dinner", color: "bg-[#6C0EAD] text-white" },
    ],
  },
];

export interface MealSliderProps {
  value: number;
  onChange: (count: number, slots: string[]) => void;
}

export function MealSlider({ value, onChange }: MealSliderProps) {
  // Active fill percentage from bottom: 2 -> 12%, 3 -> 38%, 4 -> 64%, 5 -> 90%
  const activeIndex = MEAL_FREQUENCY_OPTIONS.findIndex((o) => o.count === value);
  const safeIdx = activeIndex === -1 ? 2 : activeIndex; // default 3 meals
  const fillPercent = ((3 - safeIdx) / 3) * 100;

  return (
    <div className="w-full max-w-[310px] mx-auto flex items-stretch gap-5 py-2 select-none">
      {/* Left Vertical Slider Track */}
      <div className="relative w-10 flex flex-col items-center justify-between py-4 shrink-0">
        {/* Background Lavender Track */}
        <div className="absolute top-6 bottom-6 w-2 rounded-full bg-[#C4B5FD]/60" />

        {/* Active Purple Fill Track (grows from bottom) */}
        <div
          className="absolute bottom-6 w-2 rounded-full bg-[#6C0EAD] transition-all duration-300"
          style={{ height: `calc((100% - 48px) * ${fillPercent / 100})` }}
        />

        {/* Stops */}
        {MEAL_FREQUENCY_OPTIONS.map((opt) => {
          const isSelected = opt.count === value;
          return (
            <button
              key={opt.count}
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                onChange(opt.count, opt.slots);
              }}
              aria-label={`${opt.count} meals per day`}
              className="relative z-10 w-10 h-10 flex items-center justify-center cursor-pointer focus:outline-none"
            >
              {isSelected ? (
                <div className="w-9 h-9 rounded-full bg-[#6C0EAD] text-white font-black text-base flex items-center justify-center shadow-lg ring-4 ring-[#6C0EAD]/20 transition-transform scale-110">
                  {opt.count}
                </div>
              ) : (
                <div className="w-3 h-3 rounded-full bg-white border-2 border-[#A78BFA] hover:scale-125 transition-transform" />
              )}
            </button>
          );
        })}
      </div>

      {/* Right Meal Slot Pill Rows */}
      <div className="flex-1 flex flex-col justify-between gap-4 py-1">
        {MEAL_FREQUENCY_OPTIONS.map((opt) => {
          const isSelected = opt.count === value;
          return (
            <button
              key={opt.count}
              type="button"
              onClick={() => {
                triggerHaptic("selection");
                onChange(opt.count, opt.slots);
              }}
              className={`flex items-center gap-2 p-2.5 rounded-2xl transition-all cursor-pointer border text-left ${
                isSelected
                  ? "bg-purple-50/90 border-[#6C0EAD]/30 shadow-sm scale-[1.02]"
                  : "bg-transparent border-transparent opacity-65 hover:opacity-100"
              }`}
            >
              <span className="text-neutral-400 font-bold text-xs mr-1">—</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {opt.badges.map((b, idx) => (
                  <span
                    key={idx}
                    title={b.label}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-extrabold text-xs shadow-xs ${b.color}`}
                  >
                    {b.letter}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
