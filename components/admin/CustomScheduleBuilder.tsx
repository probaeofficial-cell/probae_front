"use client";

import React, { useState, useEffect } from "react";
import { endpoints } from "@/lib/apiService";
import AsyncBowlSelect from "@/components/admin/AsyncBowlSelect";
import { BowlCustomizerModal, CustomIngredient, parseBowlIngredient } from "@/components/admin/BowlCustomizerModal";

import { Repeat, SlidersHorizontal, Sparkles } from "lucide-react";

interface ScheduleMatrixCell {
  ulid: string;
  name: string;
  is_customized?: boolean;
  custom_ingredients?: CustomIngredient[];
  custom_calories?: number;
  custom_macros?: any;
  custom_price?: number;
  packaging_cost?: number;
  fixed_cost?: number;
}

interface CustomScheduleBuilderProps {
  days: number;
  mealSlots: string[];
  onChange: (schedule: any[]) => void;
  initialSchedule?: any[];
}

export function CustomScheduleBuilder({ days, mealSlots, onChange, initialSchedule }: CustomScheduleBuilderProps) {
  const [matrix, setMatrix] = useState<Record<string, ScheduleMatrixCell>>({});
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [isLoadingBowlRecipe, setIsLoadingBowlRecipe] = useState(false);

  // Modal state
  const [customizerModal, setCustomizerModal] = useState<{
    isOpen: boolean;
    bowlUlid: string;
    bowlName: string;
    dayIndex: number;
    mealSlot: string;
    initialIngredients: CustomIngredient[];
    packagingCost: number;
    fixedCost: number;
  }>({
    isOpen: false,
    bowlUlid: "",
    bowlName: "",
    dayIndex: 1,
    mealSlot: "",
    initialIngredients: [],
    packagingCost: 0,
    fixedCost: 0,
  });

  useEffect(() => {
    if (initialSchedule && initialSchedule.length > 0) {
      const initMat: Record<string, ScheduleMatrixCell> = {};
      initialSchedule.forEach(item => {
        initMat[`${item.day_index}-${item.meal_slot.toLowerCase()}`] = { 
          ulid: item.bowl_ulid, 
          name: item.bowl_name || "Unknown Bowl",
          is_customized: Boolean(item.is_customized),
          custom_ingredients: item.custom_ingredients,
          custom_calories: item.custom_calories,
          custom_macros: item.custom_macros,
          custom_price: item.custom_price,
        };
      });
      setMatrix(initMat);
    }
  }, [initialSchedule]);

  const emitSchedule = (newMat: Record<string, ScheduleMatrixCell>) => {
    const arr: any[] = [];
    for (let d = 1; d <= days; d++) {
      mealSlots.forEach(s => {
        const key = `${d}-${s.toLowerCase()}`;
        if (newMat[key]) {
          const item = newMat[key];
          arr.push({ 
            day_index: d, 
            meal_slot: s.toLowerCase(), 
            bowl_ulid: item.ulid,
            bowl_name: item.name,
            is_customized: item.is_customized || false,
            custom_ingredients: item.custom_ingredients || null,
            custom_calories: item.custom_calories || null,
            custom_macros: item.custom_macros || null,
            custom_price: item.custom_price || null,
          });
        }
      });
    }
    onChange(arr);
  };

  const handleSelect = (day: number, slot: string, bowl: any) => {
    if (!bowl) return;
    const newMat = { 
      ...matrix, 
      [`${day}-${slot.toLowerCase()}`]: { 
        ulid: bowl.ulid, 
        name: bowl.name,
        is_customized: false,
        custom_ingredients: undefined,
        custom_calories: undefined,
        custom_macros: undefined,
        custom_price: undefined,
      } 
    };
    setMatrix(newMat);
    emitSchedule(newMat);
  };

  const handleOpenCustomizer = async (day: number, slot: string) => {
    const key = `${day}-${slot.toLowerCase()}`;
    const cell = matrix[key];
    if (!cell || !cell.ulid) return;

    if (cell.is_customized && cell.custom_ingredients && cell.custom_ingredients.length > 0) {
      setCustomizerModal({
        isOpen: true,
        bowlUlid: cell.ulid,
        bowlName: cell.name,
        dayIndex: day,
        mealSlot: slot,
        initialIngredients: cell.custom_ingredients,
        packagingCost: cell.packaging_cost || 0,
        fixedCost: cell.fixed_cost || 0,
      });
      return;
    }

    setIsLoadingBowlRecipe(true);
    try {
      const bowlData: any = await endpoints.bowls.getBowl(cell.ulid);

      const ingredientsList: CustomIngredient[] = (bowlData.ingredients || []).map((bi: any) => parseBowlIngredient(bi));

      const packCost = Number(bowlData.packaging?.total_cost || bowlData.packaging_cost || 0);
      const fixCost = Number(bowlData.fixed_cost || 0);


      setCustomizerModal({
        isOpen: true,
        bowlUlid: cell.ulid,
        bowlName: cell.name,
        dayIndex: day,
        mealSlot: slot,
        initialIngredients: ingredientsList,
        packagingCost: packCost,
        fixedCost: fixCost,
      });
    } catch (err) {
      console.error("Failed to load bowl ingredients", err);
      alert("Failed to load bowl ingredients for customization.");
    } finally {
      setIsLoadingBowlRecipe(false);
    }
  };

  const handleCustomizerSave = (customData: {
    bowlUlid: string;
    applyToAllDays: boolean;
    customIngredients: CustomIngredient[];
    customCalories: number;
    customMacros: any;
    customPrice: number;
  }) => {
    const newMat = { ...matrix };
    const targetKey = `${customizerModal.dayIndex}-${customizerModal.mealSlot.toLowerCase()}`;

    if (customData.applyToAllDays) {
      Object.keys(newMat).forEach(key => {
        if (newMat[key]?.ulid === customData.bowlUlid) {
          newMat[key] = {
            ...newMat[key],
            is_customized: true,
            custom_ingredients: customData.customIngredients,
            custom_calories: customData.customCalories,
            custom_macros: customData.customMacros,
            custom_price: customData.customPrice,
          };
        }
      });
    } else {
      if (newMat[targetKey]) {
        newMat[targetKey] = {
          ...newMat[targetKey],
          is_customized: true,
          custom_ingredients: customData.customIngredients,
          custom_calories: customData.customCalories,
          custom_macros: customData.customMacros,
          custom_price: customData.customPrice,
        };
      }
    }

    setMatrix(newMat);
    emitSchedule(newMat);
    setCustomizerModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleAutoFill = async () => {
    setIsAutoFilling(true);
    try {
      const catRes: any = await endpoints.mealCategories.getMealCategories(1, 100);
      const categories = catRes.items || [];
      const newMat = { ...matrix };

      for (const slot of mealSlots) {
        const slotLower = slot.toLowerCase();
        const cat = categories.find((c: any) => (c.slug || c.name).toLowerCase() === slotLower);
        let bowlsForSlot: any[] = [];
        
        if (cat) {
          const bRes: any = await endpoints.bowls.getBowls(1, 100, undefined, undefined, cat.ulid);
          bowlsForSlot = bRes.items || [];
        } else {
          const bRes: any = await endpoints.bowls.getBowls(1, 100);
          bowlsForSlot = bRes.items || [];
        }

        if (bowlsForSlot.length > 0) {
          for (let d = 1; d <= days; d++) {
            const bowl = bowlsForSlot[(d - 1) % bowlsForSlot.length];
            newMat[`${d}-${slotLower}`] = { 
              ulid: bowl.ulid, 
              name: bowl.name,
              is_customized: false,
              custom_ingredients: undefined,
              custom_calories: undefined,
              custom_macros: undefined,
              custom_price: undefined,
            };
          }
        }
      }
      
      setMatrix(newMat);
      emitSchedule(newMat);
    } catch (err) {
      console.error("Failed to auto fill", err);
      alert("Failed to auto fill based on categories.");
    } finally {
      setIsAutoFilling(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-3xl border border-[#6A0FAD]/20 p-6 shadow-sm overflow-hidden mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-black text-[#6A0FAD]">Bespoke Blueprint Builder</h3>
            <p className="text-xs text-neutral-500 font-medium">Assign bowls to each slot. Customize components, weights, or add ingredients per bowl.</p>
          </div>
          <button 
            onClick={handleAutoFill}
            type="button"
            className="flex items-center gap-2 bg-[#6A0FAD]/10 text-[#6A0FAD] hover:bg-[#6A0FAD]/20 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
          >
            <Repeat className={`w-4 h-4 ${isAutoFilling ? 'animate-spin' : ''}`} />
            {isAutoFilling ? 'Filling...' : 'Auto-Fill Category'}
          </button>
        </div>
        <div className="overflow-x-auto pb-4">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr>
                <th className="py-3 px-4 border-b border-neutral-200 text-neutral-500 font-bold text-xs uppercase tracking-widest bg-neutral-50 rounded-tl-xl">Day</th>
                {mealSlots.map(slot => (
                  <th key={slot} className="py-3 px-4 border-b border-neutral-200 text-neutral-500 font-bold text-xs uppercase tracking-widest bg-neutral-50">
                    {slot}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: days }).map((_, i) => (
                <tr key={i} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="py-4 px-4 border-b border-neutral-100 font-bold text-neutral-700 whitespace-nowrap">Day {i + 1}</td>
                  {mealSlots.map(slot => {
                    const key = `${i + 1}-${slot.toLowerCase()}`;
                    const cell = matrix[key];
                    return (
                      <td key={slot} className="py-4 px-4 border-b border-neutral-100 align-top">
                        <div className="w-[210px] min-w-[210px] space-y-1.5">
                          <AsyncBowlSelect
                            value={cell?.ulid || ""}
                            onChange={() => {}}
                            onSelectBowl={(bowl) => handleSelect(i + 1, slot, bowl)}
                            selectedBowl={cell ? { ulid: cell.ulid, name: cell.name } : undefined}
                          />

                          {cell && cell.ulid && (
                            <div className="flex items-center justify-between px-1">
                              {cell.is_customized ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#6A0FAD] bg-purple-100 px-1.5 py-0.5 rounded">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  Custom {cell.custom_price ? `(₹${cell.custom_price})` : ""}
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium text-neutral-400">Master Recipe</span>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenCustomizer(i + 1, slot)}
                                disabled={isLoadingBowlRecipe}
                                className="text-[11px] font-bold text-[#6A0FAD] hover:text-[#5a0c96] hover:bg-purple-50 px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
                              >
                                <SlidersHorizontal className="w-3 h-3" />
                                Customize
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-neutral-500 font-medium mt-2">* Ensure all slots are filled to accurately calculate the pricing and macros.</p>
      </div>

      {/* Bowl Customizer Modal */}
      <BowlCustomizerModal
        isOpen={customizerModal.isOpen}
        onClose={() => setCustomizerModal(prev => ({ ...prev, isOpen: false }))}
        bowlUlid={customizerModal.bowlUlid}
        bowlName={customizerModal.bowlName}
        dayIndex={customizerModal.dayIndex}
        mealSlot={customizerModal.mealSlot}
        initialIngredients={customizerModal.initialIngredients}
        basePackagingCost={customizerModal.packagingCost}
        baseFixedCost={customizerModal.fixedCost}
        onSave={handleCustomizerSave}
      />
    </>
  );
}
