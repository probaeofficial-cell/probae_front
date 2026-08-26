
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { endpoints } from "@/lib/apiService";
import { Loader2, Edit2, Check, ArrowLeft, Trash2 } from "lucide-react";
import { ConfirmationModal } from "@/components/ConfirmationModal";

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ulid = params.ulid as string;
  
  const [customer, setCustomer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    sex: "Male",
    age: "25",
    height: "180",
    weight: "75",
    activityLevel: "Lightly Active",
    goal: "Weight Loss",
    dietaryPreferences: [] as string[],
    allergies: [] as string[],
    comments: "",
    status: "ACTIVE",
    selectedPlanId: null as string | null,
    planDuration: "WEEKLY",
    planFrequency: "5 DAYS",
    mealSlots: ["LUNCH", "DINNER"] as string[]
  });

  const fetchCustomer = async () => {
    setIsLoading(true);
    try {
            const [custData, planData] = await Promise.all([
        endpoints.customers.get(ulid),
        endpoints.planTiers.list({ limit: 100 })
      ]);
      const data: any = custData;
      if (planData && (planData as any).success) {
        setAllPlans((planData as any).tiers || []);
      }
      if (data) {
        setCustomer(data);
        setFormData({
          name: data.name || "",
          phone: data.phone || "",
          address: data.address || "",
          sex: data.sex || "Male",
          age: data.age?.toString() || "25",
          height: data.height?.toString() || "180",
          weight: data.weight?.toString() || "75",
          activityLevel: data.activity_level || "Lightly Active",
          goal: data.goal || "Weight Loss",
          dietaryPreferences: data.dietary_preferences || [],
          allergies: data.allergies || [],
          comments: data.chef_instructions || "",
          status: data.status || "ACTIVE",
          selectedPlanId: data.selected_plan_id || null,
          planDuration: "WEEKLY",
          planFrequency: "5 DAYS",
          mealSlots: ["LUNCH", "DINNER"]
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (ulid) fetchCustomer();
  }, [ulid]);

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const toggleArrayField = (field: "dietaryPreferences" | "allergies" | "mealSlots", value: string) => {
    setFormData((prev) => {
      const current = prev[field] as string[];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(item => item !== value) };
      }
      if (field === "dietaryPreferences" && value === "No Restrictions") {
        return { ...prev, [field]: ["No Restrictions"] };
      }
      const filtered = current.filter(item => item !== "No Restrictions");
      return { ...prev, [field]: [...filtered, value] };
    });
  };

    const loadPlans = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoadingPlans(true);
    setTimeout(() => {
      const days = parseInt(formData.planFrequency.split(" ")[0]);
      const matched = allPlans.filter(t => 
        t.duration.toUpperCase() === formData.planDuration && 
        t.days === days
      );
      setPlans(matched);
      setIsLoadingPlans(false);
    }, 400);
  };

  const handleSave = async () => {
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
        selected_plan_id: formData.selectedPlanId,
        status: formData.status
      };
      
      await endpoints.customers.update(ulid, payload);
      await fetchCustomer();
      setIsEditMode(false);
    } catch (err: any) {
      setErrorMsg(err?.detail || err?.message || "Failed to update customer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await endpoints.customers.del(ulid);
      router.push("/admin/customers");
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
        <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#6A0FAD] animate-spin" />
        </div>
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        <Header />
        <Breadcrumbs segments={["Admin", "Customers", customer.name]} />
        
        <div className="mt-4 flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-5xl w-full mx-auto pb-12">
            
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div className="flex items-center gap-4">
                <button onClick={() => router.push("/admin/customers")} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                  <ArrowLeft className="w-5 h-5 text-neutral-600" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-neutral-900">{customer.name}</h1>
                  <p className="text-sm text-neutral-500 mt-1">{customer.ulid}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!isEditMode ? (
                  <>
                    <button onClick={() => setShowDeleteModal(true)} className="px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2 border border-transparent hover:border-red-200">
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                    <ProbaeButton onClick={() => setIsEditMode(true)} className="!w-auto bg-[#f8f5fb] !text-[#6A0FAD] hover:!bg-[#6A0FAD] hover:!text-white !border-transparent">
                      <Edit2 className="w-4 h-4 mr-2" /> Edit Customer
                    </ProbaeButton>
                  </>
                ) : (
                  <>
                    <button onClick={() => {setIsEditMode(false); fetchCustomer();}} className="px-4 py-2 text-sm font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors">
                      Cancel
                    </button>
                    <ProbaeButton onClick={handleSave} disabled={isSubmitting} className="!w-auto">
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                      Save Changes
                    </ProbaeButton>
                  </>
                )}
              </div>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column (Forms) */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Profile Card */}
                <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8">
                  <h2 className="text-xl font-bold text-neutral-900 mb-6">Profile Information</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Full Name</label>
                      {isEditMode ? (
                        <input type="text" value={formData.name} onChange={e => updateField("name", e.target.value)} className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]" />
                      ) : (
                        <div className="px-4 py-3 bg-neutral-50 rounded-xl text-neutral-900 font-medium border border-transparent">{customer.name}</div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Phone Number</label>
                      {isEditMode ? (
                        <input type="tel" value={formData.phone} onChange={e => updateField("phone", e.target.value)} className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]" />
                      ) : (
                        <div className="px-4 py-3 bg-neutral-50 rounded-xl text-neutral-900 font-medium border border-transparent">{customer.phone}</div>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Address</label>
                      {isEditMode ? (
                        <textarea value={formData.address} onChange={e => updateField("address", e.target.value)} className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD] h-24 resize-none" />
                      ) : (
                        <div className="px-4 py-3 bg-neutral-50 rounded-xl text-neutral-900 font-medium border border-transparent min-h-[60px]">{customer.address || "N/A"}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Biological Card */}
                <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8">
                  <h2 className="text-xl font-bold text-neutral-900 mb-6">Biological Profile</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Sex</label>
                      {isEditMode ? (
                        <div className="flex gap-2">
                          {["Male", "Female"].map(s => (
                            <button type="button" key={s} onClick={() => updateField("sex", s)} className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-colors ${formData.sex === s ? "bg-[#6A0FAD] text-white border-[#6A0FAD]" : "bg-white text-neutral-600 border-neutral-300"}`}>{s}</button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-3 bg-neutral-50 rounded-xl text-neutral-900 font-medium border border-transparent">{customer.sex}</div>
                      )}
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Age</label>
                      {isEditMode ? (
                        <input type="number" value={formData.age} onChange={e => updateField("age", e.target.value)} className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]" />
                      ) : (
                        <div className="px-4 py-3 bg-neutral-50 rounded-xl text-neutral-900 font-medium border border-transparent">{customer.age} years</div>
                      )}
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Height (cm)</label>
                      {isEditMode ? (
                        <input type="number" value={formData.height} onChange={e => updateField("height", e.target.value)} className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]" />
                      ) : (
                        <div className="px-4 py-3 bg-neutral-50 rounded-xl text-neutral-900 font-medium border border-transparent">{customer.height}</div>
                      )}
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Weight (kg)</label>
                      {isEditMode ? (
                        <input type="number" value={formData.weight} onChange={e => updateField("weight", e.target.value)} className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]" />
                      ) : (
                        <div className="px-4 py-3 bg-neutral-50 rounded-xl text-neutral-900 font-medium border border-transparent">{customer.weight}</div>
                      )}
                    </div>
                    <div className="col-span-2 sm:col-span-4">
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Activity Level</label>
                      {isEditMode ? (
                        <div className="flex flex-wrap gap-2">
                          {["Sedentary", "Lightly Active", "Active", "Very Active"].map(l => (
                            <button type="button" key={l} onClick={() => updateField("activityLevel", l)} className={`flex-1 min-w-[120px] py-3 rounded-xl border text-xs font-bold transition-colors ${formData.activityLevel === l ? "bg-[#6A0FAD] text-white border-[#6A0FAD]" : "bg-white text-neutral-600 border-neutral-300"}`}>{l}</button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-3 bg-neutral-50 rounded-xl text-neutral-900 font-medium border border-transparent">{customer.activity_level}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dietary Profile */}
                <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8">
                  <h2 className="text-xl font-bold text-neutral-900 mb-6">Dietary Profile</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Primary Goal</label>
                      {isEditMode ? (
                        <div className="grid grid-cols-3 gap-3">
                          {["Weight Loss", "Muscle Gain", "Maintenance"].map(g => (
                            <button type="button" key={g} onClick={() => updateField("goal", g)} className={`py-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 ${formData.goal === g ? "bg-[#6A0FAD] text-white border-[#6A0FAD]" : "bg-white text-neutral-600 border-neutral-300"}`}>
                              {formData.goal === g && <Check className="w-4 h-4" />} {g}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-3 bg-neutral-50 rounded-xl text-neutral-900 font-medium border border-transparent">{customer.goal}</div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Dietary Preferences</label>
                      {isEditMode ? (
                        <div className="flex flex-wrap gap-2">
                          {["No Restrictions", "Vegan", "Keto", "Gluten-Free", "Paleo", "Low Carb"].map(d => (
                            <button type="button" key={d} onClick={() => toggleArrayField("dietaryPreferences", d)} className={`px-4 py-2 rounded-full border text-xs font-bold ${formData.dietaryPreferences.includes(d) ? "bg-[#ff751f] text-white border-[#ff751f]" : "bg-white text-neutral-600 border-neutral-300"}`}>{d}</button>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {(customer.dietary_preferences || []).map((p: string) => (
                            <span key={p} className="px-3 py-1.5 bg-[#ff751f]/10 text-[#ff751f] rounded-full text-xs font-bold">{p}</span>
                          ))}
                          {(!customer.dietary_preferences || customer.dietary_preferences.length === 0) && <span className="text-neutral-500 text-sm">None</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>


                {/* Assigned Plan */}
                <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8">
                  <h2 className="text-xl font-bold text-neutral-900 mb-6">Assigned Plan</h2>
                  {isEditMode ? (
                    <div className="space-y-6">
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
                      
                      <div className="flex justify-end pt-2">
                        <ProbaeButton onClick={loadPlans} type="button" disabled={isLoadingPlans} className="!w-auto flex items-center gap-2">
                          {isLoadingPlans ? <Loader2 className="w-4 h-4 animate-spin" /> : "Find Plans"}
                        </ProbaeButton>
                      </div>

                      {plans.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-neutral-100">
                          <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-4">Available Plans</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {plans.map(p => (
                              <div 
                                key={p.ulid} 
                                onClick={() => updateField("selectedPlanId", p.ulid)}
                                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${formData.selectedPlanId === p.ulid ? "border-[#6A0FAD] bg-[#6A0FAD]/5" : "border-neutral-200 hover:border-[#6A0FAD]/30"}`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="font-bold text-neutral-900">{p.tier_name}</h4>
                                  {formData.selectedPlanId === p.ulid && <Check className="w-5 h-5 text-[#6A0FAD]" />}
                                </div>
                                <div className="text-2xl font-black text-neutral-900 mb-1">
                                  KWD {p.base_price?.toFixed(2)}
                                </div>
                                <div className="text-xs text-neutral-500 font-bold uppercase">
                                  {p.duration} • {p.days} Days
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      {(() => {
                        const currentPlan = allPlans.find(p => p.ulid === customer.selected_plan_id);
                        if (!currentPlan) return <div className="text-sm text-neutral-500 italic">No plan assigned</div>;
                        return (
                          <div className="p-4 rounded-2xl border border-[#6A0FAD]/20 bg-[#6A0FAD]/5 flex justify-between items-center">
                            <div>
                              <h4 className="font-bold text-lg text-[#6A0FAD] mb-1">{currentPlan.tier_name}</h4>
                              <div className="text-xs text-neutral-600 font-bold uppercase">
                                {currentPlan.duration} • {currentPlan.days} Days
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-neutral-500 uppercase">Base Price</div>
                              <div className="text-xl font-black text-neutral-900">KWD {currentPlan.base_price?.toFixed(2)}</div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column (Status & Macros) */}
              <div className="space-y-6">
                
                <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                  <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-4">Customer Status</h3>
                  {isEditMode ? (
                    <select value={formData.status} onChange={e => updateField("status", e.target.value)} className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]">
                      <option value="ONBOARDING">Onboarding</option>
                      <option value="PENDING_PLAN">Pending Plan</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      customer.status === "ONBOARDING" ? "bg-blue-100 text-blue-800" :
                      customer.status === "PENDING_PLAN" ? "bg-yellow-100 text-yellow-800" :
                      customer.status === "ACTIVE" ? "bg-green-100 text-green-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {customer.status}
                    </span>
                  )}
                </div>

                {customer.calorie_profile && (
                  <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                    <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-4">Daily Targets</h3>
                    <div className="flex items-center justify-center p-6 bg-[#6A0FAD]/5 rounded-2xl border border-[#6A0FAD]/10 mb-6">
                      <div className="text-center">
                        <div className="text-3xl font-black text-[#6A0FAD]">{customer.calorie_profile.total}</div>
                        <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mt-1">Kcal / Day</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 text-center">
                        <div className="text-lg font-bold text-neutral-900">{customer.calorie_profile.protein}g</div>
                        <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Protein</div>
                      </div>
                      <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 text-center">
                        <div className="text-lg font-bold text-neutral-900">{customer.calorie_profile.carbs}g</div>
                        <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Carbs</div>
                      </div>
                      <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 text-center">
                        <div className="text-lg font-bold text-neutral-900">{customer.calorie_profile.fat}g</div>
                        <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Fats</div>
                      </div>
                      <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 text-center">
                        <div className="text-lg font-bold text-neutral-900">{customer.calorie_profile.fiber}g</div>
                        <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Fiber</div>
                      </div>
                    </div>
                    {isEditMode && (
                      <p className="text-xs text-neutral-500 mt-4 text-center">
                        *Macros will auto-recalculate if you update biological factors.
                      </p>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Customer"
        message={`Are you sure you want to delete ${customer?.name}? This action cannot be undone.`}
        confirmText={isDeleting ? "Deleting..." : "Delete Customer"}
        type="delete"
      />
    </div>
  );
}
