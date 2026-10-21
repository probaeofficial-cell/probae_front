"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Check, Plus, Info, Sun, Moon, Utensils, Home, X, Lock, Unlock, Dumbbell, Edit } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { endpoints } from "@/lib/apiService";
import { customerEndpoints } from "@/lib/customerApiService";

const calculateMifflinLocally = (data: { sex: string; age: number; height: number; weight: number; activityLevel: string; goal: string }) => {
  const isMale = data.sex.toLowerCase() === "male";
  const bmr = (10 * data.weight) + (6.25 * data.height) - (5 * data.age) + (isMale ? 5 : -161);
  let activityMultiplier = 1.2;
  const al = data.activityLevel.toLowerCase();
  if (al === "lightly active") activityMultiplier = 1.375;
  else if (al === "active") activityMultiplier = 1.55;
  else if (al === "very active" || al === "athlete") activityMultiplier = 1.725;
  let tdee = bmr * activityMultiplier;
  const g = data.goal.toLowerCase();
  if (g.includes("loss")) tdee -= 500;
  else if (g.includes("gain")) tdee += 300;
  if (isMale && tdee < 1500) tdee = 1500;
  if (!isMale && tdee < 1200) tdee = 1200;
  tdee = Math.round(tdee);
  let proteinFactor = 1.6;
  if (al === "sedentary" || al === "lightly active") {
    proteinFactor = (g.includes("maintain") || g.includes("loss")) ? (al === "sedentary" ? 0.8 : 1.0) : 1.6;
  } else if (al === "active") {
    proteinFactor = 1.5;
  } else if (al === "very active" || al === "athlete") {
    proteinFactor = 2.0;
  }
  const protein = Math.round(data.weight * proteinFactor);
  const fat = Math.round((tdee * 0.25) / 9);
  const proteinCals = protein * 4;
  const fatCals = fat * 9;
  const carbs = Math.max(0, Math.round((tdee - proteinCals - fatCals) / 4));
  const fiber = Math.round((tdee / 1000) * 14);
  return { total: tdee, protein, carbs, fat, fiber };
};

