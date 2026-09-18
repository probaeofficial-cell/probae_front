"use client";

import React, { useEffect, useState } from "react";
import { api as apiService } from "@/lib/apiService";
import { Package, ChefHat, RefreshCw, AlertCircle, Calendar, ChevronDown, ChevronUp, CheckSquare, Square } from "lucide-react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { BowlLoader } from "@/components/admin/BowlLoader";
import { useAuth } from "@/lib/AuthContext";

interface BatchPrepOrder {
  order_ulid: string;
  order_item_ulid: string;
  order_number?: string;
  customer_name: string;
  customer_goal: string | null;
  zone_name: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  assembly_status: string;
  order_status: string;
}

interface BatchPrepGroup {
  bowl_name: string;
  total_orders: number;
  orders: BatchPrepOrder[];
}

export default function PackagingDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<BatchPrepGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Accordion state (which bowl is expanded)
  const [expandedBowls, setExpandedBowls] = useState<Record<string, boolean>>({});

  // Mock completion status logic for UI presentation
  const [completedOrders, setCompletedOrders] = useState<Record<string, boolean>>({});

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.get<BatchPrepGroup[]>('/kds/batch-prep');
      setData(response);
      setLastUpdated(new Date());
      
      // Expand all by default
      const expansions: Record<string, boolean> = {};
      const completes: Record<string, boolean> = {};
      response.forEach(g => { 
        expansions[g.bowl_name] = true; 
        g.orders.forEach(o => {
          if (o.assembly_status === "PACKAGED") {
            completes[o.order_item_ulid] = true;
          }
        });
      });
      setExpandedBowls(expansions);
      setCompletedOrders(completes);
      
    } catch (err: any) {
      setError(err.message || "Failed to load batch prep data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleExpand = (bowlName: string) => {
    setExpandedBowls(prev => ({ ...prev, [bowlName]: !prev[bowlName] }));
  };

  const toggleOrderComplete = async (orderItemUlid: string, currentStatus: boolean, assemblyStatus: string, orderStatus: string) => {
    // Only allow if assembled OR if the order is already PREPARED
    if (assemblyStatus !== "ASSEMBLED" && assemblyStatus !== "PACKAGED" && assemblyStatus !== "COMPLETED" && orderStatus !== "PREPARED") {
      alert("This bowl has not been assembled or prepared yet! Please wait for it to be ready before packaging.");
      return;
    }

    // Optimistic update
    setCompletedOrders(prev => ({ ...prev, [orderItemUlid]: !currentStatus }));
    
    try {
      const newStatus = !currentStatus ? "PACKAGED" : "ASSEMBLED";
      await apiService.patch(`/kds/assembly-list/${orderItemUlid}/status`, { status: newStatus });
      // Update local data to reflect the new assembly_status so future clicks work correctly
      setData(prevData => {
         const newData = [...prevData];
         for (const g of newData) {
            for (const o of g.orders) {
               if (o.order_item_ulid === orderItemUlid) {
                  o.assembly_status = newStatus;
               }
            }
         }
         return newData;
      });
    } catch (err) {
      console.error("Failed to update status", err);
      // Revert on failure
      setCompletedOrders(prev => ({ ...prev, [orderItemUlid]: currentStatus }));
    }
  };

  // Top Metrics calculation
  const totalItems = data.reduce((sum, group) => sum + group.total_orders, 0);
  const completedCount = Object.values(completedOrders).filter(Boolean).length;
  const pendingCount = totalItems - completedCount;
  const completionPercentage = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

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
        <Breadcrumbs segments={["Admin", "KDS", "Packaging Prep"]} />
          
        <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-2xl pt-2 pb-6 px-6 sm:pt-2 sm:pb-8 sm:px-8">
          
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 shrink-0 gap-4">
            <div>
              <h1 className="text-xl font-bold text-neutral-800 flex items-center gap-2">
                <Package className="w-5 h-5 text-[#00E5FF]" />
                Packaging & Batch Prep
              </h1>
              <p className="text-sm text-neutral-500 mt-1 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Today's Requirements &bull; Last updated {lastUpdated.toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50 text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 border border-red-200 mb-6 shrink-0">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex-1 overflow-auto pr-2 pb-6 scrollbar-thin">
            
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <BowlLoader className="w-10 h-10 animate-spin text-[#6b21a8]" />
                <span className="text-neutral-500 text-sm font-medium">Loading packaging data...</span>
              </div>
            ) : !loading && !error && data.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center border border-neutral-100 rounded-3xl p-8 text-center max-w-lg mx-auto m-6">
                <div className="w-16 h-16 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-400 mb-4">
                  <ChefHat className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-neutral-800">No prep required</h3>
                <p className="text-neutral-500 text-sm mt-2 max-w-sm">There are no unfulfilled orders for today.</p>
              </div>
            ) : data.length > 0 ? (
              <>
                {/* Top Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {/* Total Packaging Items */}
                  <div className="border border-neutral-200 rounded-2xl p-6 bg-[#FCFAFF]">
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Total Packaging Items</p>
                    <div className="flex items-end gap-3">
                      <span className="text-4xl font-extrabold text-neutral-900 leading-none">{totalItems}</span>
                    </div>
                  </div>

                  {/* Completion Status */}
                  <div className="border border-neutral-200 rounded-2xl p-6 bg-[#FCFAFF]">
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Completion Status</p>
                    <div className="flex items-center gap-4">
                      <span className="text-4xl font-extrabold text-[#5B108E] leading-none">{completionPercentage}%</span>
                      <div className="flex-1 h-3 bg-neutral-200 rounded-full overflow-hidden">
                        <div className="h-full bg-green-600 transition-all duration-500" style={{ width: `${completionPercentage}%` }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Pending Packaging */}
                  <div className="border border-neutral-200 rounded-2xl p-6 bg-[#FCFAFF]">
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Pending Packaging</p>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-extrabold text-[#F97316] leading-none">{pendingCount}</span>
                      <span className="text-sm font-semibold text-neutral-500 mb-1">bowls remaining</span>
                    </div>
                  </div>
                </div>
              <div className="space-y-4">
                {data.map((group, idx) => {
                  const isExpanded = expandedBowls[group.bowl_name];
                  
                  return (
                    <div key={idx} className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
                      {/* Accordion Header */}
                      <div 
                        onClick={() => toggleExpand(group.bowl_name)}
                        className="bg-[#FAFAFA] hover:bg-neutral-50 px-6 py-4 flex justify-between items-center cursor-pointer select-none transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <button className="text-neutral-400 hover:text-neutral-600 transition-colors">
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-neutral-800">{group.bowl_name}</h3>
                            <span className="bg-[#E6E6E6] text-neutral-800 px-3 py-1 rounded-full text-xs font-bold">
                              {group.total_orders} Orders
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Accordion Content */}
                      {isExpanded && (
                        <div className="overflow-x-auto bg-white border-t border-neutral-100">
                          <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="text-xs uppercase bg-white text-neutral-400 font-bold tracking-wider">
                              <tr className="border-b border-neutral-100">
                                <th className="px-6 py-4 w-12 text-center">Status</th>
                                <th className="px-6 py-4">Order ID</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Cal</th>
                                <th className="px-6 py-4">Pro</th>
                                <th className="px-6 py-4">Car</th>
                                <th className="px-6 py-4">Fat</th>
                                <th className="px-6 py-4">Fib</th>
                                <th className="px-6 py-4">Goal</th>
                                <th className="px-6 py-4 text-center">Zone</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 text-neutral-600">
                              {group.orders.map((order, orderIdx) => {
                                const isCompleted = !!completedOrders[order.order_item_ulid];
                                
                                return (
                                  <tr key={orderIdx} className={`hover:bg-neutral-50 transition-colors ${isCompleted ? 'bg-neutral-50/50' : ''}`}>
                                    <td className="px-6 py-4 text-center">
                                      {order.assembly_status !== "ASSEMBLED" && order.assembly_status !== "PACKAGED" && order.assembly_status !== "COMPLETED" && order.order_status !== "PREPARED" ? (
                                        <div className="tooltip-container relative group inline-block">
                                          <Square className="w-5 h-5 text-neutral-200 inline-block cursor-not-allowed" />
                                        </div>
                                      ) : (
                                        <div className="cursor-pointer inline-block" onClick={() => toggleOrderComplete(order.order_item_ulid, isCompleted, order.assembly_status, order.order_status)}>
                                          {isCompleted ? (
                                            <CheckSquare className="w-5 h-5 text-[#5B108E] inline-block" />
                                          ) : (
                                            <Square className="w-5 h-5 text-neutral-300 hover:text-[#5B108E] inline-block" />
                                          )}
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-neutral-500">#{order.order_number || order.order_ulid.slice(-6)}</td>
                                    <td className="px-6 py-4 font-bold text-neutral-800">{order.customer_name}</td>
                                    <td className="px-6 py-4 font-bold text-neutral-800">{Math.round(order.calories)}</td>
                                    <td className="px-6 py-4">{Math.round(order.protein)}g</td>
                                    <td className="px-6 py-4">{Math.round(order.carbs)}g</td>
                                    <td className="px-6 py-4">{Math.round(order.fat)}g</td>
                                    <td className="px-6 py-4">{Math.round(order.fiber)}g</td>
                                    <td className="px-6 py-4">
                                      {order.customer_goal ? (
                                        <span className="bg-purple-50 text-purple-600 px-2.5 py-1 rounded-md text-xs font-semibold">
                                          {order.customer_goal}
                                        </span>
                                      ) : (
                                        <span className="text-neutral-300">-</span>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      {order.zone_name ? (
                                        <span className="bg-green-50 text-green-600 px-2.5 py-1 rounded-md text-xs font-semibold">
                                          {order.zone_name}
                                        </span>
                                      ) : (
                                        <span className="text-neutral-300">-</span>
                                      )}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
