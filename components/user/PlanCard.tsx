"use client";

import { useState } from "react";
import EnquiryModal from "@/components/user/EnquiryModal";

export interface PlanData {
  ulid: string;
  name: string;
  category: string;
  duration: string;
  days: number;
  plan_type: string;
  included_meal_slots: string[];
  discount_percentage: number;
}

export default function PlanCard({ plan }: { plan: PlanData }) {
  const [isOpen, setIsOpen] = useState(false);
  const mealSlots = Array.from(
    new Map(
      (plan.included_meal_slots || [])
        .map((slot) => slot.trim())
        .filter(Boolean)
        .map((slot) => [slot.toLowerCase(), slot] as const)
    ).values()
  );
  const isPro = plan.category.toLowerCase().includes("pro") || plan.name.toLowerCase().includes("pro") || plan.plan_type === "CUSTOM";
  const accent = isPro ? "#6A0FAD" : "#16A34A";

  return <>
    <article className="relative flex w-full flex-col overflow-hidden rounded-3xl p-6 text-white shadow-lg transition duration-200 hover:-translate-y-1 hover:shadow-xl" style={{ backgroundColor: accent }}>
      {isPro && <span className="absolute right-4 top-4 rounded-full bg-[#FFD700] px-3 py-1 text-[10px] font-black tracking-wide text-neutral-900">MOST NUTRIENT DENSE</span>}
      <div className="mb-5 rounded-2xl bg-white/20 p-5">
        <p className="text-3xl font-black">{plan.days} Day Plan</p>
        <p className="mt-1 text-sm font-medium text-white/80">{plan.duration}</p>
        <div className="mt-4 flex min-h-7 flex-wrap gap-2">
          {mealSlots.map((slot) => <span key={slot.toLowerCase()} className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase">{slot}</span>)}
        </div>
        <p className="mt-4 border-t border-white/20 pt-3 text-sm font-semibold">{mealSlots.length} meal slots included</p>
      </div>
      <h3 className="text-xl font-extrabold">{plan.name}</h3>
      <p className="mt-3 text-2xl font-black">₹— <span className="text-sm font-medium text-white/80">Contact for Pricing</span></p>
      {plan.discount_percentage > 0 && <p className="mt-1 text-sm">Save {plan.discount_percentage}%</p>}
      <button type="button" onClick={() => setIsOpen(true)} className="mt-6 rounded-xl bg-[#FFD700] px-5 py-3 font-extrabold text-neutral-900 transition hover:bg-yellow-300">Choose {plan.name}</button>
    </article>
    <EnquiryModal isOpen={isOpen} onClose={() => setIsOpen(false)} planName={plan.name} />
  </>;
}
