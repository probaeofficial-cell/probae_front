"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Trash2, Plus, RotateCcw, SlidersHorizontal, Check, Sparkles, Scale, DollarSign } from "lucide-react";
import AsyncIngredientSelect from "@/components/admin/AsyncIngredientSelect";
import { endpoints } from "@/lib/apiService";
import { Ingredient } from "@/lib/types";

export interface CustomIngredient {
  ingredient_id: number;
  name: string;
  macro_tag: string;
  weight_g: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  cost: number;
  is_added?: boolean;
  // Base attributes for scaling ratio calculations
  base_weight?: number;
  base_calories?: number;
  base_protein?: number;
  base_carbs?: number;
  base_fat?: number;
  base_fiber?: number;
  base_price?: number;
}

export interface BowlCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bowlUlid: string;
  bowlName: string;
  dayIndex?: number;
  mealSlot?: string;
  scheduleUlid?: string;
  customerUlid?: string;
  initialIngredients: CustomIngredient[];
  basePackagingCost?: number;
  baseFixedCost?: number;
  onSave?: (customData: {
    bowlUlid: string;
    applyToAllDays: boolean;
    scheduleUlid?: string;
    customIngredients: CustomIngredient[];
    customCalories: number;
    customMacros: { protein: number; carbs: number; fat: number; fiber: number };
    customPrice: number;
  }) => void | Promise<void>;
}

