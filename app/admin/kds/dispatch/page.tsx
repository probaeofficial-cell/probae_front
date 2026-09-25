"use client";

import { useState, useEffect } from "react";
import { BowlLoader } from "@/components/admin/BowlLoader";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { endpoints } from "@/lib/apiService";
import { Search, MapPin, Truck, CheckCircle, Package } from "lucide-react";
import { ProbaeButton } from "@/components/admin/ProbaeButton";

export default function DispatchPrepPage() {
  const [targetDate, setTargetDate] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [mealSlotFilter, setMealSlotFilter] = useState("ALL");
  const [mealSlots, setMealSlots] = useState<any[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    const init = async () => {
      try {
        const catData = await endpoints.mealCategories.getMealCategories(1, 100) as any;
        const categories = catData.items || catData.categories || [];
        setMealSlots(categories);

        const now = new Date();
        let foundSlot = "ALL";
        for (const cat of categories) {
          if (cat.time_from && cat.time_to) {
            const [fH, fM] = cat.time_from.split(':').map(Number);
            const [tH, tM] = cat.time_to.split(':').map(Number);
            const from = new Date(now);
            from.setHours(fH, fM, 0, 0);
            const to = new Date(now);
            to.setHours(tH, tM, 0, 0);
            if (to < from) to.setDate(to.getDate() + 1);
            if (now >= from && now <= to) {
              foundSlot = cat.slug;
              break;
            }
          }
        }
        setMealSlotFilter(foundSlot);
      } catch (e) {
        console.error(e);
      } finally {
        setHasInitialized(true);
      }
    };
    init();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      // Fetch PREPARED orders
      const data = await endpoints.orders.list({ target_date: targetDate, status: "PREPARED", limit: 500 }) as any;
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasInitialized) {
      fetchOrders();
    }
  }, [targetDate, hasInitialized]);

  const handleDispatch = async (ulid: string) => {
    setUpdatingId(ulid);
    try {
      const res = await endpoints.orders.updateStatus(ulid, "DISPATCHED") as any;
      if (res.success) {
        setOrders(prev => prev.filter(o => o.ulid !== ulid));
      } else {
        alert("Failed to dispatch order.");
      }
    } catch (e) {
      alert("Error dispatching order.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = orders.filter(order => {
    // Search filter
    const cust = order.customer || {};
    const nameMatch = (cust.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const idMatch = order.ulid.toLowerCase().includes(searchQuery.toLowerCase());
    const orderNumMatch = (order.order_number || "").toLowerCase().includes(searchQuery.toLowerCase());
    if (searchQuery && !nameMatch && !idMatch && !orderNumMatch) return false;

    // Meal Slot filter
    if (mealSlotFilter !== "ALL") {
      const activeSlotObj = mealSlots.find(s => s.slug === mealSlotFilter);
      const slotName = activeSlotObj ? activeSlotObj.name : mealSlotFilter;
      const hasSlot = (order.items || []).some((item: any) => {
        const itemSlot = (item.meal_slot || "").toLowerCase();
        return itemSlot === mealSlotFilter.toLowerCase() || itemSlot === (slotName || "").toLowerCase();
      });
      if (!hasSlot) return false;
    }
    
    return true;
  });

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE) || 1;
  const paginatedOrders = filteredOrders.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, mealSlotFilter, targetDate]);

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        <Header />
        <Breadcrumbs segments={["Admin", "KDS", "Dispatch Prep"]} />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-4 mb-6">
          <div>
            <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Dispatch Prep</h1>
            <p className="text-sm font-medium text-neutral-500 mt-1">Review prepared orders and mark them as dispatched.</p>
          </div>
          
          <div className="flex items-center gap-2 bg-neutral-100 p-1.5 rounded-xl border border-neutral-200 shrink-0">
            <input 
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              className="bg-transparent border-none text-sm font-bold text-neutral-700 focus:ring-0 cursor-pointer outline-none px-2"
            />
          </div>
        </div>

        {/* Meal Slot Pills */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-thin shrink-0">
          <button
            onClick={() => setMealSlotFilter("ALL")}
            className={`px-5 h-[48px] rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
              mealSlotFilter === "ALL" ? "bg-[#6A0FAD] text-white" : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
            }`}
          >
            All Slots
          </button>
          {mealSlots.map(slot => (
            <button
              key={slot.id}
              onClick={() => setMealSlotFilter(slot.slug)}
              className={`px-5 h-[48px] rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
                mealSlotFilter === slot.slug ? "bg-[#6A0FAD] text-white" : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
              }`}
            >
              {slot.name}
              {slot.time_from && slot.time_to && (
                <span className="ml-2 text-xs opacity-70">
                  ({slot.time_from.slice(0,5)} - {slot.time_to.slice(0,5)})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-6 relative shrink-0">
          <Search className="w-5 h-5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name, order number, or ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 h-[48px] rounded-xl border border-neutral-200 focus:border-[#6A0FAD] focus:ring-1 focus:ring-[#6A0FAD] outline-none text-sm font-medium text-neutral-900"
          />
        </div>

        <div className="flex-1 overflow-auto scrollbar-thin border border-neutral-200 rounded-2xl bg-neutral-50 overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <BowlLoader className="w-10 h-10 animate-spin text-[#6A0FAD]" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Package className="w-16 h-16 text-neutral-300 mb-4" />
              <h3 className="text-xl font-bold text-neutral-700 mb-1">No Prepared Orders Found</h3>
              <p className="text-neutral-500 font-medium">Try adjusting your filters or date.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse bg-white min-w-[600px]">
              <thead className="sticky top-0 bg-neutral-100/90 backdrop-blur border-b border-neutral-200 z-10 shadow-sm">
                <tr>
                  <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase tracking-wider">Order No</th>
                  <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase tracking-wider">Customer</th>
                  <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase tracking-wider">Address</th>
                  <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase tracking-wider">Contents</th>
                  <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {paginatedOrders.map(order => (
                  <tr key={order.ulid} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-4 px-6 font-black text-neutral-900">
                      {order.order_number || order.ulid.slice(-6)}
                    </td>
                    <td className="py-4 px-6 font-bold text-neutral-800">
                      {order.customer?.name || "Unknown"}
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm font-medium text-neutral-700 max-w-[200px] truncate">
                        {order.customer?.address || "-"}
                      </div>
                      <div className="text-[10px] font-bold text-[#6A0FAD] uppercase mt-0.5">
                        {order.customer?.zone?.name || "No Zone"}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        {(order.items || []).map((item: any) => (
                          <div key={item.id} className="text-xs font-bold text-neutral-600 flex items-center gap-2">
                            <span className="w-4 h-4 rounded bg-neutral-200 flex items-center justify-center text-[10px] text-neutral-700">
                              {item.quantity}
                            </span>
                            {item.bowl?.name || "Custom Bowl"}
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-neutral-100 uppercase tracking-wider">
                              {item.meal_slot}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <ProbaeButton 
                        onClick={() => handleDispatch(order.ulid)}
                        disabled={updatingId === order.ulid}
                        className="!w-auto inline-flex items-center gap-2 px-4 py-2"
                      >
                        {updatingId === order.ulid ? (
                          <BowlLoader className="w-4 h-4 animate-spin text-white" />
                        ) : (
                          <><Truck className="w-4 h-4" /> Dispatch</>
                        )}
                      </ProbaeButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && !isLoading && (
          <div className="py-4 mt-4 border-t border-neutral-100 flex items-center justify-between shrink-0">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm font-bold text-neutral-600 bg-neutral-100 rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm font-bold text-neutral-500">Page {page} of {totalPages}</span>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 text-sm font-bold text-neutral-600 bg-neutral-100 rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
