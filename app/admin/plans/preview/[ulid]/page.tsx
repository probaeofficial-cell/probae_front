"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Edit, Salad as BowlIcon } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { endpoints } from "@/lib/apiService";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ProbaeButton } from "@/components/admin/ProbaeButton";

const getTypeName = (t: string) => t === 'B' ? 'Breakfast' : t === 'L' ? 'Lunch' : 'Dinner';
const getTotalDeliveredDays = (duration: string, daysPerWeek: number) => {
  if (duration.toLowerCase() === "monthly") return (daysPerWeek * 4) + 2;
  return daysPerWeek;
};

export default function PlanPreviewPage() {
  const router = useRouter();
  const params = useParams();
  const ulid = params.ulid as string;

  const [tier, setTier] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    endpoints.planTiers.get(ulid).then((data:any) => {
      if (data.success) setTier(data.tier);
    }).finally(() => setIsLoading(false));
  }, [ulid]);

  if (isLoading) {
    return <div className="p-10 text-center">Loading plan details...</div>;
  }

  if (!tier) {
    return <div className="p-10 text-center text-red-500">Plan not found.</div>;
  }

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        <Header />
        <Breadcrumbs segments={["Admin", "Plan Tiers", "Preview"]} />
        <div className="mt-4 flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-neutral-900">Plan Details</h1>
          <p className="text-sm text-neutral-500">View configuration for {tier.name}</p>
        </div>
        <ProbaeButton className="!w-auto" onClick={() => router.push(`/admin/plans/builder/${tier._id}`)}>
          <Edit className="w-4 h-4 mr-2" /> Edit Plan
        </ProbaeButton>
      </div>

      <div className="flex-1 overflow-auto bg-white pt-4">
        <div className="bg-[#f8f5fb] rounded-3xl p-8 mb-8 border border-neutral-100">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-8">
            <div>
              <h2 className="text-3xl font-black text-neutral-900 mb-2">{tier.name}</h2>
              <span className="px-4 py-1.5 bg-[#6b21a8]/10 text-[#6b21a8] rounded-full text-sm font-bold uppercase tracking-widest">
                {tier.category}
              </span>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1">Total Price</p>
              <p className="text-3xl font-black text-neutral-900">₹{tier.totalPrice?.toFixed(2)}</p>
              {tier.discountPrice > 0 && (
                <p className="text-sm font-bold text-emerald-600">Discounted: ₹{tier.discountPrice.toFixed(2)}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">Duration</p>
              <p className="text-lg font-bold text-neutral-900 capitalize">{tier.duration}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">Days</p>
              <p className="text-lg font-bold text-neutral-900">{getTotalDeliveredDays(tier.duration, tier.days)} Days</p>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm col-span-2 sm:col-span-2">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">Meal Types Included</p>
              <p className="text-lg font-bold text-neutral-900">{tier.mealType}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {(tier.selections || []).map((sel: any, idx: number) => (
            <div key={idx} className="border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="bg-neutral-50 border-b border-neutral-200 px-8 py-5 flex justify-between items-center">
                <h3 className="text-xl font-bold text-neutral-900">{getTypeName(sel.type)} Schedule</h3>
                <span className="px-4 py-1.5 bg-white border border-neutral-200 rounded-full text-sm font-bold text-neutral-600 shadow-sm">
                  {sel.bowls.length} Days
                </span>
              </div>
              <div className="p-8 space-y-4 bg-white">
                {sel.bowls.map((bowl: any, bIdx: number) => (
                  <div key={bIdx} className="flex items-center gap-6 p-4 rounded-2xl border border-neutral-100 hover:border-neutral-200 hover:shadow-md transition-all">
                    <div className="w-16 text-center shrink-0 border-r border-neutral-100 pr-6">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">Day</span>
                      <span className="text-xl font-black text-neutral-900">{bIdx + 1}</span>
                    </div>
                    <div className="w-16 h-16 rounded-xl bg-neutral-100 overflow-hidden shrink-0">
                      {bowl.imageId?.url && <img src={bowl.imageId.url} alt={bowl.name} className="w-full h-full object-cover" />}
                    </div>
                    <div>
                      <p className="font-bold text-neutral-900 text-lg mb-1">{bowl.name}</p>
                      <p className="text-sm font-medium text-neutral-500">₹{bowl.basePrice?.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
      </div>
    </div>
  );
}