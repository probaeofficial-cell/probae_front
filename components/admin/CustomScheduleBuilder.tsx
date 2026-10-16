"use client";

import React, { useState, useEffect } from "react";
import { endpoints } from "@/lib/apiService";
import AsyncBowlSelect from "@/components/admin/AsyncBowlSelect";
import { BowlCustomizerModal, CustomIngredient, parseBowlIngredient } from "@/components/admin/BowlCustomizerModal";

import { Repeat, SlidersHorizontal, Sparkles, Copy, Check, X, CheckSquare, Square, AlertTriangle } from "lucide-react";

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

  // Copy Bowl Modal State
  const [copyBowlModal, setCopyBowlModal] = useState<{
    isOpen: boolean;
    sourceDay: number;
    sourceSlot: string;
    bowlName: string;
    cell: ScheduleMatrixCell | null;
    targetDays: number[];
  }>({
    isOpen: false,
    sourceDay: 1,
    sourceSlot: "",
    bowlName: "",
    cell: null,
    targetDays: [],
  });

  // Copy Entire Day Modal State
  const [copyDayModal, setCopyDayModal] = useState<{
    isOpen: boolean;
    sourceDay: number;
    targetDays: number[];
  }>({
    isOpen: false,
    sourceDay: 1,
    targetDays: [],
  });

  // Overwrite Confirmation Dialog State
  const [overwriteConfirm, setOverwriteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    secondaryText?: string;
    onSecondary?: () => void;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: null,
    confirmText: "Yes, Overwrite",
    onConfirm: () => {},
  });

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

  const handleOpenCopyBowl = (day: number, slot: string, cell: ScheduleMatrixCell) => {
    setCopyBowlModal({
      isOpen: true,
      sourceDay: day,
      sourceSlot: slot,
      bowlName: cell.name,
      cell: cell,
      targetDays: [],
    });
  };

  const handleApplyCopyBowl = () => {
    if (!copyBowlModal.cell) return;
    const newMat = { ...matrix };
    copyBowlModal.targetDays.forEach(d => {
      const key = `${d}-${copyBowlModal.sourceSlot.toLowerCase()}`;
      newMat[key] = JSON.parse(JSON.stringify(copyBowlModal.cell));
    });
    setMatrix(newMat);
    emitSchedule(newMat);
    setCopyBowlModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleOpenCopyDay = (day: number) => {
    setCopyDayModal({
      isOpen: true,
      sourceDay: day,
      targetDays: [],
    });
  };

  const handleApplyCopyDay = () => {
    const newMat = { ...matrix };
    copyDayModal.targetDays.forEach(d => {
      mealSlots.forEach(slot => {
        const srcKey = `${copyDayModal.sourceDay}-${slot.toLowerCase()}`;
        const tgtKey = `${d}-${slot.toLowerCase()}`;
        if (matrix[srcKey]) {
          newMat[tgtKey] = JSON.parse(JSON.stringify(matrix[srcKey]));
        }
      });
    });
    setMatrix(newMat);
    emitSchedule(newMat);
    setCopyDayModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleToggleCopyBowlDay = (dayNum: number) => {
    const isSelected = copyBowlModal.targetDays.includes(dayNum);
    if (isSelected) {
      setCopyBowlModal(prev => ({
        ...prev,
        targetDays: prev.targetDays.filter(d => d !== dayNum)
      }));
      return;
    }

    const key = `${dayNum}-${copyBowlModal.sourceSlot.toLowerCase()}`;
    const existing = matrix[key];
    const hasData = Boolean(existing && existing.ulid);

    if (hasData) {
      setOverwriteConfirm({
        isOpen: true,
        title: `Overwrite Day ${dayNum}?`,
        message: (
          <div className="space-y-2 text-sm text-neutral-600">
            <p>
              Day <span className="font-bold text-neutral-900">{dayNum}</span> already has a bowl assigned for <span className="font-bold text-[#6A0FAD] uppercase">{copyBowlModal.sourceSlot}</span>:
            </p>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 font-bold flex items-center justify-between">
              <span>{existing.name}</span>
              {existing.is_customized && (
                <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-extrabold">Customized</span>
              )}
            </div>
            <p>
              Are you sure you want to select Day {dayNum} and replace it with <span className="font-bold text-neutral-900">{copyBowlModal.bowlName}</span>?
            </p>
          </div>
        ),
        confirmText: `Yes, Overwrite Day ${dayNum}`,
        onConfirm: () => {
          setCopyBowlModal(prev => ({
            ...prev,
            targetDays: [...prev.targetDays, dayNum]
          }));
          setOverwriteConfirm(prev => ({ ...prev, isOpen: false }));
        }
      });
      return;
    }

    setCopyBowlModal(prev => ({
      ...prev,
      targetDays: [...prev.targetDays, dayNum]
    }));
  };

  const handleBulkSelectCopyBowl = (filterType: "all" | "odd" | "even") => {
    const candidates = Array.from({ length: days }, (_, idx) => idx + 1).filter(d => {
      if (d === copyBowlModal.sourceDay) return false;
      if (filterType === "odd") return d % 2 !== 0;
      if (filterType === "even") return d % 2 === 0;
      return true;
    });

    const occupiedDays = candidates.filter(d => {
      const key = `${d}-${copyBowlModal.sourceSlot.toLowerCase()}`;
      return Boolean(matrix[key]?.ulid);
    });

    if (occupiedDays.length > 0) {
      setOverwriteConfirm({
        isOpen: true,
        title: `Some Selected Days Already Have Data`,
        message: (
          <div className="space-y-3 text-sm text-neutral-600">
            <p>
              <span className="font-bold text-amber-600">{occupiedDays.length}</span> of the {candidates.length} selected days already have bowls assigned for <span className="font-bold text-[#6A0FAD] uppercase">{copyBowlModal.sourceSlot}</span>:
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-neutral-50 rounded-xl border border-neutral-200">
              {occupiedDays.map(d => {
                const bName = matrix[`${d}-${copyBowlModal.sourceSlot.toLowerCase()}`]?.name;
                return (
                  <span key={d} className="inline-flex items-center gap-1 text-[11px] bg-white border border-amber-300 text-amber-800 px-2 py-0.5 rounded-md font-semibold">
                    Day {d}: {bName}
                  </span>
                );
              })}
            </div>
            <p>
              Would you like to overwrite all selected days, or only select the empty days?
            </p>
          </div>
        ),
        confirmText: "Overwrite All",
        secondaryText: "Only Select Empty Days",
        onSecondary: () => {
          const emptyDays = candidates.filter(d => !occupiedDays.includes(d));
          setCopyBowlModal(prev => ({ ...prev, targetDays: emptyDays }));
          setOverwriteConfirm(prev => ({ ...prev, isOpen: false }));
        },
        onConfirm: () => {
          setCopyBowlModal(prev => ({ ...prev, targetDays: candidates }));
          setOverwriteConfirm(prev => ({ ...prev, isOpen: false }));
        }
      });
      return;
    }

    setCopyBowlModal(prev => ({ ...prev, targetDays: candidates }));
  };

  const handleToggleCopyEntireDay = (dayNum: number) => {
    const isSelected = copyDayModal.targetDays.includes(dayNum);
    if (isSelected) {
      setCopyDayModal(prev => ({
        ...prev,
        targetDays: prev.targetDays.filter(d => d !== dayNum)
      }));
      return;
    }

    const occupiedSlots = mealSlots.filter(s => matrix[`${dayNum}-${s.toLowerCase()}`]?.ulid);
    const hasData = occupiedSlots.length > 0;

    if (hasData) {
      setOverwriteConfirm({
        isOpen: true,
        title: `Overwrite Day ${dayNum}?`,
        message: (
          <div className="space-y-2 text-sm text-neutral-600">
            <p>
              Day <span className="font-bold text-neutral-900">{dayNum}</span> already has <span className="font-bold text-amber-600">{occupiedSlots.length} meal(s)</span> assigned:
            </p>
            <div className="space-y-1 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-semibold">
              {occupiedSlots.map(s => {
                const m = matrix[`${dayNum}-${s.toLowerCase()}`];
                return (
                  <div key={s} className="flex justify-between items-center">
                    <span className="uppercase text-[10px] text-neutral-500 font-bold">{s}:</span>
                    <span>{m?.name}</span>
                  </div>
                );
              })}
            </div>
            <p>
              Are you sure you want to select Day {dayNum} and replace its meals with Day {copyDayModal.sourceDay}?
            </p>
          </div>
        ),
        confirmText: `Yes, Overwrite Day ${dayNum}`,
        onConfirm: () => {
          setCopyDayModal(prev => ({
            ...prev,
            targetDays: [...prev.targetDays, dayNum]
          }));
          setOverwriteConfirm(prev => ({ ...prev, isOpen: false }));
        }
      });
      return;
    }

    setCopyDayModal(prev => ({
      ...prev,
      targetDays: [...prev.targetDays, dayNum]
    }));
  };

  const handleBulkSelectCopyDay = (filterType: "all" | "odd" | "even") => {
    const candidates = Array.from({ length: days }, (_, idx) => idx + 1).filter(d => {
      if (d === copyDayModal.sourceDay) return false;
      if (filterType === "odd") return d % 2 !== 0;
      if (filterType === "even") return d % 2 === 0;
      return true;
    });

    const occupiedDays = candidates.filter(d => {
      return mealSlots.some(s => matrix[`${d}-${s.toLowerCase()}`]?.ulid);
    });

    if (occupiedDays.length > 0) {
      setOverwriteConfirm({
        isOpen: true,
        title: `Some Selected Days Already Have Meals`,
        message: (
          <div className="space-y-3 text-sm text-neutral-600">
            <p>
              <span className="font-bold text-amber-600">{occupiedDays.length}</span> of the {candidates.length} selected days already have meals assigned ({occupiedDays.map(d => `Day ${d}`).join(", ")}).
            </p>
            <p>
              Would you like to overwrite all selected days, or only select empty days?
            </p>
          </div>
        ),
        confirmText: "Overwrite All",
        secondaryText: "Only Select Empty Days",
        onSecondary: () => {
          const emptyDays = candidates.filter(d => !occupiedDays.includes(d));
          setCopyDayModal(prev => ({ ...prev, targetDays: emptyDays }));
          setOverwriteConfirm(prev => ({ ...prev, isOpen: false }));
        },
        onConfirm: () => {
          setCopyDayModal(prev => ({ ...prev, targetDays: candidates }));
          setOverwriteConfirm(prev => ({ ...prev, isOpen: false }));
        }
      });
      return;
    }

    setCopyDayModal(prev => ({ ...prev, targetDays: candidates }));
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
                  <td className="py-4 px-4 border-b border-neutral-100 font-bold text-neutral-700 whitespace-nowrap">
                    <div className="flex flex-col items-start gap-1">
                      <span>Day {i + 1}</span>
                      <button
                        type="button"
                        title={`Copy Day ${i + 1} meals to other days`}
                        onClick={() => handleOpenCopyDay(i + 1)}
                        className="text-[10px] font-bold text-[#6A0FAD] hover:bg-[#6A0FAD]/10 px-2 py-0.5 rounded flex items-center gap-1 border border-[#6A0FAD]/20 transition-colors"
                      >
                        <Copy className="w-2.5 h-2.5" />
                        Copy Day
                      </button>
                    </div>
                  </td>
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
                            <div className="flex items-center justify-between px-1 gap-1">
                              {cell.is_customized ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#6A0FAD] bg-purple-100 px-1.5 py-0.5 rounded truncate max-w-[85px]">
                                  <Sparkles className="w-2.5 h-2.5 shrink-0" />
                                  Custom {cell.custom_price ? `(₹${cell.custom_price})` : ""}
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium text-neutral-400">Master Recipe</span>
                              )}

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  title="Copy bowl to other days"
                                  onClick={() => handleOpenCopyBowl(i + 1, slot, cell)}
                                  className="text-[11px] font-bold text-neutral-600 hover:text-[#6A0FAD] hover:bg-neutral-100 px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors"
                                >
                                  <Copy className="w-3 h-3" />
                                  Copy
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenCustomizer(i + 1, slot)}
                                  disabled={isLoadingBowlRecipe}
                                  className="text-[11px] font-bold text-[#6A0FAD] hover:text-[#5a0c96] hover:bg-purple-50 px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors"
                                >
                                  <SlidersHorizontal className="w-3 h-3" />
                                  Customize
                                </button>
                              </div>
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

      {/* Copy Bowl Modal */}
      {copyBowlModal.isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setCopyBowlModal(prev => ({ ...prev, isOpen: false }))}
        >
          <div 
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-neutral-100 p-6 flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div>
                <h3 className="text-lg font-black text-neutral-900 flex items-center gap-2">
                  <Copy className="w-5 h-5 text-[#6A0FAD]" />
                  Copy Bowl to Other Days
                </h3>
                <p className="text-xs text-neutral-500 font-medium mt-0.5">
                  Replicate <span className="font-bold text-neutral-800">{copyBowlModal.bowlName}</span> ({copyBowlModal.sourceSlot})
                  {copyBowlModal.cell?.is_customized ? " with custom recipe" : ""}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setCopyBowlModal(prev => ({ ...prev, isOpen: false }))}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Select Target Days:</span>
                <div className="flex gap-1.5 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => handleBulkSelectCopyBowl("all")}
                    className="text-[#6A0FAD] hover:underline px-1 py-0.5"
                  >
                    All
                  </button>
                  <span className="text-neutral-300">•</span>
                  <button
                    type="button"
                    onClick={() => setCopyBowlModal(prev => ({ ...prev, targetDays: [] }))}
                    className="text-neutral-500 hover:underline px-1 py-0.5"
                  >
                    Clear
                  </button>
                  <span className="text-neutral-300">•</span>
                  <button
                    type="button"
                    onClick={() => handleBulkSelectCopyBowl("odd")}
                    className="text-neutral-600 hover:underline px-1 py-0.5"
                  >
                    Odd
                  </button>
                  <span className="text-neutral-300">•</span>
                  <button
                    type="button"
                    onClick={() => handleBulkSelectCopyBowl("even")}
                    className="text-neutral-600 hover:underline px-1 py-0.5"
                  >
                    Even
                  </button>
                </div>
              </div>

              {/* Status Legend */}
              <div className="flex items-center gap-3 text-[10px] font-bold text-neutral-400 mb-3 bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-100">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-300"></span> Empty
                </span>
                <span className="flex items-center gap-1 text-amber-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Has data
                </span>
                <span className="flex items-center gap-1 text-[#6A0FAD]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6A0FAD]"></span> Selected
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Array.from({ length: days }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const isSource = dayNum === copyBowlModal.sourceDay;
                  const isSelected = copyBowlModal.targetDays.includes(dayNum);
                  const key = `${dayNum}-${copyBowlModal.sourceSlot.toLowerCase()}`;
                  const existingCell = matrix[key];
                  const hasData = Boolean(existingCell && existingCell.ulid);

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      disabled={isSource}
                      onClick={() => handleToggleCopyBowlDay(dayNum)}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all min-h-[48px] text-left ${
                        isSource 
                          ? "bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed opacity-60" 
                          : isSelected 
                            ? "bg-[#6A0FAD] text-white border-[#6A0FAD] shadow-sm" 
                            : hasData
                              ? "bg-amber-50/70 text-neutral-800 border-amber-300 hover:border-amber-400 hover:bg-amber-100/60"
                              : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      <div className="flex flex-col items-start min-w-0 pr-1 truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="leading-tight">Day {dayNum}</span>
                          {hasData && !isSource && (
                            <span 
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? "bg-amber-300" : "bg-amber-500"}`} 
                              title="Already has a bowl assigned"
                            />
                          )}
                        </div>
                        {hasData && !isSource && (
                          <span 
                            className={`text-[9px] font-semibold truncate max-w-[65px] leading-tight mt-0.5 ${
                              isSelected ? "text-purple-200" : "text-amber-700 font-bold"
                            }`} 
                            title={existingCell.name}
                          >
                            {existingCell.name}
                          </span>
                        )}
                        {!hasData && !isSource && (
                          <span className={`text-[9px] leading-tight mt-0.5 font-normal ${isSelected ? "text-purple-200" : "text-neutral-400"}`}>
                            Empty
                          </span>
                        )}
                      </div>

                      {isSource ? (
                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-neutral-400 shrink-0">Src</span>
                      ) : isSelected ? (
                        <Check className="w-4 h-4 text-white shrink-0" />
                      ) : hasData ? (
                        <span className="text-[8px] uppercase tracking-wider font-bold text-amber-700 bg-amber-200/70 px-1 py-0.5 rounded shrink-0">
                          Filled
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-neutral-500">
                  {copyBowlModal.targetDays.length} day{copyBowlModal.targetDays.length === 1 ? "" : "s"} selected
                </span>
                {(() => {
                  const overwriteCount = copyBowlModal.targetDays.filter(d => Boolean(matrix[`${d}-${copyBowlModal.sourceSlot.toLowerCase()}`]?.ulid)).length;
                  if (overwriteCount > 0) {
                    return (
                      <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="w-3 h-3 shrink-0" /> {overwriteCount} will overwrite existing bowl
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCopyBowlModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={copyBowlModal.targetDays.length === 0}
                  onClick={handleApplyCopyBowl}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#6A0FAD] hover:bg-[#5a0c96] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shadow-sm"
                >
                  Apply Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copy Entire Day Modal */}
      {copyDayModal.isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setCopyDayModal(prev => ({ ...prev, isOpen: false }))}
        >
          <div 
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-neutral-100 p-6 flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div>
                <h3 className="text-lg font-black text-neutral-900 flex items-center gap-2">
                  <Copy className="w-5 h-5 text-[#6A0FAD]" />
                  Copy Day {copyDayModal.sourceDay} to Other Days
                </h3>
                <p className="text-xs text-neutral-500 font-medium mt-0.5">
                  Copies all meals ({mealSlots.join(", ")}) and customized recipes from Day {copyDayModal.sourceDay}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setCopyDayModal(prev => ({ ...prev, isOpen: false }))}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Select Target Days:</span>
                <div className="flex gap-1.5 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => handleBulkSelectCopyDay("all")}
                    className="text-[#6A0FAD] hover:underline px-1 py-0.5"
                  >
                    All
                  </button>
                  <span className="text-neutral-300">•</span>
                  <button
                    type="button"
                    onClick={() => setCopyDayModal(prev => ({ ...prev, targetDays: [] }))}
                    className="text-neutral-500 hover:underline px-1 py-0.5"
                  >
                    Clear
                  </button>
                  <span className="text-neutral-300">•</span>
                  <button
                    type="button"
                    onClick={() => handleBulkSelectCopyDay("odd")}
                    className="text-neutral-600 hover:underline px-1 py-0.5"
                  >
                    Odd
                  </button>
                  <span className="text-neutral-300">•</span>
                  <button
                    type="button"
                    onClick={() => handleBulkSelectCopyDay("even")}
                    className="text-neutral-600 hover:underline px-1 py-0.5"
                  >
                    Even
                  </button>
                </div>
              </div>

              {/* Status Legend */}
              <div className="flex items-center gap-3 text-[10px] font-bold text-neutral-400 mb-3 bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-100">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-300"></span> Empty
                </span>
                <span className="flex items-center gap-1 text-amber-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Has data
                </span>
                <span className="flex items-center gap-1 text-[#6A0FAD]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6A0FAD]"></span> Selected
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Array.from({ length: days }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const isSource = dayNum === copyDayModal.sourceDay;
                  const isSelected = copyDayModal.targetDays.includes(dayNum);
                  const occupiedSlots = mealSlots.filter(s => matrix[`${dayNum}-${s.toLowerCase()}`]?.ulid);
                  const hasData = occupiedSlots.length > 0;

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      disabled={isSource}
                      onClick={() => handleToggleCopyEntireDay(dayNum)}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all min-h-[48px] text-left ${
                        isSource 
                          ? "bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed opacity-60" 
                          : isSelected 
                            ? "bg-[#6A0FAD] text-white border-[#6A0FAD] shadow-sm" 
                            : hasData
                              ? "bg-amber-50/70 text-neutral-800 border-amber-300 hover:border-amber-400 hover:bg-amber-100/60"
                              : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      <div className="flex flex-col items-start min-w-0 pr-1 truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="leading-tight">Day {dayNum}</span>
                          {hasData && !isSource && (
                            <span 
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? "bg-amber-300" : "bg-amber-500"}`} 
                              title="Already has meals assigned"
                            />
                          )}
                        </div>
                        {hasData && !isSource && (
                          <span 
                            className={`text-[9px] font-semibold truncate max-w-[65px] leading-tight mt-0.5 ${
                              isSelected ? "text-purple-200" : "text-amber-700 font-bold"
                            }`} 
                            title={`${occupiedSlots.length} meal(s) assigned`}
                          >
                            {occupiedSlots.length} meal{occupiedSlots.length > 1 ? "s" : ""}
                          </span>
                        )}
                        {!hasData && !isSource && (
                          <span className={`text-[9px] leading-tight mt-0.5 font-normal ${isSelected ? "text-purple-200" : "text-neutral-400"}`}>
                            Empty
                          </span>
                        )}
                      </div>

                      {isSource ? (
                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-neutral-400 shrink-0">Src</span>
                      ) : isSelected ? (
                        <Check className="w-4 h-4 text-white shrink-0" />
                      ) : hasData ? (
                        <span className="text-[8px] uppercase tracking-wider font-bold text-amber-700 bg-amber-200/70 px-1 py-0.5 rounded shrink-0">
                          Filled
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-neutral-500">
                  {copyDayModal.targetDays.length} day{copyDayModal.targetDays.length === 1 ? "" : "s"} selected
                </span>
                {(() => {
                  const overwriteCount = copyDayModal.targetDays.filter(d => mealSlots.some(s => matrix[`${d}-${s.toLowerCase()}`]?.ulid)).length;
                  if (overwriteCount > 0) {
                    return (
                      <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="w-3 h-3 shrink-0" /> {overwriteCount} will overwrite existing meals
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCopyDayModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={copyDayModal.targetDays.length === 0}
                  onClick={handleApplyCopyDay}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#6A0FAD] hover:bg-[#5a0c96] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shadow-sm"
                >
                  Apply to Selected Days
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overwrite Confirmation Dialog */}
      {overwriteConfirm.isOpen && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setOverwriteConfirm(prev => ({ ...prev, isOpen: false }))}
        >
          <div 
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-neutral-100 p-6 flex flex-col animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-black text-neutral-900 leading-tight">
                  {overwriteConfirm.title}
                </h3>
                <div className="mt-2">{overwriteConfirm.message}</div>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOverwriteConfirm(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              {overwriteConfirm.secondaryText && overwriteConfirm.onSecondary && (
                <button
                  type="button"
                  onClick={overwriteConfirm.onSecondary}
                  className="px-4 py-2 text-xs font-bold text-[#6A0FAD] bg-[#6A0FAD]/10 hover:bg-[#6A0FAD]/20 rounded-xl transition-colors"
                >
                  {overwriteConfirm.secondaryText}
                </button>
              )}
              <button
                type="button"
                onClick={overwriteConfirm.onConfirm}
                className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shadow-sm"
              >
                {overwriteConfirm.confirmText || "Yes, Overwrite"}
              </button>
            </div>
          </div>
        </div>
      )}

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
