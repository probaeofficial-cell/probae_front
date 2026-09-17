"use client";

import React, { useEffect, useState } from "react";
import { api as apiService } from "@/lib/apiService";
import { 
  ShoppingCart, AlertCircle, RefreshCw, 
  CheckCircle2, Info 
} from "lucide-react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { BowlLoader } from "@/components/admin/BowlLoader";
import { useAuth } from "@/lib/AuthContext";

interface ProcurementItem {
  raw_material_name: string;
  current_stock: number;
  raw_required_for_prep: number;
  deficit: number;
  final_purchase_amount: number;
}

export default function ProcurementDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<ProcurementItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [showAll, setShowAll] = useState<boolean>(false);

  const fetchShortfall = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.get<ProcurementItem[]>('/kds/procurement-shortfall');
      setItems(response);
    } catch (err: any) {
      setError(err.message || "Failed to load procurement data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShortfall();
  }, []);

  const formatGrams = (grams: number) => {
    if (grams >= 1000) {
      return (grams / 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kg';
    }
    return Math.round(grams).toLocaleString() + ' g';
  };

  const filteredItems = showAll ? items : items.filter(item => item.deficit > 0);

  if (authLoading || (!user && loading)) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <BowlLoader className="w-8 h-8 text-[#7c26d9]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        <Header />
        <Breadcrumbs segments={["Admin", "KDS", "Daily Purchase"]} />
          
        <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-2xl pt-2 pb-6 px-6 sm:pt-2 sm:pb-8 sm:px-8">
          
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 shrink-0 gap-4">
            <div>
              <h1 className="text-xl font-bold text-neutral-800 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-red-500" />
                Daily Procurement
              </h1>
              <p className="text-sm text-neutral-500 mt-1">
                Shortfall calculator based on today's cooking and raw yield metrics.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-neutral-100 p-1 rounded-xl">
                <button
                  onClick={() => setShowAll(false)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    !showAll 
                      ? 'bg-white text-neutral-900 shadow-sm' 
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  Out of Stock Only
                </button>
                <button
                  onClick={() => setShowAll(true)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    showAll 
                      ? 'bg-white text-neutral-900 shadow-sm' 
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  Show All
                </button>
              </div>

              <button
                onClick={fetchShortfall}
                disabled={loading}
                className="flex items-center gap-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50 text-sm h-[36px]"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 border border-red-200 mb-6 shrink-0">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex-1 overflow-auto pr-2 pb-6 scrollbar-thin rounded-2xl border border-neutral-100">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3">
                <BowlLoader className="w-8 h-8 text-[#6b21a8]" />
                <span className="text-neutral-500 text-sm font-medium">Calculating shortfalls...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center bg-white border border-neutral-100 rounded-3xl p-8 text-center max-w-lg mx-auto m-6">
                <div className="w-16 h-16 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center text-green-500 mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-neutral-800 font-bold text-lg">Fully Stocked</h3>
                <p className="text-neutral-500 text-sm mt-2 max-w-sm">
                  {showAll 
                    ? "There is no demand for any materials today."
                    : "You have enough stock in the kitchen to fulfill all of today's orders."}
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-sm text-neutral-600">
                <thead className="text-xs uppercase bg-[#F3F4F6] text-neutral-500 sticky top-0 z-10 font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-4 rounded-tl-xl border-b border-neutral-200">Material Name</th>
                    <th className="px-6 py-4 border-b border-neutral-200">Inventory Status</th>
                    <th className="px-6 py-4 border-b border-neutral-200">Deficit</th>
                    <th className="px-6 py-4 rounded-tr-xl border-b border-neutral-200 text-right">To Purchase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white">
                  {filteredItems.map((item, idx) => {
                    const isShort = item.deficit > 0;

                    return (
                      <tr key={idx} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-bold text-neutral-800">
                            {item.raw_material_name}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm text-neutral-600">
                              Required: <strong className="text-neutral-900">{formatGrams(item.raw_required_for_prep)}</strong>
                            </span>
                            <span className="text-xs text-neutral-400">
                              In Stock: {formatGrams(item.current_stock)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {isShort ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 border border-red-100">
                              <AlertCircle className="w-3.5 h-3.5" />
                              {formatGrams(item.deficit)} short
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-green-50 text-green-600 border border-green-100">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Sufficient
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isShort ? (
                            <div className="flex flex-col items-end gap-1">
                              <span className="bg-red-500 text-white px-4 py-2 rounded-xl font-bold text-base tabular-nums shadow-sm">
                                {formatGrams(item.final_purchase_amount)}
                              </span>
                              <div className="flex items-center gap-1 text-[11px] text-neutral-400 font-medium">
                                <Info className="w-3 h-3" />
                                <span>Includes yield waste</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-neutral-300 font-medium">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
