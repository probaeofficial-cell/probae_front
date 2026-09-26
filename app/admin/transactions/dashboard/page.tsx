"use client";

import { BowlLoader } from "@/components/admin/BowlLoader";
import { useState, useEffect } from "react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { TrendingUp, TrendingDown, IndianRupee, Wallet } from "lucide-react";
import { endpoints } from "@/lib/apiService";

export default function TransactionsDashboardPage() {
  const [financials, setFinancials] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Date context
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  
  const [activeTab, setActiveTab] = useState("Today");

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const data = await endpoints.dashboard.financials({ start_date: startDate, end_date: endDate });
        setFinancials(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [startDate, endDate]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const d = new Date();
    if (tab === "Today") {
      const t = d.toISOString().slice(0,10);
      setStartDate(t); setEndDate(t);
    } else if (tab === "This Week") {
      const first = d.getDate() - d.getDay(); 
      const firstDay = new Date(d.setDate(first)).toISOString().slice(0,10);
      const lastDay = new Date(d.setDate(first + 6)).toISOString().slice(0,10);
      setStartDate(firstDay); setEndDate(lastDay);
    } else if (tab === "This Month") {
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
      setStartDate(firstDay); setEndDate(lastDay);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-y-auto">
      <Header />
      <div className="mt-4 flex-1 flex flex-col min-h-0">
        <Breadcrumbs segments={["Transactions", "Dashboard"]} />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Financial Dashboard</h1>
          
          <div className="flex bg-white p-1 rounded-xl border border-neutral-200">
            {["Today", "This Week", "This Month", "Custom"].map(t => (
              <button 
                key={t}
                onClick={() => handleTabChange(t)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === t ? "bg-[#6A0FAD] text-white" : "text-neutral-500 hover:text-neutral-900"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "Custom" && (
          <div className="flex items-center gap-4 mb-8 p-4 bg-white border border-neutral-200 rounded-2xl">
            <div>
              <label className="block text-xs font-bold text-neutral-500 mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-neutral-900 bg-white border border-neutral-200 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-[#6A0FAD]"/>
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-500 mb-1">End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-neutral-900 bg-white border border-neutral-200 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-[#6A0FAD]"/>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="py-12 flex justify-center"><BowlLoader className="w-10 h-10 text-[#6A0FAD]" /></div>
        ) : financials ? (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="group bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm hover:shadow-lg hover:border-neutral-300 hover:-translate-y-1 transition-all duration-300 cursor-default">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600 transition-transform duration-300 group-hover:scale-110"><IndianRupee className="w-6 h-6" /></div>
              </div>
              <p className="text-sm font-bold text-neutral-500 uppercase">Total Income</p>
              <h2 className="text-3xl font-black text-neutral-900 mt-1">₹{financials.total_income.toFixed(2)}</h2>
            </div>
            
            <div className="group bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm hover:shadow-lg hover:border-neutral-300 hover:-translate-y-1 transition-all duration-300 cursor-default">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 transition-transform duration-300 group-hover:scale-110"><TrendingUp className="w-6 h-6" /></div>
              </div>
              <p className="text-sm font-bold text-neutral-500 uppercase">Sales / Revenue</p>
              <h2 className="text-3xl font-black text-neutral-900 mt-1">₹{financials.total_revenue.toFixed(2)}</h2>
            </div>
            
            <div className="group bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm hover:shadow-lg hover:border-neutral-300 hover:-translate-y-1 transition-all duration-300 cursor-default">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600 transition-transform duration-300 group-hover:scale-110"><TrendingDown className="w-6 h-6" /></div>
              </div>
              <p className="text-sm font-bold text-neutral-500 uppercase">Expenses</p>
              <h2 className="text-3xl font-black text-neutral-900 mt-1">₹{financials.total_expenses.toFixed(2)}</h2>
            </div>

            <div className={`group rounded-3xl p-6 shadow-sm border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-default ${financials.net_profit >= 0 ? "bg-green-600 border-green-700 hover:bg-green-500 text-white" : "bg-red-600 border-red-700 hover:bg-red-500 text-white"}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-110"><Wallet className="w-6 h-6" /></div>
              </div>
              <p className="text-sm font-bold uppercase text-white/80">Net Profit</p>
              <h2 className="text-3xl font-black mt-1">₹{financials.net_profit.toFixed(2)}</h2>
            </div>
          </div>

          {/* Financial Graph (SVG Line Chart) */}
          {financials?.chart_data && financials.chart_data.length > 0 && (
            <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-[0_0_15px_rgba(0,0,0,0.02)] mt-8 mb-16 animate-in fade-in zoom-in duration-300">
              <h2 className="text-xl font-black text-neutral-900 mb-6">Income vs Expenses (Daily Breakdown)</h2>
              <div className="h-64 relative px-2 mb-8 w-full">
                {/* Y-Axis Grid Lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8">
                  <div className="border-t border-neutral-100 w-full"></div>
                  <div className="border-t border-neutral-100 w-full"></div>
                  <div className="border-t border-neutral-100 w-full"></div>
                  <div className="border-t border-neutral-100 w-full"></div>
                </div>
                
                {(() => {
                  const chartData = financials.chart_data;
                  const maxVal = Math.max(1, ...chartData.flatMap((d: any) => [d.income, d.expenses]));
                  const len = chartData.length;
                  
                  // Helper to get coordinates
                  const getX = (index: number) => len === 1 ? 50 : (index / (len - 1)) * 100;
                  const getY = (val: number) => 100 - ((val / maxVal) * 90); // 10% padding top
                  
                  const incomePoints = chartData.map((d: any, i: number) => `${getX(i)},${getY(d.income)}`).join(" ");
                  const expensePoints = chartData.map((d: any, i: number) => `${getX(i)},${getY(d.expenses)}`).join(" ");
                  
                  return (
                    <div className="absolute inset-0 pb-8 w-full h-full z-10">
                      <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                        <style>{`
                          @keyframes drawLine {
                            from { stroke-dasharray: 500; stroke-dashoffset: 500; }
                            to { stroke-dasharray: 500; stroke-dashoffset: 0; }
                          }
                          .animate-draw {
                            animation: drawLine 1.5s ease-out forwards;
                          }
                        `}</style>
                        {/* Income Line */}
                        <polyline points={incomePoints} fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="drop-shadow-[0_4px_6px_rgba(74,222,128,0.3)] animate-draw" />
                        {/* Expense Line */}
                        <polyline points={expensePoints} fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="drop-shadow-[0_4px_6px_rgba(248,113,113,0.3)] animate-draw" style={{ animationDelay: '200ms' }} />
                      </svg>
                      
                      {/* Interaction Overlay (Hover regions) */}
                      <div className="absolute inset-0 flex w-full h-full">
                        {chartData.map((d: any, i: number) => (
                          <div key={i} className="flex-1 h-full group relative flex justify-center cursor-crosshair">
                            {/* Vertical Hover Line */}
                            <div className="w-[1px] h-full bg-neutral-200 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            
                            {/* Points on lines */}
                            <div className="absolute w-3 h-3 bg-white border-2 border-[#4ade80] rounded-full opacity-0 group-hover:opacity-100 shadow-sm transition-all z-20 pointer-events-none" style={{ left: '50%', top: `${getY(d.income)}%`, transform: 'translate(-50%, -50%)' }}></div>
                            <div className="absolute w-3 h-3 bg-white border-2 border-[#f87171] rounded-full opacity-0 group-hover:opacity-100 shadow-sm transition-all z-20 pointer-events-none" style={{ left: '50%', top: `${getY(d.expenses)}%`, transform: 'translate(-50%, -50%)' }}></div>
                            
                            {/* Tooltip */}
                            <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900 text-white text-xs font-bold px-3 py-2 rounded-lg pointer-events-none whitespace-nowrap shadow-xl z-30 text-center">
                              {new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}<br/>
                              <span className="text-green-400">Income: ₹{d.income.toFixed(2)}</span><br/>
                              <span className="text-red-400">Expense: ₹{d.expenses.toFixed(2)}</span>
                            </div>
                            
                            {/* X-Axis Label */}
                            <span className="absolute -bottom-8 text-[10px] font-bold text-neutral-400 truncate w-full text-center">
                              {new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="flex items-center justify-center gap-6 pt-10 border-t border-neutral-100 mt-4">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-500"><div className="w-3 h-3 rounded-full bg-green-400"></div> Income (Deposits)</div>
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-500"><div className="w-3 h-3 rounded-full bg-red-400"></div> Expenses (Manual + Raw Materials)</div>
              </div>
            </div>
          )}
          </>
        ) : null}
      </div>
      </div>
    </div>
  );
}
