"use client";
import { BowlLoader } from "@/components/admin/BowlLoader";
import React, { useState, useEffect } from "react";
import { Loader2, CheckCircle2, Circle, Clock } from "lucide-react";
import { endpoints } from "@/lib/apiService";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { ConfirmationModal } from "@/components/ConfirmationModal";

export function KitchenPrepTab({ targetDate }: { targetDate: string }) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mealSlots, setMealSlots] = useState<any[]>([]);
  const [activeSlot, setActiveSlot] = useState<string>("ALL");

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (mealSlots.length > 0) {
      fetchData();
    }
  }, [targetDate, activeSlot]);

  const fetchInitialData = async () => {
    try {
      const catData = await endpoints.mealCategories.getMealCategories(1, 100) as any;
      const categories = catData.items || catData.categories || [];
      setMealSlots(categories);

      const now = new Date();
      let foundSlot = "ALL";
      for (const cat of categories) {
        if (cat.time_from && cat.time_to) {
          const [fH, fM] = cat.time_from.split(':').map(Number);
          const [tH, tM] = cat.time_to.split(':').map(Number);
          
          const from = new Date(now);
          from.setHours(fH, fM, 0, 0);
          
          const to = new Date(now);
          to.setHours(tH, tM, 0, 0);
          
          if (to < from) to.setDate(to.getDate() + 1);
          
          if (now >= from && now <= to) {
            foundSlot = cat.name;
            break;
          }
        }
      }
      setActiveSlot(foundSlot);
    } catch (e) {
      console.error(e);
      fetchData(); // fallback
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await endpoints.kds.getPrepList(targetDate, activeSlot) as any;
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const [confirmAction, setConfirmAction] = useState<{id: number, status: string} | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const requestUpdateStatus = (ingredientId: number, newStatus: string) => {
    setConfirmAction({ id: ingredientId, status: newStatus });
  };

  const handleConfirmUpdate = async () => {
    if (!confirmAction) return;
    setIsUpdating(true);
    try {
      await endpoints.kds.updatePrepStatus(confirmAction.id, confirmAction.status, targetDate);
      fetchData();
    } catch (e) {
      console.error("Failed to update status", e);
    } finally {
      setIsUpdating(false);
      setConfirmAction(null);
    }
  };

  if (isLoading) {
    return <div className="p-8 flex justify-center"><BowlLoader className="animate-spin w-8 h-8 text-neutral-400" /></div>;
  }

  if (!data) return <div className="p-8 text-center text-neutral-500">Failed to load prep list.</div>;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        <button
          onClick={() => setActiveSlot("ALL")}
          className={`px-5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
            activeSlot === "ALL" ? "bg-[#6A0FAD] text-white" : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
          }`}
        >
          All Slots
        </button>
        {mealSlots.map(slot => (
          <button
            key={slot.id}
            onClick={() => setActiveSlot(slot.name)}
            className={`px-5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
              activeSlot === slot.name ? "bg-[#6A0FAD] text-white" : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
            }`}
          >
            {slot.name}
            {slot.time_from && slot.time_to && (
              <span className="ml-2 text-xs opacity-70">
                {slot.time_from.substring(0,5)} - {slot.time_to.substring(0,5)}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#6A0FAD]">Total Bowls for Today</h2>
          <p className="text-sm text-neutral-500">Target Date: {targetDate}</p>
        </div>
        <div className="text-3xl font-black text-[#ff751f]">{data.total_bowls}</div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
        <div className="p-4 border-b bg-neutral-50 font-bold text-neutral-700">Components to Prep</div>
        <div className="divide-y divide-neutral-100">
          {data.components?.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">No components needed for today's orders.</div>
          ) : (
            data.components.map((comp: any) => (
              <div key={comp.ingredient_id} className="p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-lg text-neutral-900">{comp.name}</h3>
                    <p className="text-sm text-[#ff751f] font-bold mt-1">Needed: {comp.total_weight_needed}g</p>
                    
                    {comp.raw_materials?.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Raw Materials Breakdown:</p>
                        <ul className="space-y-1">
                          {comp.raw_materials.map((rm: any) => (
                            <li key={rm.raw_material_id} className="text-sm text-neutral-600 flex justify-between max-w-xs">
                              <span>{rm.name}</span>
                              <span className="font-medium">{rm.total_weight_needed}g</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {comp.status === "UNCOOKED" && (
                      <button
                        disabled={true}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold border transition-colors bg-red-50 text-red-600 border-red-200 cursor-default"
                      >
                        <Circle className="w-4 h-4" /> Uncooked
                      </button>
                    )}
                    
                    {(comp.status === "UNCOOKED" || comp.status === "PREPARING") && (
                      <button
                        disabled={comp.status === "PREPARING"}
                        onClick={() => requestUpdateStatus(comp.ingredient_id, "PREPARING")}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold border transition-colors ${
                          comp.status === "PREPARING" ? "bg-yellow-50 text-yellow-600 border-yellow-200 cursor-default" 
                          : "bg-white text-neutral-400 border-neutral-200 hover:bg-neutral-50"
                        }`}
                      >
                        <Clock className="w-4 h-4" /> Preparing
                      </button>
                    )}
                    
                    <button
                      disabled={comp.status === "PREPARED"}
                      onClick={() => requestUpdateStatus(comp.ingredient_id, "PREPARED")}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold border transition-colors ${
                        comp.status === "PREPARED" ? "bg-green-50 text-green-600 border-green-200 cursor-default" 
                        : "bg-white text-neutral-400 border-neutral-200 hover:bg-neutral-50"
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" /> Prepared
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmUpdate}
        title="Confirm Status Change"
        message={`Are you sure you want to mark this item as ${confirmAction?.status}?`}
        type="warning"
        confirmText="Yes, Update"
        cancelText="Cancel"
        isLoading={isUpdating}
      />
    </div>
  );
}
