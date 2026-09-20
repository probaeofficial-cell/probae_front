"use client";

import { useState, useEffect } from "react";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { Header } from "@/components/admin/Header";
import { Save, Tag, Percent, ArrowLeft } from "lucide-react";
import { endpoints } from "@/lib/apiService";
import { ProbaeButton } from "@/components/ProbaeButton";
import { useRouter, useParams } from "next/navigation";
import { ConfirmationModal } from "@/components/ConfirmationModal";

const MEAL_SLOTS = ["breakfast", "lunch", "snack", "dinner"];

export default function EditPlanTierPage() {
  const router = useRouter();
  const params = useParams();
  const ulid = params.ulid as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    category: "Core",
    duration: "WEEKLY",
    days: 5,
    plan_type: "STANDARD",
    included_meal_slots: ["lunch"],
    discount_percentage: 0
  });

  const [isSaving, setIsSaving] = useState(false);
  
  // Modal states
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: "success" | "warning" | "error" | "info";
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ isOpen: false, type: "info", title: "", message: "" });
  
  useEffect(() => {
    if (ulid) fetchTier();
  }, [ulid]);

  const fetchTier = async () => {
    try {
      const res: any = await endpoints.planTiers.get(ulid);
      if (res) { // sometimes it might just be the direct object, adapt according to API
        const tier = res.tier || res;
        setFormData({
          name: tier.name,
          category: tier.category,
          duration: tier.duration,
          days: tier.days,
          plan_type: tier.plan_type,
          included_meal_slots: tier.included_meal_slots || [],
          discount_percentage: tier.discount_percentage || 0
        });
      }
    } catch (err) {
      console.error(err);
      setModalState({
        isOpen: true,
        type: "error",
        title: "Error",
        message: "Failed to load Plan Tier."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMealSlot = (slot: string) => {
    setFormData(prev => {
      const current = [...prev.included_meal_slots];
      if (current.includes(slot)) {
        return { ...prev, included_meal_slots: current.filter(s => s !== slot) };
      } else {
        return { ...prev, included_meal_slots: [...current, slot] };
      }
    });
  };

  const handleSave = async () => {
    if (!formData.name || formData.included_meal_slots.length === 0) {
      setModalState({
        isOpen: true,
        type: "error",
        title: "Validation Error",
        message: "Please provide a name and select at least one meal slot."
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      await endpoints.planTiers.update(ulid, formData);
      setModalState({
        isOpen: true,
        type: "success",
        title: "Success",
        message: "Plan Tier updated successfully!",
        onConfirm: () => router.push("/admin/plans/builder")
      });
    } catch (err: any) {
      console.error(err);
      setModalState({
        isOpen: true,
        type: "error",
        title: "Error",
        message: err.message || "Failed to update Plan Tier"
      });
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        <Header />
        
        <div className="mt-4 flex flex-col flex-1 min-h-0">
          <Breadcrumbs segments={["Plans", "Plan Tiers", "Edit"]} />
          
          <div className="flex items-center justify-between mb-8 shrink-0">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push("/admin/plans/builder")} className="p-2 rounded-xl bg-neutral-100 text-neutral-500 hover:bg-neutral-200 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Edit Plan Tier</h1>
                <p className="text-sm font-medium text-neutral-500 mt-1">Configure subscription metadata and included meals</p>
              </div>
            </div>
            <ProbaeButton onClick={handleSave} disabled={isSaving || isLoading} className="!w-auto flex items-center gap-2 h-[48px]">
              <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save Changes"}
            </ProbaeButton>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin max-w-3xl">
            {isLoading ? (
              <div className="flex justify-center p-12 text-[#6A0FAD]">
                Loading...
              </div>
            ) : (
              <div className="bg-neutral-50/50 border border-neutral-200 rounded-3xl p-8 space-y-8">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Plan Name</label>
                    <div className="relative">
                      <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                      <input 
                        type="text" 
                        placeholder="e.g. Executive Weight Loss"
                        value={formData.name}
                        onChange={e => setFormData(p => ({...p, name: e.target.value}))}
                        className="w-full bg-white border border-neutral-200 rounded-xl pl-12 pr-4 py-3 h-[48px] text-neutral-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Category</label>
                    <select 
                      value={formData.category}
                      onChange={e => setFormData(p => ({...p, category: e.target.value}))}
                      className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 h-[48px] text-neutral-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]"
                    >
                      <option value="Core">Core</option>
                      <option value="Pro">Pro</option>
                      <option value="Performance">Performance</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Duration</label>
                    <div className="flex gap-2">
                      {["WEEKLY", "MONTHLY"].map(d => (
                        <button 
                          key={d}
                          onClick={() => setFormData(p => ({ ...p, duration: d, days: d === "WEEKLY" ? 5 : 22 }))}
                          className={`flex-1 py-3 h-[48px] rounded-xl text-sm font-bold transition-colors ${formData.duration === d ? 'bg-[#6A0FAD] text-white shadow-md' : 'bg-white border border-neutral-200 text-neutral-600 hover:border-[#6A0FAD]/30'}`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Days Delivered</label>
                    <div className="flex gap-2">
                      {(formData.duration === "WEEKLY" ? [5, 6, 7] : [22, 26, 30]).map(d => (
                        <button 
                          key={d}
                          onClick={() => setFormData(p => ({ ...p, days: d }))}
                          className={`flex-1 py-3 h-[48px] rounded-xl text-sm font-bold transition-colors ${formData.days === d ? 'bg-[#6A0FAD] text-white shadow-md' : 'bg-white border border-neutral-200 text-neutral-600 hover:border-[#6A0FAD]/30'}`}
                        >
                          {d} Days
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Plan Type</label>
                    <div className="flex gap-2">
                      {["STANDARD", "CUSTOM"].map(t => (
                        <button 
                          key={t}
                          onClick={() => setFormData(p => ({ ...p, plan_type: t }))}
                          className={`flex-1 py-3 h-[48px] rounded-xl text-sm font-bold transition-colors ${formData.plan_type === t ? 'bg-[#6A0FAD] text-white shadow-md' : 'bg-white border border-neutral-200 text-neutral-600 hover:border-[#6A0FAD]/30'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-neutral-500 mt-2 font-medium">
                      {formData.plan_type === "STANDARD" 
                        ? "Standard plans use default 500kcal bowls." 
                        : "Custom plans use dynamically scaled bowls to hit exact calorie targets."}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Discount (%)</label>
                    <div className="relative">
                      <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        value={formData.discount_percentage}
                        onChange={e => setFormData(p => ({...p, discount_percentage: parseFloat(e.target.value) || 0}))}
                        className="w-full bg-white border border-neutral-200 rounded-xl pl-12 pr-4 py-3 h-[48px] text-neutral-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]" 
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-3">Included Meal Slots</label>
                  <div className="flex flex-wrap gap-3">
                    {MEAL_SLOTS.map(slot => {
                      const isSelected = formData.included_meal_slots.includes(slot);
                      return (
                        <button
                          key={slot}
                          onClick={() => toggleMealSlot(slot)}
                          className={`px-5 py-3 h-[48px] rounded-xl text-sm font-bold transition-all ${
                            isSelected 
                              ? 'bg-[#6A0FAD] text-white shadow-md' 
                              : 'bg-white border border-neutral-200 text-neutral-600 hover:border-[#6A0FAD]/30 hover:bg-[#6A0FAD]/5'
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                  {formData.included_meal_slots.length === 0 && (
                    <p className="text-xs text-red-500 mt-2 font-bold">You must select at least one meal slot.</p>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
      
      <ConfirmationModal
        isOpen={modalState.isOpen}
        onClose={modalState.onConfirm || (() => setModalState(prev => ({ ...prev, isOpen: false })))}
        onConfirm={modalState.onConfirm || (() => setModalState(prev => ({ ...prev, isOpen: false })))}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
      />
    </div>
  );
}
