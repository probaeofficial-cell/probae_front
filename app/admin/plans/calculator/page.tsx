"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Calculator, 
  Users, 
  Calendar, 
  DollarSign, 
  Utensils, 
  Layers, 
  Box, 
  Truck, 
  Percent, 
  Save, 
  Search, 
  Eye, 
  RotateCcw, 
  Trash2, 
  SlidersHorizontal, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Info, 
  ChevronRight, 
  ChevronLeft,
  X,
  Plus,
  ArrowRight
} from "lucide-react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { ProbaeSearch } from "@/components/admin/ProbaeSearch";
import { BowlLoader } from "@/components/admin/BowlLoader";
import AsyncCustomerSelect from "@/components/admin/AsyncCustomerSelect";
import AsyncPlanTierSelect from "@/components/admin/AsyncPlanTierSelect";
import AsyncBowlSelect from "@/components/admin/AsyncBowlSelect";
import { BowlCustomizerModal, CustomIngredient } from "@/components/admin/BowlCustomizerModal";
import { endpoints } from "@/lib/apiService";
import Link from "next/navigation";
import { useRouter } from "next/navigation";
import { ConfirmationModal } from "@/components/ConfirmationModal";

const MEAL_SLOTS = ["Breakfast", "Lunch", "Dinner", "Snack"];

