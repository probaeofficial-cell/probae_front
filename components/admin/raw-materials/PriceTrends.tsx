"use client";

import React, { useState, useEffect } from "react";
import { Search, Loader2, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { endpoints, api } from "@/lib/apiService";

interface TrendHistoryPoint {
  label: string;
  price: number;
  standard: number;
}

interface RawMaterialTrendResponse {
  id: number;
  name: string;
  item_code?: string;
  category_name?: string;
  unit: string;
  current_price: number;
  previous_price: number;
  avg_purchase: number;
  variance: number;
  trend_percent: number;
  history: TrendHistoryPoint[];
}

interface PaginatedTrendsResponse {
  items: RawMaterialTrendResponse[];
  total: number;
  page: number;
  size: number;
}

import { useInView } from "react-intersection-observer";

export function PriceTrends() {
  const [trends, setTrends] = useState<RawMaterialTrendResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"high-low" | "low-high">("high-low");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const { ref, inView } = useInView();

  useEffect(() => {
    // Reset and fetch when search changes
    const delayDebounceFn = setTimeout(() => {
      setPage(1);
      setTrends([]);
      fetchTrends(1, search);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  useEffect(() => {
    if (inView && hasMore && !isLoading && !isFetchingMore) {
      fetchTrends(page + 1, search, true);
    }
  }, [inView]);

  const fetchTrends = async (pageNum: number, searchQuery: string, isLoadMore = false) => {
    try {
      if (isLoadMore) setIsFetchingMore(true);
      else setIsLoading(true);

      const queryParams = new URLSearchParams({
        page: pageNum.toString(),
        size: "20",
      });
      if (searchQuery) queryParams.append("search", searchQuery);

      const res = await api.get<PaginatedTrendsResponse>(`/raw-materials/purchases/trends?${queryParams.toString()}`);
      
      if (res) {
        if (isLoadMore) {
          setTrends(prev => {
            // Remove duplicates
            const existingIds = new Set(prev.map(t => t.id));
            const newItems = res.items.filter(t => !existingIds.has(t.id));
            return [...prev, ...newItems];
          });
        } else {
          setTrends(res.items);
        }
        setTotalCount(res.total);
        setPage(res.page);
        setHasMore((res.page * res.size) < res.total);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  };

  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  const filtered = trends
    .filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortOrder === "high-low") return b.variance - a.variance;
      return a.variance - b.variance;
    });

  const increasedCount = trends.filter(t => t.trend_percent > 0).length;
  const decreasedCount = trends.filter(t => t.trend_percent < 0).length;
  const stableCount = trends.filter(t => t.trend_percent === 0).length;

  return (
    <div className="bg-white border border-neutral-200 rounded-[32px] overflow-hidden shadow-sm">
      <div className="p-8 border-b border-neutral-100 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">Price Trends</h2>
          <p className="text-sm text-neutral-500 mt-1">Track raw-material price movements and identify cost changes over time.</p>
        </div>
      </div>

      <div className="p-8">
        <div className="border border-neutral-200 rounded-3xl p-6 mb-8 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-96">
              <input 
                type="text" 
                placeholder="Search ingredients..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="w-full bg-[#f8f5fb] border-none rounded-2xl pl-12 pr-4 py-3 text-sm text-neutral-800 font-medium focus:ring-2 focus:ring-[#6b21a8]/20 outline-none placeholder:text-neutral-400" 
              />
              <Search className="w-5 h-5 text-neutral-400 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>
            <div className="flex gap-4 w-full md:w-auto">
              <select className="bg-[#f8f5fb] border-none rounded-2xl px-4 py-3 text-sm text-neutral-800 font-medium focus:ring-2 focus:ring-[#6b21a8]/20 outline-none">
                <option>Last 6 Months</option>
              </select>
              <select 
                value={sortOrder} 
                onChange={(e) => setSortOrder(e.target.value as "high-low" | "low-high")}
                className="bg-[#f8f5fb] border-none rounded-2xl px-4 py-3 text-sm text-neutral-800 font-medium focus:ring-2 focus:ring-[#6b21a8]/20 outline-none"
              >
                <option value="high-low">Sort by Variance (High-Low)</option>
                <option value="low-high">Sort by Variance (Low-High)</option>
              </select>
            </div>
          </div>
          <div className="h-px bg-neutral-100 w-full" />
          <div className="flex flex-wrap gap-4 items-center">
            <div className="bg-neutral-100 px-4 py-2 rounded-full text-xs font-bold text-neutral-600 flex items-center gap-2">
              TRACKED <span className="text-neutral-900">{totalCount}</span>
            </div>
            <div className="bg-red-50 text-red-500 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2">
              <TrendingUp className="w-3 h-3" /> INCREASED <span className="text-red-600">{increasedCount}</span>
            </div>
            <div className="bg-green-50 text-green-500 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2">
              <TrendingDown className="w-3 h-3" /> DECREASED <span className="text-green-600">{decreasedCount}</span>
            </div>
            <div className="bg-neutral-100 text-neutral-500 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2">
              <Minus className="w-3 h-3" /> STABLE <span className="text-neutral-700">{stableCount}</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="py-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#6b21a8]" /></div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-neutral-400 font-medium">No trends found.</div>
            ) : (
              filtered.map((t) => (
                <div key={t.id} className="border border-neutral-200 rounded-3xl p-6 flex flex-col lg:flex-row items-center gap-8 bg-white transition-all hover:shadow-md">
                  
                  {/* Info Section */}
                  <div className="flex items-center gap-4 min-w-[250px] lg:border-r lg:border-neutral-100 lg:pr-8 w-full lg:w-auto">
                    <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center shrink-0 border border-neutral-200 overflow-hidden">
                       <div className="w-full h-full bg-neutral-200" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-neutral-900">{t.name}</h3>
                      <p className="text-xs text-neutral-500 mt-1">{t.item_code || `RM-${1000 + t.id}`}</p>
                      <span className="inline-block mt-2 px-2 py-1 bg-green-700 text-white text-[10px] font-bold rounded">{t.category_name}</span>
                    </div>
                  </div>

                  {/* Pricing Section */}
                  <div className="flex items-center gap-12 lg:border-r lg:border-neutral-100 lg:pr-8 w-full lg:w-auto flex-1">
                    <div>
                      <p className="text-xs text-neutral-500 mb-1">Current Price</p>
                      <p className="text-2xl font-black text-neutral-900">{formatCurrency(t.current_price)}<span className="text-sm font-medium text-neutral-500">/{t.unit}</span></p>
                      <p className="text-xs text-neutral-500 mt-1">Prev: {formatCurrency(t.previous_price)}/{t.unit}</p>
                    </div>

                    <div className="flex flex-col items-end flex-1">
                      {t.trend_percent > 0 ? (
                         <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold flex items-center gap-1">
                           <ArrowUp className="w-3 h-3" /> {t.trend_percent.toFixed(1)}%
                         </span>
                      ) : t.trend_percent < 0 ? (
                         <span className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-xs font-bold flex items-center gap-1">
                           <ArrowDown className="w-3 h-3" /> {Math.abs(t.trend_percent).toFixed(1)}%
                         </span>
                      ) : (
                         <span className="px-3 py-1 bg-neutral-100 text-neutral-500 rounded-full text-xs font-bold flex items-center gap-1">
                           <Minus className="w-3 h-3" /> 0.0%
                         </span>
                      )}

                      <div className="mt-4 text-right space-y-1">
                        <p className="text-xs text-neutral-500">Avg. Purchase: <span className="font-bold text-neutral-900">{formatCurrency(t.avg_purchase)}/{t.unit}</span></p>
                        <p className="text-xs text-neutral-500">Variance: <span className={`font-bold ${t.variance > 0 ? 'text-red-500' : 'text-green-500'}`}>{t.variance > 0 ? '+' : ''}{formatCurrency(t.variance)}/{t.unit}</span></p>
                      </div>
                    </div>
                  </div>

                  {/* Graph Section */}
                  <div className="w-full lg:w-[300px] h-24 shrink-0 flex flex-col justify-between">
                     <p className="text-[10px] text-neutral-500 font-medium">Standard Cost: {formatCurrency(t.history[0]?.standard || 0)}/{t.unit}</p>
                     <div className="flex-1 relative mt-2 w-full flex items-end">
                        <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-neutral-300 w-full" />
                        <svg className="absolute inset-0 w-full h-full preserve-aspect-ratio-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                           <polyline 
                             points={t.history.map((h, i) => `${(i / Math.max(t.history.length - 1, 1)) * 100},${100 - ((h.price / (t.current_price * 1.5 || 1)) * 100)}`).join(' ')} 
                             fill="none" 
                             stroke={t.variance > 0 ? "#ef4444" : "#22c55e"} 
                             strokeWidth="2" 
                           />
                        </svg>
                     </div>
                     <div className="flex justify-between text-[10px] text-neutral-400 mt-2">
                       <span>{t.history[0]?.label || 'Month 1'}</span>
                       <span>Current</span>
                     </div>
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
