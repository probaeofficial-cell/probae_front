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
  ArrowRight,
  Copy,
  Repeat,
  Table,
  CheckCheck
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
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { endpoints } from "@/lib/apiService";
import { useRouter } from "next/navigation";

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
  const [activeCustomDay, setActiveCustomDay] = useState<number>(1);
  const [isAutoFilling, setIsAutoFilling] = useState<boolean>(false);
  const [showScheduleMatrixModal, setShowScheduleMatrixModal] = useState<boolean>(false);

  // Overrides & Preferences
  const [goal, setGoal] = useState<string>("MAINTENANCE");
  const [manualCalorieTarget, setManualCalorieTarget] = useState<number | "">("");
  const [slotCalories, setSlotCalories] = useState<Record<string, number | "">>({});
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

  // ── Helper: Active Meal Slots in Current Mode ─────────────────────────────
  const activeMealSlots = useMemo(() => {
    if (planMode === "STANDARD") {
      if (selectedPlanTier?.included_meal_slots && selectedPlanTier.included_meal_slots.length > 0) {
        return selectedPlanTier.included_meal_slots as string[];
      }
      return ["Lunch", "Dinner"];
    }
    return customSlots && customSlots.length > 0 ? customSlots : ["Lunch", "Dinner"];
  }, [planMode, selectedPlanTier, customSlots]);

  // ── Helper: Case-Insensitive Customer Slot Calorie Lookup ──────────────────
  const getCustomerSlotCalorie = useCallback((cust: any, slotName: string): number | null => {
    if (!cust || !slotName) return null;
    const clean = slotName.trim().toLowerCase();

    // 1. Check in cust.calorie_profile.mealCalories or meal_calories or slots
    const cp = cust.calorie_profile;
    if (cp && typeof cp === "object") {
      for (const nestedKey of ["mealCalories", "meal_calories", "slots", "mealSlots", "meal_slots"]) {
        const nested = cp[nestedKey];
        if (nested && typeof nested === "object") {
          if (nested[slotName] !== undefined && Number(nested[slotName]) > 0) {
            return Number(nested[slotName]);
          }
          for (const [k, v] of Object.entries(nested)) {
            if (k.trim().toLowerCase() === clean && Number(v) > 0) {
              return Number(v);
            }
          }
        }
      }

      // 2. Check directly in cust.calorie_profile (e.g. { lunch: 850, dinner: 600, Lunch: 850 })
      if (cp[slotName] !== undefined && Number(cp[slotName]) > 0) {
        return Number(cp[slotName]);
      }
      for (const [k, v] of Object.entries(cp)) {
        const kClean = k.trim().toLowerCase();
        if (
          (kClean === clean || kClean === `${clean}_calories` || kClean === `${clean}_cals` || kClean === `target_${clean}`) &&
          Number(v) > 0
        ) {
          return Number(v);
        }
      }
    }

    // 3. Check directly on cust (top-level properties)
    if (cust[slotName] !== undefined && Number(cust[slotName]) > 0) {
      return Number(cust[slotName]);
    }
    for (const [k, v] of Object.entries(cust)) {
      const kClean = k.trim().toLowerCase();
      if (
        (kClean === clean || kClean === `${clean}_calories` || kClean === `${clean}_cals`) &&
        Number(v) > 0
      ) {
        return Number(v);
      }
    }

    // 4. Check in cust.meal_schedules or cust.custom_schedule
    for (const schedKey of ["meal_schedules", "custom_schedule", "mealSchedules"]) {
      const sched = cust[schedKey];
      if (Array.isArray(sched)) {
        const match = sched.find((ms: any) => 
          (ms.meal_slot || "").trim().toLowerCase() === clean && Number(ms.custom_calories) > 0
        );
        if (match) return Number(match.custom_calories);
      }
    }

    return null;
  }, []);

  // ── Sync Customer Profile on Selection ────────────────────────────────────
  const handleSelectCustomer = async (cust: any) => {
    setSelectedCustomer(cust);
    if (!cust) return;

    let fullCust = cust;
    if (cust.ulid) {
      try {
        const detailRes: any = await endpoints.customers.get(cust.ulid);
        if (detailRes && (detailRes.ulid || detailRes.id)) {
          fullCust = { ...cust, ...detailRes };
          setSelectedCustomer(fullCust);
        }
      } catch (e) {
        console.warn("Could not fetch full customer detail", e);
      }
    }

    if (fullCust.goal) setGoal(fullCust.goal);
    if (fullCust.include_delivery !== undefined) setIncludeDelivery(Boolean(fullCust.include_delivery));

    const newSlotCals: Record<string, number | ""> = {};
    let totalAssigned = 0;
    let hasCustomSlotCal = false;

    activeMealSlots.forEach(slot => {
      const cVal = getCustomerSlotCalorie(fullCust, slot);
      if (cVal !== null && cVal > 0) {
        newSlotCals[slot] = cVal;
        totalAssigned += cVal;
        hasCustomSlotCal = true;
      }
    });

    if (hasCustomSlotCal) {
      // Use the exact assigned calories from the customer
      activeMealSlots.forEach(slot => {
        if (newSlotCals[slot] === undefined) {
          newSlotCals[slot] = 500;
          totalAssigned += 500;
        }
      });
      setSlotCalories(newSlotCals);
      setManualCalorieTarget(totalAssigned);
    } else {
      const customerDailyTarget = fullCust.calorie_profile?.probaeTarget || fullCust.calorie_profile?.total || fullCust.calorie_profile?.tdee;
      if (customerDailyTarget) {
        const perMeal = Math.round(Number(customerDailyTarget) / Math.max(1, activeMealSlots.length));
        activeMealSlots.forEach(slot => {
          newSlotCals[slot] = perMeal;
        });
        setSlotCalories(newSlotCals);
        setManualCalorieTarget(customerDailyTarget);
      }
    }
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId(0);
    setSelectedCustomer(null);
    setSlotCalories({});
    setManualCalorieTarget("");
  };

  // ── Plan Tier Selection ───────────────────────────────────────────────────
  const handleSelectPlanTier = (tier: any) => {
    setSelectedPlanTier(tier);
    if (tier && tier.discount_percentage !== undefined) {
      setDiscountPct(Number(tier.discount_percentage) || 0);
    }
    const tierSlots = tier?.included_meal_slots && tier.included_meal_slots.length > 0 
      ? tier.included_meal_slots 
      : ["Lunch", "Dinner"];
    setSlotCalories(prev => {
      const next = { ...prev };
      tierSlots.forEach((slot: string) => {
        const custVal = getCustomerSlotCalorie(selectedCustomer, slot);
        if (custVal !== null && custVal > 0) {
          next[slot] = custVal;
        } else if (!next[slot]) {
          next[slot] = 500;
        }
      });
      return next;
    });
  };

  // ── Auto-sync slot calories when active slots change ───────────────────────
  useEffect(() => {
    setSlotCalories(prev => {
      const next = { ...prev };
      let changed = false;
      activeMealSlots.forEach(slot => {
        if (next[slot] === undefined || next[slot] === "") {
          const custVal = getCustomerSlotCalorie(selectedCustomer, slot);
          if (custVal !== null && custVal > 0) {
            next[slot] = custVal;
            changed = true;
          } else {
            next[slot] = 500;
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
  }, [activeMealSlots, selectedCustomer, getCustomerSlotCalorie]);

  // ── Per-Slot Calorie Editing Handlers ──────────────────────────────────────
  const handleSlotCalorieChange = (slot: string, val: number | "") => {
    setSlotCalories(prev => {
      const updated = { ...prev, [slot]: val };
      const sum = activeMealSlots.reduce((acc, s) => {
        const v = updated[s];
        return acc + (typeof v === "number" ? v : 0);
      }, 0);
      setManualCalorieTarget(sum > 0 ? sum : "");
      return updated;
    });
  };

  const handleResetSlotsToCustomer = () => {
    if (!selectedCustomer) return;
    const newSlotCals: Record<string, number | ""> = {};
    let totalAssigned = 0;
    activeMealSlots.forEach(slot => {
      const cVal = getCustomerSlotCalorie(selectedCustomer, slot);
      if (cVal !== null && cVal > 0) {
        newSlotCals[slot] = cVal;
        totalAssigned += cVal;
      } else {
        newSlotCals[slot] = 500;
        totalAssigned += 500;
      }
    });
    setSlotCalories(newSlotCals);
    setManualCalorieTarget(totalAssigned);
  };

  const handleSplitDailyEvenly = () => {
    const daily = Number(manualCalorieTarget) || 1600;
    const perMeal = Math.round(daily / Math.max(1, activeMealSlots.length));
    const newSlotCals: Record<string, number | ""> = {};
    activeMealSlots.forEach(slot => {
      newSlotCals[slot] = perMeal;
    });
    setSlotCalories(newSlotCals);
  };

  const handleDailyCalorieChange = (val: number | "") => {
    setManualCalorieTarget(val);
    if (typeof val === "number" && val > 0) {
      const perMeal = Math.round(val / Math.max(1, activeMealSlots.length));
      const updated: Record<string, number> = {};
      activeMealSlots.forEach(s => { updated[s] = perMeal; });
      setSlotCalories(updated);
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
        item => !(Number(item.day_index) === Number(dayIndex) && item.meal_slot.toLowerCase() === mealSlot.toLowerCase())
      );
      return [
        ...filtered,
        {
          day_index: Number(dayIndex),
          meal_slot: mealSlot,
          bowl_ulid: bowl.ulid,
          bowl_name: bowl.name,
          bowl_code: bowl.code,
          bowl_price: bowl.price,
          image_filename: bowl.image_filename,
          is_customized: false,
          custom_ingredients: []
        }
      ];
    });
  };

  const handleRemoveCustomBowl = (dayIndex: number, mealSlot: string) => {
    setCustomSchedule(prev =>
      prev.filter(
        item => !(Number(item.day_index) === Number(dayIndex) && item.meal_slot.toLowerCase() === mealSlot.toLowerCase())
      )
    );
  };

  const handleCopyDayToAll = (sourceDay: number) => {
    const sourceBowls = customSchedule.filter(item => Number(item.day_index) === Number(sourceDay));
    if (sourceBowls.length === 0) {
      alert(`Day ${sourceDay} has no bowls assigned yet. Please assign at least one bowl first.`);
      return;
    }
    setCustomSchedule(prev => {
      const keepSource = prev.filter(item => Number(item.day_index) === Number(sourceDay));
      const newCopies: any[] = [];
      for (let d = 1; d <= customDays; d++) {
        if (d === sourceDay) continue;
        sourceBowls.forEach(sb => {
          newCopies.push({
            ...sb,
            day_index: d
          });
        });
      }
      return [...keepSource, ...newCopies];
    });
  };

  const handleCopyDayToNext = (sourceDay: number) => {
    if (sourceDay >= customDays) return;
    const targetDay = sourceDay + 1;
    const sourceBowls = customSchedule.filter(item => Number(item.day_index) === Number(sourceDay));
    if (sourceBowls.length === 0) {
      alert(`Day ${sourceDay} has no bowls assigned to copy.`);
      return;
    }
    setCustomSchedule(prev => {
      const filtered = prev.filter(item => Number(item.day_index) !== targetDay);
      const copied = sourceBowls.map(sb => ({ ...sb, day_index: targetDay }));
      return [...filtered, ...copied];
    });
    setActiveCustomDay(targetDay);
  };

  const handleAutoFillCustomSchedule = async () => {
    setIsAutoFilling(true);
    try {
      const catRes: any = await endpoints.mealCategories.getMealCategories(1, 100);
      const categories = catRes.items || [];
      const newSchedule: any[] = [];

      for (const slot of customSlots) {
        const slotLower = slot.toLowerCase();
        const cat = categories.find((c: any) => (c.slug || c.name).toLowerCase() === slotLower);
        let bowlsForSlot: any[] = [];
        if (cat) {
          const bRes: any = await endpoints.bowls.getBowls(1, 50, undefined, undefined, cat.ulid);
          bowlsForSlot = bRes.items || [];
        } else {
          const bRes: any = await endpoints.bowls.getBowls(1, 50);
          bowlsForSlot = bRes.items || [];
        }

        if (bowlsForSlot.length > 0) {
          for (let d = 1; d <= customDays; d++) {
            const bowl = bowlsForSlot[(d - 1) % bowlsForSlot.length];
            newSchedule.push({
              day_index: d,
              meal_slot: slot,
              bowl_ulid: bowl.ulid,
              bowl_name: bowl.name,
              bowl_code: bowl.code,
              bowl_price: bowl.price,
              image_filename: bowl.image_filename,
              is_customized: false,
              custom_ingredients: []
            });
          }
        }
      }
      setCustomSchedule(newSchedule);
    } catch (err) {
      console.error("Auto fill error", err);
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleClearAllCustomSchedule = () => {
    if (confirm("Are you sure you want to clear all mapped bowls from this custom schedule?")) {
      setCustomSchedule([]);
    }
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

      // Prepare calorie profile with individual per-meal slot targets
      const targetNum = Number(manualCalorieTarget) || 0;
      const mealCalories: Record<string, number> = {};
      let totalFromSlots = 0;

      activeMealSlots.forEach((slot: string) => {
        let val = typeof slotCalories[slot] === "number" && slotCalories[slot] > 0
          ? Number(slotCalories[slot]) 
          : 0;
        if (!val || val <= 0) {
          const custVal = getCustomerSlotCalorie(selectedCustomer, slot);
          if (custVal !== null && custVal > 0) {
            val = custVal;
          }
        }
        if (val > 0) {
          mealCalories[slot] = val;
          mealCalories[slot.toLowerCase()] = val;
          totalFromSlots += val;
        }
      });

      if (totalFromSlots > 0) {
        payload.calorie_profile = {
          total: totalFromSlots,
          probaeTarget: totalFromSlots,
          mealCalories,
          mealSlots: activeMealSlots
        };
      } else if (targetNum > 0) {
        payload.calorie_profile = {
          total: targetNum,
          probaeTarget: targetNum,
          mealCalories: {},
          mealSlots: activeMealSlots
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
    slotCalories,
    activeMealSlots,
    getCustomerSlotCalorie,
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
      {/* Global high-contrast text selection style */}
      <style jsx global>{`
        ::selection {
          background-color: #6A0FAD !important;
          color: #ffffff !important;
        }
        ::-moz-selection {
          background-color: #6A0FAD !important;
          color: #ffffff !important;
        }
        input::selection, textarea::selection {
          background-color: #6A0FAD !important;
          color: #ffffff !important;
        }
        input::-moz-selection, textarea::-moz-selection {
          background-color: #6A0FAD !important;
          color: #ffffff !important;
        }
      `}</style>
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
                <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#6A0FAD]" />
                  1. Select Customer (Paginated)
                </h3>
                {selectedCustomer && (
                  <button
                    onClick={handleClearCustomer}
                    className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors bg-red-50 px-2.5 py-1 rounded-lg"
                  >
                    Clear Customer
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
                <div className="p-4 bg-purple-50/90 border border-purple-200 rounded-2xl space-y-3 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-black text-neutral-900">{selectedCustomer.name}</p>
                      <p className="text-xs text-neutral-600 mt-0.5 font-medium">
                        {selectedCustomer.phone} • Goal: <strong className="text-purple-800 font-bold">{selectedCustomer.goal || "Maintenance"}</strong>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-200/80 text-[#6A0FAD] border border-purple-300">
                        {selectedCustomer?.calorie_profile?.probaeTarget || selectedCustomer?.calorie_profile?.total || selectedCustomer?.calorie_profile?.tdee || manualCalorieTarget
                          ? `${(selectedCustomer?.calorie_profile?.probaeTarget || selectedCustomer?.calorie_profile?.total || selectedCustomer?.calorie_profile?.tdee || manualCalorieTarget).toLocaleString()} kcal / day`
                          : "Custom Profile"}
                      </span>
                      <p className="text-[11px] text-neutral-500 font-semibold mt-1">
                        {includeDelivery ? "Delivery Included" : "Pickup / No Delivery"}
                      </p>
                    </div>
                  </div>

                  {/* Customer Calorie & Macro Breakdown Per Day */}
                  <div className="pt-2.5 border-t border-purple-200/70 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider">Per-Day Target:</span>
                      <span className="font-black text-[#6A0FAD] bg-white px-2 py-0.5 rounded-md border border-purple-200 text-xs">
                        {selectedCustomer?.calorie_profile?.probaeTarget || selectedCustomer?.calorie_profile?.total || selectedCustomer?.calorie_profile?.tdee
                          ? `${(selectedCustomer?.calorie_profile?.probaeTarget || selectedCustomer?.calorie_profile?.total || selectedCustomer?.calorie_profile?.tdee).toLocaleString()} kcal / day`
                          : manualCalorieTarget ? `${manualCalorieTarget} kcal / day` : "Not set"}
                      </span>
                    </div>

                    {(selectedCustomer?.calorie_profile?.protein || selectedCustomer?.calorie_profile?.carbs || selectedCustomer?.calorie_profile?.fat) && (
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-700 bg-white/70 px-2 py-0.5 rounded-md border border-purple-100">
                        <span className="text-emerald-700 font-bold">P: {selectedCustomer.calorie_profile.protein}g</span> • 
                        <span className="text-blue-700 font-bold">C: {selectedCustomer.calorie_profile.carbs}g</span> • 
                        <span className="text-amber-700 font-bold">F: {selectedCustomer.calorie_profile.fat}g</span>
                      </div>
                    )}
                  </div>

                  {/* Customer Per-Meal Slot Targets */}
                  {selectedCustomer?.calorie_profile?.mealCalories && Object.keys(selectedCustomer.calorie_profile.mealCalories).length > 0 && (
                    <div className="pt-2 border-t border-purple-200/50 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-700">Per-Meal Calories:</span>
                      {Object.entries(selectedCustomer.calorie_profile.mealCalories).map(([slot, cals]) => (
                        <span key={slot} className="bg-white text-neutral-800 text-[11px] font-bold px-2 py-0.5 rounded-lg border border-purple-200 capitalize">
                          {slot}: <span className="text-[#6A0FAD] font-black">{Number(cals)} kcal</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 bg-neutral-100/90 rounded-2xl border border-neutral-200 text-xs text-neutral-600 flex items-center gap-2.5">
                  <Info className="w-4 h-4 text-neutral-500 shrink-0" />
                  <span>Calculating as <strong>General Prospect / Unassigned</strong>. You can customize calorie targets manually below.</span>
                </div>
              )}
            </div>

            {/* Step 2: Plan Selection & Mode Toggle */}
            <div className="bg-[#FAFAFA] rounded-3xl p-5 border border-neutral-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#16A34A]" />
                  2. Plan Type & Configuration
                </h3>

                {/* Plan Mode Tabs */}
                <div className="flex items-center bg-neutral-200/90 p-1 rounded-xl text-xs font-black">
                  <button
                    onClick={() => setPlanMode("STANDARD")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      planMode === "STANDARD" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-600 hover:text-neutral-900"
                    }`}
                  >
                    Standard Tier
                  </button>
                  <button
                    onClick={() => setPlanMode("CUSTOM")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      planMode === "CUSTOM" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-600 hover:text-neutral-900"
                    }`}
                  >
                    Custom Builder
                  </button>
                </div>
              </div>

              {planMode === "STANDARD" ? (
                <div className="space-y-3">
                  <label className="text-xs font-black text-neutral-800 block">
                    Choose Plan Tier (Paginated Search)
                  </label>
                  <AsyncPlanTierSelect
                    value={selectedPlanUlid}
                    onChange={(ulid) => setSelectedPlanUlid(ulid)}
                    onSelectFull={handleSelectPlanTier}
                    selectedPlan={selectedPlanTier}
                  />

                  {selectedPlanTier && (
                    <div className="p-4 bg-white rounded-2xl border border-neutral-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between font-black text-neutral-900 text-sm">
                        <span>{selectedPlanTier.name}</span>
                        <span className="text-purple-800 bg-purple-100 border border-purple-200 px-2.5 py-0.5 rounded-full text-xs font-bold">
                          {selectedPlanTier.category}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600">
                        Duration: <strong className="text-neutral-900">{selectedPlanTier.duration}</strong> • <strong className="text-neutral-900">{selectedPlanTier.days} Delivered Days</strong>
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-neutral-100">
                        {(selectedPlanTier.included_meal_slots || []).map((slot: string) => (
                          <span key={slot} className="px-2.5 py-1 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-800 text-xs font-black">
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
                    <label className="text-xs font-black text-neutral-800 block mb-1.5">
                      Custom Plan Title
                    </label>
                    <input
                      type="text"
                      value={customPlanName}
                      onChange={(e) => setCustomPlanName(e.target.value)}
                      placeholder="e.g. VIP Corporate 24-Day Fat Loss"
                      style={{ color: "#171717" }}
                      className="w-full h-11 text-sm px-3.5 py-2 border-2 border-neutral-300 rounded-xl bg-white font-bold text-neutral-900 selection:bg-[#6A0FAD] selection:text-white focus:border-[#6A0FAD] focus:ring-4 focus:ring-purple-100 outline-none transition-all placeholder:text-neutral-400 placeholder:font-normal"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-xs font-black text-neutral-800 block mb-1.5">
                        Delivered Days
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={customDays}
                        onChange={(e) => setCustomDays(parseInt(e.target.value) || 1)}
                        style={{ color: "#171717" }}
                        className="w-full h-11 text-base px-3.5 py-2 border-2 border-neutral-300 rounded-xl bg-white font-black text-neutral-900 selection:bg-[#6A0FAD] selection:text-white focus:border-[#6A0FAD] focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black text-neutral-800 block mb-1.5">
                        Quick Preset
                      </label>
                      <div className="flex gap-1 h-11 items-center">
                        {[5, 20, 24, 26].map(d => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setCustomDays(d)}
                            className={`flex-1 h-full text-xs font-black rounded-xl border transition-all flex items-center justify-center ${
                              customDays === d 
                                ? "bg-purple-600 border-purple-600 text-white shadow-sm" 
                                : "bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-100"
                            }`}
                          >
                            {d}d
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black text-neutral-800 block mb-2">
                      Included Meal Slots
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {MEAL_SLOTS.map(slot => {
                        const isChecked = customSlots.includes(slot);
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => handleToggleSlot(slot)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all border flex items-center gap-2 ${
                              isChecked
                                ? "bg-[#6A0FAD] border-[#6A0FAD] text-white shadow-sm"
                                : "bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-100"
                            }`}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5" />}
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Multi-Day Schedule & Bowl Assignment */}
                  <div className="pt-3 border-t border-neutral-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-black text-neutral-900 block">
                          Day Schedule ({customSchedule.length} / {customDays * customSlots.length} meals assigned)
                        </span>
                        <span className="text-[11px] text-neutral-500 font-medium">
                          Select a day tab below to assign bowls for that day
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShowScheduleMatrixModal(true)}
                          className="px-2.5 py-1 text-xs font-bold text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-lg flex items-center gap-1 transition-colors"
                          title="View Full Schedule Table"
                        >
                          <Table className="w-3.5 h-3.5 text-purple-600" /> Matrix
                        </button>
                        <button
                          type="button"
                          onClick={handleAutoFillCustomSchedule}
                          disabled={isAutoFilling}
                          className="px-2.5 py-1 text-xs font-bold text-[#6A0FAD] bg-purple-50 border border-purple-200 hover:bg-purple-100 rounded-lg flex items-center gap-1 transition-colors"
                          title="Auto-fill all days using meal categories"
                        >
                          <Repeat className={`w-3.5 h-3.5 ${isAutoFilling ? "animate-spin" : ""}`} /> Auto-Fill
                        </button>
                      </div>
                    </div>

                    {/* Day Tabs Horizontal Scroll */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
                      {Array.from({ length: customDays }, (_, i) => i + 1).map((d) => {
                        const dayMeals = customSchedule.filter(it => Number(it.day_index) === d);
                        const isComplete = dayMeals.length >= customSlots.length && customSlots.length > 0;
                        const isPartial = dayMeals.length > 0 && !isComplete;
                        const isActive = activeCustomDay === d;

                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setActiveCustomDay(d)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                              isActive
                                ? "bg-[#6A0FAD] border-[#6A0FAD] text-white shadow-sm"
                                : isComplete
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                                : isPartial
                                ? "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
                                : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                            }`}
                          >
                            <span>Day {d}</span>
                            {isComplete ? (
                              <Check className={`w-3 h-3 ${isActive ? "text-white" : "text-emerald-600"}`} />
                            ) : (
                              <span className={`text-[10px] font-bold ${isActive ? "text-purple-200" : "text-neutral-400"}`}>
                                {dayMeals.length}/{customSlots.length}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Day Action Bar */}
                    <div className="flex items-center justify-between bg-purple-50/70 p-2.5 rounded-xl border border-purple-100 text-xs">
                      <span className="font-bold text-purple-900">
                        Configuring: <strong>Day {activeCustomDay}</strong> of {customDays}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyDayToAll(activeCustomDay)}
                          className="px-2 py-1 text-[11px] font-bold text-purple-800 bg-white border border-purple-200 hover:bg-purple-100/60 rounded-md flex items-center gap-1 transition-colors"
                          title="Copy Day bowls to all other days"
                        >
                          <Copy className="w-3 h-3 text-[#6A0FAD]" /> Copy to All Days
                        </button>
                        {activeCustomDay < customDays && (
                          <button
                            type="button"
                            onClick={() => handleCopyDayToNext(activeCustomDay)}
                            className="px-2 py-1 text-[11px] font-bold text-purple-800 bg-white border border-purple-200 hover:bg-purple-100/60 rounded-md flex items-center gap-1 transition-colors"
                            title="Copy to next day and advance"
                          >
                            <ArrowRight className="w-3 h-3 text-[#6A0FAD]" /> Copy to Day {activeCustomDay + 1}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Meal Slot Pickers for activeCustomDay */}
                    <div className="space-y-3">
                      {customSlots.map(slot => {
                        const assignedItem = customSchedule.find(
                          it => Number(it.day_index) === Number(activeCustomDay) && 
                                it.meal_slot.toLowerCase() === slot.toLowerCase()
                        );

                        return (
                          <div key={slot} className="p-3 bg-white rounded-2xl border border-neutral-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-neutral-800 flex items-center gap-1.5">
                                <Utensils className="w-3.5 h-3.5 text-[#6A0FAD]" />
                                Day {activeCustomDay} • {slot} Bowl
                              </span>
                              {assignedItem && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCustomBowl(activeCustomDay, slot)}
                                  className="text-[11px] font-bold text-red-500 hover:text-red-700 transition-colors"
                                >
                                  Remove
                                </button>
                              )}
                            </div>

                            <AsyncBowlSelect
                              value={assignedItem?.bowl_ulid || ""}
                              selectedBowl={assignedItem ? { name: assignedItem.bowl_name, ulid: assignedItem.bowl_ulid } : undefined}
                              onChange={() => {}}
                              onSelectBowl={(bowl) => handleSetCustomBowl(activeCustomDay, slot, bowl)}
                            />

                            {assignedItem && (
                              <div className="flex items-center justify-between pt-1.5 border-t border-neutral-100 text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-neutral-900">{assignedItem.bowl_name}</span>
                                  {assignedItem.is_customized && (
                                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                                      Customized
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleOpenCustomizer({
                                    day_index: activeCustomDay,
                                    meal_type: slot,
                                    bowl_ulid: assignedItem.bowl_ulid,
                                    bowl_name: assignedItem.bowl_name,
                                    custom_ingredients: assignedItem.custom_ingredients || []
                                  })}
                                  className="text-xs font-bold text-[#6A0FAD] hover:underline flex items-center gap-1"
                                >
                                  <SlidersHorizontal className="w-3 h-3" /> Customize Recipe
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Day Navigation Controls */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        disabled={activeCustomDay <= 1}
                        onClick={() => setActiveCustomDay(prev => Math.max(1, prev - 1))}
                        className="px-3 py-1.5 text-xs font-bold text-neutral-700 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <ChevronLeft className="w-4 h-4" /> Day {activeCustomDay - 1}
                      </button>
                      <span className="text-xs font-bold text-neutral-500">
                        Day {activeCustomDay} of {customDays}
                      </span>
                      <button
                        type="button"
                        disabled={activeCustomDay >= customDays}
                        onClick={() => setActiveCustomDay(prev => Math.min(customDays, prev + 1))}
                        className="px-3 py-1.5 text-xs font-bold text-neutral-700 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        Day {activeCustomDay + 1} <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Nutritional Targets & Adjustments */}
            <div className="bg-[#FAFAFA] rounded-3xl p-5 border border-neutral-200/80 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#F97316]" />
                3. Macro Target & Financial Overrides
              </h3>

              {/* Top Row: Total Calorie Target & Goal Strategy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black text-neutral-800">
                      Total Daily Calories (kcal)
                    </label>
                    {(selectedCustomer?.calorie_profile?.probaeTarget || selectedCustomer?.calorie_profile?.total) && (
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                        Customer: {selectedCustomer.calorie_profile.probaeTarget || selectedCustomer.calorie_profile.total} kcal
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    value={manualCalorieTarget}
                    onChange={(e) => handleDailyCalorieChange(e.target.value ? parseInt(e.target.value) : "")}
                    placeholder="e.g. 1800"
                    style={{ color: "#171717", caretColor: "#6A0FAD" }}
                    className="w-full h-11 text-base px-3.5 py-2 border-2 border-neutral-300 rounded-xl bg-white font-black text-neutral-900 selection:bg-[#6A0FAD] selection:text-white focus:border-[#6A0FAD] focus:ring-4 focus:ring-purple-100 outline-none transition-all placeholder:text-neutral-400 placeholder:font-normal"
                  />
                  <div className="flex items-center justify-between text-[11px] text-neutral-500 font-medium mt-1">
                    <span>
                      Sum of slots: <strong className="text-purple-700">{manualCalorieTarget || 0} kcal</strong>
                    </span>
                    <button
                      type="button"
                      onClick={handleSplitDailyEvenly}
                      className="text-[10px] font-bold text-[#6A0FAD] hover:underline"
                    >
                      Split Evenly Across Slots
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-neutral-800 block mb-1.5">
                    Goal Strategy
                  </label>
                  <select
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    style={{ color: "#171717" }}
                    className="w-full h-11 text-sm px-3.5 py-2 border-2 border-neutral-300 rounded-xl bg-white font-bold text-neutral-900 focus:border-[#6A0FAD] focus:ring-4 focus:ring-purple-100 outline-none transition-all cursor-pointer"
                  >
                    <option value="MAINTENANCE" className="text-neutral-900 font-semibold">Maintenance</option>
                    <option value="FAT_LOSS" className="text-neutral-900 font-semibold">Fat Loss</option>
                    <option value="MUSCLE_GAIN" className="text-neutral-900 font-semibold">Muscle Gain</option>
                  </select>
                </div>
              </div>

              {/* Per-Meal Slot Calorie Allocation Section */}
              <div className="pt-3 border-t border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-black text-neutral-900 flex items-center gap-1.5">
                      <Utensils className="w-3.5 h-3.5 text-[#6A0FAD]" />
                      Selected Calorie Per Meal Slot
                    </label>
                    <span className="text-[11px] text-neutral-500 font-medium">
                      Bowls in each slot scale directly to that slot's target calorie
                    </span>
                  </div>

                  {selectedCustomer?.calorie_profile?.mealCalories && (
                    <button
                      type="button"
                      onClick={handleResetSlotsToCustomer}
                      className="text-xs font-bold text-[#6A0FAD] bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                      title="Reset meal slot targets to customer's saved profile"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset to Customer
                    </button>
                  )}
                </div>

                {/* Grid of Meal Slot Calorie Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeMealSlots.map((slot: string) => {
                    const custVal = getCustomerSlotCalorie(selectedCustomer, slot);
                    const currentVal = slotCalories[slot] ?? "";
                    const daily = Number(manualCalorieTarget) || 0;
                    const pct = daily > 0 && typeof currentVal === "number" ? Math.round((currentVal / daily) * 100) : null;

                    return (
                      <div
                        key={slot}
                        className="p-3 bg-white rounded-xl border border-neutral-200/90 shadow-2xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 text-xs font-black">
                            {slot}
                          </span>
                          {custVal !== null && (
                            <button
                              type="button"
                              onClick={() => handleSlotCalorieChange(slot, custVal)}
                              className="text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded transition-colors"
                              title="Click to apply customer's saved target"
                            >
                              Customer: {custVal} kcal
                            </button>
                          )}
                        </div>

                        <div className="relative">
                          <input
                            type="number"
                            min="100"
                            max="3000"
                            step="25"
                            value={currentVal}
                            onChange={(e) => handleSlotCalorieChange(slot, e.target.value ? parseInt(e.target.value) : "")}
                            placeholder="e.g. 750"
                            style={{ color: "#171717", caretColor: "#6A0FAD" }}
                            className="w-full h-10 text-sm px-3 pr-14 py-1.5 border-2 border-neutral-300 rounded-xl bg-white font-black text-neutral-900 selection:bg-[#6A0FAD] selection:text-white focus:border-[#6A0FAD] focus:ring-4 focus:ring-purple-100 outline-none transition-all placeholder:text-neutral-400 placeholder:font-normal"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400 pointer-events-none">
                            kcal
                          </span>
                        </div>

                        {pct !== null && (
                          <div className="flex items-center justify-between text-[10px] text-neutral-500 font-medium">
                            <span>Share of day:</span>
                            <span className="font-bold text-purple-800">{pct}%</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Delivery & Discount Section (Full width to avoid squishing) */}
              <div className="space-y-3 pt-3 border-t border-neutral-200">
                <label className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-neutral-200 hover:border-neutral-300 transition-all cursor-pointer select-none">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 text-[#6A0FAD] flex items-center justify-center shrink-0">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-neutral-900 block">Include Delivery</span>
                      <span className="text-[11px] text-neutral-500 font-medium">Auto-calculates customer distance fees</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeDelivery}
                    onChange={(e) => setIncludeDelivery(e.target.checked)}
                    className="w-5 h-5 text-[#6A0FAD] rounded-md cursor-pointer accent-[#6A0FAD]"
                  />
                </label>

                <div className="p-3.5 bg-white rounded-xl border border-neutral-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-neutral-800 flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-emerald-600" /> Apply Discount %
                    </span>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                      {discountPct}% OFF
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[0, 5, 10, 15, 20].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setDiscountPct(p)}
                        className={`py-2 text-xs font-black rounded-lg border transition-all ${
                          discountPct === p
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                            : "bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100"
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
                
                {/* 1. Daily Calorie & Nutrition Snapshot Banner */}
                <div className="bg-gradient-to-r from-purple-50 via-white to-purple-50 border border-purple-200/90 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#6A0FAD] text-white flex items-center justify-center font-black shadow-sm shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block">Customer Daily Target</span>
                      <p className="text-base font-black text-neutral-900">
                        {calculationResult.calorie_target || manualCalorieTarget ? `${Number(calculationResult.calorie_target || manualCalorieTarget).toLocaleString()} kcal / day` : "Standard Energy Target"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="px-3 py-1.5 bg-white rounded-xl border border-neutral-200 text-xs text-neutral-700">
                      <span className="text-neutral-400 font-bold mr-1">Meals / Day:</span>
                      <strong className="text-neutral-900">{planMode === "STANDARD" ? (selectedPlanTier?.included_meal_slots?.length || 2) : customSlots.length} Slots</strong>
                    </div>
                    <div className="px-3 py-1.5 bg-white rounded-xl border border-neutral-200 text-xs text-neutral-700">
                      <span className="text-neutral-400 font-bold mr-1">Avg / Meal:</span>
                      <strong className="text-[#6A0FAD]">
                        ~{Math.round(Number(calculationResult.calorie_target || manualCalorieTarget || 1600) / Math.max(1, (planMode === "STANDARD" ? (selectedPlanTier?.included_meal_slots?.length || 2) : customSlots.length)))} kcal
                      </strong>
                    </div>
                    <div className="px-3 py-1.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-black">
                      {calculationResult.goal || goal}
                    </div>
                  </div>
                </div>

                {/* 2. Primary Financial Cards Grid */}
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
                    style={{ color: "#171717" }}
                    className="w-full h-11 text-sm px-4 py-2 border-2 border-neutral-300 rounded-xl bg-white font-bold text-neutral-900 selection:bg-[#6A0FAD] selection:text-white focus:border-[#6A0FAD] focus:ring-4 focus:ring-purple-100 outline-none transition-all placeholder:text-neutral-400 placeholder:font-normal"
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
                              <span className="text-[10px] text-neutral-400 block">
                                kcal {item.target_calories ? `(target ${Math.round(item.target_calories)})` : ""}
                              </span>
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
        type="delete"
        confirmText="Delete Entry"
        onConfirm={handleDeleteLog}
        onClose={() => setDeletingLogUlid(null)}
      />

      {/* ── FULL SCHEDULE MATRIX MODAL ─────────────────────────────────────── */}
      {showScheduleMatrixModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-neutral-100 overflow-hidden animate-slide-up-fade">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-[#FAFAFA]">
              <div>
                <h3 className="text-base font-black text-neutral-900 flex items-center gap-2">
                  <Table className="w-4 h-4 text-[#6A0FAD]" />
                  Custom Plan Schedule Matrix ({customDays} Days × {customSlots.length} Slots)
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Full blueprint of assigned bowls per day and meal slot. Click any cell to jump to that day.
                </p>
              </div>
              <button
                onClick={() => setShowScheduleMatrixModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="border border-neutral-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-neutral-100 uppercase font-black text-neutral-600 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 border-b border-neutral-200 w-24">Day</th>
                      {customSlots.map(slot => (
                        <th key={slot} className="px-4 py-3 border-b border-neutral-200">{slot}</th>
                      ))}
                      <th className="px-4 py-3 border-b border-neutral-200 text-right w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {Array.from({ length: customDays }, (_, i) => i + 1).map((d) => (
                      <tr key={d} className={`hover:bg-purple-50/40 transition-colors ${activeCustomDay === d ? "bg-purple-50/70" : ""}`}>
                        <td className="px-4 py-3 font-black text-neutral-900">
                          Day {d}
                        </td>
                        {customSlots.map(slot => {
                          const item = customSchedule.find(
                            it => Number(it.day_index) === d && it.meal_slot.toLowerCase() === slot.toLowerCase()
                          );
                          return (
                            <td key={slot} className="px-4 py-3">
                              {item ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-neutral-900">{item.bowl_name}</span>
                                  {item.is_customized && (
                                    <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-1 py-0.5 rounded">
                                      Customized
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-neutral-400 italic font-normal">Not assigned</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCustomDay(d);
                              setShowScheduleMatrixModal(false);
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold text-[#6A0FAD] bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                          >
                            Edit Day
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-neutral-100 bg-[#FAFAFA] flex items-center justify-between">
              <span className="text-xs text-neutral-500 font-medium">
                Total Meals: <strong className="text-neutral-900">{customSchedule.length}</strong> of {customDays * customSlots.length} mapped
              </span>
              <button
                type="button"
                onClick={() => setShowScheduleMatrixModal(false)}
                className="px-4 py-2 bg-[#6A0FAD] text-white text-xs font-bold rounded-xl"
              >
                Close Matrix View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