export default function PlanPriceCalculatorPage() {
  const router = useRouter();

  // ── Calculation Form State ────────────────────────────────────────────────
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | 0>(0);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  
  // Plan Mode: "STANDARD" (preconfigured tier) or "CUSTOM" (custom builder)
  const [planMode, setPlanMode] = useState<"STANDARD" | "CUSTOM">("STANDARD");
  const [selectedPlanUlid, setSelectedPlanUlid] = useState<string>("");
  const [selectedPlanTier, setSelectedPlanTier] = useState<any>(null);

  // Custom Plan fields
  const [customPlanName, setCustomPlanName] = useState<string>("Bespoke Custom Plan");
  const [customDays, setCustomDays] = useState<number>(20);
  const [customSlots, setCustomSlots] = useState<string[]>(["Lunch", "Dinner"]);
  const [customSchedule, setCustomSchedule] = useState<any[]>([]);

  // Overrides & Preferences
  const [goal, setGoal] = useState<string>("MAINTENANCE");
  const [manualCalorieTarget, setManualCalorieTarget] = useState<number | "">("");
  const [includeDelivery, setIncludeDelivery] = useState<boolean>(true);
  const [discountPct, setDiscountPct] = useState<number>(0);
  const [calculationNotes, setCalculationNotes] = useState<string>("");

  // ── Calculation Output & Loading ──────────────────────────────────────────
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // ── Bowl Customization Modal ──────────────────────────────────────────────
  const [customizingBowl, setCustomizingBowl] = useState<{
    isOpen: boolean;
    dayIndex: number;
    mealSlot: string;
    bowlUlid: string;
    bowlName: string;
    initialIngredients: CustomIngredient[];
    packagingCost: number;
    fixedCost: number;
  }>({
    isOpen: false,
    dayIndex: 0,
    mealSlot: "",
    bowlUlid: "",
    bowlName: "",
    initialIngredients: [],
    packagingCost: 0,
    fixedCost: 0,
  });

  // ── Calculation History / Logs State ──────────────────────────────────────
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState<boolean>(false);
  const [logsSearch, setLogsSearch] = useState<string>("");
  const [debouncedLogsSearch, setDebouncedLogsSearch] = useState<string>("");
  const [logsPlanType, setLogsPlanType] = useState<string>("ALL");
  const [logsPage, setLogsPage] = useState<number>(1);
  const [logsTotal, setLogsTotal] = useState<number>(0);
  const [logsTotalPages, setLogsTotalPages] = useState<number>(1);

  // Detail Modal for Log View
  const [viewingLog, setViewingLog] = useState<any>(null);
  const [deletingLogUlid, setDeletingLogUlid] = useState<string | null>(null);

  // ── Debounce search for logs ──────────────────────────────────────────────
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedLogsSearch(logsSearch);
      setLogsPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [logsSearch]);

  // ── Sync Customer Profile on Selection ────────────────────────────────────
  const handleSelectCustomer = (cust: any) => {
    setSelectedCustomer(cust);
    if (cust) {
      if (cust.goal) setGoal(cust.goal);
      if (cust.include_delivery !== undefined) setIncludeDelivery(Boolean(cust.include_delivery));
      if (cust.calorie_profile?.total || cust.calorie_profile?.probaeTarget) {
        setManualCalorieTarget(cust.calorie_profile.total || cust.calorie_profile.probaeTarget);
      }
    }
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId(0);
    setSelectedCustomer(null);
  };

  // ── Plan Tier Selection ───────────────────────────────────────────────────
  const handleSelectPlanTier = (tier: any) => {
    setSelectedPlanTier(tier);
    if (tier && tier.discount_percentage !== undefined) {
      setDiscountPct(Number(tier.discount_percentage) || 0);
    }
  };

  // ── Custom Schedule Helpers ───────────────────────────────────────────────
  const handleToggleSlot = (slot: string) => {
    setCustomSlots(prev => {
      const exists = prev.includes(slot);
      if (exists) {
        if (prev.length <= 1) return prev; // keep at least one
        return prev.filter(s => s !== slot);
      } else {
        return [...prev, slot];
      }
    });
  };

  const handleSetCustomBowl = (dayIndex: number, mealSlot: string, bowl: any) => {
    if (!bowl) return;
    setCustomSchedule(prev => {
      const filtered = prev.filter(
        item => !(item.day_index === dayIndex && item.meal_slot.toLowerCase() === mealSlot.toLowerCase())
      );
      return [
        ...filtered,
        {
          day_index: dayIndex,
          meal_slot: mealSlot,
          bowl_ulid: bowl.ulid,
          bowl_name: bowl.name,
          is_customized: false,
          custom_ingredients: []
        }
      ];
    });
  };

  // ── Execute Price Calculation ─────────────────────────────────────────────
  const runCalculation = useCallback(async () => {
    if (planMode === "STANDARD" && !selectedPlanUlid) {
      setCalculationResult(null);
      return;
    }

    setIsCalculating(true);
    setCalcError(null);

    try {
      const payload: any = {
        include_delivery: includeDelivery,
        discount_percentage: Number(discountPct) || 0,
      };

      if (selectedCustomerId && selectedCustomerId !== 0) {
        payload.customer_id = selectedCustomerId;
      }
      if (selectedCustomer?.ulid) {
        payload.customer_ulid = selectedCustomer.ulid;
      }

      if (goal) payload.goal = goal;

      if (manualCalorieTarget) {
        const targetNum = Number(manualCalorieTarget);
        const slotsToDivide = planMode === "STANDARD" 
          ? (selectedPlanTier?.included_meal_slots || ["Lunch", "Dinner"])
          : customSlots;
        const perMeal = Math.round(targetNum / Math.max(1, slotsToDivide.length));
        const mealCalories: Record<string, number> = {};
        slotsToDivide.forEach((s: string) => {
          mealCalories[s.toLowerCase()] = perMeal;
        });

        payload.calorie_profile = {
          total: targetNum,
          probaeTarget: targetNum,
          mealCalories
        };
      }

      if (planMode === "STANDARD") {
        payload.plan_tier_ulid = selectedPlanUlid;
        payload.is_custom_plan = false;
        if (customSchedule.length > 0) {
          payload.custom_schedule = customSchedule;
        }
      } else {
        payload.is_custom_plan = true;
        payload.custom_plan_name = customPlanName || "Bespoke Custom Plan";
        payload.custom_days = customDays;
        payload.custom_slots = customSlots;
        payload.custom_schedule = customSchedule;
      }

      const res = await endpoints.planTiers.calculate(payload) as any;
      if (res && res.success) {
        setCalculationResult(res);
      } else {
        setCalcError(res?.message || "Failed to calculate plan price");
      }
    } catch (err: any) {
      console.error("Calculation error:", err);
      setCalcError(err?.response?.data?.detail || err?.message || "Calculation failed");
    } finally {
      setIsCalculating(false);
    }
  }, [
    planMode, 
    selectedPlanUlid, 
    selectedPlanTier,
    selectedCustomerId, 
    selectedCustomer, 
    goal, 
    manualCalorieTarget, 
    includeDelivery, 
    discountPct, 
    customPlanName, 
    customDays, 
    customSlots, 
    customSchedule
  ]);

  // Auto-run calculation when primary inputs change
  useEffect(() => {
    const timer = setTimeout(() => {
      runCalculation();
    }, 300);
    return () => clearTimeout(timer);
  }, [runCalculation]);

  // ── Save Calculation Entry ────────────────────────────────────────────────
  const handleSaveCalculation = async () => {
    if (!calculationResult) return;

    setIsSaving(true);
    setSaveSuccessMessage(null);

    try {
      const payload: any = {
        customer_id: selectedCustomer?.id || (selectedCustomerId !== 0 ? selectedCustomerId : null),
        customer_ulid: selectedCustomer?.ulid || null,
        customer_name: selectedCustomer?.name || "General Prospect",
        customer_phone: selectedCustomer?.phone || null,
        plan_tier_id: selectedPlanTier?.id || null,
        plan_tier_ulid: selectedPlanTier?.ulid || (planMode === "STANDARD" ? selectedPlanUlid : null),
        plan_name: calculationResult.plan_name || (planMode === "CUSTOM" ? customPlanName : "Standard Plan"),
        plan_type: calculationResult.plan_type || planMode,
        duration: selectedPlanTier?.duration || (customDays > 7 ? "MONTHLY" : "WEEKLY"),
        days: calculationResult.days || customDays,
        total_bowls: calculationResult.total_bowls || 0,
        gross_price: calculationResult.gross_price || 0,
        discount_percentage: calculationResult.discount_percentage || 0,
        discount_amount: calculationResult.discount_amount || 0,
        final_price: calculationResult.final_price || 0,
        total_fixed_cost: calculationResult.total_fixed_cost || 0,
        total_raw_cost: calculationResult.total_raw_cost || 0,
        total_packaging_cost: calculationResult.total_packaging_cost || 0,
        total_delivery_cost: calculationResult.total_delivery_cost || 0,
        delivery_distance_km: calculationResult.delivery_distance_km || 0,
        include_delivery: calculationResult.include_delivery || false,
        calorie_target: calculationResult.calorie_target || (Number(manualCalorieTarget) || null),
        goal: calculationResult.goal || goal,
        calculation_notes: calculationNotes || null,
        scaled_matrix: calculationResult.scaled_matrix || [],
        custom_schedule: customSchedule || []
      };

      const res = await endpoints.planTiers.saveCalculation(payload) as any;
      if (res && res.success) {
        setSaveSuccessMessage("Calculation entry saved to logs successfully!");
        setCalculationNotes("");
        fetchLogs(1);
        setTimeout(() => setSaveSuccessMessage(null), 5000);
      }
    } catch (err: any) {
      console.error("Failed to save calculation", err);
      alert(err?.response?.data?.detail || "Failed to save calculation entry");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Fetch Calculation Logs ────────────────────────────────────────────────
  const fetchLogs = useCallback(async (pageNum: number) => {
    setLogsLoading(true);
    try {
      const res = await endpoints.planTiers.listCalculations({
        page: pageNum,
        limit: 10,
        search: debouncedLogsSearch,
        plan_type: logsPlanType === "ALL" ? undefined : logsPlanType
      }) as any;

      if (res && res.success) {
        setLogs(res.logs || []);
        setLogsTotal(res.total || 0);
        setLogsTotalPages(Math.ceil((res.total || 0) / 10) || 1);
        setLogsPage(pageNum);
      }
    } catch (err) {
      console.error("Failed to load calculation logs", err);
    } finally {
      setLogsLoading(false);
    }
  }, [debouncedLogsSearch, logsPlanType]);

  useEffect(() => {
    fetchLogs(logsPage);
  }, [fetchLogs, logsPage]);

  // ── Delete Calculation Log ────────────────────────────────────────────────
  const handleDeleteLog = async () => {
    if (!deletingLogUlid) return;
    try {
      await endpoints.planTiers.deleteCalculation(deletingLogUlid);
      setDeletingLogUlid(null);
      fetchLogs(logsPage);
    } catch (err) {
      console.error("Failed to delete log", err);
    }
  };

  // ── Reload Saved Calculation into Calculator ──────────────────────────────
  const handleReloadLog = (log: any) => {
    if (log.customer_id) {
      setSelectedCustomerId(log.customer_id);
      setSelectedCustomer({
        id: log.customer_id,
        name: log.customer_name,
        phone: log.customer_phone
      });
    } else {
      setSelectedCustomerId(0);
      setSelectedCustomer(null);
    }

    if (log.plan_type === "CUSTOM" || !log.plan_tier_id) {
      setPlanMode("CUSTOM");
      setCustomPlanName(log.plan_name);
      setCustomDays(log.days || 20);
    } else {
      setPlanMode("STANDARD");
      if (log.plan_tier_ulid) {
        setSelectedPlanUlid(log.plan_tier_ulid);
      }
    }

    if (log.goal) setGoal(log.goal);
    if (log.calorie_target) setManualCalorieTarget(log.calorie_target);
    setIncludeDelivery(Boolean(log.include_delivery));
    setDiscountPct(Number(log.discount_percentage) || 0);
    if (log.custom_schedule) setCustomSchedule(log.custom_schedule);
    if (log.calculation_notes) setCalculationNotes(log.calculation_notes);

    // Scroll smoothly to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Open Bowl Customizer Modal ────────────────────────────────────────────
  const handleOpenCustomizer = (item: any) => {
    setCustomizingBowl({
      isOpen: true,
      dayIndex: item.day_index,
      mealSlot: item.meal_type,
      bowlUlid: item.bowl_ulid,
      bowlName: item.bowl_name,
      initialIngredients: item.custom_ingredients || [],
      packagingCost: item.packaging_cost || 0,
      fixedCost: item.fixed_cost || 0
    });
  };

  const handleSaveBowlCustomization = (customData: any) => {
    const updated = [...customSchedule];
    const existingIdx = updated.findIndex(
      it => it.day_index === customizingBowl.dayIndex && it.meal_slot.toLowerCase() === customizingBowl.mealSlot.toLowerCase()
    );

    const scheduleItem = {
      day_index: customizingBowl.dayIndex,
      meal_slot: customizingBowl.mealSlot,
      bowl_ulid: customizingBowl.bowlUlid,
      bowl_name: customizingBowl.bowlName,
      is_customized: true,
      custom_ingredients: customData.customIngredients,
      custom_calories: customData.customCalories,
      custom_macros: customData.customMacros,
      custom_price: customData.customPrice
    };

    if (existingIdx >= 0) {
      updated[existingIdx] = scheduleItem;
    } else {
      updated.push(scheduleItem);
    }

    setCustomSchedule(updated);
    setCustomizingBowl(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-y-auto">
        <Header />
        
        {/* Navigation Breadcrumbs & Sub-Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 pb-4 border-b border-neutral-100">
          <div>
            <Breadcrumbs segments={["Admin", "Plans", "Price Calculator & Estimator"]} />
            <h1 className="text-xl sm:text-2xl font-black text-neutral-900 mt-1 flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-2xl bg-purple-100 text-[#6A0FAD] flex items-center justify-center">
                <Calculator className="w-5 h-5" />
              </span>
              Plan Price Calculator & Quotation Tool
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">
              Calculate accurate plan prices, bowl macros, and operational cost breakdowns for customers. Save entries to track quote history.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/admin/plans/menu-blueprint")}
              className="px-3.5 py-2 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600" /> Rotations
            </button>
            <button
              onClick={() => router.push("/admin/plans/builder")}
              className="px-3.5 py-2 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-purple-600" /> Plan Tiers
            </button>
          </div>
        </div>

        {/* ── MAIN TWO-COLUMN CALCULATOR WORKSPACE ────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-6">
          
          {/* LEFT COLUMN: Input Configuration (5 Cols) */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* Step 1: Customer Selection */}
            <div className="bg-[#FAFAFA] rounded-3xl p-5 border border-neutral-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-neutral-600 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#6A0FAD]" />
                  1. Select Customer (Paginated)
                </h3>
                {selectedCustomer && (
                  <button
                    onClick={handleClearCustomer}
                    className="text-[11px] font-bold text-neutral-400 hover:text-red-500 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              <AsyncCustomerSelect
                value={selectedCustomerId}
                onChange={(id) => setSelectedCustomerId(id)}
                onSelectFull={handleSelectCustomer}
                selectedCustomer={selectedCustomer}
              />

              {/* Customer Profile Pill */}
              {selectedCustomer ? (
                <div className="p-3.5 bg-purple-50/70 border border-purple-100 rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-neutral-900">{selectedCustomer.name}</p>
                    <p className="text-[11px] text-neutral-500">{selectedCustomer.phone} • Goal: <strong className="text-purple-700">{selectedCustomer.goal || "Maintenance"}</strong></p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-[#6A0FAD]">
                      {manualCalorieTarget ? `${manualCalorieTarget} kcal` : "Custom Profile"}
                    </span>
                    <p className="text-[10px] text-neutral-400 mt-0.5">
                      {includeDelivery ? "Delivery Included" : "Pickup / No Delivery"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-neutral-100/70 rounded-2xl border border-neutral-200/60 text-[11px] text-neutral-500 flex items-center gap-2">
                  <Info className="w-4 h-4 text-neutral-400 shrink-0" />
                  <span>Calculating as <strong>General Prospect / Unassigned</strong>. You can customize calorie goals manually below.</span>
                </div>
              )}
            </div>

            {/* Step 2: Plan Selection & Mode Toggle */}
            <div className="bg-[#FAFAFA] rounded-3xl p-5 border border-neutral-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-neutral-600 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#16A34A]" />
                  2. Plan Type & Configuration
                </h3>

                {/* Plan Mode Tabs */}
                <div className="flex items-center bg-neutral-200/80 p-0.5 rounded-xl text-[11px] font-bold">
                  <button
                    onClick={() => setPlanMode("STANDARD")}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      planMode === "STANDARD" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
                    }`}
                  >
                    Standard Tier
                  </button>
                  <button
                    onClick={() => setPlanMode("CUSTOM")}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      planMode === "CUSTOM" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
                    }`}
                  >
                    Custom Builder
                  </button>
                </div>
              </div>

              {planMode === "STANDARD" ? (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-neutral-600 block">
                    Choose Plan Tier (Paginated Search)
                  </label>
                  <AsyncPlanTierSelect
                    value={selectedPlanUlid}
                    onChange={(ulid) => setSelectedPlanUlid(ulid)}
                    onSelectFull={handleSelectPlanTier}
                    selectedPlan={selectedPlanTier}
                  />

                  {selectedPlanTier && (
                    <div className="p-3 bg-white rounded-2xl border border-neutral-200/80 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between font-bold text-neutral-900">
                        <span>{selectedPlanTier.name}</span>
                        <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full text-[10px]">
                          {selectedPlanTier.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500">
                        Duration: <strong>{selectedPlanTier.duration}</strong> • <strong>{selectedPlanTier.days} Delivered Days</strong>
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1 pt-1 border-t border-neutral-100">
                        {(selectedPlanTier.included_meal_slots || []).map((slot: string) => (
                          <span key={slot} className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-[10px] font-bold">
                            {slot}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Custom Plan Builder Controls */
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-neutral-600 block mb-1">
                      Custom Plan Title
                    </label>
                    <input
                      type="text"
                      value={customPlanName}
                      onChange={(e) => setCustomPlanName(e.target.value)}
                      placeholder="e.g. VIP Corporate 24-Day Fat Loss"
                      className="w-full text-xs px-3 py-2 border border-neutral-200 rounded-xl bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-neutral-600 block mb-1">
                        Days Count
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={customDays}
                        onChange={(e) => setCustomDays(parseInt(e.target.value) || 1)}
                        className="w-full text-xs px-3 py-2 border border-neutral-200 rounded-xl bg-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-neutral-600 block mb-1">
                        Quick Preset
                      </label>
                      <div className="flex gap-1">
                        {[5, 20, 24, 26].map(d => (
                          <button
                            key={d}
                            onClick={() => setCustomDays(d)}
                            className={`flex-1 py-1 text-[11px] font-bold rounded-lg border ${
                              customDays === d ? "bg-purple-100 border-purple-300 text-[#6A0FAD]" : "bg-white border-neutral-200 text-neutral-600"
                            }`}
                          >
                            {d}d
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-neutral-600 block mb-1.5">
                      Included Meal Slots
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {MEAL_SLOTS.map(slot => {
                        const isChecked = customSlots.includes(slot);
                        return (
                          <button
                            key={slot}
                            onClick={() => handleToggleSlot(slot)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                              isChecked
                                ? "bg-[#6A0FAD] border-[#6A0FAD] text-white shadow-sm"
                                : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3" />}
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pick Base Bowls for Slots */}
                  <div className="pt-2 border-t border-neutral-200/80 space-y-2">
                    <span className="text-xs font-bold text-neutral-700 block">
                      Assign Bowls for Slots (Applies to rotation):
                    </span>
                    {customSlots.map(slot => (
                      <div key={slot} className="space-y-1">
                        <span className="text-[11px] font-bold text-neutral-500 uppercase">{slot} Bowl</span>
                        <AsyncBowlSelect
                          value=""
                          onChange={() => {}}
                          onSelectBowl={(bowl) => handleSetCustomBowl(0, slot, bowl)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Nutritional Targets & Adjustments */}
            <div className="bg-[#FAFAFA] rounded-3xl p-5 border border-neutral-200/80 shadow-sm space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-neutral-600 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-orange-500" />
                3. Macro Target & Financial Overrides
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-600 block mb-1">
                    Calorie Target (kcal)
                  </label>
                  <input
                    type="number"
                    value={manualCalorieTarget}
                    onChange={(e) => setManualCalorieTarget(e.target.value ? parseInt(e.target.value) : "")}
                    placeholder="e.g. 1800"
                    className="w-full text-xs px-3 py-2 border border-neutral-200 rounded-xl bg-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-600 block mb-1">
                    Goal Strategy
                  </label>
                  <select
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-neutral-200 rounded-xl bg-white font-semibold"
                  >
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="FAT_LOSS">Fat Loss</option>
                    <option value="MUSCLE_GAIN">Muscle Gain</option>
                  </select>
                </div>
              </div>

              {/* Delivery & Discount Row */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-200/80">
                <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-neutral-200/80">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-neutral-500" />
                    <span className="text-xs font-bold text-neutral-700">Delivery</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeDelivery}
                    onChange={(e) => setIncludeDelivery(e.target.checked)}
                    className="w-4 h-4 text-[#6A0FAD] rounded cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-neutral-600 flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5 text-emerald-600" /> Discount %
                    </span>
                    <span className="text-xs font-bold text-neutral-900">{discountPct}%</span>
                  </div>
                  <div className="flex gap-1">
                    {[0, 5, 10, 15].map(p => (
                      <button
                        key={p}
                        onClick={() => setDiscountPct(p)}
                        className={`flex-1 py-1 text-[10px] font-bold rounded-lg border ${
                          discountPct === p ? "bg-emerald-100 border-emerald-300 text-emerald-800" : "bg-white border-neutral-200 text-neutral-600"
                        }`}
                      >
                        {p}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Recalculate Button */}
            <ProbaeButton
              onClick={runCalculation}
              disabled={isCalculating}
              className="w-full py-3 text-sm font-bold shadow-md bg-[#6A0FAD] hover:bg-[#5a0d93] text-white flex items-center justify-center gap-2"
            >
              {isCalculating ? (
                <>
                  <BowlLoader className="w-4 h-4 text-white" /> Calculating Live Quote...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" /> Recalculate Quote
                </>
              )}
            </ProbaeButton>
          </div>

          {/* RIGHT COLUMN: Output Dashboard & Bowls Matrix (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {calcError && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{calcError}</span>
              </div>
            )}

            {isCalculating && !calculationResult ? (
              <div className="p-16 flex flex-col items-center justify-center space-y-3 bg-[#FAFAFA] rounded-3xl border border-neutral-200/80">
                <BowlLoader className="w-10 h-10 text-[#6A0FAD]" />
                <p className="text-sm font-bold text-neutral-600">Calculating scaled bowls and prices...</p>
              </div>
            ) : calculationResult ? (
              <div className="space-y-6">
                
                {/* 1. Primary Financial Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Final Price Card */}
                  <div className="bg-gradient-to-br from-[#6A0FAD] to-[#4A0A7A] text-white rounded-3xl p-5 shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-purple-200 uppercase tracking-wider block">
                        Final Rounded Price
                      </span>
                      <div className="text-3xl font-black mt-1">
                        ₹{Number(calculationResult.final_price || 0).toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-purple-400/30 flex items-center justify-between text-xs text-purple-100">
                      <span>{calculationResult.total_bowls} Meals ({calculationResult.days}d)</span>
                      <span>₹{Number(calculationResult.average_bowl_price || 0).toFixed(0)}/bowl</span>
                    </div>
                  </div>

                  {/* Kitchen Fixed Overhead */}
                  <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                          Fixed Prep Overhead
                        </span>
                        <div className="w-6 h-6 rounded-lg bg-purple-100 text-[#6A0FAD] flex items-center justify-center">
                          <Layers className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="text-2xl font-black text-purple-900">
                        ₹{Number(calculationResult.total_fixed_cost || 0).toFixed(0)}
                      </div>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-2">
                      Kitchen rent, staff labor, prep equipment allocation.
                    </p>
                  </div>

                  {/* Raw + Packaging Cost */}
                  <div className="bg-white rounded-3xl p-5 border border-neutral-200/80 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                          Raw Food + Box
                        </span>
                        <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                          <Box className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="text-2xl font-black text-emerald-700">
                        ₹{(Number(calculationResult.total_raw_cost || 0) + Number(calculationResult.total_packaging_cost || 0)).toFixed(0)}
                      </div>
                    </div>
                    <div className="mt-2 text-[11px] text-neutral-500 flex justify-between">
                      <span>Raw: ₹{Number(calculationResult.total_raw_cost || 0).toFixed(0)}</span>
                      <span>Pack: ₹{Number(calculationResult.total_packaging_cost || 0).toFixed(0)}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Save Calculation Entry Bar */}
                <div className="bg-white rounded-3xl p-5 border border-purple-100 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-neutral-800 flex items-center gap-1.5">
                        <Save className="w-4 h-4 text-[#6A0FAD]" />
                        Save Calculation Entry
                      </h4>
                      <p className="text-xs text-neutral-400">
                        Save this quote for admin reference, audit logs, and future customer follow-up.
                      </p>
                    </div>

                    <button
                      onClick={handleSaveCalculation}
                      disabled={isSaving}
                      className="px-4 py-2 rounded-xl bg-[#6A0FAD] hover:bg-[#5a0d93] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 shrink-0"
                    >
                      {isSaving ? <BowlLoader className="w-3.5 h-3.5 text-white" /> : <Save className="w-3.5 h-3.5" />}
                      Save to Logs
                    </button>
                  </div>

                  <input
                    type="text"
                    value={calculationNotes}
                    onChange={(e) => setCalculationNotes(e.target.value)}
                    placeholder="Add calculation notes or client reference (e.g. 'Customized quote for John - extra chicken requested')..."
                    className="w-full text-xs px-3.5 py-2 border border-neutral-200 rounded-xl bg-neutral-50"
                  />

                  {saveSuccessMessage && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>{saveSuccessMessage}</span>
                    </div>
                  )}
                </div>

                {/* 3. Scaled Bowls Matrix Table */}
                <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-neutral-100 bg-[#FAFAFA] flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-neutral-800 flex items-center gap-2">
                        <Utensils className="w-4 h-4 text-[#6A0FAD]" />
                        Scaled Bowls & Individual Prices ({calculationResult.scaled_matrix?.length || 0} Meals)
                      </h4>
                      <p className="text-[11px] text-neutral-500">
                        Individual prices include scaled ingredients, packaging, fixed kitchen cost, and round-to-9 retail logic.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F8F9FA] text-neutral-500 uppercase font-bold sticky top-0 z-10 border-b border-neutral-200">
                        <tr>
                          <th className="px-4 py-3">Day / Slot</th>
                          <th className="px-4 py-3">Bowl Name</th>
                          <th className="px-4 py-3 text-center">Calories</th>
                          <th className="px-4 py-3 text-center">Macros (P/C/F)</th>
                          <th className="px-4 py-3 text-right">Raw + Pack</th>
                          <th className="px-4 py-3 text-right">Fixed</th>
                          <th className="px-4 py-3 text-right font-black text-neutral-900">Price (₹)</th>
                          <th className="px-4 py-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {calculationResult.scaled_matrix?.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-purple-50/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-bold text-neutral-800">Day {item.day_number || item.day_index + 1}</div>
                              <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-600 uppercase">
                                {item.meal_type}
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              <p className="font-bold text-neutral-900">{item.bowl_name}</p>
                              {item.is_customized ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded mt-0.5">
                                  <Sparkles className="w-2.5 h-2.5" /> Customized Ingredients
                                </span>
                              ) : (
                                <span className="text-[10px] text-neutral-400">Standard Recipe</span>
                              )}
                            </td>

                            <td className="px-4 py-3 text-center">
                              <span className="font-black text-neutral-900">{Math.round(item.scaled_calories || 0)}</span>
                              <span className="text-[10px] text-neutral-400 block">kcal</span>
                            </td>

                            <td className="px-4 py-3 text-center">
                              <div className="text-[11px] font-semibold text-neutral-700">
                                <span className="text-purple-700 font-bold">{Math.round(item.scaled_protein || 0)}P</span> •{" "}
                                <span className="text-blue-700 font-bold">{Math.round(item.scaled_carbs || 0)}C</span> •{" "}
                                <span className="text-amber-700 font-bold">{Math.round(item.scaled_fats || 0)}F</span>
                              </div>
                            </td>

                            <td className="px-4 py-3 text-right text-neutral-600">
                              ₹{(Number(item.raw_material_cost || 0) + Number(item.packaging_cost || 0)).toFixed(0)}
                            </td>

                            <td className="px-4 py-3 text-right text-purple-700 font-medium">
                              ₹{Number(item.fixed_cost || 0).toFixed(0)}
                            </td>

                            <td className="px-4 py-3 text-right font-black text-sm text-neutral-900">
                              ₹{Number(item.scaled_price || 0).toFixed(0)}
                            </td>

                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleOpenCustomizer(item)}
                                className="px-2.5 py-1 rounded-lg border border-neutral-200 hover:border-purple-300 hover:bg-purple-50 text-[10px] font-bold text-neutral-700 transition-colors"
                              >
                                Customize
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-16 text-center bg-[#FAFAFA] rounded-3xl border border-neutral-200/80 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-[#6A0FAD] flex items-center justify-center mx-auto">
                  <Calculator className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-neutral-800">Ready to Calculate Plan Quote</h4>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  Select a customer or choose a plan tier on the left. ProBae will scale bowls and calculate the final quote automatically.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── CALCULATION LOGS & QUOTE HISTORY (BELOW CALCULATOR) ─────────── */}
        <div className="mt-10 pt-8 border-t border-neutral-200 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-neutral-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-emerald-100 text-[#16A34A] flex items-center justify-center">
                  <Save className="w-4 h-4" />
                </span>
                Saved Calculation Logs & Quote History
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Saved calculation entries for client quotations and internal accounting reference.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Filter Pills */}
              <div className="flex items-center bg-neutral-100 p-1 rounded-xl text-xs font-bold">
                {["ALL", "STANDARD", "CUSTOM"].map(t => (
                  <button
                    key={t}
                    onClick={() => { setLogsPlanType(t); setLogsPage(1); }}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      logsPlanType === t ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
                    }`}
                  >
                    {t === "ALL" ? "All Plans" : t === "STANDARD" ? "Standard" : "Custom"}
                  </button>
                ))}
              </div>

              <ProbaeSearch
                value={logsSearch}
                onChange={setLogsSearch}
                placeholder="Search saved logs..."
                isLoading={logsLoading}
              />
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8F9FA] text-neutral-500 uppercase font-bold border-b border-neutral-200">
                  <tr>
                    <th className="px-5 py-3.5">Date & Time (IST)</th>
                    <th className="px-4 py-3.5">Customer</th>
                    <th className="px-4 py-3.5">Plan / Duration</th>
                    <th className="px-4 py-3.5 text-center">Meals</th>
                    <th className="px-4 py-3.5 text-right">Fixed Cost</th>
                    <th className="px-4 py-3.5 text-right">Raw+Pack</th>
                    <th className="px-4 py-3.5 text-right font-black text-neutral-900">Final Price</th>
                    <th className="px-4 py-3.5">Notes</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {logsLoading && logs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-neutral-400">
                        <BowlLoader className="w-6 h-6 text-[#6A0FAD] mx-auto" />
                        <span className="block mt-2">Loading calculation logs...</span>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-neutral-400">
                        No calculation logs found. Save a calculation entry above to view history.
                      </td>
                    </tr>
                  ) : (
                    logs.map(log => (
                      <tr key={log.ulid} className="hover:bg-neutral-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-bold text-neutral-900">{log.created_at_formatted || log.created_at}</p>
                          <p className="text-[10px] text-neutral-400">By: {log.created_by_name || "Admin"}</p>
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-bold text-neutral-900">{log.customer_name}</p>
                          <p className="text-[10px] text-neutral-500">{log.customer_phone || "—"}</p>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-neutral-900">{log.plan_name}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              log.plan_type === "CUSTOM" ? "bg-orange-100 text-orange-700" : "bg-purple-100 text-[#6A0FAD]"
                            }`}>
                              {log.plan_type}
                            </span>
                          </div>
                          <p className="text-[10px] text-neutral-500">{log.days} Days • {log.duration || "Standard"}</p>
                        </td>

                        <td className="px-4 py-4 text-center font-bold text-neutral-800">
                          {log.total_bowls}
                        </td>

                        <td className="px-4 py-4 text-right text-purple-700 font-semibold">
                          ₹{Number(log.total_fixed_cost || 0).toFixed(0)}
                        </td>

                        <td className="px-4 py-4 text-right text-emerald-700 font-semibold">
                          ₹{(Number(log.total_raw_cost || 0) + Number(log.total_packaging_cost || 0)).toFixed(0)}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <p className="text-sm font-black text-neutral-900">
                            ₹{Number(log.final_price || 0).toLocaleString("en-IN")}
                          </p>
                          {Number(log.discount_percentage || 0) > 0 && (
                            <p className="text-[10px] text-emerald-600 font-semibold">
                              ({log.discount_percentage}% off)
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4 max-w-[200px] truncate text-neutral-600" title={log.calculation_notes || ""}>
                          {log.calculation_notes || "—"}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setViewingLog(log)}
                              className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-neutral-600"
                              title="View saved quote details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleReloadLog(log)}
                              className="p-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-[#6A0FAD]"
                              title="Reload into calculator"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingLogUlid(log.ulid)}
                              className="p-1.5 rounded-lg border border-red-100 hover:bg-red-50 text-red-500"
                              title="Delete log"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {logsTotalPages > 1 && (
              <div className="p-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                <span>Showing page <strong>{logsPage}</strong> of <strong>{logsTotalPages}</strong> ({logsTotal} logs)</span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={logsPage <= 1}
                    onClick={() => setLogsPage(prev => prev - 1)}
                    className="p-1.5 rounded-lg border border-neutral-200 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={logsPage >= logsTotalPages}
                    onClick={() => setLogsPage(prev => prev + 1)}
                    className="p-1.5 rounded-lg border border-neutral-200 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── BOWL CUSTOMIZER MODAL ─────────────────────────────────────────── */}
      <BowlCustomizerModal
        isOpen={customizingBowl.isOpen}
        onClose={() => setCustomizingBowl(prev => ({ ...prev, isOpen: false }))}
        bowlUlid={customizingBowl.bowlUlid}
        bowlName={customizingBowl.bowlName}
        dayIndex={customizingBowl.dayIndex + 1}
        mealSlot={customizingBowl.mealSlot}
        initialIngredients={customizingBowl.initialIngredients}
        basePackagingCost={customizingBowl.packagingCost}
        baseFixedCost={customizingBowl.fixedCost}
        onSave={handleSaveBowlCustomization}
      />

      {/* ── SAVED CALCULATION DETAIL MODAL ────────────────────────────────── */}
      {viewingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[88vh] bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
              <div>
                <h3 className="text-base font-black text-neutral-900">{viewingLog.plan_name}</h3>
                <p className="text-xs text-neutral-500">
                  Customer: <strong>{viewingLog.customer_name}</strong> • Saved on {viewingLog.created_at_formatted}
                </p>
              </div>
              <button
                onClick={() => setViewingLog(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">Final Price</span>
                  <p className="text-lg font-black text-neutral-900">₹{Number(viewingLog.final_price || 0).toLocaleString("en-IN")}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100">
                  <span className="text-[10px] font-bold text-purple-600 uppercase">Fixed Cost</span>
                  <p className="text-lg font-black text-[#6A0FAD]">₹{Number(viewingLog.total_fixed_cost || 0).toFixed(0)}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase">Raw Food Cost</span>
                  <p className="text-lg font-black text-emerald-700">₹{Number(viewingLog.total_raw_cost || 0).toFixed(0)}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100">
                  <span className="text-[10px] font-bold text-blue-600 uppercase">Total Meals</span>
                  <p className="text-lg font-black text-blue-800">{viewingLog.total_bowls} Bowls</p>
                </div>
              </div>

              {viewingLog.calculation_notes && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900">
                  <strong>Notes:</strong> {viewingLog.calculation_notes}
                </div>
              )}

              {/* Scaled Matrix preview */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">Saved Bowls Breakdown</h4>
                <div className="max-h-60 overflow-y-auto border border-neutral-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-100 text-neutral-600 uppercase font-bold sticky top-0">
                      <tr>
                        <th className="px-3 py-2">Day</th>
                        <th className="px-3 py-2">Slot</th>
                        <th className="px-3 py-2">Bowl</th>
                        <th className="px-3 py-2 text-right">Calories</th>
                        <th className="px-3 py-2 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {(viewingLog.scaled_matrix || []).map((m: any, i: number) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-bold text-neutral-700">Day {m.day_number || m.day_index + 1}</td>
                          <td className="px-3 py-2 text-neutral-500">{m.meal_type}</td>
                          <td className="px-3 py-2 font-bold text-neutral-900">{m.bowl_name}</td>
                          <td className="px-3 py-2 text-right">{Math.round(m.scaled_calories || 0)} kcal</td>
                          <td className="px-3 py-2 text-right font-black text-neutral-900">₹{Number(m.scaled_price || 0).toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-2">
              <button
                onClick={() => {
                  handleReloadLog(viewingLog);
                  setViewingLog(null);
                }}
                className="px-4 py-2 bg-[#6A0FAD] text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reload into Calculator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRMATION MODAL FOR DELETING LOG ────────────────────────────── */}
      <ConfirmationModal
        isOpen={Boolean(deletingLogUlid)}
        title="Delete Saved Calculation Entry"
        message="Are you sure you want to delete this saved calculation log? This action cannot be undone."
        onConfirm={handleDeleteLog}
        onCancel={() => setDeletingLogUlid(null)}
      />
    </div>
  );
}