export default function OnboardingPage() {
  const router = useRouter();

  // Restore scrolling on onboarding page
  useEffect(() => {
    document.body.classList.add("landing-page");
    document.documentElement.classList.add("landing-page");
    document.body.style.overflow = "auto";
    document.documentElement.style.overflow = "auto";
    document.body.style.height = "auto";
    document.documentElement.style.height = "auto";
    return () => {
      document.body.classList.remove("landing-page");
      document.documentElement.classList.remove("landing-page");
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.body.style.height = "";
      document.documentElement.style.height = "";
    };
  }, []);

  const getTotalDeliveredDays = (duration: string, daysPerWeek: number) => {
    if (duration.toLowerCase() === 'monthly') {
      return (daysPerWeek * 4) + 2;
    }
    return daysPerWeek;
  };

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customAllergy, setCustomAllergy] = useState("");
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [calorieProfile, setCalorieProfile] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showGymWarning, setShowGymWarning] = useState(false);
  const [isChartLoaded, setIsChartLoaded] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [customizedDips, setCustomizedDips] = useState<{[bowlId: string]: string}>({});
  const [customizingBowl, setCustomizingBowl] = useState<any>(null);

  // Trigger chart animation
  useEffect(() => {
    if (step === 3 || step === 6) {
      const timer = setTimeout(() => setIsChartLoaded(true), 100);
      return () => clearTimeout(timer);
    } else {
      setIsChartLoaded(false);
    }
  }, [step]);
  
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);
  const [latestPlanRequest, setLatestPlanRequest] = useState<any>(null);
  const [planPreviewData, setPlanPreviewData] = useState<{
    final_discounted_price: number;
    gross_price: number;
    discount_percentage: number;
    discount_amount: number;
    bowls_by_slot: Record<string, any[]>;
    scaled_matrix: any[];
    is_custom: boolean;
  } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  
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
  });

  const getTotalPurchasedCalories = () => {
    const total = Object.values(formData.mealCalories).reduce((sum, val) => sum + val, 0);
    if (calorieProfile?.total && total > calorieProfile.total) {
      return calorieProfile.total;
    }
    return total;
  };

  // Safety guard: ensure purchased calories never exceed calculated daily target
  useEffect(() => {
    if (calorieProfile?.total && calorieProfile.total > 0) {
      const currentTotal = Object.values(formData.mealCalories).reduce((sum, val) => sum + val, 0);
      if (currentTotal > calorieProfile.total) {
        setFormData((prev) => ({
          ...prev,
          mealCalories: distributeCaloriesAcrossSlots(
            prev.mealSlots,
            calorieProfile.total,
            prev.mealCalories,
            prev.lockedMeals
          )
        }));
      }
    }
  }, [calorieProfile?.total]);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/onboarding/profile');
        if (res.ok) {
          const { data } = await res.json();
          if (data) {
            const updatedData = { ...data };
            if (updatedData.mealSlots && !updatedData.mealCalories) {
              updatedData.mealCalories = {};
              updatedData.mealSlots.forEach((slot: string) => {
                updatedData.mealCalories[slot] = 500;
              });
            }
            setFormData(prev => ({ ...prev, ...updatedData }));
            
            if (data.calorieProfile) {
              setCalorieProfile(data.calorieProfile);
            }
            if (data.selectedPlan) {
              setSelectedPlan(data.selectedPlan);
            }

            if (data.onboardingStep) {
              setStep(data.onboardingStep);
            }
            if (data.latestPlanRequest) {
              setLatestPlanRequest(data.latestPlanRequest);
            }

            // If user is at Step 5 or 6, they need the `plans` array loaded to view them!
            if (data.onboardingStep >= 5 && data.planDuration && data.planFrequency && data.mealSlots) {
              try {
                const plansData = await customerEndpoints.getFilteredPlans({
                  duration: data.planDuration,
                  frequency: data.planFrequency,
                  mealSlots: data.mealSlots,
                });
                let fetched = (plansData && plansData.success && Array.isArray(plansData.plans)) ? plansData.plans : [];
                if (data.mealSlots && data.mealSlots.length > 0 && fetched.length > 0) {
                  const normTarget = new Set(
                    data.mealSlots.map((s: string) => {
                      const lower = s.toLowerCase();
                      if (lower.includes("fast") || lower.includes("break")) return "breakfast";
                      if (lower.includes("lunch")) return "lunch";
                      if (lower.includes("din")) return "dinner";
                      if (lower.includes("snack")) return "snack";
                      return lower;
                    })
                  );
                  fetched = fetched.filter((p: any) => {
                    const planSlots = new Set(
                      (p.included_meal_slots || []).map((s: string) => {
                        const lower = s.toLowerCase();
                        if (lower.includes("fast") || lower.includes("break")) return "breakfast";
                        if (lower.includes("lunch")) return "lunch";
                        if (lower.includes("din")) return "dinner";
                        if (lower.includes("snack")) return "snack";
                        return lower;
                      })
                    );
                    if (planSlots.size !== normTarget.size) return false;
                    for (const s of normTarget) {
                      if (!planSlots.has(s)) return false;
                    }
                    return true;
                  });
                }
                setPlans(fetched);
              } catch (err) {
                console.error("Failed to load plans on mount", err);
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch profile", err);
      } finally {
        setProfileLoaded(true);
      }
    }
    fetchProfile();
  }, []);

  const distributeCaloriesAcrossSlots = (
    slots: string[],
    targetTotal: number,
    currentCalories: Record<string, number> = {},
    lockedMeals: Record<string, boolean> = {}
  ): Record<string, number> => {
    if (slots.length === 0) return {};
    if (slots.length === 1) {
      return { [slots[0]]: targetTotal };
    }

    const unlockedSlots = slots.filter((s) => !lockedMeals[s]);
    const lockedSlots = slots.filter((s) => lockedMeals[s]);

    const newCalories: Record<string, number> = {};

    // If all slots are locked or no unlocked slots, distribute evenly
    if (unlockedSlots.length === 0) {
      const perSlot = Math.floor(targetTotal / slots.length);
      let rem = targetTotal;
      slots.forEach((s, idx) => {
        if (idx === slots.length - 1) {
          newCalories[s] = rem;
        } else {
          newCalories[s] = perSlot;
          rem -= perSlot;
        }
      });
      return newCalories;
    }

    // Preserve locked slots (clamped so they don't exceed targetTotal minus minimums for unlocked)
    let lockedSum = 0;
    lockedSlots.forEach((s) => {
      const maxValForLocked = Math.max(100, targetTotal - unlockedSlots.length * 100);
      const val = Math.max(100, Math.min(maxValForLocked, currentCalories[s] || 100));
      newCalories[s] = val;
      lockedSum += val;
    });

    // Distribute remaining budget among unlocked slots
    let remaining = Math.max(unlockedSlots.length * 100, targetTotal - lockedSum);
    const perUnlocked = Math.floor(remaining / unlockedSlots.length);

    unlockedSlots.forEach((s, idx) => {
      if (idx === unlockedSlots.length - 1) {
        newCalories[s] = remaining;
      } else {
        newCalories[s] = perUnlocked;
        remaining -= perUnlocked;
      }
    });

    return newCalories;
  };

  const updateField = (field: string, value: any) => {
    if (field === "goal" && value === "Muscle Gain") {
      if (formData.activityLevel === "Sedentary" || formData.activityLevel === "Lightly Active") {
        setShowGymWarning(true);
        return;
      }
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDurationChange = (d: "WEEKLY" | "MONTHLY") => {
    setFormData((prev) => {
      let newFreq = prev.planFrequency;
      if (d === "MONTHLY") {
        if (prev.planFrequency === "5 DAYS" || prev.planFrequency === "22 DAYS") newFreq = "22 DAYS";
        else if (prev.planFrequency === "6 DAYS" || prev.planFrequency === "26 DAYS") newFreq = "26 DAYS";
        else newFreq = "30 DAYS";
      } else {
        if (prev.planFrequency === "22 DAYS" || prev.planFrequency === "5 DAYS") newFreq = "5 DAYS";
        else if (prev.planFrequency === "26 DAYS" || prev.planFrequency === "6 DAYS") newFreq = "6 DAYS";
        else newFreq = "7 DAYS";
      }
      return { ...prev, planDuration: d, planFrequency: newFreq };
    });
  };

  const toggleArrayField = (field: "dietaryPreferences" | "allergies" | "mealSlots", value: string) => {
    setFormData((prev) => {
      const current = prev[field] as string[];
      if (current.includes(value)) {
        const newArray = current.filter(item => item !== value);
        if (field === "mealSlots") {
          const maxTarget = calorieProfile?.total || 2000;
          const newCalories = distributeCaloriesAcrossSlots(
            newArray,
            maxTarget,
            prev.mealCalories,
            prev.lockedMeals
          );
          return { ...prev, [field]: newArray, mealCalories: newCalories };
        }
        return { ...prev, [field]: newArray };
      } else {
        if (field === "dietaryPreferences") {
          if (value === "No Restrictions") return { ...prev, [field]: ["No Restrictions"] };
          const filtered = current.filter(item => item !== "No Restrictions");
          return { ...prev, [field]: [...filtered, value] };
        }
        const newArray = [...current, value];
        if (field === "mealSlots") {
          const maxTarget = calorieProfile?.total || 2000;
          const newCalories = distributeCaloriesAcrossSlots(
            newArray,
            maxTarget,
            prev.mealCalories,
            prev.lockedMeals
          );
          return { ...prev, [field]: newArray, mealCalories: newCalories };
        }
        return { ...prev, [field]: newArray };
      }
    });
  };

  const handleMealCalorieChange = (slotId: string, newValue: number) => {
    setFormData((prev) => {
      const maxTargetTotal = calorieProfile?.total || 2000;
      const otherSlots = prev.mealSlots.filter((s) => s !== slotId);
      const unlockedOtherSlots = otherSlots.filter((s) => !prev.lockedMeals[s]);

      const newCalories = { ...prev.mealCalories };

      if (unlockedOtherSlots.length > 0) {
        // Auto-balance against other unlocked slots so total never exceeds maxTargetTotal
        const currentSumOfUnlocked = unlockedOtherSlots.reduce((sum, s) => sum + (newCalories[s] || 100), 0);
        const minPossibleSumOfUnlocked = unlockedOtherSlots.length * 100;
        const maxIncrease = Math.max(0, currentSumOfUnlocked - minPossibleSumOfUnlocked);

        const currentVal = newCalories[slotId] || 100;
        let validValue = Math.min(newValue, currentVal + maxIncrease);
        validValue = Math.max(100, Math.min(maxTargetTotal, validValue));

        const diff = validValue - currentVal;
        newCalories[slotId] = validValue;

        if (diff !== 0) {
          let remainingDiff = diff;
          const diffPerSlot = Math.round(diff / unlockedOtherSlots.length);

          for (let i = 0; i < unlockedOtherSlots.length; i++) {
            const s = unlockedOtherSlots[i];
            const adjustment = i === unlockedOtherSlots.length - 1 ? remainingDiff : diffPerSlot;
            const adjustedValue = Math.max(100, (newCalories[s] || 100) - adjustment);
            const actualAdjustment = (newCalories[s] || 100) - adjustedValue;
            newCalories[s] = adjustedValue;
            remainingDiff -= actualAdjustment;
          }
        }
      } else {
        // Only 1 slot active (or all others locked): cannot exceed maxTargetTotal
        const otherSum = otherSlots.reduce((sum, s) => sum + (newCalories[s] || 0), 0);
        const maxForThisSlot = Math.max(100, maxTargetTotal - otherSum);
        newCalories[slotId] = Math.max(100, Math.min(maxForThisSlot, newValue));
      }

      return { ...prev, mealCalories: newCalories };
    });
  };

  const handleTotalCalorieChange = (newTotalStr: string) => {
    let newTotal = parseInt(newTotalStr) || 0;
    
    // Validation: Cannot exceed calorie profile total
    const maxAllowed = calorieProfile?.total || 2000;
    if (newTotal > maxAllowed) {
      newTotal = maxAllowed;
    }
    const minAllowed = Math.max(100, formData.mealSlots.length * 100);
    if (newTotal < minAllowed && newTotalStr !== "") {
      newTotal = minAllowed;
    }

    setFormData((prev) => {
      const newCalories = distributeCaloriesAcrossSlots(
        prev.mealSlots,
        newTotal,
        prev.mealCalories,
        prev.lockedMeals
      );
      return { ...prev, mealCalories: newCalories };
    });
  };

  const toggleMealLock = (slotId: string) => {
    setFormData((prev) => ({
      ...prev,
      lockedMeals: {
        ...prev.lockedMeals,
        [slotId]: !prev.lockedMeals[slotId]
      }
    }));
  };

  const addCustomAllergy = () => {
    if (customAllergy.trim() && !formData.allergies.includes(customAllergy.trim())) {
      toggleArrayField("allergies", customAllergy.trim());
      setCustomAllergy("");
    }
  };

  const handleContinueToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      const root = document.getElementById("onboarding-root");
      if (root) root.scrollTo({ top: 0, behavior: "smooth" });
      try {
        localStorage.setItem("probae_onboarding_formData", JSON.stringify({ ...formData, onboardingStep: 2 }));
      } catch {}
    }
  };

  const handleContinueToStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let calProfile: any = null;
      try {
        calProfile = await customerEndpoints.calculateCalories({
          sex: formData.sex,
          age: parseInt(formData.age) || 25,
          height: parseFloat(formData.height) || 170,
          weight: parseFloat(formData.weight) || 70,
          activity_level: formData.activityLevel,
          goal: formData.goal,
        });
      } catch {
        calProfile = calculateMifflinLocally({
          sex: formData.sex,
          age: parseInt(formData.age) || 25,
          height: parseFloat(formData.height) || 170,
          weight: parseFloat(formData.weight) || 70,
          activityLevel: formData.activityLevel,
          goal: formData.goal,
        });
      }

      if (calProfile) {
        setCalorieProfile(calProfile);
        setFormData((prev) => {
          const slots = prev.mealSlots.length > 0 ? prev.mealSlots : ["LUNCH"];
          return {
            ...prev,
            mealSlots: slots,
            mealCalories: distributeCaloriesAcrossSlots(
              slots,
              calProfile.total,
              prev.mealCalories,
              prev.lockedMeals
            ),
          };
        });
        setStep(3); // Go to Calorie Profile
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
          const root = document.getElementById("onboarding-root");
          if (root) root.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinueToStep4 = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(4);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      const root = document.getElementById("onboarding-root");
      if (root) root.scrollTo({ top: 0, behavior: "smooth" });
      try {
        localStorage.setItem("probae_onboarding_formData", JSON.stringify({ ...formData, onboardingStep: 4 }));
      } catch {}
    }
  };

  const loadPlanPreview = async (planUlid: string, planOverride?: any) => {
    setIsLoadingPreview(true);
    try {
      const isCustom = planUlid === "CUSTOM_BUILDER" || planOverride?.plan_type?.toUpperCase() === "CUSTOM";
      const res = await customerEndpoints.previewPlanPrice({
        plan_tier_ulid: planUlid,
        duration: formData.planDuration,
        frequency: formData.planFrequency,
        meal_slots: formData.mealSlots,
        calorie_profile: {
          total: getTotalPurchasedCalories(),
          mealCalories: formData.mealCalories,
        },
        goal: formData.goal,
        discount_percentage: planOverride?.discount_percentage || 0,
      });

      if (res && res.success) {
        setPlanPreviewData({
          final_discounted_price: res.final_discounted_price,
          gross_price: res.gross_price,
          discount_percentage: res.discount_percentage,
          discount_amount: res.discount_amount || 0,
          bowls_by_slot: res.bowls_by_slot || {},
          scaled_matrix: res.scaled_matrix || [],
          is_custom: isCustom || res.is_custom,
        });
      }
    } catch (err) {
      console.error("Failed to load plan preview", err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleSelectPlan = async (planId: string, planObj?: any) => {
    setSelectedPlan(planId);
    await loadPlanPreview(planId, planObj);
  };

  const handleContinueToStep5 = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingPlans(true);
    setStep(5);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      const root = document.getElementById("onboarding-root");
      if (root) root.scrollTo({ top: 0, behavior: "smooth" });
      try {
        localStorage.setItem("probae_onboarding_formData", JSON.stringify({ ...formData, onboardingStep: 5 }));
      } catch {}
    }

    try {
      const data = await customerEndpoints.getFilteredPlans({
        duration: formData.planDuration,
        frequency: formData.planFrequency,
        mealSlots: formData.mealSlots,
      });

      let fetchedPlans = (data && data.success && Array.isArray(data.plans)) ? data.plans : [];

      // Strict client-side filter: only keep plans whose included_meal_slots match formData.mealSlots
      if (formData.mealSlots && formData.mealSlots.length > 0 && fetchedPlans.length > 0) {
        const normTarget = new Set(
          formData.mealSlots.map(s => {
            const lower = s.toLowerCase();
            if (lower.includes("fast") || lower.includes("break")) return "breakfast";
            if (lower.includes("lunch")) return "lunch";
            if (lower.includes("din")) return "dinner";
            if (lower.includes("snack")) return "snack";
            return lower;
          })
        );
        fetchedPlans = fetchedPlans.filter((p: any) => {
          const planSlots = new Set(
            (p.included_meal_slots || []).map((s: string) => {
              const lower = s.toLowerCase();
              if (lower.includes("fast") || lower.includes("break")) return "breakfast";
              if (lower.includes("lunch")) return "lunch";
              if (lower.includes("din")) return "dinner";
              if (lower.includes("snack")) return "snack";
              return lower;
            })
          );
          if (planSlots.size !== normTarget.size) return false;
          for (const s of normTarget) {
            if (!planSlots.has(s)) return false;
          }
          return true;
        });
      }

      setPlans(fetchedPlans);

      if (fetchedPlans.length > 0) {
        const firstPlan = fetchedPlans[0];
        const planId = firstPlan.ulid || firstPlan._id;
        setSelectedPlan(planId);
        await loadPlanPreview(planId, firstPlan);
      } else {
        // No pre-built plan matching -> automatically select Custom Plan!
        setSelectedPlan("CUSTOM_BUILDER");
        await loadPlanPreview("CUSTOM_BUILDER", { plan_type: "CUSTOM" });
      }
    } catch (err) {
      console.error("Failed to filter plans:", err);
      setSelectedPlan("CUSTOM_BUILDER");
      await loadPlanPreview("CUSTOM_BUILDER", { plan_type: "CUSTOM" });
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const handleFinalizePlan = async () => {
    setIsSubmitting(true);
    try {
      const isCustomBuilder = selectedPlan === "CUSTOM_BUILDER";
      const plan = plans.find(p => (p.ulid || p._id) === selectedPlan);
      const planName = isCustomBuilder 
        ? `Bespoke Custom Plan (${formData.planDuration} - ${formData.planFrequency})` 
        : (plan?.name || "Personalized Meal Plan");
      const planType = (isCustomBuilder || plan?.plan_type?.toUpperCase() === "CUSTOM") ? "CUSTOM" : "STANDARD";
      
      const slotCaloriesSummary = formData.mealSlots
        .map(slot => `${slot}: ${formData.mealCalories[slot] || 0} kcal`)
        .join(" | ");

      let bowlsSummary = "Standard meal rotation";
      if (planPreviewData?.scaled_matrix && planPreviewData.scaled_matrix.length > 0) {
        bowlsSummary = planPreviewData.scaled_matrix
          .slice(0, 15)
          .map((item) => `Day ${item.day_index + 1} [${item.meal_slot}]: ${item.bowl_name} (${item.scaled_calories} kcal, P:${item.scaled_protein}g C:${item.scaled_carbs}g F:${item.scaled_fats}g - ₹${item.scaled_price})`)
          .join("\n");
      }

      const formattedMessage = [
        "=== CUSTOMER ONBOARDING PLAN FINALIZATION ===",
        `Customer: ${formData.name}`,
        `Phone: ${formData.phone}`,
        `Delivery Address: ${formData.address}`,
        `Sex: ${formData.sex} | Age: ${formData.age} | Height: ${formData.height}cm | Weight: ${formData.weight}kg`,
        `Activity Level: ${formData.activityLevel} | Goal: ${formData.goal}`,
        `Dietary Preferences: ${formData.dietaryPreferences.length > 0 ? formData.dietaryPreferences.join(", ") : "None"}`,
        `Allergies: ${formData.allergies.length > 0 ? formData.allergies.join(", ") : "None"}`,
        `Chef Instructions: ${formData.comments || "None"}`,
        "",
        "=== SELECTED PLAN DETAILS ===",
        `Plan: ${planName} [${planType}]`,
        `Duration: ${formData.planDuration} | Frequency: ${formData.planFrequency}`,
        `Meal Slots: ${formData.mealSlots.join(", ")}`,
        `Daily Purchased Calories: ${getTotalPurchasedCalories()} kcal`,
        `Calorie Distribution: ${slotCaloriesSummary}`,
        "",
        "=== PRICING BREAKDOWN ===",
        `Gross Price: ₹${planPreviewData?.gross_price || 0}`,
        `Discount: ${planPreviewData?.discount_percentage || 0}% (₹${planPreviewData?.discount_amount || 0})`,
        `Final Price: ₹${planPreviewData?.final_discounted_price || 0}`,
        "",
        "=== SCHEDULED BOWLS ===",
        bowlsSummary
      ].join("\n");

      await customerEndpoints.submitEnquiry({
        name: formData.name,
        phone: formData.phone,
        email: undefined,
        plan_interest: `${planName} - ₹${planPreviewData?.final_discounted_price || 0}`,
        message: formattedMessage,
      });

      setShowCheckoutModal(false);
      setStep(6); // Success Step
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        const root = document.getElementById("onboarding-root");
        if (root) root.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      console.error("Failed to submit enquiry:", err);
      setShowCheckoutModal(false);
      setStep(6);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomBowlOrder = async () => {
    await handleSelectPlan("CUSTOM_BUILDER", { plan_type: "CUSTOM" });
    setShowCheckoutModal(true);
  };

  const getRatioForType = (typeCode: string) => {
    let slotId = typeCode;
    if (typeCode === 'B') slotId = 'B-FAST';
    if (typeCode === 'L') slotId = 'LUNCH';
    if (typeCode === 'D') slotId = 'DINNER';
    if (!formData.mealSlots.includes(slotId)) return 0;
    
    const total = getTotalPurchasedCalories();
    if (total === 0) return 0;
    return (formData.mealCalories[slotId] || 0) / total * 100;
  };

  const getDynamicCalsPerMeal = (typeCode: string = '') => {
    if (!calorieProfile || formData.mealSlots.length === 0) return 0;
    if (typeCode) {
      let slotId = typeCode;
      if (typeCode === 'B') slotId = 'B-FAST';
      if (typeCode === 'L') slotId = 'LUNCH';
      if (typeCode === 'D') slotId = 'DINNER';
      return formData.mealCalories[slotId] || 0;
    }
    
    // If no typeCode, return average
    return Math.round(getTotalPurchasedCalories() / formData.mealSlots.length);
  };

  const getDynamicMacroPerMeal = (macro: 'protein' | 'carbs' | 'fat' | 'fiber', typeCode: string = '') => {
    if (!calorieProfile || formData.mealSlots.length === 0) return 0;
    const ratio = typeCode ? (getRatioForType(typeCode) / 100) : (1 / formData.mealSlots.length);
    const scaleFactor = getTotalPurchasedCalories() / calorieProfile.total;
    return Math.round(calorieProfile[macro] * scaleFactor * ratio);
  };

  const getDynamicBowlStats = (bowl: any, typeCode: string = '') => {
    const defaultStats = {
      weight: bowl.baseWeight || 0,
      calories: bowl.baseCalories || 0,
      price: bowl.basePrice || 0,
      macros: bowl.macros || { protein: 0, carbs: 0, fat: 0, fiber: 0 }
    };
    if (!bowl.baseCalories || formData.mealSlots.length === 0) return defaultStats;
    
    const targetCals = getDynamicCalsPerMeal(typeCode);
    const scale = targetCals / bowl.baseCalories;
    
    return {
      weight: Math.round(bowl.baseWeight * scale),
      calories: Math.round(bowl.baseCalories * scale),
      price: bowl.rawMaterialCost > 0 
        ? Math.round((bowl.rawMaterialCost * scale) + (bowl.fixedCost || 0))
        : Math.round((bowl.basePrice || 0) * scale),
      macros: {
        protein: Math.round((bowl.macros?.protein || 0) * scale),
        carbs: Math.round((bowl.macros?.carbs || 0) * scale),
        fat: Math.round((bowl.macros?.fat || 0) * scale),
        fiber: Math.round((bowl.macros?.fiber || 0) * scale),
      }
    };
  };

  const getPlanDynamicPrices = (plan: any) => {
    if (!calorieProfile) {
      return {
        total: plan.totalPrice || 0,
        discounted: plan.discountPrice || plan.totalPrice || 0
      };
    }
    
    let sumOfBowls = 0;
    
    plan.selections?.forEach((bucket: any) => {
      let isSlotSelected = false;
      if (bucket.type === 'B' && formData.mealSlots.includes('B-FAST')) isSlotSelected = true;
      if (bucket.type === 'L' && formData.mealSlots.includes('LUNCH')) isSlotSelected = true;
      if (bucket.type === 'D' && formData.mealSlots.includes('DINNER')) isSlotSelected = true;
      
      if (isSlotSelected && bucket.bowls) {
        bucket.bowls.forEach((bowl: any) => {
          const stats = getDynamicBowlStats(bowl, bucket.type);
          sumOfBowls += stats.price;
        });
      }
    });

    const calculatedTotal = sumOfBowls;
    let calculatedDiscount = calculatedTotal;

    if (plan.totalPrice > 0 && plan.discountPrice > 0 && plan.discountPrice < plan.totalPrice) {
      const discountRatio = plan.discountPrice / plan.totalPrice;
      calculatedDiscount = Math.round(calculatedTotal * discountRatio);
    }

    if (calculatedTotal === 0) {
      let scale = calorieProfile.total / 2000;
      const mealsMultiplier = Math.max(1, formData.mealSlots.length);
      let daysMultiplier = 5;
      if (formData.planFrequency === "6 DAYS") daysMultiplier = 6;
      if (formData.planFrequency === "7 DAYS") daysMultiplier = 7;
      
      const fallbackTotal = Math.round((plan.totalPrice || 0) * scale * mealsMultiplier * daysMultiplier);
      const fallbackDiscount = Math.round((plan.discountPrice || plan.totalPrice || 0) * scale * mealsMultiplier * daysMultiplier);
      return { total: fallbackTotal, discounted: fallbackDiscount };
    }

    return {
      total: calculatedTotal,
      discounted: calculatedDiscount
    };
  };

  const commonAllergies = ["Peanuts", "Dairy", "Shellfish", "Tree Nuts", "Eggs", "Soy", "Wheat"];
  const dietaryOptions = ["No Restrictions", "Vegan", "Keto", "Gluten-Free", "Paleo", "Low Carb"];

  const goals = [
    { 
      id: "Weight Loss", label: "Weight Loss", sub: "Deficit focused", 
      bg: "bg-[#6A0FAD]", 
      iconBg: "bg-[#8A3FD1]",
      shadow: "shadow-[#6A0FAD]/40",
      icon: (
        <svg className="w-4 h-4 text-white/90" viewBox="0 0 24 24" fill="currentColor">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <circle cx="12" cy="8" r="2" fill="#6A0FAD" />
        </svg>
      )
    },
    { 
      id: "Muscle Gain", label: "Muscle Gain", sub: "Surplus & Protein", 
      bg: "bg-[#1B5E20]", 
      iconBg: "bg-[#4CAF50]",
      shadow: "shadow-[#4CAF50]/50",
      icon: (
        <svg className="w-4 h-4 text-[#1B5E20]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.5 4.5l-1-1c-.8-.8-2-.8-2.8 0l-1 1-2-2 1-1c.8-.8.8-2 0-2.8l-1-1c-.8-.8-2-.8-2.8 0L9 4.6 4.6 9c-.8.8-.8 2 0 2.8l1 1c.8.8 2 .8 2.8 0l1-1 2 2-1 1c-.8.8-.8 2 0 2.8l1 1c.8.8 2 .8 2.8 0l1-1c.8-.8.8-2 0-2.8l-1-1 2-2 1-1c.8-.8.8-2 0-2.8z" />
        </svg>
      )
    },
    { 
      id: "Maintenance", label: "Maintenance", sub: "Equilibrium", 
      bg: "bg-[#8D4004]", 
      iconBg: "bg-[#A65B1A]",
      shadow: "shadow-[#FF751F]/40",
      icon: (
        <svg className="w-4 h-4 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
           <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 3m0 0l-3 3m3-3h12m0 0l3 3m-3-3l3-3"/>
        </svg>
      )
    },
  ];

  return (
    <>
      {showGymWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowGymWarning(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-[#1A1A1A] border-2 border-primary/20 rounded-3xl p-8 max-w-sm w-full shadow-2xl overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
            <div className="flex flex-col items-center text-center space-y-4 relative z-10">
              <motion.div 
                animate={{ rotate: [-10, 10, -10], scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(var(--primary),0.5)]"
              >
                <Dumbbell className="w-8 h-8 text-primary" strokeWidth={2.5} />
              </motion.div>
              <h3 className="text-2xl font-bold text-white tracking-tight">Hit the Gym!</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Hey man, it is physically impossible to gain muscle while being sedentary or lightly active. 
                <span className="block mt-2 font-semibold text-white/90">Time to lift some heavy weights!</span>
              </p>
              <button 
                onClick={() => setShowGymWarning(false)}
                className="mt-6 w-full py-3.5 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors active:scale-95"
              >
                Got it
              </button>
            </div>
            
            {/* Background elements */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          </motion.div>
        </div>
      )}
      <div 
        id="onboarding-root"
        className="min-h-screen w-full bg-[#111111] font-sans text-gray-100 flex flex-col items-center justify-start p-4 md:p-8 relative overflow-x-hidden overflow-y-auto"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
      
      {/* Background Square Grid */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.06] pointer-events-none" 
        style={{ 
          backgroundImage: `
            linear-gradient(to right, #ffffff 1px, transparent 1px),
            linear-gradient(to bottom, #ffffff 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px"
        }} 
      />

      <div className="w-full max-w-4xl relative z-10 transition-all duration-500 py-8">
        
        {/* Main Content Area (Removed Figma Card Border) */}
        <div className="w-full">
          
          <div className="px-4 md:px-12">
            
            {/* PERSISTENT HEADER AREA FOR INDICATORS */}
            <div className="flex justify-between items-center mb-10">
               {step === 1 ? (
                 <Link 
                   href="/" 
                   className="w-12 h-12 flex items-center justify-center bg-[#181818] rounded-full hover:bg-gray-800 transition-all duration-300 border border-gray-800/60"
                   aria-label="Go home"
                 >
                   <Home className="w-5 h-5 text-gray-400" />
                 </Link>
               ) : (
                 <button 
                   onClick={() => setStep(step - 1)} 
                   className="w-12 h-12 flex items-center justify-center bg-[#181818] rounded-full hover:bg-gray-800 transition-all duration-300 border border-gray-800/60"
                   aria-label="Go back"
                 >
                   <ArrowLeft className="w-5 h-5 text-gray-400" />
                 </button>
               )}
               
               <div className="flex items-center gap-3">
                 <div className={`h-2.5 rounded-full transition-all duration-500 ease-out ${step === 1 ? 'w-10 bg-primary' : 'w-2.5 bg-gray-600'}`} />
                 <div className={`h-2.5 rounded-full transition-all duration-500 ease-out ${step === 2 ? 'w-10 bg-tertiary' : 'w-2.5 bg-gray-600'}`} />
                 <div className={`h-2.5 rounded-full transition-all duration-500 ease-out ${step === 3 ? 'w-10 bg-secondary' : 'w-2.5 bg-gray-600'}`} />
               </div>

               <div className="w-12 h-12 flex items-center justify-end">
                 {/* Right spacer, except on step 1 where we have 'Skip for now' */}
                 <Link href="/menu" className={`text-sm font-bold text-gray-400 hover:text-white transition-all duration-300 whitespace-nowrap ${step === 1 ? 'opacity-100' : 'opacity-0 pointer-events-none hidden'}`}>
                   Skip for now
                 </Link>
               </div>
            </div>

            {/* -------------------- STEP 1 -------------------- */}
            <div className={`transition-all duration-500 ${step === 1 ? 'block opacity-100' : 'hidden opacity-0 h-0'}`}>
              
              <div className="mb-6 max-w-xl">
                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2 leading-tight font-headline">
                  Build Your<br />Nutrition Profile
                </h1>
                <p className="text-gray-400 text-sm leading-relaxed">
                  We need a few details to precisely calculate your metabolic baseline.
                </p>
              </div>

              <form onSubmit={handleContinueToStep2} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  {/* Left Column */}
                  <div className="space-y-5">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                        Full Name
                      </label>
                      <input 
                        type="text" 
                        value={formData.name}
                        onChange={(e) => updateField("name", e.target.value)}
                        placeholder="Enter your name"
                        className="w-full bg-[#222222] border border-gray-800 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-inner"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                        Phone Number
                      </label>
                      <input 
                        type="tel" 
                        value={formData.phone}
                        onChange={(e) => updateField("phone", e.target.value)}
                        placeholder="Enter your phone number"
                        className="w-full bg-[#222222] border border-gray-800 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-inner"
                        required
                      />
                    </div>
                    
                    {/* Biological Sex with smooth animated slider */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                        Biological Sex
                      </label>
                      <div className="relative flex p-1 bg-[#222222] rounded-xl border border-gray-800 shadow-inner">
                        <div 
                          className="absolute inset-y-1 left-1 w-[calc(50%-4px)] bg-primary rounded-lg transition-transform duration-300 ease-out shadow-md"
                          style={{ transform: formData.sex === "Male" ? "translateX(0)" : "translateX(100%)" }}
                        />
                        <button
                          type="button"
                          onClick={() => updateField("sex", "Male")}
                          className={`relative z-10 flex-1 py-3 text-sm font-bold transition-colors duration-300 ${formData.sex === "Male" ? "text-white" : "text-gray-400 hover:text-gray-200"}`}
                        >
                          Male
                        </button>
                        <button
                          type="button"
                          onClick={() => updateField("sex", "Female")}
                          className={`relative z-10 flex-1 py-3 text-sm font-bold transition-colors duration-300 ${formData.sex === "Female" ? "text-white" : "text-gray-400 hover:text-gray-200"}`}
                        >
                          Female
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-5">
                    <div className="grid grid-cols-3 gap-3 md:gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                          Age
                        </label>
                        <input 
                          type="number" 
                          value={formData.age}
                          onChange={(e) => updateField("age", e.target.value)}
                          className="w-full bg-[#222222] border border-gray-800 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-primary transition-all text-center shadow-inner"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 whitespace-nowrap">
                          Height <span className="text-gray-600 normal-case font-normal">(cm)</span>
                        </label>
                        <input 
                          type="number" 
                          value={formData.height}
                          onChange={(e) => updateField("height", e.target.value)}
                          className="w-full bg-[#222222] border border-gray-800 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-primary transition-all text-center shadow-inner"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 whitespace-nowrap">
                          Weight <span className="text-gray-600 normal-case font-normal">(kg)</span>
                        </label>
                        <input 
                          type="number" 
                          value={formData.weight}
                          onChange={(e) => updateField("weight", e.target.value)}
                          className="w-full bg-[#222222] border border-gray-800 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-primary transition-all text-center shadow-inner"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                        Delivery Address
                      </label>
                      <textarea 
                        value={formData.address}
                        onChange={(e) => updateField("address", e.target.value)}
                        placeholder="Enter your full address"
                        rows={2}
                        className="w-full bg-[#222222] border border-gray-800 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-inner resize-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                        Activity Level
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {["Sedentary", "Lightly Active", "Active", "Very Active"].map((level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => updateField("activityLevel", level)}
                            className={`px-4 py-3.5 text-[11px] md:text-xs font-bold rounded-xl border transition-all ${
                              formData.activityLevel === level
                                ? "bg-primary border-primary text-white shadow-md shadow-primary/20"
                                : "bg-[#222222] border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200"
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-800/50 flex justify-end">
                  <button
                    type="submit"
                    disabled={!formData.name || !formData.phone || !formData.address || !formData.age || !formData.height || !formData.weight}
                    className="group w-full md:w-auto md:px-12 bg-[#F97316] text-white border-2 border-[#F97316] py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-[#F97316]/25 hover:bg-white hover:text-[#F97316] hover:border-white hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#F97316] disabled:hover:text-white disabled:hover:border-[#F97316] disabled:hover:scale-100 cursor-pointer"
                  >
                    <span>Continue to Goals</span>
                    <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.5} />
                  </button>
                </div>

              </form>
            </div>

            {/* -------------------- STEP 2 -------------------- */}
            <div className={`transition-all duration-500 ${step === 2 ? 'block opacity-100' : 'hidden opacity-0 h-0 overflow-hidden'}`}>
              
              <div className="mb-6 max-w-xl">
                <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2 font-headline">
                  Select Your Goal
                </h2>
                <p className="text-gray-400 text-sm md:text-base leading-relaxed">
                  Calibrate your nutritional baseline for optimal biological performance.
                </p>
              </div>

              <form onSubmit={handleContinueToStep3} className="space-y-6">
                
                {/* GOALS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {goals.map((g) => {
                    const isSelected = formData.goal === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => updateField("goal", g.id)}
                        className={`relative p-6 rounded-[24px] text-left transition-all duration-300 overflow-hidden group ${g.bg} ${
                          isSelected 
                            ? `ring-2 ring-white/40 shadow-xl ${g.shadow} scale-[1.02]` 
                            : `hover:scale-[1.01] opacity-90 hover:opacity-100`
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-6 right-6 bg-white/20 rounded-full p-1 backdrop-blur-sm">
                            <Check className="w-4 h-4 text-white" strokeWidth={3} />
                          </div>
                        )}
                        <div className={`w-10 h-10 rounded-full ${g.iconBg} flex items-center justify-center mb-6`}>
                          {g.icon}
                        </div>
                        <h3 className={`text-xl font-bold mb-1 text-white`}>
                          {g.label}
                        </h3>
                        <p className={`text-xs font-mono tracking-wider text-white/70`}>
                          {g.sub}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  {/* Preferences & Allergies */}
                  <div className="space-y-6">
                    
                    {/* Dietary Preferences */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-white">Dietary Preferences</h3>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Optional</span>
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        {dietaryOptions.map(diet => {
                          const active = formData.dietaryPreferences.includes(diet);
                          return (
                            <button
                              key={diet}
                              type="button"
                              onClick={() => toggleArrayField("dietaryPreferences", diet)}
                              className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                                active 
                                  ? "bg-secondary/20 text-secondary border-secondary" 
                                  : "bg-[#222] text-gray-400 border-gray-800 hover:border-gray-600 hover:text-gray-200"
                              }`}
                            >
                              {diet}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Allergies */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-white">Allergies</h3>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Optional</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2.5 mb-4">
                        {commonAllergies.map(allergy => {
                          const active = formData.allergies.includes(allergy);
                          return (
                            <button
                              key={allergy}
                              type="button"
                              onClick={() => toggleArrayField("allergies", allergy)}
                              className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                                active 
                                  ? "bg-red-500/20 text-red-400 border-red-500/50" 
                                  : "bg-[#222] text-gray-400 border-gray-800 hover:border-gray-600 hover:text-gray-200"
                              }`}
                            >
                              {allergy}
                            </button>
                          );
                        })}
                        
                        {/* Render dynamically added custom allergies */}
                        {formData.allergies.filter(a => !commonAllergies.includes(a)).map(custom => (
                           <button
                             key={custom}
                             type="button"
                             onClick={() => toggleArrayField("allergies", custom)}
                             className="px-4 py-2 rounded-full text-xs font-bold transition-all border bg-red-500/20 text-red-400 border-red-500/50 flex items-center gap-1"
                           >
                             {custom} <span className="text-[10px] opacity-70">✕</span>
                           </button>
                        ))}
                      </div>

                      {/* Add custom allergy input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customAllergy}
                          onChange={e => setCustomAllergy(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomAllergy())}
                          placeholder="Other allergy..."
                          className="flex-1 bg-[#222] border border-gray-800 rounded-lg px-4 py-2.5 text-sm text-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all shadow-inner"
                        />
                        <button 
                          type="button"
                          onClick={addCustomAllergy}
                          disabled={!customAllergy.trim()}
                          className="px-4 py-2.5 bg-gray-800 text-white rounded-lg disabled:opacity-50 hover:bg-gray-700 transition-colors flex items-center justify-center border border-gray-700"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Comments/Instructions */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-bold text-white">Chef Instructions</h3>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Optional</span>
                    </div>
                    <textarea 
                      value={formData.comments}
                      onChange={(e) => updateField("comments", e.target.value)}
                      placeholder="Any specific aversions, preferences, or notes for the culinary team? (e.g. 'No cilantro', 'Extra dressing on the side')"
                      className="w-full bg-[#222222] border border-gray-800 rounded-2xl px-5 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-tertiary focus:ring-1 focus:ring-tertiary transition-all shadow-inner resize-none h-40 md:h-[235px]"
                    />
                    <div className="flex items-start gap-2 mt-3 text-gray-500">
                      <Info className="w-4 h-4 shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-relaxed">
                        We review all notes carefully. However, for severe medical allergies, please contact support directly.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-800/50 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group w-full md:w-auto md:px-12 bg-[#F97316] text-white border-2 border-[#F97316] py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-[#F97316]/25 hover:bg-white hover:text-[#F97316] hover:border-white hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#F97316] disabled:hover:text-white disabled:hover:border-[#F97316] disabled:hover:scale-100 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Calculate Profile</span>
                        <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.5} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* -------------------- STEP 3 (Calorie Profile) -------------------- */}
            <div className={`transition-all duration-500 ${step === 3 ? 'block opacity-100' : 'hidden opacity-0 h-0 overflow-hidden'}`}>
              <div className="max-w-md mx-auto">
                <h2 className="text-3xl font-bold text-white tracking-tight mb-12 text-center">
                  Your Goal Calorie Profile
                </h2>

                {calorieProfile && (
                  <div className="flex flex-col items-center">
                    {/* Donut Chart */}
                    <div className="relative w-64 h-64 mb-12">
                      <svg viewBox="0 0 300 300" className="w-full h-full transform -rotate-90">
                        {(() => {
                          const { protein, carbs, fat, fiber } = calorieProfile;
                          const total = protein + carbs + fat + fiber;
                          const circ = 2 * Math.PI * 120; // r=120
                          
                          // Calculate segments
                          const pPct = protein / total;
                          const cPct = carbs / total;
                          const fPct = fat / total;
                          const fiPct = fiber / total;
                          
                          const pStroke = pPct * circ;
                          const cStroke = cPct * circ;
                          const fStroke = fPct * circ;
                          const fiStroke = fiPct * circ;
                          
                          let currentOffset = 0;
                          const pOffset = -currentOffset;
                          currentOffset += pStroke;
                          
                          const cOffset = -currentOffset;
                          currentOffset += cStroke;
                          
                          const fOffset = -currentOffset;
                          currentOffset += fStroke;
                          
                          const fiOffset = -currentOffset;

                          return (
                            <>
                              {/* Background track */}
                              <circle cx="150" cy="150" r="120" fill="none" stroke="#222" strokeWidth="20" />
                              
                              {/* Protein Segment (Purple) */}
                              <circle cx="150" cy="150" r="120" fill="none" stroke="#8B5CF6" strokeWidth="20" 
                                strokeDasharray={`${isChartLoaded ? pStroke : 0} ${circ}`} strokeDashoffset={pOffset} className="transition-all duration-1000 ease-out" />
                                
                              {/* Carbs Segment (Orange) */}
                              <circle cx="150" cy="150" r="120" fill="none" stroke="#F97316" strokeWidth="20" 
                                strokeDasharray={`${isChartLoaded ? cStroke : 0} ${circ}`} strokeDashoffset={cOffset} className="transition-all duration-1000 ease-out delay-100" />
                                
                              {/* Fat Segment (Green) */}
                              <circle cx="150" cy="150" r="120" fill="none" stroke="#10B981" strokeWidth="20" 
                                strokeDasharray={`${isChartLoaded ? fStroke : 0} ${circ}`} strokeDashoffset={fOffset} className="transition-all duration-1000 ease-out delay-200" />
                                
                              {/* Fiber Segment (Peach) */}
                              <circle cx="150" cy="150" r="120" fill="none" stroke="#FFB084" strokeWidth="20" 
                                strokeDasharray={`${isChartLoaded ? fiStroke : 0} ${circ}`} strokeDashoffset={fiOffset} className="transition-all duration-1000 ease-out delay-300" />
                            </>
                          );
                        })()}
                      </svg>
                      
                      {/* Center Text */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-bold text-white font-mono tracking-tight">
                          {calorieProfile.total.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-400 font-bold tracking-widest mt-1">
                          KCAL
                        </span>
                      </div>
                    </div>

                    {/* Macro Grid */}
                    <div className="w-full grid grid-cols-2 bg-[#151515] rounded-2xl border border-gray-800/60 overflow-hidden mb-8">
                      {/* Protein */}
                      <div className="p-6 border-b border-r border-gray-800/60">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
                          <span className="text-sm text-gray-300">Protein</span>
                        </div>
                        <div className="text-xl font-bold text-white font-mono">{calorieProfile.protein}g</div>
                      </div>
                      
                      {/* Carbs */}
                      <div className="p-6 border-b border-gray-800/60">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#F97316]" />
                          <span className="text-sm text-gray-300">Carbs</span>
                        </div>
                        <div className="text-xl font-bold text-white font-mono">{calorieProfile.carbs}g</div>
                      </div>
                      
                      {/* Fat */}
                      <div className="p-6 border-r border-gray-800/60">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                          <span className="text-sm text-gray-300">Fat</span>
                        </div>
                        <div className="text-xl font-bold text-white font-mono">{calorieProfile.fat}g</div>
                      </div>
                      
                      {/* Fiber */}
                      <div className="p-6">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#FFB084]" />
                          <span className="text-sm text-gray-300">Fiber</span>
                        </div>
                        <div className="text-xl font-bold text-white font-mono">{calorieProfile.fiber}g</div>
                      </div>
                    </div>

                    {/* Continue to Filters Button */}
                    <div className="w-full">
                      <button 
                        onClick={handleContinueToStep4}
                        className="w-full border-2 border-dashed border-[#F97316] p-1.5 rounded-2xl group"
                      >
                        <div className="w-full bg-[#F97316] text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 group-hover:bg-[#EA580C] transition-colors">
                          Customize Plan
                          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* -------------------- STEP 4 (Filters) -------------------- */}
            <div className={`transition-all duration-500 ${step === 4 ? 'block opacity-100' : 'hidden opacity-0 h-0 overflow-hidden'}`}>
              
              <div className="mb-6 max-w-xl">
                <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2 font-headline">
                  Customize Your <span className="text-[#4CAF50]">Plan</span>
                </h2>
                <p className="text-gray-400 text-sm md:text-base leading-relaxed">
                  Tailor your meals to your dietary needs.
                </p>
              </div>

              <form onSubmit={handleContinueToStep5} className="max-w-xl mx-auto space-y-4">
                <div className="relative w-full">
                  {selectedPlan && (
                    <div className="absolute -top-16 left-0 right-0 z-50">
                      <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 p-4 rounded-xl text-sm mb-6 flex justify-between items-center shadow-lg backdrop-blur-md">
                        <span>A plan is already selected.</span>
                        <button type="button" onClick={() => setSelectedPlan(null)} className="font-bold underline hover:text-yellow-400">Clear Selection</button>
                      </div>
                    </div>
                  )}
                  <div className={`space-y-4 transition-all duration-300 ${selectedPlan ? 'pointer-events-none opacity-50 blur-[1px]' : ''}`}>
                
                {/* Plan Duration */}
                <div className="flex flex-col items-center">
                  <div className="relative flex p-1 bg-[#151515] rounded-full border border-gray-800/60 max-w-[280px] w-full">
                     {/* Sliding Pill */}
                     <div 
                        className="absolute inset-y-1 left-1 w-[calc(50%-4px)] bg-primary rounded-full transition-transform duration-300 ease-out"
                        style={{ transform: formData.planDuration === "WEEKLY" ? "translateX(0)" : "translateX(100%)" }}
                     />
                     <button type="button" onClick={() => handleDurationChange("WEEKLY")} className={`relative z-10 flex-1 py-3 text-xs font-bold tracking-widest rounded-full transition-colors duration-300 ${formData.planDuration === "WEEKLY" ? "text-white" : "text-gray-400 hover:text-white"}`}>WEEKLY</button>
                     <button type="button" onClick={() => handleDurationChange("MONTHLY")} className={`relative z-10 flex-1 py-3 text-xs font-bold tracking-widest rounded-full transition-colors duration-300 ${formData.planDuration === "MONTHLY" ? "text-white" : "text-gray-400 hover:text-white"}`}>MONTHLY</button>
                  </div>
                  
                  <div className="mt-3 px-3 py-1 bg-[#10B981]/10 border border-[#10B981] text-[#10B981] text-[10px] font-bold rounded-full uppercase tracking-widest transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                    Up to {formData.planDuration === "WEEKLY" ? "10%" : "15%"} Discount
                  </div>
                </div>

                {/* Frequency */}
                <div>
                  <h3 className="text-[11px] font-bold text-[#E6D0BA]/80 uppercase tracking-widest mb-4">Frequency</h3>
                  <div className="relative flex p-1 bg-[#151515] rounded-2xl border border-gray-800/60">
                    {(() => {
                      const currentFrequencies = formData.planDuration === "MONTHLY"
                        ? [
                            { id: "22 DAYS", label: "22 DAYS", sub: "5 Days / wk" },
                            { id: "26 DAYS", label: "26 DAYS", sub: "6 Days / wk" },
                            { id: "30 DAYS", label: "30 DAYS", sub: "7 Days / wk" },
                          ]
                        : [
                            { id: "5 DAYS", label: "5 DAYS", sub: "5 Days / wk" },
                            { id: "6 DAYS", label: "6 DAYS", sub: "6 Days / wk" },
                            { id: "7 DAYS", label: "7 DAYS", sub: "7 Days / wk" },
                          ];

                      const selectedFreqIndex = Math.max(0, currentFrequencies.findIndex(f => f.id === formData.planFrequency));

                      return (
                        <>
                          {/* Sliding Pill */}
                          <div 
                             className={`absolute inset-y-1 left-1 w-[calc(33.333%-2.66px)] rounded-xl transition-all duration-300 ease-out ${
                               selectedFreqIndex === 0 ? "bg-[#4CAF50] shadow-[0_0_15px_rgba(76,175,80,0.3)]" :
                               selectedFreqIndex === 1 ? "bg-[#EAB308] shadow-[0_0_15px_rgba(234,179,8,0.3)]" :
                               "bg-[#F97316] shadow-[0_0_15px_rgba(249,115,22,0.3)]"
                             }`}
                             style={{ 
                               transform: `translateX(${selectedFreqIndex * 100}%)`
                             }}
                          />
                          {currentFrequencies.map(freq => (
                            <button
                              key={freq.id}
                              type="button"
                              onClick={() => updateField("planFrequency", freq.id)}
                              className={`relative z-10 flex-1 py-3 px-2 text-center rounded-xl transition-colors duration-300 ${formData.planFrequency === freq.id ? "text-white" : "text-gray-400 hover:text-white"}`}
                            >
                              <span className="block text-sm font-bold tracking-wider">{freq.label}</span>
                              <span className="block text-[10px] opacity-75 font-medium">{freq.sub}</span>
                            </button>
                          ))}
                        </>
                      );
                    })()}
                  </div>
                </div>


                {/* Meal Slots */}
                <div>
                  <h3 className="text-[11px] font-bold text-[#E6D0BA]/80 uppercase tracking-widest mb-4">Meal Slots</h3>
                  <div className="bg-[#151515] rounded-2xl border border-gray-800/60 px-6 py-6 flex justify-between items-center relative">
                     {/* Connecting Line */}
                     <div className="absolute left-16 right-16 top-[56px] h-[1px] bg-gray-800/60 z-0" />
                     
                     {[
                       { id: "B-FAST", icon: <Sun className="w-6 h-6" />, fillClass: "bg-[#8B5CF6]/40", activeClass: "text-[#8B5CF6]", borderClass: "border-[#8B5CF6]/50 shadow-[0_0_15px_rgba(139,92,246,0.15)]" },
                       { id: "LUNCH", icon: <Utensils className="w-6 h-6" />, fillClass: "bg-[#10B981]/40", activeClass: "text-[#10B981]", borderClass: "border-[#10B981]/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]" },
                       { id: "DINNER", icon: <Moon className="w-6 h-6" />, fillClass: "bg-[#F97316]/40", activeClass: "text-[#F97316]", borderClass: "border-[#F97316]/50 shadow-[0_0_15px_rgba(249,115,22,0.15)]" },
                     ].map(slot => {
                        const active = formData.mealSlots.includes(slot.id);
                        return (
                          <div key={slot.id} className="relative z-10 flex flex-col items-center gap-4">
                            <button 
                              type="button" 
                              onClick={() => toggleArrayField("mealSlots", slot.id)} 
                              className={`relative overflow-hidden w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 border border-gray-700/50 ${active ? slot.borderClass : "bg-[#1A1A1A] hover:bg-[#222]"}`}
                            >
                               {/* Bottom Fill Animation */}
                               <div 
                                  className={`absolute bottom-0 left-0 right-0 ${slot.fillClass} transition-all duration-500 ease-out z-0`}
                                  style={{ height: active ? '100%' : '0%' }}
                               />
                               <div className={`relative z-10 transition-colors duration-500 ${active ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                                  {slot.icon}
                               </div>
                            </button>
                            <span className={`text-[10px] font-bold tracking-widest transition-colors duration-500 ${active ? slot.activeClass : "text-[#E6D0BA]/80"}`}>{slot.id}</span>
                          </div>
                        )
                     })}
                  </div>
                </div>

                {/* Calories to Purchase - Moved above distribution */}
                <div className="mt-6 mb-6">
                  <h3 className="text-[11px] font-bold text-[#E6D0BA]/80 uppercase tracking-widest mb-4">Total Purchased Calories</h3>
                  <div className="bg-[#151515] rounded-2xl border border-gray-800/60 p-6 flex flex-col items-center shadow-inner">
                    <p className="text-gray-400 text-sm text-center mb-6 leading-relaxed">
                      Your goal requires <span className="text-white font-bold">{calorieProfile?.total || 0} kcal</span> daily. 
                      You can adjust your intake per meal slot below.
                    </p>
                    <div className="flex flex-col items-center w-full">
                      <div className="relative flex items-center justify-center group">
                        <input
                          type="number"
                          min={Math.max(100, formData.mealSlots.length * 100)}
                          max={calorieProfile?.total || 3000}
                          value={getTotalPurchasedCalories() || ""}
                          onChange={(e) => handleTotalCalorieChange(e.target.value)}
                          className="w-48 bg-transparent text-white text-4xl font-black font-mono text-center focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-xl transition-all hover:bg-white/5 py-2"
                        />
                        <Edit className="absolute right-2 w-5 h-5 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      </div>
                      <span className="text-xs text-tertiary font-bold tracking-widest mt-1">KCAL TOTAL</span>
                    </div>
                  </div>
                </div>

                {/* Calorie Distribution UI */}
                {formData.mealSlots.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[11px] font-bold text-[#E6D0BA]/80 uppercase tracking-widest">Calorie Distribution</h3>
                      <span className="text-[10px] text-gray-500 bg-gray-800/50 px-2 py-0.5 rounded border border-gray-700/50">
                        Auto-balances to maintain total
                      </span>
                    </div>
                    <div className="bg-[#151515] rounded-2xl border border-gray-800/60 p-6 space-y-6">
                      {[...formData.mealSlots].sort((a, b) => {
                        const order: Record<string, number> = { "B-FAST": 1, "LUNCH": 2, "DINNER": 3 };
                        return (order[a] || 99) - (order[b] || 99);
                      }).map((slotId) => {
                        const isLocked = formData.lockedMeals[slotId];
                        const showLock = formData.mealSlots.length > 1;
                        const otherSlotsMinSum = formData.mealSlots
                          .filter((s) => s !== slotId)
                          .reduce((sum, s) => sum + (formData.lockedMeals[s] ? (formData.mealCalories[s] || 100) : 100), 0);
                        const slotMax = Math.max(100, (calorieProfile?.total || 2000) - otherSlotsMinSum);
                        return (
                          <div key={slotId} className="flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-300">{slotId}</span>
                                {showLock && (
                                  <button
                                    type="button"
                                    onClick={() => toggleMealLock(slotId)}
                                    className={`p-1.5 rounded-lg transition-colors border ${isLocked ? 'bg-tertiary/20 text-tertiary border-tertiary/30' : 'bg-gray-800 text-gray-500 border-gray-700 hover:text-gray-300'}`}
                                    title={isLocked ? "Unlock slider" : "Lock slider"}
                                  >
                                    {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                  </button>
                                )}
                              </div>
                              <span className={`text-sm font-bold bg-white/10 px-2 py-0.5 rounded ${isLocked ? 'text-tertiary' : 'text-white'}`}>
                                {formData.mealCalories?.[slotId] || 0} kcal
                              </span>
                            </div>
                            <input 
                              type="range" 
                              min="100" 
                              max={slotMax} 
                              step="10"
                              value={formData.mealCalories?.[slotId] || 0}
                              onChange={(e) => handleMealCalorieChange(slotId, parseInt(e.target.value))}
                              disabled={isLocked && showLock}
                              className={`w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#4CAF50] ${isLocked && showLock ? 'opacity-50 cursor-not-allowed' : ''}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-800/50 flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoadingPlans}
                    className="group w-full md:w-auto md:px-12 bg-[#F97316] text-white border-2 border-[#F97316] py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-[#F97316]/25 hover:bg-white hover:text-[#F97316] hover:border-white hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isLoadingPlans ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Select Plan</span>
                        <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2.5} />
                      </>
                    )}
                  </button>
                </div>

              </form>
            </div>
            
            {/* -------------------- STEP 5 (Plan Selection) -------------------- */}
            <div className={`transition-all duration-500 ${step === 5 ? 'block opacity-100' : 'hidden opacity-0 h-0 overflow-hidden'}`}>
              <div className="max-w-6xl mx-auto">
                <h2 className="text-3xl font-bold text-white tracking-tight mb-2 text-center">
                  {selectedPlan ? "Selected Tier" : "Select Your Tier"}
                </h2>
                <p className="text-[#E6D0BA]/80 text-sm md:text-base font-serif italic text-center mb-12">
                  Pricing and meal rotations calibrated for your {getTotalPurchasedCalories()} kcal goal.
                </p>

                <div className="flex justify-center mb-12">
                  {isLoadingPlans ? (
                    <div className="flex flex-col items-center py-12">
                      <div className="w-12 h-12 border-4 border-[#F97316]/30 border-t-[#F97316] rounded-full animate-spin mb-4" />
                      <p className="text-gray-400">Finding the perfect plans from the kitchen...</p>
                    </div>
                  ) : plans.length === 0 ? (
                    <div className="w-full max-w-2xl mx-auto">
                      {/* No exact pre-made plan -> Show Custom Plan */}
                      <div className="bg-[#181818] rounded-3xl p-6 md:p-8 border border-gray-800 text-center shadow-xl">
                        <div className="inline-flex items-center gap-2 bg-[#F97316]/10 text-[#F97316] border border-[#F97316]/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                          Custom Plan Calibration
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Bespoke Custom Plan</h3>
                        <p className="text-gray-400 text-sm mb-6 max-w-lg mx-auto leading-relaxed">
                          We didn&apos;t find a standard tier matching your exact combination of {formData.planDuration}, {formData.planFrequency}, and {formData.mealSlots.length} meals. We have calibrated a custom plan specifically for your nutritional profile!
                        </p>

                        <div className="bg-[#6A0FAD] rounded-2xl p-6 text-left text-white mb-6 border border-white/20 shadow-2xl relative">
                          <div className="absolute top-4 right-4 bg-[#FFD700] text-black text-[10px] font-bold tracking-widest px-3 py-1 rounded-full uppercase">
                            Custom Calibrated
                          </div>
                          <h4 className="text-2xl font-bold mb-1">Bespoke Custom Plan</h4>
                          <p className="text-white/80 text-xs mb-6">{formData.planDuration} - {formData.planFrequency} ({formData.mealSlots.join(" + ")})</p>

                          <div className="bg-white/20 rounded-xl p-4 mb-6 backdrop-blur-sm">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs uppercase font-bold text-white/80 tracking-wider">Target Daily Intake</span>
                              <span className="text-lg font-bold text-white">{getTotalPurchasedCalories()} kcal</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {formData.mealSlots.map(slot => (
                                <span key={slot} className="bg-black/25 text-white text-xs px-2.5 py-1 rounded-md font-medium">
                                  {slot}: {formData.mealCalories[slot] || 0} kcal
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-baseline gap-3 mb-2">
                            <span className="text-4xl font-extrabold text-white">
                              ₹{planPreviewData?.final_discounted_price || "—"}
                            </span>
                            {planPreviewData && planPreviewData.discount_percentage > 0 && (
                              <span className="text-sm line-through text-white/60">₹{planPreviewData.gross_price}</span>
                            )}
                            <span className="text-xs text-white/70">all-inclusive</span>
                          </div>
                        </div>

                        <button 
                          onClick={() => handleSelectPlan("CUSTOM_BUILDER", { plan_type: "CUSTOM" })}
                          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                            selectedPlan === "CUSTOM_BUILDER" 
                              ? "bg-[#FFD700] text-black shadow-lg shadow-[#FFD700]/20" 
                              : "bg-white/10 text-white hover:bg-white/20 border border-white/20"
                          }`}
                        >
                          {selectedPlan === "CUSTOM_BUILDER" ? "✓ Custom Plan Selected" : "Select Custom Plan"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full">
                      <div className="flex gap-4 md:gap-6 mb-12 overflow-x-auto pb-6 snap-x snap-mandatory px-4 md:px-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {plans.map((plan) => {
                          const planId = plan.ulid || plan._id;
                          const isSelected = selectedPlan === planId;
                          const isCore = plan.category?.toLowerCase() === "core";
                          const bgColor = isCore ? "bg-[#16A34A]" : "bg-[#6A0FAD]";
                          const activeBorder = isCore ? "border-[#16A34A] shadow-[0_0_30px_rgba(22,163,74,0.3)]" : "border-[#6A0FAD] shadow-[0_0_30px_rgba(106,15,173,0.3)]";
                          const textColor = isCore ? "text-gray-900" : "text-yellow-950";
                          const labelColor = isCore ? "text-gray-500" : "text-yellow-900";
                          const boxColor = isCore ? "bg-white" : "bg-[#FFD700]";

                          const displayPrice = isSelected && planPreviewData 
                            ? planPreviewData.final_discounted_price 
                            : (plan.discount_percentage > 0 ? `₹— (${plan.discount_percentage}% OFF)` : "₹—");

                          return (
                            <div 
                              key={planId} 
                              onClick={() => handleSelectPlan(planId, plan)}
                              className={`relative cursor-pointer rounded-3xl p-6 lg:p-8 transition-all duration-300 border-2 snap-center shrink-0 w-[85vw] md:w-[60vw] lg:w-[500px] ${isSelected ? `${activeBorder} scale-[1.02]` : 'border-transparent'} ${bgColor}`}
                            >
                              {isSelected && (
                                <div className="absolute top-4 right-4 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg">
                                  <Check className={`w-4 h-4 ${isCore ? "text-[#16A34A]" : "text-[#6A0FAD]"}`} strokeWidth={3} />
                                </div>
                              )}
                              {!isCore && (
                                <div className="absolute top-0 right-12 bg-[#FFD700] text-black text-[10px] font-bold tracking-widest px-4 py-1.5 rounded-b-lg uppercase">
                                  Most Nutrient Dense
                                </div>
                              )}
                              <h3 className="text-2xl xl:text-3xl font-bold text-white mb-2 mt-2">{plan.name}</h3>
                              <p className="text-white/90 text-sm mb-8">{plan.category} Plan - {plan.duration} ({getTotalDeliveredDays(plan.duration, plan.days)} Days)</p>
                              
                              <div className="bg-white/20 rounded-2xl p-6 mb-8 backdrop-blur-sm">
                                <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest text-center mb-2">Per Meal Average</p>
                                <h4 className="text-5xl font-bold text-white text-center mb-6">
                                  {getDynamicCalsPerMeal()} <span className="text-2xl font-normal">kcal</span>
                                </h4>
                                
                                <div className="grid grid-cols-4 gap-2 mb-6">
                                  <div className={`${boxColor} rounded-xl p-2 text-center`}>
                                    <p className={`text-[10px] font-bold uppercase ${labelColor}`}>Protein</p>
                                    <p className={`font-bold ${textColor}`}>
                                      {isCore ? getDynamicMacroPerMeal('protein') : Math.round(getDynamicMacroPerMeal('protein') * 1.2)}g
                                    </p>
                                  </div>
                                  <div className="bg-white rounded-xl p-2 text-center">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase">Carbs</p>
                                    <p className="font-bold text-gray-900">
                                      {isCore ? getDynamicMacroPerMeal('carbs') : Math.round(getDynamicMacroPerMeal('carbs') * 0.9)}g
                                    </p>
                                  </div>
                                  <div className="bg-white rounded-xl p-2 text-center">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase">Fats</p>
                                    <p className="font-bold text-gray-900">{getDynamicMacroPerMeal('fat')}g</p>
                                  </div>
                                  <div className="bg-white rounded-xl p-2 text-center">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase">Fiber</p>
                                    <p className="font-bold text-gray-900">10g</p>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-end gap-3 mb-6">
                                <span className="text-5xl font-bold text-white">
                                  {typeof displayPrice === "number" ? `₹${displayPrice}` : displayPrice}
                                </span>
                                {isSelected && planPreviewData && planPreviewData.discount_percentage > 0 && (
                                  <span className="text-lg text-white/60 line-through mb-1">₹{planPreviewData.gross_price}</span>
                                )}
                              </div>
                              
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleSelectPlan(planId, plan); }}
                                className="w-full bg-[#FFD700] hover:bg-white text-black py-4 rounded-xl font-bold text-lg transition-colors cursor-pointer"
                              >
                                {isSelected ? 'Selected' : `Choose ${plan.name}`}
                              </button>
                            </div>
                          );
                        })}

                        {/* Custom Bowl Card */}
                        <div className="relative rounded-3xl p-6 lg:p-8 flex flex-col self-stretch bg-[#F97316] shadow-xl justify-center items-center text-center snap-center shrink-0 w-[85vw] md:w-[60vw] lg:w-[500px]">
                          <h3 className="text-2xl font-black text-white mb-2">Want Something Else?</h3>
                          <p className="text-white/90 font-medium mb-8">Get a fully customized bowl tailored exactly to your unique needs.</p>
                          <button
                            onClick={handleCustomBowlOrder}
                            disabled={isSubmittingCustom}
                            className="w-full bg-black/10 border-2 border-white text-white py-4 rounded-xl font-bold text-lg hover:bg-white hover:text-[#F97316] transition-colors flex items-center justify-center shadow-sm cursor-pointer"
                          >
                            {isSubmittingCustom ? (
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              "Order your custom bowl"
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sample Bowls Grid based on selected plan */}
                {selectedPlan && (
                  <div className="border-t border-gray-800/50 pt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center mb-8">
                      <div className="inline-flex items-center gap-2 bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/30 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest mb-3">
                        {planPreviewData?.is_custom ? "Custom Calorie Calibration" : "Standard Blueprint Rotation"}
                      </div>
                      <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                        {selectedPlan === "CUSTOM_BUILDER" 
                          ? "Your Custom Calibrated Bowls" 
                          : `Sample ${plans.find(p => (p.ulid || p._id) === selectedPlan)?.name || "Plan"} Bowls`}
                      </h3>
                      <p className="text-sm text-gray-400 max-w-lg mx-auto">
                        {planPreviewData?.is_custom 
                          ? `Portions and ingredients mathematically scaled to meet your ${getTotalPurchasedCalories()} kcal target.` 
                          : `Handcrafted culinary selections from our active ${formData.planDuration} menu rotation.`}
                      </p>
                    </div>

                    {isLoadingPreview ? (
                      <div className="flex flex-col items-center py-8">
                        <div className="w-8 h-8 border-2 border-[#F97316]/30 border-t-[#F97316] rounded-full animate-spin mb-3" />
                        <p className="text-xs text-gray-400">Scaling portions and calculating live kitchen pricing...</p>
                      </div>
                    ) : (
                      <div className="space-y-10">
                        {formData.mealSlots.map((slot) => {
                          const slotBowls = planPreviewData?.bowls_by_slot?.[slot] || [];
                          return (
                            <div key={slot} className="space-y-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  slot === 'B-FAST' ? 'bg-[#8B5CF6]/20 text-[#8B5CF6]' : 
                                  slot === 'LUNCH' ? 'bg-[#10B981]/20 text-[#10B981]' : 
                                  'bg-[#F97316]/20 text-[#F97316]'
                                }`}>
                                  {slot === 'B-FAST' && <Sun className="w-4 h-4" />}
                                  {slot === 'LUNCH' && <Utensils className="w-4 h-4" />}
                                  {slot === 'DINNER' && <Moon className="w-4 h-4" />}
                                </div>
                                <h4 className="text-lg font-bold text-white tracking-wide">{slot}</h4>
                                <span className="text-xs text-gray-400 bg-gray-800/80 px-2.5 py-0.5 rounded-full border border-gray-700/60 font-mono">
                                  {formData.mealCalories[slot] || 0} kcal target
                                </span>
                              </div>

                              {slotBowls.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                  {slotBowls.map((bowl, idx) => (
                                    <div key={idx} className="bg-[#181818] rounded-2xl p-4 border border-gray-800/80 hover:border-gray-700 transition-all flex flex-col justify-between">
                                      <div>
                                        <div className="w-full h-36 bg-[#222] rounded-xl mb-4 overflow-hidden relative">
                                          {bowl.image_url ? (
                                            <img src={bowl.image_url} alt={bowl.bowl_name} className="w-full h-full object-cover" />
                                          ) : (
                                            <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                                              <span className="text-neutral-600 text-xs uppercase font-bold tracking-widest">{slot}</span>
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex justify-between items-start mb-2">
                                          <h5 className="font-bold text-gray-200 text-sm leading-tight pr-2">{bowl.bowl_name}</h5>
                                          <span className="text-xs font-bold text-[#FFD700] bg-[#FFD700]/10 px-2 py-0.5 rounded shrink-0">
                                            ₹{bowl.scaled_price}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 mb-3">
                                          <span className="text-[10px] font-bold text-black bg-[#FFD700] px-2 py-0.5 rounded">
                                            {bowl.scaled_calories} kcal
                                          </span>
                                          {bowl.is_customized && (
                                            <span className="text-[9px] font-bold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded uppercase">
                                              Calibrated
                                            </span>
                                          )}
                                        </div>
                                        <div className="grid grid-cols-4 gap-1">
                                          <div className="bg-[#222] p-1.5 rounded text-center">
                                            <p className="text-[8px] text-gray-500 uppercase font-bold">Pro</p>
                                            <p className="text-[10px] font-bold text-white">{bowl.scaled_protein}g</p>
                                          </div>
                                          <div className="bg-[#222] p-1.5 rounded text-center">
                                            <p className="text-[8px] text-gray-500 uppercase font-bold">Carb</p>
                                            <p className="text-[10px] font-bold text-white">{bowl.scaled_carbs}g</p>
                                          </div>
                                          <div className="bg-[#222] p-1.5 rounded text-center">
                                            <p className="text-[8px] text-gray-500 uppercase font-bold">Fat</p>
                                            <p className="text-[10px] font-bold text-white">{bowl.scaled_fats}g</p>
                                          </div>
                                          <div className="bg-[#222] p-1.5 rounded text-center">
                                            <p className="text-[8px] text-gray-500 uppercase font-bold">Fib</p>
                                            <p className="text-[10px] font-bold text-white">{bowl.scaled_fiber || 8}g</p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-gray-500 text-sm italic">Rotation bowls will be calibrated during kitchen dispatch.</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Finalize Button */}
                <div className="flex justify-center flex-col items-center gap-4 mt-12 mb-20">
                  <button 
                    onClick={() => setShowCheckoutModal(true)}
                    disabled={!selectedPlan || isSubmitting}
                    className="group w-full max-w-sm bg-[#F97316] text-white border-2 border-[#F97316] py-4.5 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-white hover:text-[#F97316] hover:border-white hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out shadow-[0_0_30px_rgba(249,115,22,0.25)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Lock in my plan</span>
                        <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </div>

                {/* Checkout Confirmation Modal */}
                {showCheckoutModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-[#151515] border border-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
                    >
                      <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-[#F97316]/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#F97316]/30">
                          <Check className="w-8 h-8 text-[#F97316]" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2 font-headline">Confirm Selection</h3>
                        <p className="text-gray-400 text-sm mb-4">
                          You are about to lock in your personalized plan configuration.<br/>
                          Our nutrition team will connect with you directly to finalize your dispatch details.
                        </p>
                        <div className="bg-[#222] p-4 rounded-xl text-left text-xs space-y-1.5 border border-gray-800">
                          <div className="flex justify-between text-gray-300">
                            <span>Plan:</span>
                            <span className="font-bold text-white">
                              {selectedPlan === "CUSTOM_BUILDER" ? "Bespoke Custom Plan" : (plans.find(p => (p.ulid || p._id) === selectedPlan)?.name || "Selected Plan")}
                            </span>
                          </div>
                          <div className="flex justify-between text-gray-300">
                            <span>Schedule:</span>
                            <span className="text-white">{formData.planDuration} ({formData.planFrequency})</span>
                          </div>
                          <div className="flex justify-between text-gray-300">
                            <span>Daily Calories:</span>
                            <span className="text-white">{getTotalPurchasedCalories()} kcal</span>
                          </div>
                          <div className="flex justify-between text-[#FFD700] pt-2 border-t border-gray-800 font-bold text-sm">
                            <span>Estimated Price:</span>
                            <span>₹{planPreviewData?.final_discounted_price || 0}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <button 
                          onClick={() => setShowCheckoutModal(false)}
                          className="flex-1 py-3.5 rounded-xl font-bold text-white bg-gray-800 hover:bg-gray-700 transition-colors cursor-pointer"
                          disabled={isSubmitting}
                        >
                          Go Back
                        </button>
                        <button 
                          onClick={handleFinalizePlan}
                          disabled={isSubmitting}
                          className="flex-1 py-3.5 rounded-xl font-bold text-white bg-[#F97316] hover:bg-white hover:text-[#F97316] border-2 border-[#F97316] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            "Confirm & Finalize"
                          )}
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </div>
            </div>
            
            {/* -------------------- STEP 6 (Success) -------------------- */}
            <div className={`transition-all duration-500 ${step === 6 ? 'block opacity-100' : 'hidden opacity-0 h-0 overflow-hidden'}`}>
              <div className="max-w-2xl mx-auto py-12 text-center">
                <div className="w-20 h-20 bg-[#16A34A]/20 text-[#16A34A] rounded-full flex items-center justify-center mx-auto mb-6 border border-[#16A34A]/40">
                  <Check className="w-10 h-10" strokeWidth={3} />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-3 font-headline">
                  Plan Locked In!
                </h2>
                <p className="text-gray-300 text-base md:text-lg mb-8 leading-relaxed max-w-lg mx-auto">
                  Our team will connect with you at <span className="text-[#FFD700] font-bold">{formData.phone}</span> within 24 hours to confirm your delivery address,meal plan and schedule.
                </p>

                {/* Summary Card */}
                <div className="bg-[#181818] border border-gray-800 rounded-3xl p-6 md:p-8 text-left mb-8 space-y-4 shadow-xl">
                  <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Selected Plan</span>
                      <h4 className="text-xl font-bold text-white">
                        {selectedPlan === "CUSTOM_BUILDER" 
                          ? "Bespoke Custom Plan" 
                          : (plans.find(p => (p.ulid || p._id) === selectedPlan)?.name || "Personalized Meal Plan")}
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Total Price</span>
                      <p className="text-2xl font-black text-[#FFD700]">₹{planPreviewData?.final_discounted_price || 0}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Schedule</p>
                      <p className="font-semibold text-white">{formData.planDuration} ({formData.planFrequency})</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Daily Calories</p>
                      <p className="font-semibold text-white">{getTotalPurchasedCalories()} kcal</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Meal Slots</p>
                      <p className="font-semibold text-white">{formData.mealSlots.join(", ")}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Customer Name</p>
                      <p className="font-semibold text-white">{formData.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Delivery Address</p>
                      <p className="font-semibold text-white truncate max-w-[180px]">{formData.address}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Status</p>
                      <p className="font-semibold text-[#10B981]">Team Connecting Soon</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link 
                    href="/"
                    className="px-8 py-3.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold text-sm transition-colors"
                  >
                    Return Home
                  </Link>
                  <Link 
                    href="/menu"
                    className="px-8 py-3.5 bg-[#F97316] hover:bg-white hover:text-[#F97316] text-white rounded-xl font-bold text-sm transition-colors border border-[#F97316]"
                  >
                    Explore Today&apos;s Menu
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  </>
  );
}
