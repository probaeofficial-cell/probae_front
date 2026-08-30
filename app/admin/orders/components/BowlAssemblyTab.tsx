"use client";
import { BowlLoader } from "@/components/admin/BowlLoader";
import React, { useState, useEffect } from "react";
import { Loader2, Package } from "lucide-react";
import { endpoints } from "@/lib/apiService";

export function BowlAssemblyTab({ targetDate }: { targetDate: string }) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [targetDate]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await endpoints.kds.getAssemblyList(targetDate) as any;
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 flex justify-center"><BowlLoader className="animate-spin w-8 h-8 text-neutral-400" /></div>;
  }

  if (!data) return <div className="p-8 text-center text-neutral-500">Failed to load assembly list.</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#6A0FAD]">Total Bowls to Assemble Today</h2>
          <p className="text-sm text-neutral-500">Target Date: {targetDate}</p>
        </div>
        <div className="text-3xl font-black text-[#ff751f]">{data.total_bowls}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data.bowls?.length === 0 ? (
          <div className="col-span-full p-8 text-center text-neutral-500 bg-white rounded-2xl border">No bowls needed for today's orders.</div>
        ) : (
          data.bowls.map((bowl: any) => (
            <div key={bowl.bowl_id} className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden flex flex-col">
              <div className="p-4 border-b bg-neutral-50 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-bold text-neutral-900 text-lg">{bowl.bowl_name}</h3>
                  <div className="flex items-center gap-1.5 mt-1 text-sm text-neutral-500">
                    <Package className="w-4 h-4" />
                    <span>Packaging: {bowl.packaging_name || "None Selected"}</span>
                  </div>
                </div>
                <div className="bg-[#ff751f] text-white px-3 py-1 rounded-lg font-black text-xl">
                  x{bowl.quantity}
                </div>
              </div>
              <div className="p-4 flex-1">
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Total Components Needed for all {bowl.quantity}:</p>
                <div className="space-y-2">
                  {bowl.components?.map((comp: any) => (
                    <div key={comp.ingredient_id} className="flex items-center justify-between py-2 border-b border-neutral-50 last:border-0">
                      <span className="text-sm font-medium text-neutral-700">{comp.name}</span>
                      <span className="text-sm font-bold text-[#6A0FAD]">{comp.weight_needed}g</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
