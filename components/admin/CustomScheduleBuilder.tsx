"use client";
import React, { useState, useEffect } from "react";
import { endpoints } from "@/lib/apiService";

interface CustomScheduleBuilderProps {
  days: number;
  mealSlots: string[];
  onChange: (schedule: any[]) => void;
  initialSchedule?: any[];
}

export function CustomScheduleBuilder({ days, mealSlots, onChange, initialSchedule }: CustomScheduleBuilderProps) {
  const [bowls, setBowls] = useState<any[]>([]);
  const [matrix, setMatrix] = useState<Record<string, string>>({}); // "dayIndex-slot" -> "bowlUlid"

  useEffect(() => {
    const fetchBowls = async () => {
      try {
        const data = await endpoints.bowls.getBowls(1, 100);
        if (data.items) {
          setBowls(data.items);
        }
      } catch (err) {
        console.error("Failed to fetch bowls", err);
      }
    };
    fetchBowls();
  }, []);

  useEffect(() => {
    if (initialSchedule && initialSchedule.length > 0) {
      const initMat: Record<string, string> = {};
      initialSchedule.forEach(item => {
        initMat[`${item.day_index}-${item.meal_slot.toLowerCase()}`] = item.bowl_ulid;
      });
      setMatrix(initMat);
    }
  }, [initialSchedule]);

  const handleSelect = (day: number, slot: string, bowlUlid: string) => {
    const newMat = { ...matrix, [`${day}-${slot.toLowerCase()}`]: bowlUlid };
    setMatrix(newMat);
    
    // convert to array format
    const arr: any[] = [];
    for (let d = 1; d <= days; d++) {
      mealSlots.forEach(s => {
        const key = `${d}-${s.toLowerCase()}`;
        if (newMat[key]) {
          arr.push({ day_index: d, meal_slot: s.toLowerCase(), bowl_ulid: newMat[key] });
        }
      });
    }
    onChange(arr);
  };

  return (
    <div className="bg-white rounded-3xl border border-[#6A0FAD]/20 p-6 shadow-sm overflow-hidden mb-6">
      <h3 className="text-lg font-black text-[#6A0FAD] mb-4">Bespoke Blueprint Builder</h3>
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
                    <select
                      value={matrix[`${i + 1}-${slot.toLowerCase()}`] || ""}
                      onChange={(e) => handleSelect(i + 1, slot, e.target.value)}
                      className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#6A0FAD] focus:border-transparent font-medium"
                    >
                      <option value="" disabled>Select Bowl</option>
                      {bowls.map(b => (
                        <option key={b.ulid} value={b.ulid}>{b.name}</option>
                      ))}
                    </select>
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
