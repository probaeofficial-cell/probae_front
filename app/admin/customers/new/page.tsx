"use client";

import React, { useState } from "react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { ArrowRight, ArrowLeft, Check, Plus, Lock, Unlock, Loader2 } from "lucide-react";
import { endpoints } from "@/lib/apiService";
import { useRouter } from "next/navigation";

export default function NewCustomerPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customAllergy, setCustomAllergy] = useState("");
  const [calorieProfile, setCalorieProfile] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    sex: "Male",
    age: "25",
    height: "180",
    weight: "75",
    activityLevel: "Lightly Active",
    goal: "Muscle Gain",
    dietaryPreferences: [] as string[],
    allergies: [] as string[],
    comments: "",
    planDuration: "WEEKLY",
    planFrequency: "5 DAYS",
    mealSlots: ["LUNCH"] as string[],
    mealCalories: { "LUNCH": 500 } as Record<string, number>,
    lockedMeals: {} as Record<string, boolean>,
    selectedPlanId: null as string | null,
    status: "ONBOARDING"
  });

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayField = (field: "dietaryPreferences" | "allergies" | "mealSlots", value: string) => {
    setFormData((prev) => {
      const current = prev[field] as string[];
      if (current.includes(value)) {
        const newArray = current.filter((item) => item !== value);
        if (field === "mealSlots") {
          const newCalories = { ...prev.mealCalories };
          delete newCalories[value];
          return { ...prev, [field]: newArray, mealCalories: newCalories };
        }
        return { ...prev, [field]: newArray };
      } else {
        if (field === "dietaryPreferences") {
          if (value === "No Restrictions") return { ...prev, [field]: ["No Restrictions"] };
          const filtered = current.filter((item) => item !== "No Restrictions");
          return { ...prev, [field]: [...filtered, value] };
        }
        const newArray = [...current, value];
        if (field === "mealSlots") {
          const newCalories = { ...prev.mealCalories };
          if (calorieProfile?.total) {
            newCalories[value] = Math.round(calorieProfile.total / 3);
          } else {
            newCalories[value] = 500;
          }
          return { ...prev, [field]: newArray, mealCalories: newCalories };
        }
        return { ...prev, [field]: newArray };
      }
    });
  };

  const addCustomAllergy = () => {
    if (customAllergy.trim() && !formData.allergies.includes(customAllergy.trim())) {
      toggleArrayField("allergies", customAllergy.trim());
      setCustomAllergy("");
    }
  };

  const calculateCalories = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await endpoints.customers.calculateCalories({
      
        sex: formData.sex,
        age: parseInt(formData.age),
        height: parseFloat(formData.height),
        weight: parseFloat(formData.weight),
        activity_level: formData.activityLevel,
        goal: formData.goal
      }) as any;
      if (res) {
        setCalorieProfile(res);
        
        // Setup initial slots
        setFormData((prev) => {
          const newCalories = { ...prev.mealCalories };
          if (prev.mealSlots.length > 0) {
            const perSlot = Math.round(res.total / 3);
            prev.mealSlots.forEach((slot) => {
              if (!newCalories[slot] || newCalories[slot] === 500) {
                newCalories[slot] = perSlot;
              }
            });
          }
          return { ...prev, mealCalories: newCalories };
        });
        setStep(3);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };


  const getExpectedMealType = (slots: string[]) => {
    const hasB = slots.includes("B-FAST");
    const hasL = slots.includes("LUNCH");
    const hasD = slots.includes("DINNER");
    if (hasB && hasL && hasD) return "Breakfast + Lunch + Dinner";
    if (hasB && hasL) return "Breakfast + Lunch";
    if (hasL && hasD) return "Lunch + Dinner";
    if (hasB && hasD) return "Breakfast + Dinner";
    if (hasB) return "Breakfast Only";
    if (hasL) return "Lunch Only";
    if (hasD) return "Dinner Only";
    return "";
  };

  const loadPlans = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingPlans(true);
    setStep(4);
    
    try {
      const listRes = await endpoints.planTiers.list({ limit: 100 }) as any;
      if (listRes.success) {
        const days = parseInt(formData.planFrequency.split(" ")[0]);
        const matched = listRes.tiers.filter((t: any) => 
          t.duration.toUpperCase() === formData.planDuration && 
          t.days === days &&
          t.mealType === getExpectedMealType(formData.mealSlots)
        );
        setPlans(matched);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const handleSaveCustomer = async (skipPlan = false) => {
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      const payload = {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        sex: formData.sex,
        age: parseInt(formData.age),
        height: parseFloat(formData.height),
        weight: parseFloat(formData.weight),
        activity_level: formData.activityLevel,
        goal: formData.goal,
        dietary_preferences: formData.dietaryPreferences,
        allergies: formData.allergies,
        chef_instructions: formData.comments,
        calorie_profile: calorieProfile,
        selected_plan_id: skipPlan ? null : formData.selectedPlanId,
        status: skipPlan ? "PENDING_PLAN" : "ACTIVE"
      };

      await endpoints.customers.create(payload);
      router.push("/admin/customers");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.detail || err?.message || "Failed to save customer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const commonAllergies = ["Peanuts", "Dairy", "Shellfish", "Tree Nuts", "Eggs", "Soy", "Wheat"];
  const dietaryOptions = ["No Restrictions", "Vegan", "Keto", "Gluten-Free", "Paleo", "Low Carb"];
  const goals = ["Weight Loss", "Muscle Gain", "Maintenance"];

    return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        <Header />
        <Breadcrumbs segments={["Admin", "Customers", "New"]} />
        <div className="mt-4 flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-4xl w-full mx-auto pb-12">
<div className="flex items-center gap-3 mb-8">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className={`h-2.5 rounded-full transition-all duration-500 ${step >= s ? "w-10 bg-[#6A0FAD]" : "w-2.5 bg-neutral-300"}`} />
              ))}
            </div>

            {step === 1 && (
              <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-6">
                <h2 className="text-2xl font-bold text-neutral-900 mb-6">Biological Profile</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Full Name</label>
                    <input type="text" required value={formData.name} onChange={(e) => updateField("name", e.target.value)} className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Phone</label>
                    <input type="tel" required value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]" />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Address</label>
                    <textarea required value={formData.address} onChange={(e) => updateField("address", e.target.value)} className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]" rows={3} />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 col-span-1 md:col-span-2">
                    <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Biological Sex</label>
                      <div className="flex gap-2">
                        {["Male", "Female"].map(s => (
                          <button type="button" key={s} onClick={() => updateField("sex", s)} className={`flex-1 py-3 rounded-xl border text-sm font-bold ${formData.sex === s ? "bg-[#6A0FAD] text-white border-[#6A0FAD]" : "bg-white text-neutral-600 border-neutral-300"}`}>{s}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Age</label>
                      <input type="number" required value={formData.age} onChange={(e) => updateField("age", e.target.value)} className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Height (cm)</label>
                      <input type="number" required value={formData.height} onChange={(e) => updateField("height", e.target.value)} className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Weight (kg)</label>
                      <input type="number" required value={formData.weight} onChange={(e) => updateField("weight", e.target.value)} className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]" />
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Activity Level</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {["Sedentary", "Lightly Active", "Active", "Very Active"].map(l => (
                        <button type="button" key={l} onClick={() => updateField("activityLevel", l)} className={`py-3 rounded-xl border text-xs font-bold ${formData.activityLevel === l ? "bg-[#6A0FAD] text-white border-[#6A0FAD]" : "bg-white text-neutral-600 border-neutral-300"}`}>{l}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <ProbaeButton  type="submit" className="!w-auto flex items-center gap-2">
                    Continue <ArrowRight className="w-4 h-4" />
                  </ProbaeButton>
                </div>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={calculateCalories} className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <button type="button" onClick={() => setStep(1)} className="p-2 hover:bg-neutral-200 rounded-full"><ArrowLeft className="w-5 h-5 text-neutral-600" /></button>
                  <h2 className="text-2xl font-bold text-neutral-900">Dietary Profile</h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Goal</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {goals.map(g => (
                        <button type="button" key={g} onClick={() => updateField("goal", g)} className={`py-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 ${formData.goal === g ? "bg-[#6A0FAD] text-white border-[#6A0FAD]" : "bg-white text-neutral-600 border-neutral-300"}`}>
                          {formData.goal === g && <Check className="w-4 h-4" />} {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Dietary Preferences</label>
                    <div className="flex flex-wrap gap-2">
                      {dietaryOptions.map(d => (
                        <button type="button" key={d} onClick={() => toggleArrayField("dietaryPreferences", d)} className={`px-4 py-2 rounded-full border text-xs font-bold ${formData.dietaryPreferences.includes(d) ? "bg-[#ff751f] text-white border-[#ff751f]" : "bg-white text-neutral-600 border-neutral-300"}`}>{d}</button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Allergies</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {commonAllergies.map(a => (
                        <button type="button" key={a} onClick={() => toggleArrayField("allergies", a)} className={`px-4 py-2 rounded-full border text-xs font-bold ${formData.allergies.includes(a) ? "bg-red-500 text-white border-red-500" : "bg-white text-neutral-600 border-neutral-300"}`}>{a}</button>
                      ))}
                    </div>
                    <div className="flex gap-2 max-w-xs">
                      <input type="text" value={customAllergy} onChange={(e) => setCustomAllergy(e.target.value)} placeholder="Custom allergy" className="flex-1 bg-[#f8f5fb] border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]" />
                      <button type="button" onClick={addCustomAllergy} className="bg-neutral-800 text-white px-3 py-2 rounded-lg"><Plus className="w-4 h-4" /></button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Chef Instructions</label>
                    <textarea value={formData.comments} onChange={(e) => updateField("comments", e.target.value)} className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]" rows={3} />
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <ProbaeButton  type="submit" disabled={isSubmitting} className="!w-auto flex items-center gap-2">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Calculate Profile <ArrowRight className="w-4 h-4" /></>}
                  </ProbaeButton>
                </div>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={loadPlans} className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <button type="button" onClick={() => setStep(2)} className="p-2 hover:bg-neutral-200 rounded-full"><ArrowLeft className="w-5 h-5 text-neutral-600" /></button>
                  <h2 className="text-2xl font-bold text-neutral-900">Plan Configuration</h2>
                </div>

                {calorieProfile && (
                  <div className="bg-white p-6 rounded-2xl border border-neutral-200 mb-8 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral-500 font-bold uppercase tracking-wider mb-1">Target Calories</p>
                      <h3 className="text-4xl font-bold text-neutral-900">{calorieProfile.total} <span className="text-xl font-normal text-neutral-500">kcal</span></h3>
                    </div>
                    <div className="flex gap-6">
                      <div className="text-center"><p className="text-xs text-neutral-500 uppercase font-bold">Pro</p><p className="font-bold text-lg text-[#6A0FAD]">{calorieProfile.protein}g</p></div>
                      <div className="text-center"><p className="text-xs text-neutral-500 uppercase font-bold">Carb</p><p className="font-bold text-lg text-[#4caf50]">{calorieProfile.carbs}g</p></div>
                      <div className="text-center"><p className="text-xs text-neutral-500 uppercase font-bold">Fat</p><p className="font-bold text-lg text-[#ff751f]">{calorieProfile.fat}g</p></div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Plan Duration</label>
                    <div className="flex gap-2">
                      {["WEEKLY", "MONTHLY"].map(d => (
                        <button type="button" key={d} onClick={() => updateField("planDuration", d)} className={`flex-1 py-3 rounded-xl border text-sm font-bold ${formData.planDuration === d ? "bg-[#6A0FAD] text-white border-[#6A0FAD]" : "bg-white text-neutral-600 border-neutral-300"}`}>{d}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Frequency</label>
                    <div className="flex gap-2">
                      {["5 DAYS", "6 DAYS", "7 DAYS"].map(f => (
                        <button type="button" key={f} onClick={() => updateField("planFrequency", f)} className={`flex-1 py-3 rounded-xl border text-sm font-bold ${formData.planFrequency === f ? "bg-[#6A0FAD] text-white border-[#6A0FAD]" : "bg-white text-neutral-600 border-neutral-300"}`}>{f}</button>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Meal Slots</label>
                    <div className="flex gap-4">
                      {["B-FAST", "LUNCH", "DINNER"].map(m => (
                        <button type="button" key={m} onClick={() => toggleArrayField("mealSlots", m)} className={`flex-1 py-4 rounded-xl border text-sm font-bold ${formData.mealSlots.includes(m) ? "bg-[#ff751f] text-white border-[#ff751f]" : "bg-white text-neutral-600 border-neutral-300"}`}>{m}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <ProbaeButton  type="submit" disabled={isLoadingPlans} className="!w-auto flex items-center gap-2">
                    {isLoadingPlans ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Find Plans <ArrowRight className="w-4 h-4" /></>}
                  </ProbaeButton>
                </div>
              </form>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <button type="button" onClick={() => setStep(3)} className="p-2 hover:bg-neutral-200 rounded-full"><ArrowLeft className="w-5 h-5 text-neutral-600" /></button>
                  <h2 className="text-2xl font-bold text-neutral-900">Select Plan</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {plans.length === 0 ? (
                    <div className="col-span-2 p-8 bg-white rounded-2xl text-center text-neutral-500 border border-neutral-200">
                      No matching plans found for this configuration.
                    </div>
                  ) : (
                    plans.map(p => (
                      <div key={p.ulid} onClick={() => updateField("selectedPlanId", p.ulid)} className={`cursor-pointer p-6 rounded-2xl border-2 transition-all ${formData.selectedPlanId === p.ulid ? "border-[#6A0FAD] bg-[#6A0FAD]/5" : "border-neutral-200 bg-white"}`}>
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-xl font-bold text-neutral-900">{p.name}</h3>
                          {formData.selectedPlanId === p.ulid && <Check className="text-[#6A0FAD] w-5 h-5" />}
                        </div>
                        <p className="text-sm text-neutral-600 mb-4">{p.category} • {p.duration} • {p.days} Days</p>
                        <p className="text-2xl font-bold text-neutral-900">₹{p.discountPrice || p.totalPrice}</p>
                      </div>
                    ))
                  )}
                </div>

                {errorMsg && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">
                    {errorMsg}
                  </div>
                )}
                <div className="flex justify-between items-center pt-8 border-t border-neutral-200 mt-8">
                  
                  <button type="button" onClick={() => handleSaveCustomer(true)} disabled={isSubmitting} className="text-neutral-500 font-bold hover:text-neutral-900 transition-colors">
                    Skip & Save Customer
                  </button>
                  <ProbaeButton  onClick={() => handleSaveCustomer(false)} disabled={!formData.selectedPlanId || isSubmitting} className="!w-auto flex items-center gap-2">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Finalize"}
                  </ProbaeButton>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
