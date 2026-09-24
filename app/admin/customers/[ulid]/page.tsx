
"use client";
import { BowlLoader } from "@/components/admin/BowlLoader";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { LocationPicker } from "@/components/admin/LocationPicker";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { endpoints, api } from "@/lib/apiService";
import { getMediaUrl } from "@/lib/utils";
import { Loader2, Edit2, Check, ArrowLeft, Trash2, Camera, Upload, Lock, Unlock, Hourglass } from "lucide-react";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { CustomerLedger } from "../components/CustomerLedger";
import { CustomerCalories } from "@/components/admin/CustomerCalories";
import { CustomerHistory } from "@/components/admin/CustomerHistory";


export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  useEffect(() => {
    async function fetchSystemSettings() {
      try {
        const data = await endpoints.settings.getSystemSettings();
        if (data && data.R2_BASE_URL !== undefined) {
          setSystemSettings({ R2_BASE_URL: data.R2_BASE_URL });
        }
        const catData = await endpoints.mealCategories.getMealCategories(1, 100) as any;
        if (catData) {
          if (catData.items) setMealCategories(catData.items);
          else if (catData.categories) setMealCategories(catData.categories);
          else if (Array.isArray(catData)) setMealCategories(catData);
        }
      } catch (err) {
        console.error("Failed to fetch settings", err);
      }
    }
    fetchSystemSettings();
  }, []);
  const ulid = params.ulid as string;
  
  const [customer, setCustomer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [mealCategories, setMealCategories] = useState<any[]>([]);
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [activeTab, setActiveTab] = useState<"PROFILE" | "LEDGER" | "CALORIES" | "HISTORY">("PROFILE");
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [systemSettings, setSystemSettings] = useState({ R2_BASE_URL: "" });
  const [zones, setZones] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    latitude: "",
    longitude: "",
    locationDescription: "",
    address: "",
    zone_id: "",
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
    mealSlots: [] as string[],
    probaeTarget: 0,
    mealCalories: {} as Record<string, number>,
    lockedMeals: {} as Record<string, boolean>,
    image_filename: null as string | null
  });

    const fetchPreview = async (planUlid: string, goal: string, mealCalories: any) => {
    setIsPreviewLoading(true);
    try {
      const resData: any = await endpoints.customers.previewPlanPrice({
        plan_tier_ulid: planUlid,
        goal: goal,
        calorie_profile: { mealCalories: mealCalories || {} }
      });
      if (resData && resData.success) {
        setPreviewData(resData);
      }
    } catch (e) {
      console.error("Preview fetch error:", e);
    } finally {
      setIsPreviewLoading(false);
    }
  };

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
        if (data.selected_plan_id) {
          fetchPreview(data.selected_plan_id, data.goal || "MAINTENANCE", data.calorie_profile?.mealCalories || {});
        }
        const profile = data.calorie_profile || {};
        setFormData({
          name: data.name || "",
          phone: data.phone || "",
          email: data.email || "",
          latitude: data.latitude !== null && data.latitude !== undefined ? data.latitude.toString() : "",
          longitude: data.longitude !== null && data.longitude !== undefined ? data.longitude.toString() : "",
          locationDescription: data.location_description || "",
      zone_id: data.zone_id ? String(data.zone_id) : "",
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
          mealSlots: profile.mealSlots || [],
          probaeTarget: profile.probaeTarget || profile.total || 0,
          mealCalories: profile.mealCalories || {},
          lockedMeals: profile.lockedMeals || {},
          image_filename: data.image_filename || null
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

  useEffect(() => {
    if (formData.selectedPlanId && formData.mealCalories && Object.keys(formData.mealCalories).length > 0) {
      const timer = setTimeout(() => {
        fetchPreview(formData.selectedPlanId as string, formData.goal, formData.mealCalories);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [formData.mealCalories, formData.selectedPlanId, formData.goal]);


  
  const handleToggleDeliveryStatus = async () => {
    try {
      const newStatus = customer.delivery_status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      await endpoints.customers.updateDeliveryStatus(ulid, { status: newStatus });
      fetchCustomer(); // re-fetch to get updated state
    } catch (err: any) {
      alert("Failed to update delivery status: " + (err?.detail || err?.message || "Unknown error"));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploadingImage(true);
    try {
      const res = await endpoints.documents.upload(e.target.files[0]);
      updateField("image_filename", res.filename);
      // Immediately update backend if not in edit mode?
      // Better to just let it save on "Save Changes"
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploadingImage(false);
    }
  };

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

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const toggleArrayField = (field: "dietaryPreferences" | "allergies" | "mealSlots", value: string) => {
    if (field === "mealSlots" && formData.selectedPlanId) {
      alert("Meal slots changed. The current plan has been cleared. Please select another plan.");
      setPreviewData(null);
    }
    setFormData((prev) => {
      const current = prev[field] as string[];
      if (current.includes(value)) {
        const newArray = current.filter(item => item !== value);
        if (field === "mealSlots") {
          const newCalories = { ...prev.mealCalories };
          delete newCalories[value];
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
          return { ...prev, [field]: newArray, mealCalories: newCalories, lockedMeals: {}, selectedPlanId: null };
        }
        return { ...prev, [field]: newArray };
      }
      if (field === "dietaryPreferences" && value === "No Restrictions") {
        return { ...prev, [field]: ["No Restrictions"] };
      }
      const filtered = current.filter(item => item !== "No Restrictions");
      const newArray = [...filtered, value];
      
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
        return { ...prev, [field]: newArray, mealCalories: newCalories, lockedMeals: {}, selectedPlanId: null };
      }
      return { ...prev, [field]: newArray };
    });
  };

  
  const getExpectedMealType = (slots: string[]) => {
    return slots.map(s => {
      const found = mealCategories.find(c => (c.slug === s || c.name === s));
      return found ? found.name : s;
    }).join(" + ");
  };

  const loadPlans = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoadingPlans(true);
    setTimeout(() => {
      const days = parseInt(formData.planFrequency.split(" ")[0]);
      const matched = allPlans.filter(t => {
        const durationMatch = t.duration.toUpperCase() === formData.planDuration && t.days === days;
        if (!durationMatch) return false;
        
        const planSlots = t.included_meal_slots || [];
        const formSlots = formData.mealSlots || [];
        if (planSlots.length !== formSlots.length) return false;
        
        const normalizeSlot = (s: string) => (s || "").toLowerCase();
        const sortedPlan = [...planSlots].map(normalizeSlot).sort();
        const sortedForm = [...formSlots].map(normalizeSlot).sort();
        return sortedPlan.every((val, index) => val === sortedForm[index]);
      });
      setPlans(matched);
      setIsLoadingPlans(false);
    }, 400);
  };

  const handleSave = async () => {
    const sum = Object.values(formData.mealCalories).reduce((a,b)=>a+b, 0);
    if (formData.mealSlots.length > 0 && formData.probaeTarget > 0 && sum !== formData.probaeTarget) {
      setErrorMsg(`Meal allocation (${sum} kcal) must exactly match the target (${formData.probaeTarget} kcal).`);
      return;
    }
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      let finalStatus = formData.status;
      if (formData.selectedPlanId && finalStatus === "PENDING_PLAN") {
        finalStatus = "ACTIVE";
      }

      const payload = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        location_description: formData.locationDescription || null,
        zone_id: formData.zone_id ? parseInt(formData.zone_id) : null,
        address: formData.address,
        sex: formData.sex || null,
        age: formData.age ? parseInt(formData.age) : null,
        height: formData.height ? parseFloat(formData.height) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        activity_level: formData.activityLevel || null,
        goal: formData.goal || null,
        dietary_preferences: formData.dietaryPreferences,
        allergies: formData.allergies,
        chef_instructions: formData.comments,
        selected_plan_id: formData.selectedPlanId,
        status: finalStatus,
        image_filename: formData.image_filename,
        calorie_profile: customer.calorie_profile ? {
          ...customer.calorie_profile,
          probaeTarget: formData.probaeTarget,
          mealCalories: formData.mealCalories,
          mealSlots: formData.mealSlots,
          lockedMeals: formData.lockedMeals
        } : null
      };
      
      await endpoints.customers.update(ulid, payload);
      await fetchCustomer();
      setIsEditMode(false);
    } catch (err: any) {
      const errorDetail = err?.detail;
      const formattedError = Array.isArray(errorDetail) ? errorDetail.map((e: any) => `${e.loc?.join('.')} ${e.msg}`).join(', ') : (errorDetail || err?.message || "Failed to update customer");
      setErrorMsg(formattedError);
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
          <BowlLoader className="w-8 h-8 text-[#6A0FAD] animate-spin" />
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

            {/* Tabs */}
            <div className="flex border-b border-neutral-200 mb-8 overflow-x-auto custom-scrollbar mt-2">
              <button 
                onClick={() => setActiveTab("PROFILE")}
                className={`px-6 py-3 font-bold text-sm whitespace-nowrap transition-colors border-b-2 ${activeTab === "PROFILE" ? "border-[#6A0FAD] text-[#6A0FAD]" : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"}`}
              >
                Profile & Plans
              </button>
              <button 
                onClick={() => setActiveTab("LEDGER")}
                className={`px-6 py-3 font-bold text-sm whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${activeTab === "LEDGER" ? "border-[#6A0FAD] text-[#6A0FAD]" : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"}`}
              >
                Wallet & Ledger
                {customer.wallet_balance < 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
              </button>
              <button 
                onClick={() => setActiveTab("CALORIES")}
                className={`px-6 py-3 font-bold text-sm whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${activeTab === "CALORIES" ? "border-[#6A0FAD] text-[#6A0FAD]" : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"}`}
              >
                Calorie Intake
              </button>
              <button 
                onClick={() => setActiveTab("HISTORY")}
                className={`px-6 py-3 font-bold text-sm whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${activeTab === "HISTORY" ? "border-[#6A0FAD] text-[#6A0FAD]" : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"}`}
              >
                Subscription History
              </button>
            </div>

            {activeTab === "LEDGER" ? (
              <CustomerLedger
                customerUlid={customer.ulid}
                initialBalance={customer.wallet_balance || 0}
                onBalanceChange={(newBal) => setCustomer((prev: any) => ({ ...prev, wallet_balance: newBal }))}
              />
            ) : activeTab === "CALORIES" ? (
              <CustomerCalories customerUlid={customer.ulid} />
            ) : activeTab === "HISTORY" ? (
              <CustomerHistory customerUlid={customer.ulid} subscriptions={customer.subscriptions || []} onRefresh={fetchCustomer} />
            ) : (
            <div className="animate-in fade-in zoom-in duration-300">
            
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
                      {isSubmitting ? <BowlLoader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                      Save Changes
                    </ProbaeButton>
                  </>
                )}
              </div>
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column (Forms) */}
              <div className="lg:col-span-2 space-y-6">
                

                {customer.subscription_status === 'EXPIRED' && (
                  <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-red-700">Plan Expired - Renewal Needed</h3>
                      <p className="text-sm text-red-600 mt-1">The customer has 0 bowls remaining in their quota.</p>
                    </div>
                    <button onClick={() => setShowRenewalModal(true)} className="px-4 py-2 bg-red-600 text-white font-bold rounded-xl text-sm hover:bg-red-700 transition-colors">Renew Plan</button>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-3xl shadow-[0_0_15px_rgba(0,0,0,0.03)] border border-neutral-100 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Consumption Quota</div>
                      <div className="text-3xl font-black text-[#6A0FAD]">{customer.remaining_bowl_count || 0}</div>
                      <div className="text-xs font-bold text-neutral-400 mt-1">Remaining Bowls</div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#6A0FAD]/10 flex items-center justify-center text-[#6A0FAD]">
                      <Hourglass className="w-6 h-6" />
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-3xl shadow-[0_0_15px_rgba(0,0,0,0.03)] border border-neutral-100 flex flex-col justify-center">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Delivery Status</div>
                        <div className={`text-lg font-black ${customer.delivery_status === 'ACTIVE' ? 'text-green-600' : 'text-orange-500'}`}>{customer.delivery_status || 'ACTIVE'}</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={customer.delivery_status === 'ACTIVE'} onChange={handleToggleDeliveryStatus} disabled={customer.subscription_status === 'EXPIRED'} />
                        <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                      </label>
                    </div>
                    {isEditMode && <div className="text-[10px] text-neutral-400 mt-2">Toggle to pause/resume daily automated deliveries.</div>}
                  </div>
                </div>

                {/* Profile Card */}

                <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8">
                  <h2 className="text-xl font-bold text-neutral-900 mb-6">Profile Information</h2>
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
                      {isEditMode && (
                        <label className="absolute bottom-0 right-0 w-8 h-8 bg-white border border-neutral-200 rounded-full flex items-center justify-center shadow-sm cursor-pointer hover:bg-neutral-50 transition-colors">
                          <Camera className="w-4 h-4 text-neutral-600" />
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                      )}
                    </div>
                  </div>
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
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Email</label>
                      {isEditMode ? (
                        <input type="email" value={formData.email} onChange={e => updateField("email", e.target.value)} placeholder="Optional" className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]" />
                      ) : (
                        <div className="px-4 py-3 bg-neutral-50 rounded-xl text-neutral-900 font-medium border border-transparent">{customer.email || "N/A"}</div>
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
                    {isEditMode ? (
                      <div className="sm:col-span-2">
                        <LocationPicker 
                          latitude={formData.latitude ? parseFloat(formData.latitude) : null}
                          longitude={formData.longitude ? parseFloat(formData.longitude) : null}
                          onChange={(lat, lng) => {
                            updateField("latitude", lat ? lat.toString() : "");
                            updateField("longitude", lng ? lng.toString() : "");
                          }}
                        />
                                                <div className="mt-4">
                          <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Location Description</label>
                          <textarea 
                            value={formData.locationDescription} 
                            onChange={e => updateField("locationDescription", e.target.value)} 
                            className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD] h-20 resize-none" 
                            placeholder="e.g. Leave at the front desk, second building on the left..."
                          />
                        </div>
                        <div className="mt-4">
                          <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Delivery Zone</label>
                          <select 
                            value={formData.zone_id || ""}
                            onChange={(e) => updateField("zone_id", e.target.value)}
                            className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]"
                          >
                            <option value="">Select a Zone (or None)</option>
                            {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Latitude</label>
                          <div className="px-4 py-3 bg-neutral-50 rounded-xl text-neutral-900 font-medium border border-transparent">{customer.latitude || "N/A"}</div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Longitude</label>
                          <div className="px-4 py-3 bg-neutral-50 rounded-xl text-neutral-900 font-medium border border-transparent">{customer.longitude || "N/A"}</div>
                        </div>
                      </>
                    )}
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
                      
                      
                      {formData.selectedPlanId && allPlans.find(p => p._id === formData.selectedPlanId) && (
                        <div className="mt-4 p-4 rounded-2xl border border-[#6A0FAD]/30 bg-[#6A0FAD]/5">
                          <div className="text-xs font-bold text-[#6A0FAD] uppercase tracking-wider mb-2">Currently Assigned Plan</div>
                          {(() => {
                            const p = allPlans.find(p => p._id === formData.selectedPlanId);
                            return (
                              <div className="flex justify-between items-center">
                                <div>
                                  <h4 className="font-bold text-neutral-900">{p.name}</h4>
                                  <div className="text-xs text-neutral-500 font-bold uppercase mt-1">{p.duration} • {p.days} Days</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs font-bold text-neutral-500 uppercase">Meals</div>
                                  <div className="text-sm font-black text-[#6A0FAD]">{p.included_meal_slots?.join(', ')}</div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      <div className="flex justify-end pt-4">
                        <ProbaeButton onClick={loadPlans} type="button" disabled={isLoadingPlans} className="!w-auto flex items-center gap-2">
                          {isLoadingPlans ? <BowlLoader className="w-4 h-4 animate-spin" /> : "Find Plans"}
                        </ProbaeButton>
                      </div>

                      {plans.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-neutral-100">
                          <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-4">Available Plans</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {plans.map(p => (
                              <div 
                                key={p._id} 
                                onClick={() => { updateField("selectedPlanId", p._id); fetchPreview(p._id, formData.goal, customer?.calorie_profile?.mealCalories || {}); }}
                                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${formData.selectedPlanId === p._id ? "border-[#6A0FAD] bg-[#6A0FAD]/5" : "border-neutral-200 hover:border-[#6A0FAD]/30"}`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="font-bold text-neutral-900">{p.name}</h4>
                                  {formData.selectedPlanId === p._id && <Check className="w-5 h-5 text-[#6A0FAD]" />}
                                </div>
                                <div className="text-sm font-black text-neutral-900 mb-1">
                                  {p.plan_type === 'CUSTOM' ? 'Dynamic Custom Plan' : 'Standard 500kcal'}
                                </div>
                                <div className="text-xs text-neutral-500 font-bold uppercase mb-2">
                                  {p.duration} • {p.days} Days
                                </div>
                                <div className="text-xs text-[#6A0FAD] font-bold">
                                  Meals: {p.included_meal_slots?.join(', ')}
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
                        const currentPlan = allPlans.find(p => p._id === customer.selected_plan_id);
                        if (!currentPlan) return <div className="text-sm text-neutral-500 italic">No plan assigned</div>;
                        return (
                          <div className="p-4 rounded-2xl border border-[#6A0FAD]/20 bg-[#6A0FAD]/5 flex justify-between items-center">
                            <div>
                              <h4 className="font-bold text-lg text-[#6A0FAD] mb-1">{currentPlan.name}</h4>
                              <div className="text-xs text-neutral-600 font-bold uppercase">
                                {currentPlan.duration} • {currentPlan.days} Days
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-bold text-neutral-500 uppercase mb-1">Included Meals</div>
                              <div className="text-sm font-black text-neutral-900">{currentPlan.included_meal_slots?.join(', ')}</div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Plan Customization Preview */}
                {isPreviewLoading && (
                  <div className="flex items-center justify-center p-8 bg-white rounded-2xl border border-neutral-200">
                    <BowlLoader className="w-8 h-8 text-[#6A0FAD] animate-spin" />
                    <span className="ml-3 text-neutral-600 font-bold">Calculating personalized macros & pricing...</span>
                  </div>
                )}

                {!isPreviewLoading && previewData && (
                  <div className="space-y-6">
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

                    <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
                      <div className="px-6 py-4 bg-neutral-50 border-b border-neutral-200 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">Customized Meal Schedule</h3>
                        {isEditMode && (
                          <button type="button" onClick={() => fetchPreview(formData.selectedPlanId || "", formData.goal, customer?.calorie_profile?.mealCalories || {})} className="text-xs font-bold text-[#6A0FAD] hover:underline">
                            Refresh Preview
                          </button>
                        )}
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

              </div>

              {/* Right Column (Status & Macros) */}
              <div className="space-y-6">
                
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-100 p-6 shadow-sm">
                  <h3 className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2">Total Calories Delivered</h3>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-black text-green-900">
                      {customer.total_calories_ordered ? customer.total_calories_ordered.toLocaleString("en-US", { maximumFractionDigits: 1 }) : "0"}
                    </span>
                    <span className="text-sm font-bold text-green-700 mb-1">kcal</span>
                  </div>
                  <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mt-2">Lifetime Consumption</p>
                </div>

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
                    <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-4">Calculated TDEE</h3>
                    <div className="flex items-center justify-center p-6 bg-[#6A0FAD]/5 rounded-2xl border border-[#6A0FAD]/10 mb-6">
                      <div className="text-center">
                        <div className="text-3xl font-black text-[#6A0FAD]">{customer.calorie_profile.total}</div>
                        <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mt-1">Kcal / Day</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-6">
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
                    
                    <div className="pt-6 border-t border-neutral-100 space-y-6">
                      <div>
                        <label className="block text-xs font-bold text-[#6A0FAD] uppercase tracking-wider mb-2">Probae Calorie Target</label>
                        {isEditMode ? (
                          <div>
                            <div className="flex items-center gap-3">
                              <input 
                                type="number" 
                                value={formData.probaeTarget}
                                onChange={(e) => handleProbaeTargetChange(Number(e.target.value))}
                                disabled={customer.status === "ACTIVE"}
                                className={`w-32 border border-neutral-200 rounded-xl px-4 py-3 font-bold outline-none ${customer.status === "ACTIVE" ? "bg-neutral-100 text-neutral-400 cursor-not-allowed" : "bg-[#f8f5fb] text-neutral-900 focus:ring-2 focus:ring-[#6A0FAD]/20"}`}
                              />
                              <span className="text-neutral-500 font-medium text-sm">kcal / day</span>
                            </div>
                            {customer.status === "ACTIVE" && (
                              <div className="text-[10px] text-red-500 font-bold mt-2">Matrix locked while subscription is active.</div>
                            )}
                          </div>
                        ) : (
                          <div className="text-2xl font-black text-neutral-900">{customer.calorie_profile.probaeTarget || formData.probaeTarget} <span className="text-sm text-neutral-500 font-medium">kcal / day</span></div>
                        )}
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
                                  <div className="w-16 shrink-0 text-[10px] sm:text-xs font-bold text-neutral-700 uppercase tracking-wider whitespace-nowrap">{slot}</div>
                                  {isEditMode ? (
                                    <>
                                      <button type="button" onClick={() => toggleLock(slot)} disabled={customer.status === "ACTIVE"} className={`p-1 sm:p-1.5 shrink-0 rounded-lg transition-colors ${isLocked ? "bg-red-100 text-red-600" : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200"} ${customer.status === "ACTIVE" ? "opacity-50 cursor-not-allowed" : ""}`}>
                                        {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                      </button>
                                      <input 
                                        type="range" 
                                        min="0"
                                        max={formData.probaeTarget} 
                                        value={formData.mealCalories[slot] || 0}
                                        onChange={(e) => handleMealCalorieChange(slot, Number(e.target.value))}
                                        disabled={isLocked || customer.status === "ACTIVE"}
                                        className={`flex-1 min-w-[40px] ${isLocked || customer.status === "ACTIVE" ? "opacity-50 cursor-not-allowed grayscale" : "accent-[#6A0FAD]"}`}
                                      />
                                      <div className="w-16 sm:w-20 shrink-0 relative">
                                        <input
                                          type="number"
                                          value={formData.mealCalories[slot] || 0}
                                          onChange={(e) => handleMealCalorieChange(slot, Number(e.target.value))}
                                          disabled={isLocked || customer.status === "ACTIVE"}
                                          className={`w-full border-none rounded-lg px-1 sm:px-2 py-1.5 text-xs sm:text-sm font-bold text-center focus:ring-2 focus:ring-[#6A0FAD]/20 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isLocked || customer.status === "ACTIVE" ? "bg-neutral-100 text-neutral-400" : "bg-[#f8f5fb] text-neutral-900"}`}
                                        />
                                      </div>
                                    </>
                                  ) : (
                                    <div className="flex-1 flex justify-end text-lg font-bold text-neutral-900">{customer.calorie_profile.mealCalories?.[slot] || formData.mealCalories[slot] || 0} <span className="text-xs text-neutral-500 font-medium ml-1">kcal</span></div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {isEditMode && (
                      <p className="text-xs text-neutral-500 mt-6 text-center">
                        *Macros will auto-recalculate if you update biological factors.
                      </p>
                    )}
                  </div>
                )}
              </div>

            </div>
            </div>
            )}
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
      
      <ConfirmationModal
        isOpen={!!errorMsg}
        onClose={() => setErrorMsg("")}
        title="Action Failed"
        message={errorMsg}
        type="error"
        cancelText="Close"
      />
    </div>
  );
}
