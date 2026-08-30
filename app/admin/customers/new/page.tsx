"use client";
import { BowlLoader } from "@/components/admin/BowlLoader";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { ArrowRight, ArrowLeft, Check, Plus, Lock, Unlock, Loader2, Camera, Upload } from "lucide-react";
import { endpoints } from "@/lib/apiService";
import { getMediaUrl } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function NewCustomerPage() {
  const router = useRouter();
  useEffect(() => {
    async function fetchSystemSettings() {
      try {
        const data = await endpoints.settings.getSystemSettings();
        if (data && data.R2_BASE_URL !== undefined) {
          setSystemSettings({ R2_BASE_URL: data.R2_BASE_URL });
        }
      } catch (err) {
        console.error("Failed to fetch settings", err);
      }
    }
    async function fetchMealCats() {
      try {
        const catData = await endpoints.mealCategories.getMealCategories(1, 100) as any;
        if (catData.items) setMealCategories(catData.items);
        else if (catData.categories) setMealCategories(catData.categories);
      } catch (e) {
        console.error("Failed to fetch meal categories", e);
      }
    }
    fetchSystemSettings();
    fetchMealCats();
  }, []);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customAllergy, setCustomAllergy] = useState("");
  const [calorieProfile, setCalorieProfile] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [mealCategories, setMealCategories] = useState<any[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [systemSettings, setSystemSettings] = useState({ R2_BASE_URL: "" });
  const [errorMsg, setErrorMsg] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    latitude: "",
    longitude: "",
    image_filename: null as string | null,
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
    mealSlots: [] as string[],
    mealCalories: {} as Record<string, number>,
    probaeTarget: 2000,
    lockedMeals: {} as Record<string, boolean>,
    selectedPlanId: null as string | null,
    status: "ONBOARDING"
  });


  const handleProbaeTargetChange = (val: number) => {
    const target = val || 0;
    setFormData((prev) => {
      const slots = prev.mealSlots;
      const newCalories = { ...prev.mealCalories };
      if (slots.length > 0) {
        const perSlot = Math.round(target / slots.length);
        slots.forEach((s, i) => {
          if (i === slots.length - 1) {
            newCalories[s] = target - (perSlot * (slots.length - 1));
          } else {
            newCalories[s] = perSlot;
          }
        });
      }
      return { ...prev, probaeTarget: target, mealCalories: newCalories, lockedMeals: {} };
    });
  };

  const handleMealCalorieChange = (changedSlot: string, val: number) => {
    const rawVal = val || 0;
    setFormData((prev) => {
      const slots = prev.mealSlots;
      const target = prev.probaeTarget;
      const newCals = { ...prev.mealCalories };
      
      let lockedSum = 0;
      const unlockedSlots: string[] = [];
      
      slots.forEach(s => {
        if (s !== changedSlot) {
          if (prev.lockedMeals[s]) {
            lockedSum += newCals[s] || 0;
          } else {
            unlockedSlots.push(s);
          }
        }
      });
      
      let finalVal = rawVal;
      if (finalVal + lockedSum > target) {
        finalVal = target - lockedSum;
        if (finalVal < 0) finalVal = 0;
      }
      
      newCals[changedSlot] = finalVal;
      
      let remaining = target - lockedSum - finalVal;
      
      if (unlockedSlots.length > 0) {
        const currentUnlockedSum = unlockedSlots.reduce((sum, s) => sum + (newCals[s] || 0), 0);
        let distributed = 0;
        unlockedSlots.forEach((s, idx) => {
          if (idx === unlockedSlots.length - 1) {
            newCals[s] = remaining - distributed;
          } else {
            let portion = 0;
            if (currentUnlockedSum > 0) {
              portion = Math.round(((newCals[s] || 0) / currentUnlockedSum) * remaining);
            } else {
              portion = Math.round(remaining / unlockedSlots.length);
            }
            newCals[s] = portion;
            distributed += portion;
          }
        });
      }
      
      return { ...prev, mealCalories: newCals };
    });
  };

  const toggleLock = (slot: string) => {
    setFormData(prev => ({
      ...prev,
      lockedMeals: { ...prev.lockedMeals, [slot]: !prev.lockedMeals[slot] }
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploadingImage(true);
    try {
      const res = await endpoints.documents.upload(e.target.files[0]);
      updateField("image_filename", res.filename);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploadingImage(false);
    }
  };

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
          // Redistribute remainder
          if (newArray.length > 0) {
            const perSlot = Math.round(prev.probaeTarget / newArray.length);
            newArray.forEach((s, i) => {
              if (i === newArray.length - 1) {
                newCalories[s] = prev.probaeTarget - (perSlot * (newArray.length - 1));
              } else {
                newCalories[s] = perSlot;
              }
            });
          }
          return { ...prev, [field]: newArray, mealCalories: newCalories, lockedMeals: {} };
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
          const perSlot = Math.round(prev.probaeTarget / newArray.length);
          newArray.forEach((s, i) => {
            if (i === newArray.length - 1) {
              newCalories[s] = prev.probaeTarget - (perSlot * (newArray.length - 1));
            } else {
              newCalories[s] = perSlot;
            }
          });
          return { ...prev, [field]: newArray, mealCalories: newCalories, lockedMeals: {} };
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
          const target = res.total;
          if (prev.mealSlots.length > 0) {
            const perSlot = Math.round(target / prev.mealSlots.length);
            prev.mealSlots.forEach((slot, i) => {
              if (i === prev.mealSlots.length - 1) {
                newCalories[slot] = target - (perSlot * (prev.mealSlots.length - 1));
              } else {
                newCalories[slot] = perSlot;
              }
            });
          }
          return { ...prev, probaeTarget: target, mealCalories: newCalories, lockedMeals: {} };
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
    return slots.map(s => {
      const found = mealCategories.find(c => (c.slug === s || c.name === s));
      return found ? found.name : s;
    }).join(" + ");
  };

  const loadPlans = async (e: React.FormEvent) => {
    e.preventDefault();
    const sum = Object.values(formData.mealCalories).reduce((a,b)=>a+b, 0);
    if (sum !== formData.probaeTarget) {
      setErrorMsg(`Meal allocation (${sum} kcal) must exactly match the target (${formData.probaeTarget} kcal).`);
      return;
    }
    setErrorMsg("");
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

    const handlePlanSelect = async (planUlid: string) => {
    updateField("selectedPlanId", planUlid);
    setIsPreviewLoading(true);
    setPreviewData(null);
    try {
      // In a real app we should use endpoints from apiService, but fetch is fine for this new endpoint
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1"}/plans/preview-customization`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_ulid: planUlid,
          goal: formData.goal,
          meal_calories: formData.mealCalories
        })
      });
      const data = await res.json();
      if (data.success) {
        setPreviewData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleSaveCustomer = async (skipPlan = false) => {
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      const payload = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        address: formData.address,
        sex: formData.sex,
        age: parseInt(formData.age),
        height: parseFloat(formData.height),
        weight: parseFloat(formData.weight),
        activity_level: formData.activityLevel,
        goal: formData.goal,
        image_filename: formData.image_filename,
        dietary_preferences: formData.dietaryPreferences,
        allergies: formData.allergies,
        chef_instructions: formData.comments,
        calorie_profile: { ...calorieProfile, probaeTarget: formData.probaeTarget, mealCalories: formData.mealCalories, mealSlots: formData.mealSlots, lockedMeals: formData.lockedMeals },
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
                
                <div className="flex justify-center mb-8">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-neutral-100 border-2 border-dashed border-neutral-300 flex items-center justify-center overflow-hidden">
                      {isUploadingImage ? (
                        <BowlLoader className="w-6 h-6 animate-spin text-neutral-400" />
                      ) : formData.image_filename ? (
                        <img src={getMediaUrl(systemSettings.R2_BASE_URL, formData.image_filename) as string} alt="Customer" className="w-full h-full object-cover" />
                      ) : (
                        <Upload className="w-6 h-6 text-neutral-400" />
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 w-8 h-8 bg-white border border-neutral-200 rounded-full flex items-center justify-center shadow-sm cursor-pointer hover:bg-neutral-50 transition-colors">
                      <Camera className="w-4 h-4 text-neutral-600" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Full Name</label>
                    <input type="text" required value={formData.name} onChange={(e) => updateField("name", e.target.value)} className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Phone</label>
                    <input type="tel" required value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Email (Optional)</label>
                    <input type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]" />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Address</label>
                    <textarea required value={formData.address} onChange={(e) => updateField("address", e.target.value)} className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]" rows={3} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Latitude (Optional)</label>
                    <input type="text" value={formData.latitude} onChange={(e) => updateField("latitude", e.target.value)} placeholder="e.g. 12.9716" className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Longitude (Optional)</label>
                    <input type="text" value={formData.longitude} onChange={(e) => updateField("longitude", e.target.value)} placeholder="e.g. 77.5946" className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]" />
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
                    {isSubmitting ? <BowlLoader className="w-4 h-4 animate-spin" /> : <>Calculate Profile <ArrowRight className="w-4 h-4" /></>}
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
                  <div className="bg-white p-6 rounded-2xl border border-neutral-200 mb-8 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-neutral-500 font-bold uppercase tracking-wider mb-1">Calculated TDEE</p>
                        <h3 className="text-4xl font-bold text-neutral-900">{calorieProfile.total} <span className="text-xl font-normal text-neutral-500">kcal</span></h3>
                      </div>
                      <div className="flex gap-6">
                        <div className="text-center"><p className="text-xs text-neutral-500 uppercase font-bold">Pro</p><p className="font-bold text-lg text-[#6A0FAD]">{calorieProfile.protein}g</p></div>
                        <div className="text-center"><p className="text-xs text-neutral-500 uppercase font-bold">Carb</p><p className="font-bold text-lg text-[#4caf50]">{calorieProfile.carbs}g</p></div>
                        <div className="text-center"><p className="text-xs text-neutral-500 uppercase font-bold">Fat</p><p className="font-bold text-lg text-[#ff751f]">{calorieProfile.fat}g</p></div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-neutral-100 grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <label className="block text-xs font-bold text-[#6A0FAD] uppercase tracking-wider mb-2">Probae Calorie Target</label>
                        <p className="text-sm text-neutral-500 mb-4">How many of the total {calorieProfile.total} kcal will be fulfilled by Probae meals?</p>
                        <div className="flex items-center gap-3">
                          <input 
                            type="number" 
                            value={formData.probaeTarget}
                            onChange={(e) => handleProbaeTargetChange(Number(e.target.value))}
                            className="w-32 bg-[#f8f5fb] border-none rounded-xl px-4 py-3 text-neutral-900 font-bold focus:ring-2 focus:ring-[#6A0FAD]/20 outline-none"
                          />
                          <span className="text-neutral-500 font-medium">kcal / day</span>
                        </div>
                      </div>

                      {formData.mealSlots.length > 0 && (
                        <div>
                          <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4 flex justify-between items-center">
                            <span>Meal Allocation</span>
                            <span className={Object.values(formData.mealCalories).reduce((a,b)=>a+b,0) !== formData.probaeTarget ? "text-red-500 font-bold" : "text-[#6A0FAD] font-bold"}>
                              {Object.values(formData.mealCalories).reduce((a,b)=>a+b,0)} / {formData.probaeTarget}
                            </span>
                          </label>
                          <div className="space-y-4">
                            {formData.mealSlots.map(slot => {
                              const isLocked = formData.lockedMeals[slot];
                              return (
                                <div key={slot} className="flex items-center gap-2 sm:gap-3">
                                  <div className="w-16 shrink-0 text-xs sm:text-sm font-bold text-neutral-700 tracking-wider whitespace-nowrap">{mealCategories.find(c => c.slug === slot)?.name || slot}</div>
                                  <button type="button" onClick={() => toggleLock(slot)} className={`p-1 sm:p-1.5 shrink-0 rounded-lg transition-colors ${isLocked ? "bg-red-100 text-red-600" : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200"}`}>
                                    {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                  </button>
                                  <input 
                                    type="range" 
                                    min="0"
                                    max={formData.probaeTarget} 
                                    value={formData.mealCalories[slot] || 0}
                                    onChange={(e) => handleMealCalorieChange(slot, Number(e.target.value))}
                                    disabled={isLocked}
                                    className={`flex-1 min-w-[40px] ${isLocked ? "opacity-50 cursor-not-allowed" : "accent-[#6A0FAD]"}`}
                                  />
                                  <div className="w-16 sm:w-20 shrink-0 relative">
                                    <input
                                      type="number"
                                      value={formData.mealCalories[slot] || 0}
                                      onChange={(e) => handleMealCalorieChange(slot, Number(e.target.value))}
                                      disabled={isLocked}
                                      className={`w-full border-none rounded-lg px-1 sm:px-2 py-1.5 text-xs sm:text-sm font-bold text-center focus:ring-2 focus:ring-[#6A0FAD]/20 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isLocked ? "bg-neutral-100 text-neutral-400" : "bg-[#f8f5fb] text-neutral-900"}`}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
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
                    <div className="flex gap-4 flex-wrap">
                      {mealCategories.map(cat => {
                        const m = cat.slug || cat.name;
                        return (
                          <button type="button" key={m} onClick={() => toggleArrayField("mealSlots", m)} className={`flex-1 min-w-[120px] py-4 rounded-xl border text-sm font-bold ${formData.mealSlots.includes(m) ? "bg-[#ff751f] text-white border-[#ff751f]" : "bg-white text-neutral-600 border-neutral-300"}`}>{cat.name}</button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <ProbaeButton  type="submit" disabled={isLoadingPlans} className="!w-auto flex items-center gap-2">
                    {isLoadingPlans ? <BowlLoader className="w-4 h-4 animate-spin" /> : <>Find Plans <ArrowRight className="w-4 h-4" /></>}
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
                      <div key={p.ulid} onClick={() => handlePlanSelect(p.ulid)} className={`cursor-pointer p-6 rounded-2xl border-2 transition-all ${formData.selectedPlanId === p.ulid ? "border-[#6A0FAD] bg-[#6A0FAD]/5" : "border-neutral-200 bg-white"}`}>
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

                                {isPreviewLoading && (
                  <div className="flex items-center justify-center p-8 bg-white rounded-2xl border border-neutral-200">
                    <BowlLoader className="w-8 h-8 text-[#6A0FAD] animate-spin" />
                    <span className="ml-3 text-neutral-600 font-bold">Scaling recipe macros & calculating dynamic pricing...</span>
                  </div>
                )}

                {!isPreviewLoading && previewData && (
                  <div className="space-y-6">
                    {/* Financial Summary */}
                    <div className="bg-white rounded-2xl border border-neutral-200 p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                      <div className="flex-1 text-center md:text-left">
                        <div className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Gross Value</div>
                        <div className="text-2xl font-bold text-neutral-900">₹{previewData.gross_price}</div>
                      </div>
                      <div className="w-px h-12 bg-neutral-200 hidden md:block"></div>
                      <div className="flex-1 text-center">
                        <div className="text-sm font-bold text-red-500 uppercase tracking-wider">Plan Discount ({previewData.discount_percentage}%)</div>
                        <div className="text-2xl font-bold text-red-600">- ₹{previewData.discount_amount}</div>
                      </div>
                      <div className="w-px h-12 bg-neutral-200 hidden md:block"></div>
                      <div className="flex-1 text-center md:text-right">
                        <div className="text-sm font-bold text-[#6A0FAD] uppercase tracking-wider">Final Price</div>
                        <div className="text-3xl font-black text-[#6A0FAD]">₹{previewData.final_discounted_price}</div>
                      </div>
                    </div>

                    {/* Matrix Preview */}
                    <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
                      <div className="px-6 py-4 bg-neutral-50 border-b border-neutral-200">
                        <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">Customized Meal Schedule</h3>
                      </div>
                      <div className="divide-y divide-neutral-100 max-h-96 overflow-y-auto">
                        {previewData.scaled_matrix.map((item: any, idx: number) => (
                          <div key={idx} className="p-4 hover:bg-neutral-50 transition-colors flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-neutral-100 rounded-xl flex flex-col items-center justify-center shrink-0">
                                <span className="text-[10px] font-bold text-neutral-500 uppercase">Day</span>
                                <span className="text-sm font-black text-neutral-900">{item.day_index + 1}</span>
                              </div>
                              <div>
                                <div className="text-xs font-bold text-[#6A0FAD] uppercase tracking-wider mb-1">{item.meal_type}</div>
                                <div className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                                  {item.bowl_name}
                                  <span className="text-[10px] font-bold text-[#6A0FAD] bg-[#6A0FAD]/10 px-2 py-0.5 rounded-full">
                                    ₹{item.scaled_price?.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-6">
                              <div className="hidden sm:flex items-center gap-3">
                                <div className="text-center"><div className="text-xs font-black text-neutral-900">{Math.round(item.scaled_protein)}g</div><div className="text-[9px] font-bold text-neutral-500 uppercase">Pro</div></div>
                                <div className="text-center"><div className="text-xs font-black text-neutral-900">{Math.round(item.scaled_carbs)}g</div><div className="text-[9px] font-bold text-neutral-500 uppercase">Carb</div></div>
                                <div className="text-center"><div className="text-xs font-black text-neutral-900">{Math.round(item.scaled_fats)}g</div><div className="text-[9px] font-bold text-neutral-500 uppercase">Fat</div></div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-black text-neutral-900">{Math.round(item.scaled_calories)} <span className="text-xs text-neutral-500 font-medium">kcal</span></div>
                                <div className="text-[10px] font-bold text-green-600 uppercase">Target: {item.target_calories}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

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
                    {isSubmitting ? <BowlLoader className="w-4 h-4 animate-spin" /> : "Finalize"}
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