export function parseBowlIngredient(bi: any): CustomIngredient {
  const name = bi.ingredient_name || bi.name || bi.ingredient?.name || "Ingredient";
  const id = Number(bi.ingredient_id || bi.ingredient?.id || bi.id || 0);
  const weight = Number(bi.weight_g_or_ml ?? bi.weight_g ?? 0);
  const baseWeight = Number(bi.base_weight || bi.ingredient?.total_weight || (weight > 0 ? weight : 100));
  const ratio = baseWeight > 0 ? weight / baseWeight : 1;

  // Base values
  const baseCal = Number(bi.base_calories ?? bi.ingredient?.total_calories ?? (bi.calories ? (ratio > 0 ? bi.calories / ratio : bi.calories) : 0));
  const basePro = Number(bi.base_protein ?? bi.ingredient?.total_protein ?? (bi.protein ? (ratio > 0 ? bi.protein / ratio : bi.protein) : 0));
  const baseCarb = Number(bi.base_carbs ?? bi.ingredient?.total_carbs ?? (bi.carbs ? (ratio > 0 ? bi.carbs / ratio : bi.carbs) : 0));
  const baseFat = Number(bi.base_fat ?? bi.ingredient?.total_fat ?? (bi.fat ? (ratio > 0 ? bi.fat / ratio : bi.fat) : 0));
  const baseFib = Number(bi.base_fiber ?? bi.ingredient?.total_fiber ?? (bi.fiber ? (ratio > 0 ? bi.fiber / ratio : bi.fiber) : 0));
  const baseCost = Number(bi.base_price ?? bi.ingredient?.total_price ?? (bi.cost ? (ratio > 0 ? bi.cost / ratio : bi.cost) : 0));

  // Current values
  const cal = Number(bi.calories !== undefined ? bi.calories : Math.round(baseCal * ratio * 10) / 10);
  const pro = Number(bi.protein !== undefined ? bi.protein : Math.round(basePro * ratio * 10) / 10);
  const carb = Number(bi.carbs !== undefined ? bi.carbs : Math.round(baseCarb * ratio * 10) / 10);
  const fat = Number(bi.fat !== undefined ? bi.fat : Math.round(baseFat * ratio * 10) / 10);
  const fib = Number(bi.fiber !== undefined ? bi.fiber : Math.round(baseFib * ratio * 10) / 10);
  const cost = Number(bi.cost !== undefined ? bi.cost : Math.round(baseCost * ratio * 100) / 100);

  return {
    ingredient_id: id,
    name,
    macro_tag: String(bi.macro_tag || bi.section_name || "CARB"),
    weight_g: weight,
    calories: Math.round(cal * 10) / 10,
    protein: Math.round(pro * 10) / 10,
    carbs: Math.round(carb * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    fiber: Math.round(fib * 10) / 10,
    cost: Math.round(cost * 100) / 100,
    is_added: Boolean(bi.is_added),
    base_weight: baseWeight,
    base_calories: baseCal,
    base_protein: basePro,
    base_carbs: baseCarb,
    base_fat: baseFat,
    base_fiber: baseFib,
    base_price: baseCost,
  };
}

export function BowlCustomizerModal({
  isOpen,
  onClose,
  bowlUlid,
  bowlName,
  dayIndex,
  mealSlot,
  scheduleUlid,
  customerUlid,
  initialIngredients,
  basePackagingCost = 0,
  baseFixedCost = 0,
  onSave,
}: BowlCustomizerModalProps) {
  const [ingredients, setIngredients] = useState<CustomIngredient[]>([]);
  const [applyToAllDays, setApplyToAllDays] = useState(true);
  const [selectedIngredientToAdd, setSelectedIngredientToAdd] = useState<Ingredient | null>(null);
  const [addWeightG, setAddWeightG] = useState<number>(50);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Store original ingredients snapshot for reset
  const [originalSnapshot, setOriginalSnapshot] = useState<CustomIngredient[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (initialIngredients && initialIngredients.length > 0) {
        const normalized = initialIngredients.map((item) => parseBowlIngredient(item));
        setIngredients(normalized);
        setOriginalSnapshot(JSON.parse(JSON.stringify(normalized)));
      } else if (bowlUlid) {
        endpoints.bowls.getBowl(bowlUlid).then((bData: any) => {
          const list = (bData.ingredients || []).map((bi: any) => parseBowlIngredient(bi));
          setIngredients(list);
          setOriginalSnapshot(JSON.parse(JSON.stringify(list)));
        }).catch(err => {
          console.error("Failed auto-fetching bowl in customizer modal", err);
        });
      } else {
        setIngredients([]);
        setOriginalSnapshot([]);
      }
      setApplyToAllDays(true);
      setErrorMsg("");
      setSaveSuccess(false);
    }
  }, [isOpen, initialIngredients, bowlUlid]);


  // Recalculate macro and cost totals
  const totals = useMemo(() => {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    let fiber = 0;
    let rawCost = 0;

    ingredients.forEach((ing) => {
      calories += Number(ing.calories || 0);
      protein += Number(ing.protein || 0);
      carbs += Number(ing.carbs || 0);
      fat += Number(ing.fat || 0);
      fiber += Number(ing.fiber || 0);
      rawCost += Number(ing.cost || 0);
    });

    const packaging = Number(basePackagingCost || 0);
    const fixed = Number(baseFixedCost || 0);
    const finalPrice = Math.round((rawCost + packaging + fixed) * 100) / 100;

    return {
      calories: Math.round(calories * 10) / 10,
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      fiber: Math.round(fiber * 10) / 10,
      rawCost: Math.round(rawCost * 100) / 100,
      packaging,
      fixed,
      finalPrice,
    };
  }, [ingredients, basePackagingCost, baseFixedCost]);

  // Handle changing ingredient weight
  const handleWeightChange = (index: number, newWeight: number) => {
    const safeWeight = Math.max(0, newWeight);
    setIngredients((prev) =>
      prev.map((ing, i) => {
        if (i !== index) return ing;
        const baseW = Number(ing.base_weight || 100);
        const ratio = baseW > 0 ? safeWeight / baseW : 0;
        return {
          ...ing,
          weight_g: safeWeight,
          calories: Math.round(Number(ing.base_calories || 0) * ratio * 10) / 10,
          protein: Math.round(Number(ing.base_protein || 0) * ratio * 10) / 10,
          carbs: Math.round(Number(ing.base_carbs || 0) * ratio * 10) / 10,
          fat: Math.round(Number(ing.base_fat || 0) * ratio * 10) / 10,
          fiber: Math.round(Number(ing.base_fiber || 0) * ratio * 10) / 10,
          cost: Math.round(Number(ing.base_price || 0) * ratio * 100) / 100,
        };
      })
    );
  };

  // Handle deleting an ingredient
  const handleDeleteIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle adding an ingredient from pantry
  const handleAddIngredient = () => {
    if (!selectedIngredientToAdd) return;
    if (addWeightG <= 0) return;

    // Check if ingredient already exists in current list
    const existingIndex = ingredients.findIndex(
      (ing) => ing.ingredient_id === selectedIngredientToAdd.id
    );
    if (existingIndex >= 0) {
      // Increase weight of existing
      const current = ingredients[existingIndex];
      handleWeightChange(existingIndex, Number(current.weight_g) + Number(addWeightG));
      setSelectedIngredientToAdd(null);
      setAddWeightG(50);
      return;
    }

    const baseW = Number(selectedIngredientToAdd.total_weight || 100);
    const ratio = baseW > 0 ? addWeightG / baseW : 0;

    const newIng: CustomIngredient = {
      ingredient_id: selectedIngredientToAdd.id,
      name: selectedIngredientToAdd.name,
      macro_tag: "ADD_ON",
      weight_g: addWeightG,
      calories: Math.round(Number(selectedIngredientToAdd.total_calories || 0) * ratio * 10) / 10,
      protein: Math.round(Number(selectedIngredientToAdd.total_protein || 0) * ratio * 10) / 10,
      carbs: Math.round(Number(selectedIngredientToAdd.total_carbs || 0) * ratio * 10) / 10,
      fat: Math.round(Number(selectedIngredientToAdd.total_fat || 0) * ratio * 10) / 10,
      fiber: Math.round(Number(selectedIngredientToAdd.total_fiber || 0) * ratio * 10) / 10,
      cost: Math.round(Number(selectedIngredientToAdd.total_price || 0) * ratio * 100) / 100,
      is_added: true,
      base_weight: baseW,
      base_calories: Number(selectedIngredientToAdd.total_calories || 0),
      base_protein: Number(selectedIngredientToAdd.total_protein || 0),
      base_carbs: Number(selectedIngredientToAdd.total_carbs || 0),
      base_fat: Number(selectedIngredientToAdd.total_fat || 0),
      base_fiber: Number(selectedIngredientToAdd.total_fiber || 0),
      base_price: Number(selectedIngredientToAdd.total_price || 0),
    };

    setIngredients((prev) => [...prev, newIng]);
    setSelectedIngredientToAdd(null);
    setAddWeightG(50);
  };

  // Reset to original snapshot
  const handleReset = () => {
    setIngredients(JSON.parse(JSON.stringify(originalSnapshot)));
  };

  // Save handler
  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg("");
    try {
      const activeIngredients = ingredients
        .filter((ing) => ing.weight_g > 0)
        .map((ing) => ({
          ingredient_id: ing.ingredient_id,
          name: ing.name,
          macro_tag: ing.macro_tag || "CARB",
          weight_g: ing.weight_g,
          calories: ing.calories,
          protein: ing.protein,
          carbs: ing.carbs,
          fat: ing.fat,
          fiber: ing.fiber,
          cost: ing.cost,
          is_added: Boolean(ing.is_added),
        }));

      // If customerUlid is present, call the backend endpoint directly
      if (customerUlid) {
        await endpoints.customers.customizeBowl(customerUlid, {
          schedule_ulid: scheduleUlid,
          bowl_ulid: bowlUlid,
          apply_to_all_days: applyToAllDays,
          custom_ingredients: activeIngredients,
        });
      }

      // Notify parent callback
      if (onSave) {
        await onSave({
          bowlUlid,
          applyToAllDays,
          scheduleUlid,
          customIngredients: activeIngredients,
          customCalories: totals.calories,
          customMacros: {
            protein: totals.protein,
            carbs: totals.carbs,
            fat: totals.fat,
            fiber: totals.fiber,
          },
          customPrice: totals.finalPrice,
        });
      }

      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error("Failed to save bowl customization", err);
      setErrorMsg(err.detail || err.message || "Failed to save bowl customization");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-neutral-100 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#6A0FAD]/10 text-[#6A0FAD] flex items-center justify-center font-bold">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-neutral-900">{bowlName}</h2>
                <span className="text-[10px] font-black bg-[#6A0FAD] text-white px-2 py-0.5 rounded-full tracking-wide">
                  CUSTOMIZER
                </span>
              </div>
              <p className="text-xs text-neutral-500 font-medium mt-0.5">
                {dayIndex ? `Day ${dayIndex}` : ""} {mealSlot ? `• ${mealSlot.toUpperCase()}` : ""} • Modify components, delete, or add pantry ingredients
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Nutrition & Pricing Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 p-4 bg-neutral-900 text-white border-b border-neutral-800">
          <div className="text-center p-2 rounded-xl bg-white/5">
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Calories</div>
            <div className="text-base font-black text-white">{totals.calories} <span className="text-[10px] font-normal text-neutral-400">kcal</span></div>
          </div>
          <div className="text-center p-2 rounded-xl bg-white/5">
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Protein</div>
            <div className="text-base font-black text-emerald-400">{totals.protein}g</div>
          </div>
          <div className="text-center p-2 rounded-xl bg-white/5">
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Carbs</div>
            <div className="text-base font-black text-amber-400">{totals.carbs}g</div>
          </div>
          <div className="text-center p-2 rounded-xl bg-white/5">
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Fat</div>
            <div className="text-base font-black text-rose-400">{totals.fat}g</div>
          </div>
          <div className="text-center p-2 rounded-xl bg-white/5">
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Fiber</div>
            <div className="text-base font-black text-sky-400">{totals.fiber}g</div>
          </div>
          <div className="text-center p-2 rounded-xl bg-[#6A0FAD]/40 border border-[#6A0FAD]">
            <div className="text-[10px] font-bold text-purple-200 uppercase tracking-wider">Unit Price</div>
            <div className="text-base font-black text-white">₹{totals.finalPrice}</div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {errorMsg}
            </div>
          )}

          {/* Current Ingredients List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-neutral-400" />
                Current Ingredients ({ingredients.length})
              </h3>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-bold text-neutral-500 hover:text-neutral-800 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset to Original
              </button>
            </div>

            {ingredients.length === 0 ? (
              <div className="text-center py-8 text-neutral-400 border-2 border-dashed border-neutral-200 rounded-2xl text-xs">
                All ingredients have been removed. Add components below from the pantry catalog.
              </div>
            ) : (
              <div className="space-y-2">
                {ingredients.map((ing, idx) => (
                  <div
                    key={`${ing.ingredient_id}-${idx}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border border-neutral-100 hover:border-neutral-200 bg-white transition-all gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-neutral-900 truncate">{ing.name}</span>
                        {ing.is_added && (
                          <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                            ADDED
                          </span>
                        )}
                        <span className="text-[9px] font-bold bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">
                          {ing.macro_tag}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-400 flex flex-wrap gap-x-3 gap-y-0.5">
                        <span>{ing.calories} kcal</span>
                        <span>•</span>
                        <span>P: {ing.protein}g</span>
                        <span>C: {ing.carbs}g</span>
                        <span>F: {ing.fat}g</span>
                        <span>•</span>
                        <span className="font-semibold text-neutral-700">₹{ing.cost}</span>
                      </div>
                    </div>

                    {/* Weight Stepper & Delete Button */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center border border-neutral-200 rounded-xl overflow-hidden bg-neutral-50">
                        <button
                          type="button"
                          onClick={() => handleWeightChange(idx, ing.weight_g - 10)}
                          className="px-2.5 py-1.5 text-neutral-600 hover:bg-neutral-200 text-xs font-bold transition-colors"
                        >
                          -10
                        </button>
                        <button
                          type="button"
                          onClick={() => handleWeightChange(idx, ing.weight_g - 5)}
                          className="px-2 py-1.5 text-neutral-600 hover:bg-neutral-200 text-xs font-bold transition-colors"
                        >
                          -5
                        </button>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={ing.weight_g}
                          onChange={(e) => handleWeightChange(idx, parseFloat(e.target.value) || 0)}
                          style={{ color: "#000000" }}
                          className="w-16 text-center text-xs font-black text-black bg-white border-x border-neutral-200 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#6A0FAD]"
                        />
                        <span className="text-[10px] text-neutral-400 px-1 font-bold">g</span>
                        <button
                          type="button"
                          onClick={() => handleWeightChange(idx, ing.weight_g + 5)}
                          className="px-2 py-1.5 text-neutral-600 hover:bg-neutral-200 text-xs font-bold transition-colors"
                        >
                          +5
                        </button>
                        <button
                          type="button"
                          onClick={() => handleWeightChange(idx, ing.weight_g + 10)}
                          className="px-2.5 py-1.5 text-neutral-600 hover:bg-neutral-200 text-xs font-bold transition-colors"
                        >
                          +10
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteIngredient(idx)}
                        className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                        title="Remove ingredient completely"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Component from Pantry Catalog */}
          <div className="p-4 rounded-2xl border border-[#6A0FAD]/20 bg-[#6A0FAD]/5 space-y-3">
            <h3 className="text-xs font-black text-[#6A0FAD] uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Add Component From Pantry Catalog
            </h3>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="flex-1">
                <AsyncIngredientSelect
                  value={selectedIngredientToAdd?.id || 0}
                  onChange={(_, ingredient) => setSelectedIngredientToAdd(ingredient || null)}
                  selectedIngredient={selectedIngredientToAdd}
                  compact={true}
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    placeholder="Grams"
                    value={addWeightG || ""}
                    onChange={(e) => setAddWeightG(parseFloat(e.target.value) || 0)}
                    style={{ color: "#000000" }}
                    className="w-24 text-xs font-bold text-black placeholder:text-neutral-400 px-3 py-2 border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20"
                  />
                  <span className="absolute right-2.5 top-2 text-[10px] text-neutral-400 font-bold">g</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddIngredient}
                  disabled={!selectedIngredientToAdd || addWeightG <= 0}
                  className="bg-[#6A0FAD] hover:bg-[#5a0c96] disabled:opacity-40 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shrink-0 flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Add to Bowl
                </button>
              </div>
            </div>
            {selectedIngredientToAdd && (
              <p className="text-[11px] text-neutral-500">
                Selected: <strong>{selectedIngredientToAdd.name}</strong> • Base: {selectedIngredientToAdd.total_weight}g = {selectedIngredientToAdd.total_calories} kcal, ₹{selectedIngredientToAdd.total_price}
              </p>
            )}
          </div>

          {/* Scope Control */}
          <div className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50/80">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={applyToAllDays}
                onChange={(e) => setApplyToAllDays(e.target.checked)}
                className="mt-0.5 rounded text-[#6A0FAD] focus:ring-[#6A0FAD] w-4 h-4 cursor-pointer"
              />
              <div>
                <span className="text-xs font-black text-neutral-900 block">
                  Apply this recipe customization to ALL DAYS where this bowl is scheduled in this plan
                </span>
                <span className="text-[11px] text-neutral-500 block mt-0.5">
                  When enabled, any occurrences of <strong>{bowlName}</strong> across all days will use this exact recipe. Any future pending orders for this bowl will also automatically synchronize.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-100 flex items-center justify-between bg-white">
          <div className="text-xs text-neutral-400 font-medium">
            Raw: ₹{totals.rawCost} + Pack: ₹{totals.packaging} + Fix: ₹{totals.fixed} = <strong className="text-neutral-900 font-bold">₹{totals.finalPrice}</strong>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-[#6A0FAD] hover:bg-[#5a0c96] text-white text-xs font-bold transition-all shadow-md shadow-[#6A0FAD]/20 flex items-center gap-2 disabled:opacity-50"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4" /> Saved!
                </>
              ) : isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Save Customization
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
