"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { endpoints } from "@/lib/apiService";
import { getMediaUrl } from "@/lib/utils";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { BowlLoader } from "@/components/admin/BowlLoader";

export default function BowlPreviewPage() {
  const { ulid } = useParams() as { ulid: string };
  const router = useRouter();
  const [bowl, setBowl] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBowl() {
      try {
        const data = await endpoints.bowls.getBowl(ulid);
        setBowl(data);
      } catch (err) {
        console.error("Error fetching bowl:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchBowl();
  }, [ulid]);

  if (loading) {
    return (
      <div className="flex flex-col flex-1 h-full overflow-y-auto bg-neutral-50">
      <div className="p-4 sm:p-8 flex flex-col w-full h-full">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <BowlLoader className="w-8 h-8 text-[#6A0FAD]" />
        </div>
      </div>
    </div>
  );
  }

  if (!bowl) {
    return (
      <div className="flex flex-col flex-1 h-full overflow-y-auto bg-neutral-50">
      <div className="p-4 sm:p-8 flex flex-col w-full h-full">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-neutral-500">Bowl not found.</p>
        </div>
      </div>
    </div>
  );
  }

  return (
    <div className="flex flex-col flex-1 h-full overflow-y-auto bg-neutral-50 font-sans">
      <div className="p-4 sm:p-8 flex flex-col w-full">
        <Header />
        <div className="max-w-4xl mx-auto w-full">
          <Breadcrumbs segments={["Bowls", bowl.name, "Preview"]} />

          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 bg-white border border-neutral-200 rounded-xl flex items-center justify-center text-neutral-500 hover:text-[#6A0FAD] hover:border-[#6A0FAD] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
                {bowl.name}
              </h1>
              <p className="text-sm font-medium text-neutral-500 mt-1 uppercase tracking-wider">
                {bowl.code || "NO CODE"} • {bowl.bowl_type}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm mb-8 flex flex-col md:flex-row gap-8">
            {bowl.image_filename ? (
              <img
                src={getMediaUrl(bowl.image_filename) ?? undefined}

                alt={bowl.name}
                className="w-48 h-48 rounded-2xl object-cover bg-neutral-100 border border-neutral-100"
              />
            ) : (
              <div className="w-48 h-48 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-400 font-bold uppercase tracking-widest text-xs">
                No Image
              </div>
            )}

            <div className="flex-1">
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-4 border-b border-neutral-100 pb-2">
                Nutritional Summary
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                  <div className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-1">Calories</div>
                  <div className="text-xl font-black text-neutral-900">{bowl.total_calories || 0} kcal</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                  <div className="text-xs text-orange-600 font-bold uppercase tracking-wider mb-1">Protein</div>
                  <div className="text-xl font-black text-orange-900">{bowl.total_protein || 0}g</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <div className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Carbs</div>
                  <div className="text-xl font-black text-blue-900">{bowl.total_carbs || 0}g</div>
                </div>
                <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                  <div className="text-xs text-green-600 font-bold uppercase tracking-wider mb-1">Fats</div>
                  <div className="text-xl font-black text-green-900">{bowl.total_fats || 0}g</div>
                </div>
              </div>

              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-4 border-b border-neutral-100 pb-2">
                Financials
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Raw Cost</div>
                  <div className="text-base font-bold text-neutral-900">₹{bowl.raw_cost || 0}</div>
                </div>
                <div>
                  <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Fixed Cost</div>
                  <div className="text-base font-bold text-neutral-900">₹{bowl.fixed_cost || 0}</div>
                </div>
                <div>
                  <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Total Cost</div>
                  <div className="text-base font-bold text-[#6A0FAD]">₹{bowl.total_cost || 0}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-neutral-100 bg-neutral-50">
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">Ingredients Detail</h3>
            </div>
            {bowl.ingredients && bowl.ingredients.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50/50 text-[10px] uppercase tracking-wider text-neutral-500 font-bold border-b border-neutral-100">
                    <th className="px-6 py-4">Ingredient</th>
                    <th className="px-6 py-4">Section</th>
                    <th className="px-6 py-4 text-right">Quantity (g/ml)</th>
                    <th className="px-6 py-4 text-right">Calories</th>
                    <th className="px-6 py-4 text-right">Protein</th>
                    <th className="px-6 py-4 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {bowl.ingredients.map((bi: any) => (
                    <tr key={bi.id} className="border-b border-neutral-50 hover:bg-neutral-50/50">
                      <td className="px-6 py-4">
                        <div className="font-bold text-sm text-neutral-900">{bi.ingredient_name}</div>
                        
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-neutral-100 text-neutral-600 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">
                          {bi.section_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-sm text-neutral-900">
                        {bi.weight_g_or_ml}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-sm text-neutral-900">
                        {bi.calories?.toFixed(1) || 0}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-sm text-neutral-900">
                        {bi.protein?.toFixed(1) || 0}g
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-sm text-neutral-900">
                        ₹{bi.cost?.toFixed(2) || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-neutral-500">
                No ingredients added to this bowl yet.
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
