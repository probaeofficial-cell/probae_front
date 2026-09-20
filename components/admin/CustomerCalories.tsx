import { useState, useEffect } from "react";
import { endpoints } from "@/lib/apiService";
import { BowlLoader } from "./BowlLoader";
import { LegacyOrderModal } from "./LegacyModals";

export function CustomerCalories({ customerUlid }: { customerUlid: string }) {
  const [stats, setStats] = useState({ total: 0, today: 0, this_week: 0, this_month: 0 });
  const [log, setLog] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterDate, setFilterDate] = useState("");
  const [showLegacyOrderModal, setShowLegacyOrderModal] = useState(false);

  const fetchCalories = async () => {
    setIsLoading(true);
    try {
      const res: any = await endpoints.customers.getCalories(customerUlid, filterDate);
      if (res.success) {
        setStats(res.stats);
        setLog(res.log);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCalories();
  }, [customerUlid, filterDate]);

  if (isLoading && log.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-4">
        <BowlLoader className="w-8 h-8 text-[#6A0FAD]" />
        <span className="text-neutral-500 font-medium">Loading calories...</span>
      </div>
    );
  }

  return (
    <>
      {showLegacyOrderModal && (
        <LegacyOrderModal 
          customerUlid={customerUlid} 
          onClose={() => setShowLegacyOrderModal(false)}
          onSuccess={() => { setShowLegacyOrderModal(false); fetchCalories(); }}
        />
      )}
      
      <div className="animate-in fade-in zoom-in-95 duration-300">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-3xl border border-neutral-200 shadow-sm flex flex-col justify-center">
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Total Calories</p>
            <p className="text-2xl font-black text-neutral-900">{Math.round(stats.total).toLocaleString()} <span className="text-sm text-neutral-400 font-medium">kcal</span></p>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-neutral-200 shadow-sm flex flex-col justify-center">
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Today</p>
            <p className="text-2xl font-black text-[#6A0FAD]">{Math.round(stats.today).toLocaleString()} <span className="text-sm font-medium">kcal</span></p>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-neutral-200 shadow-sm flex flex-col justify-center">
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">This Week</p>
            <p className="text-2xl font-black text-neutral-900">{Math.round(stats.this_week).toLocaleString()} <span className="text-sm text-neutral-400 font-medium">kcal</span></p>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-neutral-200 shadow-sm flex flex-col justify-center">
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">This Month</p>
            <p className="text-2xl font-black text-neutral-900">{Math.round(stats.this_month).toLocaleString()} <span className="text-sm text-neutral-400 font-medium">kcal</span></p>
          </div>
        </div>

        {/* Filter and Log */}
        <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
            <h3 className="font-bold text-neutral-900 text-lg">Calorie Log</h3>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowLegacyOrderModal(true)}
                className="px-4 py-2 bg-[#6A0FAD] text-white text-sm font-bold rounded-xl hover:bg-[#5b0c96] transition-colors"
              >
                Log Past Meal
              </button>
              <input
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="bg-white border border-neutral-200 rounded-xl px-4 py-2 text-sm font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-neutral-50/50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Meal</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Slot</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Calories</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Macros (P/C/F)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {log.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-neutral-400 font-medium text-sm">
                      {isLoading ? "Fetching logs..." : "No calorie logs found."}
                    </td>
                  </tr>
                ) : (
                  log.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-neutral-900">{entry.date}</td>
                      <td className="px-6 py-4 text-sm font-medium text-neutral-900">{entry.bowl_name}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-[#6A0FAD]/10 text-[#6A0FAD] text-xs font-bold rounded-full">
                          {entry.meal_slot}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-black text-[#6A0FAD]">{Math.round(entry.calories || 0)} kcal</td>
                      <td className="px-6 py-4 text-xs font-bold text-neutral-500">
                        <span className="text-red-500">{Math.round(entry.macros.protein || 0)}g</span> / <span className="text-blue-500">{Math.round(entry.macros.carbs || 0)}g</span> / <span className="text-yellow-500">{Math.round(entry.macros.fat || 0)}g</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
