"use client";
import { BowlLoader } from "@/components/admin/BowlLoader";
import React, { useState, useEffect } from "react";
import { Loader2, CheckCircle2, Circle, Clock , Scale, ChefHat} from "lucide-react";
import { endpoints } from "@/lib/apiService";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { ConfirmationModal } from "@/components/ConfirmationModal";

export function KitchenPrepTab({ targetDate }: { targetDate: string }) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mealSlots, setMealSlots] = useState<any[]>([]);
  const [activeSlot, setActiveSlot] = useState<string>("ALL");
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (hasInitialized) {
      fetchData();
    }
  }, [targetDate, activeSlot, hasInitialized]);

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
            foundSlot = cat.slug;
            break;
          }
        }
      }
      setActiveSlot(foundSlot);
    } catch (e) {
      console.error(e);
    } finally {
      setHasInitialized(true);
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

  const [confirmAction, setConfirmAction] = useState<{id: number, status: string, currentWeight?: number} | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const requestUpdateStatus = (ingredientId: number, newStatus: string, currentWeight: number = 0) => {
    setConfirmAction({ id: ingredientId, status: newStatus, currentWeight });
  };

  const handleConfirmUpdate = async () => {
    if (!confirmAction) return;
    setIsUpdating(true);
    try {
      await endpoints.kds.updatePrepStatus(confirmAction.id, confirmAction.status, targetDate, confirmAction.currentWeight);
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
            onClick={() => setActiveSlot(slot.slug)}
            className={`px-5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
              activeSlot === slot.slug ? "bg-[#6A0FAD] text-white" : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
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
              <div key={comp.ingredient_id} className="p-6 transition-colors hover:bg-neutral-50/50">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-extrabold text-xl text-neutral-900">{comp.name}</h3>
                      <div className="px-3 py-1 bg-orange-50 border border-orange-100 rounded-lg flex items-center gap-1.5">
                        <Scale className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-bold text-orange-600">{Number(comp.total_weight_needed).toFixed(1)}g</span>
                      </div>
                    </div>
                    
                    {comp.raw_materials?.length > 0 && (
                      <div className="mt-5 max-w-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <ChefHat className="w-4 h-4 text-neutral-400" />
                          <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Raw Materials Breakdown</h4>
                        </div>
                        <div className="bg-[#FCFAFF] border border-neutral-200 rounded-xl overflow-hidden">
                          <ul className="divide-y divide-neutral-200/60">
                            {comp.raw_materials.map((rm: any) => (
                              <li key={rm.raw_material_id} className="flex justify-between items-center p-3 text-sm hover:bg-white transition-colors">
                                <span className="font-semibold text-neutral-700">{rm.name}</span>
                                <span className="font-mono font-bold text-[#6A0FAD] bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                                  {Number(rm.total_weight_needed).toFixed(1)}g
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center bg-neutral-100 p-1.5 rounded-2xl border border-neutral-200 shadow-sm shrink-0">
                    <button
                      disabled={true}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        comp.status === "UNCOOKED" 
                          ? "bg-white text-red-600 shadow-sm border border-neutral-200/60 cursor-default" 
                          : "text-neutral-400 opacity-60 hidden"
                      }`}
                    >
                      <Circle className="w-4 h-4" /> Uncooked
                    </button>
                    
                    {(comp.status === "UNCOOKED" || comp.status === "PREPARING") && (
                      <button
                        disabled={comp.status === "PREPARING"}
                        onClick={() => requestUpdateStatus(comp.ingredient_id, "PREPARING", comp.total_weight_needed)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                          comp.status === "PREPARING" 
                            ? "bg-white text-yellow-600 shadow-sm border border-neutral-200/60 cursor-default" 
                            : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200/50"
                        }`}
                      >
                        <Clock className="w-4 h-4" /> Preparing
                      </button>
                    )}
                    
                    <button
                      disabled={comp.status === "PREPARED"}
                      onClick={() => requestUpdateStatus(comp.ingredient_id, "PREPARED", comp.total_weight_needed)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        comp.status === "PREPARED" 
                          ? "bg-white text-green-600 shadow-sm border border-neutral-200/60 cursor-default" 
                          : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200/50"
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
