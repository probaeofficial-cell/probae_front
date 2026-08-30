"use client";
import { useState } from "react";
import { Calendar } from "lucide-react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { KitchenPrepTab } from "../../orders/components/KitchenPrepTab";

export default function PrepPage() {
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split("T")[0]);

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        <Header />
        <Breadcrumbs segments={["Admin", "KDS", "Kitchen Prep"]} />
        <div className="mt-4 flex-1 flex flex-col min-h-0">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
            <div>
              <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Kitchen Prep</h1>
              <p className="text-neutral-500 font-medium mt-1">Aggregate component prep list for daily operations</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-white border border-neutral-200 rounded-xl px-3 py-2 shadow-sm">
                <Calendar className="w-4 h-4 text-neutral-400 mr-2" />
                <input 
                  type="date" 
                  value={targetDate} 
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="bg-transparent text-sm font-bold text-neutral-700 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 pb-10">
            <KitchenPrepTab targetDate={targetDate} />
          </div>
        </div>
      </div>
    </div>
  );
}
