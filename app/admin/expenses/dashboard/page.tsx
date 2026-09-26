"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { BowlLoader } from "@/components/admin/BowlLoader";
import { endpoints } from "@/lib/apiService";
import { TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";

type CategoryMetric = {
  ulid: string;
  name: string;
  monthly_budget: number;
  day_total: number;
  week_total: number;
  month_total: number;
  period_total: number;
};

type ChartDataPoint = {
  date: string;
  categories: Record<string, number>;
  total: number;
};

type DashboardData = {
  period: string;
  start_date: string;
  end_date: string;
  category_metrics: CategoryMetric[];
  chart_data: ChartDataPoint[];
  total_month: number;
  total_budget: number;
  total_period: number;
};

const CHART_COLORS = ["#f87171", "#60a5fa", "#34d399", "#fbbf24", "#c084fc", "#f472b6", "#2dd4bf", "#a3e635"];

export default function ExpenseDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getQuickDateRange = (preset: string) => {
    const today = new Date();
    if (preset === 'today') {
      return [today.toISOString().split('T')[0], today.toISOString().split('T')[0]];
    }
    if (preset === 'this_week') {
      const monday = new Date(today);
      monday.setDate(today.getDate() - today.getDay() + 1); // rough monday
      return [monday.toISOString().split('T')[0], today.toISOString().split('T')[0]];
    }
    if (preset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      return [firstDay.toISOString().split('T')[0], today.toISOString().split('T')[0]];
    }
    // last 30 days default
    const last30 = new Date(today);
    last30.setDate(today.getDate() - 30);
    return [last30.toISOString().split('T')[0], today.toISOString().split('T')[0]];
  };

  const [dateFrom, setDateFrom] = useState(() => getQuickDateRange('last_30_days')[0]);
  const [dateTo, setDateTo] = useState(() => getQuickDateRange('last_30_days')[1]);
  const [showOverBudgetOnly, setShowOverBudgetOnly] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const res = await endpoints.expenses.dashboardMetrics(dateFrom, dateTo) as any;
        setData(res);
      } catch (err) {
        console.error("Failed to fetch dashboard metrics", err);
      } finally {
        setIsLoading(false);
      }
    }
    if (dateFrom && dateTo) {
      fetchData();
    }
  }, [dateFrom, dateTo]);

  if (isLoading && !data) {
    return (
      <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
        <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden justify-center items-center">
          <BowlLoader className="w-10 h-10 text-[#6A0FAD]" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const catColors: Record<string, string> = {};
  data.category_metrics.forEach((c, i) => {
    catColors[c.ulid] = CHART_COLORS[i % CHART_COLORS.length];
  });

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        <Header />
        <Breadcrumbs segments={["Expenses", "Dashboard"]} />
        
        <div className="mt-4 flex-1 flex flex-col min-h-0 overflow-y-auto space-y-6 pb-20 pr-2 scrollbar-thin">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
            <h1 className="text-3xl font-black text-neutral-900 mt-2">Expense Dashboard</h1>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-2 sm:mt-0">
              <select
                onChange={(e) => {
                  if(e.target.value) {
                    const [f, t] = getQuickDateRange(e.target.value);
                    setDateFrom(f);
                    setDateTo(t);
                  }
                }}
                className="px-4 py-2 bg-white border border-neutral-200 rounded-xl outline-none text-sm font-bold text-neutral-800 focus:border-[#6A0FAD] focus:ring-1 focus:ring-[#6A0FAD] shadow-sm min-w-[140px]"
              >
                <option value="">Custom Range</option>
                <option value="today">Today</option>
                <option value="this_week">This Week (Mon-Today)</option>
                <option value="last_30_days">Last 30 Days</option>
                <option value="this_month">This Month</option>
              </select>
              
              <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-xl px-2 shadow-sm focus-within:border-[#6A0FAD] focus-within:ring-1 focus-within:ring-[#6A0FAD]">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="py-2 px-2 outline-none text-sm font-bold text-neutral-800 bg-transparent"
                />
                <span className="text-neutral-400 font-bold">-</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="py-2 px-2 outline-none text-sm font-bold text-neutral-800 bg-transparent"
                />
              </div>
            </div>
          </div>

          {/* Top Level Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
            <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm flex flex-col justify-between">
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Total Monthly Budget</p>
              <p className="text-3xl font-black text-[#6A0FAD] mt-2">
                ₹{data.total_budget.toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm flex flex-col justify-between">
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Total Spent (Month)</p>
              <p className={`text-3xl font-black mt-2 ${data.total_month > data.total_budget && data.total_budget > 0 ? "text-red-500" : "text-neutral-900"}`}>
                ₹{data.total_month.toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm flex flex-col justify-between">
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Selected Period Spent</p>
              <p className="text-3xl font-black text-neutral-900 mt-2">
                ₹{data.total_period.toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm flex flex-col justify-between">
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Total Spent (Today)</p>
              <p className="text-3xl font-black text-neutral-900 mt-2">
                ₹{data.category_metrics.reduce((acc, c) => acc + c.day_total, 0).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Trend Graph */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm shrink-0">
            <h2 className="text-xl font-black text-neutral-900 mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#6A0FAD]" /> Expense Trend
            </h2>
            <div className="h-64 relative px-2 mb-8 w-full">
              {/* Y-Axis Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8">
                <div className="border-t border-neutral-100 w-full"></div>
                <div className="border-t border-neutral-100 w-full"></div>
                <div className="border-t border-neutral-100 w-full"></div>
                <div className="border-t border-neutral-100 w-full"></div>
              </div>
              
              {(() => {
                const chartData = data.chart_data;
                const maxCategoryVal = Math.max(1, ...chartData.flatMap(d => Object.values(d.categories).length > 0 ? Object.values(d.categories) : [0]));
                const len = chartData.length;
                
                const getX = (index: number) => len === 1 ? 50 : (index / (len - 1)) * 100;
                const getY = (val: number) => 100 - ((val / maxCategoryVal) * 90); // 10% padding top
                
                return (
                  <div className="w-full h-full relative">
                    <svg className="w-full h-full overflow-visible absolute inset-0 z-10 pointer-events-none" preserveAspectRatio="none">
                      {data.category_metrics.map(cat => {
                        const points = chartData.map((d, i) => `${getX(i)},${getY(d.categories[cat.ulid] || 0)}`).join(" ");
                        return (
                          <polyline key={cat.ulid} points={points} fill="none" stroke={catColors[cat.ulid]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                        );
                      })}
                    </svg>
                    
                    {/* Hover Regions */}
                    <div className="absolute inset-0 flex w-full h-full">
                      {chartData.map((d, i) => (
                        <div key={i} className="flex-1 h-full group relative flex justify-center cursor-crosshair">
                          <div className="w-[1px] h-full bg-neutral-200 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          
                          {/* Points on lines */}
                          {data.category_metrics.map(cat => {
                            const val = d.categories[cat.ulid] || 0;
                            if (val > 0) {
                              return <div key={cat.ulid} className="absolute w-2 h-2 bg-white border-2 rounded-full opacity-0 group-hover:opacity-100 shadow-sm transition-all z-20 pointer-events-none" style={{ borderColor: catColors[cat.ulid], left: '50%', top: `${getY(val)}%`, transform: 'translate(-50%, -50%)' }}></div>
                            }
                            return null;
                          })}
                          
                          <div className="absolute -top-4 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900 text-white text-xs font-bold p-3 rounded-xl pointer-events-none shadow-xl z-30 text-left min-w-[150px] transform -translate-x-1/2 left-1/2">
                            <div className="mb-2 pb-2 border-b border-neutral-700 text-center">{new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                            {data.category_metrics.map(cat => {
                              const val = d.categories[cat.ulid] || 0;
                              if (val > 0) {
                                return (
                                  <div key={cat.ulid} className="flex justify-between gap-4 mb-1">
                                    <span style={{ color: catColors[cat.ulid] }}>{cat.name}</span>
                                    <span>₹{val.toFixed(2)}</span>
                                  </div>
                                )
                              }
                              return null;
                            })}
                            {d.total === 0 && <div className="text-neutral-500 text-center italic">No expenses</div>}
                          </div>
                          
                          {/* X-Axis Label */}
                          {i % Math.ceil(len / 5) === 0 && (
                            <span className="absolute -bottom-8 text-[10px] font-bold text-neutral-400 truncate w-full text-center">
                              {new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-8 pt-4 border-t border-neutral-100">
              {data.category_metrics.map(cat => (
                <div key={cat.ulid} className="flex items-center gap-2 text-xs font-bold text-neutral-600">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: catColors[cat.ulid] }}></div>
                  {cat.name}
                </div>
              ))}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm shrink-0">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-neutral-900">Category Breakdown & Budget Tracker</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={showOverBudgetOnly} onChange={(e) => setShowOverBudgetOnly(e.target.checked)} />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${showOverBudgetOnly ? 'bg-red-500' : 'bg-neutral-300'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showOverBudgetOnly ? 'transform translate-x-4' : ''}`}></div>
                </div>
                <span className="text-sm font-bold text-neutral-600">Show Over Budget Only</span>
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50/50">
                    <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase">Category</th>
                    <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase text-right">Selected Period</th>
                    <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase text-right">This Month</th>
                    <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase">Budget Health</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {data.category_metrics.filter(c => !showOverBudgetOnly || (c.monthly_budget > 0 && c.month_total > c.monthly_budget)).map((c) => {
                    const progress = c.monthly_budget > 0 ? (c.month_total / c.monthly_budget) * 100 : 0;
                    const isOverBudget = c.monthly_budget > 0 && c.month_total > c.monthly_budget;
                    
                    return (
                      <tr key={c.ulid} className="hover:bg-neutral-50/30 transition-colors">
                        <td className="py-4 px-6 font-bold text-neutral-900 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: catColors[c.ulid] }}></div>
                          {c.name}
                        </td>
                        <td className="py-4 px-6 text-sm font-semibold text-neutral-700 text-right">₹{c.period_total.toFixed(2)}</td>
                        <td className="py-4 px-6 text-sm font-semibold text-neutral-700 text-right">₹{c.month_total.toFixed(2)}</td>
                        <td className="py-4 px-6">
                          {c.monthly_budget > 0 ? (
                            <div className="w-full max-w-[200px]">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-neutral-500">₹{c.monthly_budget.toFixed(2)} Budget</span>
                                {isOverBudget ? (
                                  <span className="flex items-center gap-1 text-[10px] font-black uppercase text-red-500"><AlertCircle className="w-3 h-3" /> Over</span>
                                ) : (
                                  <span className="flex items-center gap-1 text-[10px] font-black uppercase text-green-500"><CheckCircle2 className="w-3 h-3" /> OK</span>
                                )}
                              </div>
                              <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${isOverBudget ? 'bg-red-500' : 'bg-[#6A0FAD]'}`}
                                  style={{ width: `${Math.min(progress, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-neutral-400 italic">No budget set</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {data.category_metrics.filter(c => !showOverBudgetOnly || (c.monthly_budget > 0 && c.month_total > c.monthly_budget)).length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-sm font-bold text-neutral-400">
                        {showOverBudgetOnly ? "No categories are currently over budget! 🎉" : "No categories found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
