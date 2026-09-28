"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Check, Plus, Info, Sun, Moon, Utensils, Home, X, Lock, Unlock, Dumbbell, Edit } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function OnboardingPage() {
  const router = useRouter();

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
    return Object.values(formData.mealCalories).reduce((sum, val) => sum + val, 0);
  };

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
                const plansRes = await fetch('/api/onboarding/plans', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    duration: data.planDuration, 
                    frequency: data.planFrequency,
                    mealSlots: data.mealSlots 
                  })
                });
                const plansData = await plansRes.json();
                if (plansData.success && plansData.plans) {
                  setPlans(plansData.plans);
                }
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

  const updateField = (field: string, value: any) => {
    if (field === "goal" && value === "Muscle Gain") {
      if (formData.activityLevel === "Sedentary" || formData.activityLevel === "Lightly Active") {
        setShowGymWarning(true);
        return;
      }
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayField = (field: "dietaryPreferences" | "allergies" | "mealSlots", value: string) => {
    setFormData((prev) => {
      const current = prev[field] as string[];
      if (current.includes(value)) {
        const newArray = current.filter(item => item !== value);
        if (field === "mealSlots") {
          const newCalories = { ...prev.mealCalories };
          delete newCalories[value];
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

  const handleMealCalorieChange = (slotId: string, newValue: number) => {
    setFormData((prev) => {
      const newCalories = { ...prev.mealCalories };
      let validValue = newValue;

      if (prev.mealSlots.length > 1) {
        // Auto-balance logic for multiple meals
        const unlockedSlots = prev.mealSlots.filter(s => s !== slotId && !prev.lockedMeals[s]);
        const currentSumOfUnlocked = unlockedSlots.reduce((sum, s) => sum + (newCalories[s] || 0), 0);
        const minPossibleSumOfUnlocked = unlockedSlots.length * 100;
        
        const maxIncrease = currentSumOfUnlocked - minPossibleSumOfUnlocked;
        const currentVal = newCalories[slotId] || 0;
        
        validValue = Math.min(newValue, currentVal + maxIncrease);
        validValue = Math.max(100, Math.min(calorieProfile?.total || 3000, validValue));
        
        const diff = validValue - currentVal;
        newCalories[slotId] = validValue;

        if (unlockedSlots.length > 0) {
          const diffPerSlot = Math.round(diff / unlockedSlots.length);
          let remainingDiff = diff;
          
          for (let i = 0; i < unlockedSlots.length; i++) {
            const s = unlockedSlots[i];
            const adjustment = (i === unlockedSlots.length - 1) ? remainingDiff : diffPerSlot;
            const adjustedValue = Math.max(100, (newCalories[s] || 0) - adjustment);
            const actualAdjustment = (newCalories[s] || 0) - adjustedValue;
            
            newCalories[s] = adjustedValue;
            remainingDiff -= actualAdjustment;
          }
        }
      } else {
        // Only 1 slot: it can be adjusted independently up to total
        validValue = Math.max(100, Math.min(calorieProfile?.total || 3000, newValue));
        newCalories[slotId] = validValue;
      }

      return { ...prev, mealCalories: newCalories };
    });
  };

  const handleTotalCalorieChange = (newTotalStr: string) => {
    let newTotal = parseInt(newTotalStr) || 0;
    
    // Validation: Cannot exceed calorie profile total
    const maxAllowed = calorieProfile?.total || 3000;
    if (newTotal > maxAllowed) {
      newTotal = maxAllowed;
    }

    setFormData((prev) => {
      const newCalories = { ...prev.mealCalories };
      const oldTotal = Object.values(newCalories).reduce((sum, val) => sum + val, 0) || 1;
      
      let remaining = newTotal;
      const slots = prev.mealSlots;
      
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (i === slots.length - 1) {
          newCalories[slot] = remaining; // last slot takes the remainder
        } else {
          const ratio = (newCalories[slot] || 0) / oldTotal;
          const assigned = Math.round(newTotal * ratio);
          newCalories[slot] = assigned;
          remaining -= assigned;
        }
      }
      
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
    // Save progress in background
    fetch('/api/onboarding/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, onboardingStep: 2 })
    }).catch(console.error);
  };

  const handleContinueToStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/onboarding/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, onboardingStep: 3 })
      });
      const data = await res.json();
      if (data.success) {
        setCalorieProfile(data.calorieProfile);
        setFormData(prev => {
          const newCalories = { ...prev.mealCalories };
          if (prev.mealSlots.length > 0) {
            // Assign 1/3 to each slot by default if it was newly added (i.e. had the default 500)
            const perSlot = Math.round(data.calorieProfile.total / 3);
            prev.mealSlots.forEach((slot) => {
              if (!newCalories[slot] || newCalories[slot] === 500) {
                newCalories[slot] = perSlot;
              }
            });
          }
          return {
            ...prev,
            mealCalories: newCalories
          };
        });
        setStep(3); // Go to Calorie Profile
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
    fetch('/api/onboarding/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, onboardingStep: 4 })
    }).catch(console.error);
  };

  const handleContinueToStep5 = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingPlans(true);
    setStep(5);
    
    try {
      // Save filter choices
      await fetch('/api/onboarding/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, onboardingStep: 5 })
      });
      
      // Fetch dynamic plans
      const res = await fetch('/api/onboarding/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          duration: formData.planDuration, 
          frequency: formData.planFrequency,
          mealSlots: formData.mealSlots 
        })
      });
      const data = await res.json();
      if (data.success && data.plans) {
        setPlans(data.plans);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const handleConnectRequest = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/onboarding/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formData.phone,
          name: formData.name,
          filters: {
            duration: formData.planDuration,
            frequency: formData.planFrequency,
            mealSlots: formData.mealSlots,
            calorieTarget: calorieProfile?.total
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setRequestSubmitted(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomBowlOrder = async () => {
    setIsSubmittingCustom(true);
    try {
      const res = await fetch("/api/onboarding/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name || "Unknown",
          phone: formData.phone || "Unknown",
          filters: {
            duration: formData.planDuration,
            frequency: formData.planFrequency,
            mealSlots: formData.mealSlots,
            calorieTarget: getTotalPurchasedCalories(),
          },
          notes: "User requested a custom bowl instead of the standard plans.",
        }),
      });
      if (res.ok) {
        setStep(6);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingCustom(false);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const plan = plans.find(p => p._id === selectedPlan);
      
      const calculatedBowls: any[] = [];
      let selectedMealCombo = formData.mealSlots.join(" + ");

      if (plan && plan.selections) {
        plan.selections.forEach((bucket: any) => {
          let isSlotSelected = false;
          if (bucket.type === 'B' && formData.mealSlots.includes('B-FAST')) isSlotSelected = true;
          if (bucket.type === 'L' && formData.mealSlots.includes('LUNCH')) isSlotSelected = true;
          if (bucket.type === 'D' && formData.mealSlots.includes('DINNER')) isSlotSelected = true;
          
          if (isSlotSelected && bucket.bowls) {
            bucket.bowls.forEach((bowl: any) => {
              const stats = getDynamicBowlStats(bowl, bucket.type);
              calculatedBowls.push({
                originalBowlId: bowl._id,
                name: bowl.name,
                assignedCalories: stats.calories,
                calculatedWeight: stats.weight,
                calculatedPrice: stats.price,
                mealType: bucket.type === 'B' ? 'Breakfast' : bucket.type === 'L' ? 'Lunch' : bucket.type === 'D' ? 'Dinner' : bucket.type,
                ratio: getRatioForType(bucket.type),
                macros: stats.macros,
                micros: bowl.micros || [],
                selectedDip: customizedDips[bowl._id] || (bowl.dips && bowl.dips.length === 1 ? bowl.dips[0] : undefined)
              });
            });
          }
        });
      }

      const prices = plan ? getPlanDynamicPrices(plan) : { total: 0, discounted: 0 };
      const finalTotalPrice = prices.discounted;

      const res = await fetch('/api/onboarding/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          selectedPlan, 
          onboardingStep: 6,
          selectedMealCombo,
          calculatedBowls,
          finalTotalPrice,
          purchasedCalories: getTotalPurchasedCalories()
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowCheckoutModal(false);
        setStep(6); // Success Step
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
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
      <div className="min-h-screen bg-[#111111] font-sans text-gray-100 flex flex-col items-center justify-center p-4 md:p-8 relative overflow-x-hidden">
      
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
                    className="w-full md:w-auto md:px-12 bg-tertiary text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-[#EA580C] transition-colors shadow-lg shadow-tertiary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue to Goals
                    <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
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
                    onClick={handleContinueToStep3}
                    className="w-full md:w-auto md:px-12 bg-tertiary text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-[#EA580C] transition-colors shadow-lg shadow-tertiary/20 disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Calculate Profile
                        <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
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
                     <button type="button" onClick={() => updateField("planDuration", "WEEKLY")} className={`relative z-10 flex-1 py-3 text-xs font-bold tracking-widest rounded-full transition-colors duration-300 ${formData.planDuration === "WEEKLY" ? "text-white" : "text-gray-400 hover:text-white"}`}>WEEKLY</button>
                     <button type="button" onClick={() => updateField("planDuration", "MONTHLY")} className={`relative z-10 flex-1 py-3 text-xs font-bold tracking-widest rounded-full transition-colors duration-300 ${formData.planDuration === "MONTHLY" ? "text-white" : "text-gray-400 hover:text-white"}`}>MONTHLY</button>
                  </div>
                  
                  <div className="mt-3 px-3 py-1 bg-[#10B981]/10 border border-[#10B981] text-[#10B981] text-[10px] font-bold rounded-full uppercase tracking-widest transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                    Up to {formData.planDuration === "WEEKLY" ? "10%" : "15%"} Discount
                  </div>
                </div>

                {/* Frequency */}
                <div>
                  <h3 className="text-[11px] font-bold text-[#E6D0BA]/80 uppercase tracking-widest mb-4">Frequency</h3>
                  <div className="relative flex p-1 bg-[#151515] rounded-2xl border border-gray-800/60">
                    {/* Sliding Pill */}
                    <div 
                       className={`absolute inset-y-1 left-1 w-[calc(33.333%-2.66px)] rounded-xl transition-all duration-300 ease-out ${
                         formData.planFrequency === "5 DAYS" ? "bg-[#4CAF50] shadow-[0_0_15px_rgba(76,175,80,0.3)]" :
                         formData.planFrequency === "6 DAYS" ? "bg-[#EAB308] shadow-[0_0_15px_rgba(234,179,8,0.3)]" :
                         "bg-[#F97316] shadow-[0_0_15px_rgba(249,115,22,0.3)]"
                       }`}
                       style={{ 
                         transform: formData.planFrequency === "5 DAYS" ? "translateX(0)" : 
                                    formData.planFrequency === "6 DAYS" ? "translateX(100%)" : "translateX(200%)" 
                       }}
                    />
                    {["5 DAYS", "6 DAYS", "7 DAYS"].map(freq => (
                      <button key={freq} type="button" onClick={() => updateField("planFrequency", freq)} className={`relative z-10 flex-1 py-4 text-sm font-bold tracking-wider rounded-xl transition-colors duration-300 ${formData.planFrequency === freq ? "text-white" : "text-gray-400 hover:text-white"}`}>
                        {freq}
                      </button>
                    ))}
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
                              max={calorieProfile?.total || 3000} 
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
                    className="w-full md:w-auto md:px-12 bg-tertiary text-white py-4.5 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-[#EA580C] transition-colors shadow-lg shadow-tertiary/20"
                  >
                    Select Plan
                    <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
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
                  Pricing adjusted for your {calorieProfile?.total} kcal target.
                </p>

                <div className="flex justify-center mb-12">
                  {isLoadingPlans ? (
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 border-4 border-tertiary/30 border-t-tertiary rounded-full animate-spin mb-4" />
                      <p className="text-gray-400">Finding the perfect plans for you...</p>
                    </div>
                  ) : plans.length === 0 ? (
                    <div className="bg-[#151515] rounded-3xl p-8 border border-gray-800/60 text-center max-w-2xl w-full">
                      <h3 className="text-2xl font-bold text-white mb-4">No Exact Match Found</h3>
                      <p className="text-gray-400 mb-8 leading-relaxed">
                        We currently don't have a pre-built plan matching your exact combination of {formData.planDuration}, {formData.planFrequency}, and {formData.mealSlots.length} meals/day.
                      </p>
                      {requestSubmitted ? (
                        <div className="bg-[#4CAF50]/10 text-[#4CAF50] p-4 rounded-xl border border-[#4CAF50]/30 font-bold flex items-center justify-center gap-2">
                          <Check className="w-5 h-5" />
                          Request sent! Our team will contact you shortly.
                        </div>
                      ) : (
                        <button 
                          onClick={handleConnectRequest}
                          disabled={isSubmitting}
                          className="bg-tertiary text-white px-8 py-4 rounded-xl font-bold hover:bg-[#EA580C] transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                        >
                          {isSubmitting ? "Submitting..." : "Send Connect Request"}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="w-full">
                      <div className="flex gap-4 md:gap-6 mb-12 overflow-x-auto pb-6 snap-x snap-mandatory px-4 md:px-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {plans.map((plan) => {
                          const isCore = plan.category === "Core";
                          const bgColor = isCore ? "bg-[#4CAF50]" : "bg-[#8A3FD1]";
                          const activeBorder = isCore ? "border-[#4CAF50] shadow-[0_0_30px_rgba(76,175,80,0.2)]" : "border-[#8A3FD1] shadow-[0_0_30px_rgba(138,63,209,0.2)]";
                          const textColor = isCore ? "text-gray-900" : "text-yellow-950";
                          const labelColor = isCore ? "text-gray-500" : "text-yellow-900";
                          const boxColor = isCore ? "bg-white" : "bg-[#FFD700]";

                          return (
                            <div 
                              key={plan._id} 
                              onClick={() => setSelectedPlan(plan._id)}
                              className={`relative cursor-pointer rounded-3xl p-6 lg:p-8 transition-all duration-300 border-2 snap-center shrink-0 w-[85vw] md:w-[60vw] lg:w-[500px] ${selectedPlan === plan._id ? `${activeBorder} scale-[1.02]` : 'border-transparent'} ${bgColor}`}
                            >
                              {selectedPlan === plan._id && (
                                <div className="absolute top-4 right-4 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg">
                                  <Check className={`w-4 h-4 ${isCore ? "text-[#4CAF50]" : "text-[#8A3FD1]"}`} strokeWidth={3} />
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

                              {(() => {
                                const prices = getPlanDynamicPrices(plan);
                                return (
                                  <div className="flex items-end gap-3 mb-6">
                                    <span className="text-5xl font-bold text-white">₹{prices.discounted}</span>
                                    {(plan.totalPrice > (plan.discountPrice || 0) && plan.discountPrice > 0) && (
                                      <span className="text-lg text-white/60 line-through mb-1">₹{prices.total}</span>
                                    )}
                                  </div>
                                );
                              })()}
                              
                              <button 
                                onClick={() => setSelectedPlan(plan._id)}
                                className="w-full bg-[#FFD700] hover:bg-white text-black py-4 rounded-xl font-bold text-lg transition-colors"
                              >
                                {selectedPlan === plan._id ? 'Selected' : `Choose ${plan.name}`}
                              </button>
                            </div>
                          );
                        })}

                        {/* Custom Bowl Card */}
                        <div className="relative rounded-3xl p-6 lg:p-8 flex flex-col self-stretch bg-tertiary shadow-xl justify-center items-center text-center snap-center shrink-0 w-[85vw] md:w-[60vw] lg:w-[500px]">
                          <h3 className="text-2xl font-black text-white mb-2">Want Something Else?</h3>
                          <p className="text-white/90 font-medium mb-8">Get a fully customized bowl tailored exactly to your unique needs.</p>
                          <button
                            onClick={handleCustomBowlOrder}
                            disabled={isSubmittingCustom}
                            className="w-full bg-black/10 border-2 border-white text-white py-4 rounded-xl font-bold text-lg hover:bg-white hover:text-tertiary transition-colors flex items-center justify-center shadow-sm"
                          >
                            {isSubmittingCustom ? (
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              "Order your custom bowl"
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-center flex-col items-center gap-4 mt-12 mb-20">
                        <button 
                          onClick={() => setShowCheckoutModal(true)}
                          disabled={!selectedPlan || isSubmitting}
                          className="w-full max-w-sm bg-white text-black py-4.5 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors shadow-[0_0_30px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                          ) : (
                            <>Lock in my plan <ArrowRight className="w-5 h-5" /></>
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
                              <div className="w-16 h-16 bg-[#FFD700]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="w-8 h-8 text-[#FFD700]" />
                              </div>
                              <h3 className="text-2xl font-bold text-white mb-2 font-headline">Confirm Selection</h3>
                              <p className="text-gray-400 text-sm">
                                You are about to lock in your personalized plan.<br/>
                                <span className="text-white font-semibold">Once selected, you cannot change your plan later.</span><br/>
                                Are you ready to proceed?
                              </p>
                            </div>
                            <div className="flex gap-4">
                              <button 
                                onClick={() => setShowCheckoutModal(false)}
                                className="flex-1 py-3.5 rounded-xl font-bold text-white bg-gray-800 hover:bg-gray-700 transition-colors"
                                disabled={isSubmitting}
                              >
                                Go Back
                              </button>
                              <button 
                                onClick={handleCheckout}
                                disabled={isSubmitting}
                                className="flex-1 py-3.5 rounded-xl font-bold text-black bg-[#FFD700] hover:bg-white transition-colors flex items-center justify-center gap-2"
                              >
                                {isSubmitting ? (
                                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                ) : (
                                  "Confirm"
                                )}
                              </button>
                            </div>
                          </motion.div>
                        </div>
                      )}



                      {/* Sample Bowls Grid based on selected plan */}
                      {selectedPlan && plans.find(p => p._id === selectedPlan) && (
                        <div className="border-t border-gray-800/50 pt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                          <h3 className="text-2xl font-bold text-white mb-8 text-center">
                            Sample {plans.find(p => p._id === selectedPlan)?.name} Bowls for You
                          </h3>
                          
                          <div className="space-y-12">
                            {[...formData.mealSlots].sort((a, b) => {
                              const order: Record<string, number> = { "B-FAST": 1, "LUNCH": 2, "DINNER": 3 };
                              return (order[a] || 99) - (order[b] || 99);
                            }).map(slot => {
                              const plan = plans.find(p => p._id === selectedPlan);
                              
                              let typeCode = slot;
                              if (slot === 'B-FAST') typeCode = 'B';
                              if (slot === 'LUNCH') typeCode = 'L';
                              if (slot === 'DINNER') typeCode = 'D';

                              const selection = plan?.selections.find((s: any) => s.type === typeCode);
                              const bowls = selection ? selection.bowls : [];

                              return (
                                <div key={slot}>
                                  <div className="flex items-center gap-3 mb-6">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                      slot === 'B-FAST' ? 'bg-[#8B5CF6]/20 text-[#8B5CF6]' : 
                                      slot === 'LUNCH' ? 'bg-[#10B981]/20 text-[#10B981]' : 
                                      'bg-[#F97316]/20 text-[#F97316]'
                                    }`}>
                                      {slot === 'B-FAST' && <Sun className="w-4 h-4" />}
                                      {slot === 'LUNCH' && <Utensils className="w-4 h-4" />}
                                      {slot === 'DINNER' && <Moon className="w-4 h-4" />}
                                    </div>
                                    <h4 className="text-xl font-bold text-white tracking-wide">{slot}</h4>
                                  </div>
                                  
                                  {bowls.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                      {bowls.map((bowl: any) => (
                                        <div key={bowl._id} className="bg-[#151515] rounded-2xl p-4 border border-gray-800/60 hover:border-gray-600 transition-colors">
                                          <div className="w-full h-32 bg-[#222] rounded-xl mb-4 overflow-hidden relative">
                                            {bowl.imageId?.url ? (
                                              <img src={bowl.imageId.url} alt={bowl.name} className="w-full h-full object-cover" />
                                            ) : (
                                              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                                <span className="text-gray-600 text-xs uppercase font-bold tracking-widest">{bowl.category}</span>
                                              </div>
                                            )}
                                          </div>
                                          
                                          {(() => {
                                            const stats = getDynamicBowlStats(bowl, slot);
                                            return (
                                              <>
                                                <div className="flex justify-between items-start mb-3">
                                                  <h5 className="font-bold text-gray-200 pr-2 leading-tight">{bowl.name}</h5>
                                                  <span className="text-sm font-bold text-white bg-white/10 px-2 py-0.5 rounded">₹{stats.price}</span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                                  <span className="text-[10px] font-bold text-black bg-[#FFD700] px-2 py-1 rounded">{stats.calories} kcal</span>
                                                  <span className="text-[10px] font-bold text-gray-400 bg-gray-800 px-2 py-1 rounded">{stats.weight}g</span>
                                                </div>
                                                <div className="grid grid-cols-4 gap-1 mb-3">
                                                  <div className="bg-[#222] p-1.5 rounded text-center">
                                                    <p className="text-[8px] text-gray-500 uppercase">Pro</p>
                                                    <p className="text-[10px] font-bold text-white">{stats.macros.protein}g</p>
                                                  </div>
                                                  <div className="bg-[#222] p-1.5 rounded text-center">
                                                    <p className="text-[8px] text-gray-500 uppercase">Carb</p>
                                                    <p className="text-[10px] font-bold text-white">{stats.macros.carbs}g</p>
                                                  </div>
                                                  <div className="bg-[#222] p-1.5 rounded text-center">
                                                    <p className="text-[8px] text-gray-500 uppercase">Fat</p>
                                                    <p className="text-[10px] font-bold text-white">{stats.macros.fat}g</p>
                                                  </div>
                                                  <div className="bg-[#222] p-1.5 rounded text-center">
                                                    <p className="text-[8px] text-gray-500 uppercase">Fib</p>
                                                    <p className="text-[10px] font-bold text-white">{stats.macros.fiber}g</p>
                                                  </div>
                                                </div>
                                                <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed mb-3">{bowl.ingredients?.slice(0,4).join(", ")}...</p>
                                                
                                                {bowl.dips && bowl.dips.length > 1 && (
                                                  <div className="mt-auto border-t border-gray-800/60 pt-3">
                                                    <div className="flex items-center justify-between">
                                                      <div className="flex flex-col">
                                                        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Dip Choice</span>
                                                        <span className="text-xs text-white font-medium truncate max-w-[100px]">
                                                          {customizedDips[bowl._id] || "Not Selected"}
                                                        </span>
                                                      </div>
                                                      <button 
                                                        type="button"
                                                        onClick={() => setCustomizingBowl(bowl)}
                                                        className="text-[10px] font-bold uppercase tracking-widest bg-[#FFD700] hover:bg-white text-black px-3 py-1.5 rounded transition-colors shadow-sm"
                                                      >
                                                        Customize
                                                      </button>
                                                    </div>
                                                  </div>
                                                )}
                                                {bowl.dips && bowl.dips.length === 1 && (
                                                  <div className="mt-auto border-t border-gray-800/60 pt-3">
                                                    <div className="flex flex-col">
                                                      <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Included Dip</span>
                                                      <span className="text-xs text-white font-medium">{bowl.dips[0]}</span>
                                                    </div>
                                                  </div>
                                                )}
                                              </>
                                            );
                                          })()}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-gray-500 text-sm italic">No bowls available for this slot in the selected plan.</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* -------------------- STEP 6 (Success) -------------------- */}
            <div className={`transition-all duration-500 ${step === 6 ? 'block opacity-100' : 'hidden opacity-0 h-0 overflow-hidden'}`}>
              <div className="max-w-3xl mx-auto py-12">
                <div className="text-center mb-16">
                  <div className="w-20 h-20 bg-tertiary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check className="w-10 h-10 text-tertiary" strokeWidth={3} />
                  </div>
                  <h2 className="text-4xl font-bold text-white tracking-tight mb-4 font-headline">
                    {selectedPlan 
                      ? "Order Received!" 
                      : (latestPlanRequest?.status === "Resolved" ? "Custom Bowl Resolved!" : "Custom Bowl Requested!")}
                  </h2>
                  <p className="text-gray-400 text-lg">
                    {selectedPlan 
                      ? "Your personalised plan has been locked in. We will connect with you shortly."
                      : (latestPlanRequest?.status === "Resolved" 
                          ? "Our team has resolved your request. Your assigned plan will be visible shortly."
                          : "Our team has been notified of your custom bowl request and will connect with you personally.")}
                  </p>
                </div>

                {/* Calorie Profile Summary */}
                {calorieProfile && (
                  <div className="mb-16">
                    <h3 className="text-2xl font-bold text-white mb-8 text-center font-headline">Your Calorie Profile</h3>
                    <div className="flex flex-col items-center">
                      <div className="relative w-64 h-64 mb-12">
                        <svg viewBox="0 0 300 300" className="w-full h-full transform -rotate-90">
                          {(() => {
                            const { protein, carbs, fat, fiber } = calorieProfile;
                            const total = protein + carbs + fat + fiber;
                            const circ = 2 * Math.PI * 120; // r=120
                            
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
                                <circle cx="150" cy="150" r="120" fill="none" stroke="#222" strokeWidth="20" />
                                <circle cx="150" cy="150" r="120" fill="none" stroke="#8B5CF6" strokeWidth="20" 
                                  strokeDasharray={`${isChartLoaded ? pStroke : 0} ${circ}`} strokeDashoffset={pOffset} className="transition-all duration-1000 ease-out" />
                                <circle cx="150" cy="150" r="120" fill="none" stroke="#F97316" strokeWidth="20" 
                                  strokeDasharray={`${isChartLoaded ? cStroke : 0} ${circ}`} strokeDashoffset={cOffset} className="transition-all duration-1000 ease-out delay-100" />
                                <circle cx="150" cy="150" r="120" fill="none" stroke="#10B981" strokeWidth="20" 
                                  strokeDasharray={`${isChartLoaded ? fStroke : 0} ${circ}`} strokeDashoffset={fOffset} className="transition-all duration-1000 ease-out delay-200" />
                                <circle cx="150" cy="150" r="120" fill="none" stroke="#FFB084" strokeWidth="20" 
                                  strokeDasharray={`${isChartLoaded ? fiStroke : 0} ${circ}`} strokeDashoffset={fiOffset} className="transition-all duration-1000 ease-out delay-300" />
                              </>
                            );
                          })()}
                        </svg>
                        
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-4xl font-bold text-white font-mono tracking-tight">
                            {(getTotalPurchasedCalories() || calorieProfile.total).toLocaleString()}
                          </span>
                          <span className="text-xs text-gray-400 font-bold tracking-widest mt-1">
                            {getTotalPurchasedCalories() > 0 && getTotalPurchasedCalories() !== calorieProfile.total ? "PROBAE KCAL" : "KCAL"}
                          </span>
                        </div>
                      </div>

                      {getTotalPurchasedCalories() > 0 && getTotalPurchasedCalories() !== calorieProfile.total && (
                        <div className="mb-6 text-center">
                          <p className="text-gray-400 text-sm">
                            Your total daily requirement is <span className="text-white font-bold">{calorieProfile.total.toLocaleString()} kcal</span>.<br/>
                            You are purchasing <span className="text-white font-bold">{getTotalPurchasedCalories().toLocaleString()} kcal</span> from us.
                          </p>
                        </div>
                      )}

                      {(() => {
                        const scaleFactor = (getTotalPurchasedCalories() || calorieProfile.total) / calorieProfile.total;
                        const p = Math.round(calorieProfile.protein * scaleFactor);
                        const c = Math.round(calorieProfile.carbs * scaleFactor);
                        const f = Math.round(calorieProfile.fat * scaleFactor);
                        const fi = Math.round(calorieProfile.fiber * scaleFactor);
                        return (
                          <div className="w-full max-w-md grid grid-cols-2 bg-[#151515] rounded-2xl border border-gray-800/60 overflow-hidden">
                            <div className="p-6 border-b border-r border-gray-800/60">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
                                <span className="text-sm text-gray-300">Protein</span>
                              </div>
                              <div className="text-xl font-bold text-white font-mono">{p}g</div>
                            </div>
                            <div className="p-6 border-b border-gray-800/60">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#F97316]" />
                                <span className="text-sm text-gray-300">Carbs</span>
                              </div>
                              <div className="text-xl font-bold text-white font-mono">{c}g</div>
                            </div>
                            <div className="p-6 border-r border-gray-800/60">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                                <span className="text-sm text-gray-300">Fat</span>
                              </div>
                              <div className="text-xl font-bold text-white font-mono">{f}g</div>
                            </div>
                            <div className="p-6">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#FFB084]" />
                                <span className="text-sm text-gray-300">Fiber</span>
                              </div>
                              <div className="text-xl font-bold text-white font-mono">{fi}g</div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Selected Plan Summary */}
                {selectedPlan && (
                  <div className="mb-16">
                    <h3 className="text-2xl font-bold text-white mb-8 text-center font-headline">Your Selected Plan</h3>
                    <div className="max-w-md mx-auto">
                      {plans.filter(p => p._id === selectedPlan).map((plan) => {
                        const isCore = plan.category === "Core";
                        const bgColor = isCore ? "bg-[#4CAF50]" : "bg-[#8A3FD1]";
                        const textColor = isCore ? "text-gray-900" : "text-yellow-950";
                        const labelColor = isCore ? "text-gray-500" : "text-yellow-900";
                        const boxColor = isCore ? "bg-white" : "bg-[#FFD700]";

                        return (
                          <div key={plan._id} className={`relative rounded-3xl p-8 border-2 border-transparent ${bgColor}`}>
                            <h3 className="text-4xl font-bold text-white mb-2 mt-2">{plan.name}</h3>
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

                            {(() => {
                              const prices = getPlanDynamicPrices(plan);
                              return (
                                <div className="flex items-end gap-3">
                                  <span className="text-5xl font-bold text-white">₹{prices.discounted}</span>
                                  {(plan.totalPrice > (plan.discountPrice || 0) && plan.discountPrice > 0) && (
                                    <span className="text-lg text-white/60 line-through mb-1">₹{prices.total}</span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Bowls Summary */}
                {selectedPlan && (
                  <div className="mb-12">
                    <h3 className="text-2xl font-bold text-white mb-8 text-center font-headline">Your Bowls</h3>
                    <div className="space-y-12">
                      {[...formData.mealSlots].sort((a, b) => {
                        const order: Record<string, number> = { "B-FAST": 1, "LUNCH": 2, "DINNER": 3 };
                        return (order[a] || 99) - (order[b] || 99);
                      }).map(slot => {
                        const plan = plans.find(p => p._id === selectedPlan);
                        
                        let typeCode = slot;
                        if (slot === 'B-FAST') typeCode = 'B';
                        if (slot === 'LUNCH') typeCode = 'L';
                        if (slot === 'DINNER') typeCode = 'D';

                        const selection = plan?.selections.find((s: any) => s.type === typeCode);
                        const bowls = selection ? selection.bowls : [];

                        return (
                          <div key={slot}>
                            <div className="flex items-center gap-3 mb-6">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                slot === 'B-FAST' ? 'bg-[#8B5CF6]/20 text-[#8B5CF6]' : 
                                slot === 'LUNCH' ? 'bg-[#10B981]/20 text-[#10B981]' : 
                                'bg-[#F97316]/20 text-[#F97316]'
                              }`}>
                                {slot === 'B-FAST' && <Sun className="w-4 h-4" />}
                                {slot === 'LUNCH' && <Utensils className="w-4 h-4" />}
                                {slot === 'DINNER' && <Moon className="w-4 h-4" />}
                              </div>
                              <h4 className="text-xl font-bold text-white tracking-wide">{slot}</h4>
                            </div>
                            
                            {bowls.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {bowls.map((bowl: any) => (
                                  <div key={bowl._id} className="bg-[#151515] rounded-2xl p-4 border border-gray-800/60 transition-colors">
                                      <div className="w-full h-32 bg-[#222] rounded-xl mb-4 overflow-hidden relative">
                                        {bowl.imageId?.url ? (
                                          <img src={bowl.imageId.url} alt={bowl.name} className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                            <span className="text-gray-600 text-xs uppercase font-bold tracking-widest">{bowl.category}</span>
                                          </div>
                                        )}
                                      </div>
                                    {(() => {
                                      const stats = getDynamicBowlStats(bowl, slot);
                                      return (
                                        <>
                                          <div className="flex justify-between items-start mb-3">
                                            <h5 className="font-bold text-gray-200 pr-2 leading-tight">{bowl.name}</h5>
                                            <span className="text-sm font-bold text-white bg-white/10 px-2 py-0.5 rounded">₹{stats.price}</span>
                                          </div>
                                          <div className="flex flex-wrap items-center gap-2 mb-3">
                                            <span className="text-[10px] font-bold text-black bg-[#FFD700] px-2 py-1 rounded">{stats.calories} kcal</span>
                                            <span className="text-[10px] font-bold text-gray-400 bg-gray-800 px-2 py-1 rounded">{stats.weight}g</span>
                                          </div>
                                          <div className="grid grid-cols-4 gap-1 mb-3">
                                            <div className="bg-[#222] p-1.5 rounded text-center">
                                              <p className="text-[8px] text-gray-500 uppercase">Pro</p>
                                              <p className="text-[10px] font-bold text-white">{stats.macros.protein}g</p>
                                            </div>
                                            <div className="bg-[#222] p-1.5 rounded text-center">
                                              <p className="text-[8px] text-gray-500 uppercase">Carb</p>
                                              <p className="text-[10px] font-bold text-white">{stats.macros.carbs}g</p>
                                            </div>
                                            <div className="bg-[#222] p-1.5 rounded text-center">
                                              <p className="text-[8px] text-gray-500 uppercase">Fat</p>
                                              <p className="text-[10px] font-bold text-white">{stats.macros.fat}g</p>
                                            </div>
                                            <div className="bg-[#222] p-1.5 rounded text-center">
                                              <p className="text-[8px] text-gray-500 uppercase">Fib</p>
                                              <p className="text-[10px] font-bold text-white">{stats.macros.fiber}g</p>
                                            </div>
                                          </div>
                                          <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed mb-3">{bowl.ingredients?.slice(0,4).join(", ")}...</p>
                                          
                                          {bowl.dips && bowl.dips.length > 1 && (
                                            <div className="mt-auto border-t border-gray-800/60 pt-3">
                                              <div className="flex items-center justify-between">
                                                <div className="flex flex-col">
                                                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Dip Choice</span>
                                                  <span className="text-xs text-white font-medium truncate max-w-[100px]">
                                                    {customizedDips[bowl._id] || "Not Selected"}
                                                  </span>
                                                </div>
                                                <button 
                                                  onClick={() => setCustomizingBowl(bowl)}
                                                  className="text-[10px] font-bold uppercase tracking-widest bg-[#FFD700] hover:bg-white text-black px-3 py-1.5 rounded transition-colors shadow-sm"
                                                >
                                                  Customize
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                          {bowl.dips && bowl.dips.length === 1 && (
                                            <div className="mt-auto border-t border-gray-800/60 pt-3">
                                              <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Included Dip</span>
                                                <span className="text-xs text-white font-medium">{bowl.dips[0]}</span>
                                              </div>
                                            </div>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm italic">No bowls available for this slot in the selected plan.</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                <div className="text-center mt-16 pt-8 border-t border-gray-800">
                  <Link href="/menu" className="inline-flex items-center gap-2 bg-[#FFD700] hover:bg-white text-black px-12 py-4 rounded-xl font-bold transition-colors">
                    Go to Dashboard
                    <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Customize Dip Modal */}
      {customizingBowl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-[#151515] border border-gray-800 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative"
          >
            <button 
              onClick={() => setCustomizingBowl(null)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Select your Dip</h3>
              <p className="text-sm text-gray-400">Choose a dip for your {customizingBowl.name}</p>
            </div>
            <div className="space-y-3 mb-6">
              {customizingBowl.dips?.map((dip: string) => {
                const isSelected = customizedDips[customizingBowl._id] === dip;
                return (
                  <button
                    key={dip}
                    onClick={() => {
                      setCustomizedDips(prev => ({ ...prev, [customizingBowl._id]: dip }));
                      if (step === 6) {
                        fetch('/api/onboarding/update-dips', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ bowlId: customizingBowl._id, selectedDip: dip })
                        }).catch(err => console.error("Failed to update dip", err));
                      }
                      setCustomizingBowl(null);
                    }}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                      isSelected 
                        ? 'bg-[#FFD700]/10 border-[#FFD700] text-white' 
                        : 'bg-gray-800/30 border-gray-800 text-gray-300 hover:border-gray-600 hover:bg-gray-800/50'
                    }`}
                  >
                    <span className="font-medium">{dip}</span>
                    {isSelected && <Check className="w-5 h-5 text-[#FFD700]" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
      </div>
    </>
  );
}
