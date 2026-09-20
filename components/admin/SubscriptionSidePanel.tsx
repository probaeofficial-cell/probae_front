
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, Calendar, Edit3, PauseCircle, RefreshCw, CheckCircle2, Clock } from "lucide-react";
import { api } from "@/lib/apiService";
import { BowlLoader } from "@/components/admin/BowlLoader";

export function SubscriptionSidePanel({ subscription, onClose }: { subscription: any, onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"overview" | "schedule">("overview");
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const s = subscription;
  const progressPct = s.progress.total > 0 ? Math.round((s.progress.done / s.progress.total) * 100) : 0;
  
  useEffect(() => {
    if (activeTab === "schedule") {
      loadSchedule();
    }
  }, [activeTab, s.customer.ulid]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/customers/${s.customer.ulid}/meal-schedule`);
      setSchedule(res as any);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden sticky top-8">
      {/* Header */}
      <div className="p-6 border-b flex justify-between items-start">
        <div className="flex gap-4 items-center">
          <div className="w-12 h-12 rounded-full bg-neutral-200 overflow-hidden relative">
            {s.customer.image ? (
              <Image src={`/uploads/${s.customer.image}`} alt="" fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#6A0FAD] font-bold text-lg bg-[#6A0FAD]/10">
                {s.customer.name.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-black text-black">{s.customer.name}</h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                s.status === 'Active' ? 'bg-green-100 text-green-700' :
                s.status === 'Ending Soon' ? 'bg-orange-100 text-orange-700' :
                'bg-neutral-100 text-neutral-700'
              }`}>
                • {s.status}
              </span>
            </div>
            <p className="text-xs text-neutral-500 font-medium">#{s.customer.ulid.slice(-4)} • {s.customer.phone}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full text-neutral-400">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-100">
        <button 
          onClick={() => setActiveTab("overview")}
          className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-colors ${activeTab === 'overview' ? 'border-[#6A0FAD] text-[#6A0FAD]' : 'border-transparent text-neutral-400 hover:text-neutral-600'}`}
        >
          OVERVIEW
        </button>
        <button 
          onClick={() => setActiveTab("schedule")}
          className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-colors ${activeTab === 'schedule' ? 'border-[#6A0FAD] text-[#6A0FAD]' : 'border-transparent text-neutral-400 hover:text-neutral-600'}`}
        >
          MEAL SCHEDULE
        </button>
      </div>
      
      <div className="p-6 overflow-y-auto transition-all duration-300 ease-in-out animate-in fade-in duration-300" style={{ maxHeight: "calc(100vh - 300px)" }}>
        {activeTab === "overview" ? (
          <>
            {/* Blueprint */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Subscription Blueprint</h3>
                <span className="bg-[#6A0FAD]/10 text-[#6A0FAD] px-3 py-1 rounded-full text-xs font-bold">
                  {s.plan.name} ({s.plan.total_bowls} Bowls)
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                  <p className="text-xs text-neutral-400 font-bold mb-1">Meal Slots</p>
                  <p className="text-sm font-black text-black">{s.plan.included_meal_slots.map((m:string)=>m.charAt(0).toUpperCase()+m.slice(1)).join(' + ')}</p>
                </div>
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                  <p className="text-xs text-neutral-400 font-bold mb-1">Est. Completion</p>
                  <p className="text-sm font-black text-black">{s.est_completion}</p>
                </div>
              </div>
            </div>
            
            {/* Progress Details */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Plan Progress Details</h3>
                <span className="text-[#6A0FAD] text-sm font-black">{progressPct}% Fulfilled</span>
              </div>
              <div className="w-full bg-neutral-200 h-2.5 rounded-full overflow-hidden flex mb-4">
                <div className="bg-[#6A0FAD] h-full" style={{ width: `${progressPct}%` }}></div>
                <div className="bg-green-400 h-full" style={{ width: `${s.progress.total > 0 ? (s.progress.left/s.progress.total)*100 : 0}%` }}></div>
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-[#6A0FAD]/10 p-2 rounded-lg text-center">
                  <p className="text-[10px] font-bold text-[#6A0FAD] mb-0.5 uppercase">Done</p>
                  <p className="text-sm font-black text-[#6A0FAD]">{s.progress.done}</p>
                </div>
                <div className="bg-green-100 p-2 rounded-lg text-center">
                  <p className="text-[10px] font-bold text-green-700 mb-0.5 uppercase">Left</p>
                  <p className="text-sm font-black text-green-700">{s.progress.left}</p>
                </div>
                <div className="bg-neutral-100 p-2 rounded-lg text-center">
                  <p className="text-[10px] font-bold text-neutral-500 mb-0.5 uppercase">Hold</p>
                  <p className="text-sm font-black text-neutral-600">{s.progress.hold}</p>
                </div>
                <div className="bg-red-50 p-2 rounded-lg text-center">
                  <p className="text-[10px] font-bold text-red-500 mb-0.5 uppercase">Disq.</p>
                  <p className="text-sm font-black text-red-600">{s.progress.disq}</p>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button className="flex items-center justify-center gap-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs py-3 rounded-xl transition-colors">
                <Edit3 className="w-4 h-4" /> Manage Plan
              </button>
              <button className="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs py-3 rounded-xl transition-colors">
                <PauseCircle className="w-4 h-4" /> Pause Plan
              </button>
            </div>
            <button disabled={s.status !== "Ending Soon" && s.progress.left > 0} className="w-full flex items-center justify-center gap-2 bg-[#6A0FAD] hover:bg-[#5a0c96] text-white font-bold text-sm py-3.5 rounded-xl transition-colors shadow-lg shadow-[#6A0FAD]/20 disabled:opacity-50 disabled:cursor-not-allowed">
              <RefreshCw className="w-4 h-4" /> Renew Subscription Plan
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-4">
            {loading ? (
              <div className="flex justify-center py-10"><BowlLoader /></div>
            ) : schedule.length === 0 ? (
              <p className="text-center text-sm text-neutral-400 py-10">No meals scheduled.</p>
            ) : (
              schedule.map((item, i) => (
                <div key={item.ulid} className="bg-white border rounded-xl p-4 shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-xs font-black text-black bg-neutral-100 px-2 py-1 rounded-md">Day {item.day_index}</span>
                    <span className="text-xs font-bold text-neutral-500 capitalize">{item.meal_slot}</span>
                    {item.status === 'PROCESSED' ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" /> Delivered</span>
                    ) : item.status === 'SKIPPED' ? (
                      <span className="text-[10px] font-bold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">Skipped</span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full"><Clock className="w-3 h-3" /> Pending</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {item.bowls.map((bowl: any, j: number) => (
                      <div key={j} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-neutral-100 relative overflow-hidden flex-shrink-0">
                          {bowl.image && <Image src={`/uploads/${bowl.image}`} alt="" fill className="object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-black truncate">{bowl.name}</p>
                          <p className="text-xs text-neutral-500">{bowl.calories} kcal</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
