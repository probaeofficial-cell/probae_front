"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Sun, Utensils, Moon } from "lucide-react";

interface BowlCardProps {
  bowl: any;
  index: number;
}

export default function BowlCard({ bowl, index }: BowlCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  // Determine meal type
  const isBreakfast = bowl.mealTypes?.includes("B");
  const isLunch = bowl.mealTypes?.includes("L");

  // --- Colour tokens per meal type ---
  // Breakfast → orange  |  Lunch → green  |  Dinner → purple
  let bannerBg   = "#7C3AED"; // purple default (dinner)
  let accentColor = "#7C3AED";
  let phaseLabel = "DINNER";
  let Icon       = Moon;

  if (isBreakfast) {
    bannerBg    = "#F97316";
    accentColor = "#F97316";
    phaseLabel  = "BREAKFAST";
    Icon        = Sun;
  } else if (isLunch) {
    bannerBg    = "#16A34A";
    accentColor = "#16A34A";
    phaseLabel  = "LUNCH";
    Icon        = Utensils;
  }

  return (
    <div
      className="w-[260px] min-w-[260px] h-[420px] sm:w-[290px] sm:min-w-[290px] sm:h-[440px] md:w-[310px] md:min-w-[310px] md:h-[460px] perspective-1000 cursor-pointer snap-center hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 rounded-[24px]"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div
        className={`w-full h-full relative transition-transform duration-700 preserve-3d ${isFlipped ? "rotate-y-180" : ""}`}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* ── FRONT FACE ───────────────────────────────────────────── */}
        <div
          className={`absolute inset-0 backface-hidden rounded-[24px] flex flex-col shadow-lg overflow-hidden border border-gray-100 transition-opacity duration-300 bg-white ${isFlipped ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        >
          {/* Top Coloured Banner */}
          <div
            className="w-full h-[72px] flex justify-between items-center px-5 shrink-0"
            style={{ backgroundColor: bannerBg }}
          >
            <span className="text-white text-xs font-extrabold tracking-[0.18em] uppercase">
              {phaseLabel}
            </span>
            <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>

          {/* Bowl Image — fills remaining space */}
          <div className="relative w-full flex-1">
            <Image
              src={
                bowl.imageId?.url ||
                "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop"
              }
              alt={bowl.name}
              fill
              className="object-cover"
            />
            {/* Gradient from white at bottom → transparent at top (matches reference) */}
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
          </div>

          {/* Footer */}
          <div className="w-full h-[80px] bg-white flex justify-between items-center px-5 shrink-0">
            <span className="text-[#1A1A1A] text-xs font-bold tracking-widest uppercase line-clamp-2 leading-tight mr-3">
              {bowl.name}
            </span>
            {/* Accent info button */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2"
              style={{ borderColor: accentColor }}
            >
              <span
                className="font-serif italic font-bold text-base leading-none"
                style={{ color: accentColor }}
              >
                i
              </span>
            </div>
          </div>
        </div>

        {/* ── BACK FACE (Macro Details) ─────────────────────────────── */}
        <div
          className={`absolute inset-0 backface-hidden bg-white rounded-[24px] p-6 shadow-lg flex flex-col rotate-y-180 border border-gray-100 overflow-hidden transition-opacity duration-300 ${isFlipped ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          {/* Meal type pill */}
          <div
            className="w-full h-10 rounded-xl flex items-center justify-center mb-4 shrink-0"
            style={{ backgroundColor: bannerBg }}
          >
            <span className="text-white text-xs font-extrabold tracking-[0.18em] uppercase flex items-center gap-2">
              <Icon className="w-4 h-4" strokeWidth={2.5} />
              {phaseLabel}
            </span>
          </div>

          <h4 className="font-bold text-gray-900 text-base mb-4 text-center border-b border-gray-100 pb-3 shrink-0">
            {bowl.name}
          </h4>

          {/* Macros grid */}
          <div className="grid grid-cols-2 gap-3 flex-1 content-start">
            {[
              { label: "Protein", value: bowl.macros?.protein },
              { label: "Carbs",   value: bowl.macros?.carbs },
              { label: "Fats",    value: bowl.macros?.fat },
              { label: "Fiber",   value: bowl.macros?.fiber },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-2xl p-3 flex flex-col items-center justify-center"
                style={{ backgroundColor: `${accentColor}18` }}
              >
                <span
                  className="text-[10px] font-bold uppercase tracking-widest mb-1"
                  style={{ color: accentColor }}
                >
                  {label}
                </span>
                <span className="font-bold text-gray-900 text-xl">
                  {Math.round(value || 0)}g
                </span>
              </div>
            ))}
          </div>

          {/* Calories */}
          <div className="mt-3 mb-3 flex flex-col items-center justify-center bg-gray-50 rounded-2xl py-3 border border-gray-100 shrink-0">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">
              Calories
            </span>
            <span className="font-black text-gray-900 text-3xl">
              {Math.round(bowl.baseCalories || bowl.macros?.calories || 0)}{" "}
              <span className="text-base text-gray-400 font-medium">kcal</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
