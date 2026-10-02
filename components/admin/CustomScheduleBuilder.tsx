"use client";
import React, { useState, useEffect } from "react";
import { endpoints } from "@/lib/apiService";
import AsyncBowlSelect from "@/components/admin/AsyncBowlSelect";
import { Repeat } from "lucide-react";

interface CustomScheduleBuilderProps {
  days: number;
  mealSlots: string[];
  onChange: (schedule: any[]) => void;
  initialSchedule?: any[];
}

export function CustomScheduleBuilder({ days, mealSlots, onChange, initialSchedule }: CustomScheduleBuilderProps) {
  const [matrix, setMatrix] = useState<Record<string, { ulid: string, name: string }>>({});

  useEffect(() => {
    if (initialSchedule && initialSchedule.length > 0) {
      const initMat: Record<string, { ulid: string, name: string }> = {};
      initialSchedule.forEach(item => {
        initMat[`${item.day_index}-${item.meal_slot.toLowerCase()}`] = { 
          ulid: item.bowl_ulid, 
          name: item.bowl_name || "Unknown Bowl" 
        };
      });
      setMatrix(initMat);
    }
  }, [initialSchedule]);

  const handleSelect = (day: number, slot: string, bowl: any) => {
    if (!bowl) return;
    const newMat = { ...matrix, [`${day}-${slot.toLowerCase()}`]: { ulid: bowl.ulid, name: bowl.name } };
    setMatrix(newMat);
    
    const arr: any[] = [];
    for (let d = 1; d <= days; d++) {
      mealSlots.forEach(s => {
        const key = `${d}-${s.toLowerCase()}`;
        if (newMat[key]) {
          arr.push({ 
            day_index: d, 
            meal_slot: s.toLowerCase(), 
            bowl_ulid: newMat[key].ulid,
            bowl_name: newMat[key].name 
          });
        }
      });
    }
    onChange(arr);
  };

  const [isAutoFilling, setIsAutoFilling] = useState(false);

  const handleAutoFill = async () => {
    setIsAutoFilling(true);
    try {
      // 1. Fetch categories
      const catRes: any = await endpoints.mealCategories.getMealCategories(1, 100);
      const categories = catRes.items || [];
      
      const newMat = { ...matrix };

      // 2. For each slot, fetch bowls and fill
      for (const slot of mealSlots) {
        const slotLower = slot.toLowerCase();
        // find category
        const cat = categories.find((c: any) => (c.slug || c.name).toLowerCase() === slotLower);
        let bowlsForSlot: any[] = [];
        
        if (cat) {
          const bRes: any = await endpoints.bowls.getBowls(1, 100, undefined, undefined, cat.ulid);
          bowlsForSlot = bRes.items || [];
        } else {
          // fallback if no category match
          const bRes: any = await endpoints.bowls.getBowls(1, 100);
          bowlsForSlot = bRes.items || [];
        }

        if (bowlsForSlot.length > 0) {
          for (let d = 1; d <= days; d++) {
            const bowl = bowlsForSlot[(d - 1) % bowlsForSlot.length];
            newMat[`${d}-${slotLower}`] = { ulid: bowl.ulid, name: bowl.name };
          }
        }
      }
      
      setMatrix(newMat);
      
      const arr: any[] = [];
      for (let d = 1; d <= days; d++) {
        mealSlots.forEach(s => {
          const key = `${d}-${s.toLowerCase()}`;
          if (newMat[key]) {
            arr.push({ 
              day_index: d, 
              meal_slot: s.toLowerCase(), 
              bowl_ulid: newMat[key].ulid,
              bowl_name: newMat[key].name 
            });
          }
        });
      }
      onChange(arr);
    } catch (err) {
      console.error("Failed to auto fill", err);
      alert("Failed to auto fill based on categories.");
    } finally {
      setIsAutoFilling(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-[#6A0FAD]/20 p-6 shadow-sm overflow-hidden mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-black text-[#6A0FAD]">Bespoke Blueprint Builder</h3>
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
        <table className="w-full text-left border-collapse min-w-[600px]">
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
                {mealSlots.map(slot => (
                  <td key={slot} className="py-4 px-4 border-b border-neutral-100">
                    <div className="w-[200px] min-w-[200px]">
                      <AsyncBowlSelect
                        value={matrix[`${i + 1}-${slot.toLowerCase()}`]?.ulid || ""}
                        onChange={(ulid) => {}}
                        onSelectBowl={(bowl) => handleSelect(i + 1, slot, bowl)}
                        selectedBowl={matrix[`${i + 1}-${slot.toLowerCase()}`] ? { ulid: matrix[`${i + 1}-${slot.toLowerCase()}`].ulid, name: matrix[`${i + 1}-${slot.toLowerCase()}`].name } : undefined}
                      />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-neutral-500 font-medium mt-2">* Ensure all slots are filled to accurately calculate the pricing and macros.</p>
    </div>
  );
}
