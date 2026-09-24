"use client";

import { BowlLoader } from "@/components/admin/BowlLoader";
import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/admin/Header";
import { User, Search, Filter, Loader2, RefreshCw, Briefcase, Map, ClipboardList, MoreVertical, ChevronLeft, ChevronRight, Phone } from "lucide-react";
import { endpoints } from "@/lib/apiService";

function toLocalDateStr(d: Date) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return toLocalDateStr(d);
}
function formatDisplay(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DeliveryDashboard() {
  const todayStr = toLocalDateStr(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mealSlotFilter, setMealSlotFilter] = useState("ALL");
  const [mealSlots, setMealSlots] = useState<any[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);

  const [assignDriverUlid, setAssignDriverUlid] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState("");
  const [assignError, setAssignError] = useState("");

  const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState(false);
  const [actionMenuUlid, setActionMenuUlid] = useState("");
  const [agentPage, setAgentPage] = useState(1);
  const agentDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest(".action-menu-container")) {
        setActionMenuUlid("");
      }
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(e.target as Node)) {
        setIsAgentDropdownOpen(false);
      }
    };
    if (isAgentDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAgentDropdownOpen]);

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

  useEffect(() => {
    if (hasInitialized) {
      fetchData(selectedDate);
    }
  }, [selectedDate, hasInitialized]);


  const handleRemoveDriver = async (orderUlid: string) => {
    try {
      await endpoints.orders.bulkAssignDriver({ order_ulids: [orderUlid], driver_ulid: null });
      setActionMenuUlid("");
      fetchData(selectedDate); // Refetch to show unassigned
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectForReassign = (orderUlid: string) => {
    setSelectedIds([orderUlid]);
    setActionMenuUlid("");
    // Scroll to top or highlight the assign menu
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const fetchData = async (date: string) => {
    setIsLoading(true);
    try {
      const [ordersRes, driversRes] = await Promise.all([
        endpoints.orders.list({ target_date: date, limit: 500 }),
        endpoints.logistics.getDrivers()
      ]);
      setOrders((ordersRes as any).orders || []);
      setDrivers((driversRes as any) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const goDate = (delta: number) => {
    setSelectedIds([]);
    setSelectedDate(prev => addDays(prev, delta));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkAssign = async () => {
    if (!assignDriverUlid || selectedIds.length === 0) return;
    setIsAssigning(true);
    setAssignError("");
    setAssignSuccess("");
    try {
      const res = await endpoints.orders.bulkAssignDriver({
        order_ulids: selectedIds,
        driver_ulid: assignDriverUlid
      }) as any;
      setAssignSuccess(`✓ ${res.updated || selectedIds.length} order(s) assigned successfully.`);
      setSelectedIds([]);
      setAssignDriverUlid("");
      fetchData(selectedDate);
      setTimeout(() => setAssignSuccess(""), 4000);
    } catch (e: any) {
      setAssignError("Failed: " + (e.detail || e.message || "Unknown error"));
    } finally {
      setIsAssigning(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    if (mealSlotFilter === "ALL") return true;
    const activeSlotObj = mealSlots.find(s => s.slug === mealSlotFilter);
    const slotName = activeSlotObj ? activeSlotObj.name : mealSlotFilter;
    return (order.items || []).some((item: any) => {
      const itemSlot = (item.meal_slot || "").toLowerCase();
      return itemSlot === mealSlotFilter.toLowerCase() || itemSlot === (slotName || "").toLowerCase();
    });
  });

  const totalOrders = filteredOrders.length;
  const completedOrders = filteredOrders.filter(o => o.status === "DELIVERED").length;
  const pendingOrders = filteredOrders.filter(o => o.status === "PENDING" || o.status === "DISPATCHED").length;
  const completionPercentage = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
  const isToday = selectedDate === todayStr;

  return (
    <div className="flex flex-col flex-1 h-full bg-[#F5F6F8]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-[#F5F6F8] overflow-hidden">
        <Header />
        
        <div className="mt-4 flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-[1400px] mx-auto pb-12">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold text-neutral-900">Delivery Management</h1>
                <p className="text-neutral-500 font-medium mt-1">Track deliveries, zone performance and completion status.</p>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Navigable date picker */}
                <div className="bg-white rounded-xl border border-neutral-200 flex items-center shadow-sm overflow-hidden">
                  <button onClick={() => goDate(-1)} className="px-3 h-10 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700 transition-colors border-r border-neutral-100">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="px-4 flex items-center gap-2 font-bold text-sm text-neutral-900 min-w-[160px] justify-center">
                    {formatDisplay(selectedDate)}
                    {isToday && <span className="text-[#6A0FAD] bg-purple-50 px-2 py-0.5 rounded text-[10px] font-bold">TODAY</span>}
                  </div>
                  <button onClick={() => goDate(1)} className="px-3 h-10 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700 transition-colors border-l border-neutral-100">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <button onClick={() => fetchData(selectedDate)} className="w-10 h-10 bg-white rounded-xl border border-neutral-200 flex items-center justify-center text-neutral-500 hover:bg-neutral-50 transition-colors shadow-sm" title="Refresh">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Meal Slot Pills */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-thin">
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

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col justify-between h-36">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-neutral-500">Total Orders</span>
                  <div className="w-10 h-10 bg-[#FCF9FF] rounded-xl flex items-center justify-center text-[#6A0FAD]">
                    <Briefcase className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h2 className="text-4xl font-black text-neutral-900 leading-none">{totalOrders}</h2>
                  <p className="text-[11px] text-neutral-400 mt-2">Today's scheduled deliveries</p>
                </div>
              </div>
              
              <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col justify-between h-36">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-neutral-500">Completion</span>
                  <div className="px-2 py-1 bg-green-100 text-green-700 font-bold text-xs rounded-md">{completionPercentage}%</div>
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <h2 className="text-4xl font-black text-neutral-900 leading-none">{completedOrders}</h2>
                    <span className="text-neutral-400 font-bold">/{totalOrders}</span>
                  </div>
                  <div className="w-full bg-neutral-100 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-green-500 h-full rounded-full" style={{ width: `${completionPercentage}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col justify-between h-36">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-neutral-500">Pending</span>
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h2 className="text-4xl font-black text-neutral-900 leading-none">{pendingOrders}</h2>
                  <p className="text-[11px] text-neutral-400 mt-2">Deliveries remaining</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col justify-between h-36">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-neutral-500">Active Zones</span>
                  <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center text-neutral-500">
                    <Map className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h2 className="text-4xl font-black text-neutral-900 leading-none">1</h2>
                  <p className="text-[11px] text-neutral-400 mt-2">Operational zones today</p>
                </div>
              </div>
            </div>

            {/* Status Filters */}
            <div className="flex items-center gap-4 mb-8 overflow-x-auto pb-2">
              <span className="text-sm font-bold text-neutral-500 shrink-0">Status Filters:</span>
              <button className="shrink-0 inline-flex items-center px-4 py-2 bg-green-100 text-green-700 font-bold text-xs rounded-full border border-green-200">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span> Completed ({completedOrders})
              </button>
              <button className="shrink-0 inline-flex items-center px-4 py-2 bg-[#eaddf7] text-[#6A0FAD] font-bold text-xs rounded-full border border-[#d6bff0]">
                <span className="w-2 h-2 rounded-full bg-[#6A0FAD] mr-2"></span> Out for Delivery ({filteredOrders.filter(o => o.status === "DISPATCHED").length})
              </button>
              <button className="shrink-0 inline-flex items-center px-4 py-2 bg-yellow-100 text-yellow-700 font-bold text-xs rounded-full border border-yellow-200">
                <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span> Pending ({filteredOrders.filter(o => o.status === "PENDING").length})
              </button>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold text-neutral-900 mb-6">Today's Deliveries <span className="text-xs bg-neutral-200 text-neutral-600 px-2 py-0.5 rounded-md ml-2 font-medium">{totalOrders} Records</span></h2>

            {/* Filters */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <div className="flex-1 max-w-md w-full">
                <div className="bg-white border border-neutral-200 rounded-xl px-4 py-2.5 flex items-center">
                  <Search className="w-4 h-4 text-neutral-400 mr-3" />
                  <input type="text" placeholder="Search ID, Name..." className="w-full bg-transparent outline-none text-sm text-neutral-900" />
                </div>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button className="bg-white border border-neutral-200 px-4 py-2.5 rounded-xl text-sm font-bold text-neutral-700 flex-1 md:flex-none text-center">All Zones</button>
                <button className="bg-[#FCF9FF] border border-purple-100 px-4 py-2.5 rounded-xl text-sm font-bold text-[#6A0FAD] flex items-center justify-center flex-1 md:flex-none">
                  <Filter className="w-4 h-4 mr-2" /> Filter
                </button>
              </div>
            </div>

            {/* Bulk Actions */}
            {assignSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-5 py-3 mb-4 font-medium text-sm">{assignSuccess}</div>
            )}
            {assignError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-3 mb-4 font-medium text-sm">{assignError}</div>
            )}
            {selectedIds.length > 0 && (
              <div className="bg-[#FCF9FF] border border-purple-200 p-4 rounded-xl shadow-sm mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <span className="font-bold text-[#6A0FAD] text-sm">{selectedIds.length} order{selectedIds.length > 1 ? "s" : ""} selected</span>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative" ref={agentDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsAgentDropdownOpen(!isAgentDropdownOpen)}
                      className="flex items-center justify-between min-w-[200px] bg-[#3B3B3B] border-2 border-[#6A0FAD] rounded-xl px-4 py-2.5 text-sm font-semibold outline-none text-white shadow-[0_0_15px_rgba(106,15,173,0.3)] transition-all"
                    >
                      {assignDriverUlid 
                        ? (drivers.find(d => d.ulid === assignDriverUlid)?.name || "Select Agent...") 
                        : "✓ Select Agent..."}
                    </button>
                    
                    {isAgentDropdownOpen && (
                      <div className="absolute top-full left-0 mt-2 w-full min-w-[250px] bg-[#3B3B3B] border-2 border-[#6A0FAD] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] z-50 overflow-hidden">
                        {drivers.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-neutral-400">No agents available</div>
                        ) : (
                          <>
                            <div className="max-h-60 overflow-y-auto">
                              {drivers.slice((agentPage - 1) * 5, agentPage * 5).map(d => (
                                <button
                                  key={d.ulid}
                                  onClick={() => { setAssignDriverUlid(d.ulid); setIsAgentDropdownOpen(false); }}
                                  className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors ${
                                    assignDriverUlid === d.ulid 
                                      ? "bg-[#6A0FAD] text-white" 
                                      : "text-neutral-200 hover:bg-[#4A4A4A]"
                                  }`}
                                >
                                  {d.name} ({d.phone})
                                </button>
                              ))}
                            </div>
                            
                            {/* Pagination Controls */}
                            {drivers.length > 5 && (
                              <div className="flex items-center justify-between px-3 py-2 border-t border-[#4A4A4A] bg-[#333333]">
                                <button
                                  type="button"
                                  disabled={agentPage === 1}
                                  onClick={() => setAgentPage(p => p - 1)}
                                  className="p-1 rounded bg-[#4A4A4A] text-white disabled:opacity-50 hover:bg-[#5A5A5A]"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-xs text-neutral-300 font-medium">
                                  Page {agentPage} of {Math.ceil(drivers.length / 5)}
                                </span>
                                <button
                                  type="button"
                                  disabled={agentPage === Math.ceil(drivers.length / 5)}
                                  onClick={() => setAgentPage(p => p + 1)}
                                  className="p-1 rounded bg-[#4A4A4A] text-white disabled:opacity-50 hover:bg-[#5A5A5A]"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={handleBulkAssign} 
                    disabled={!assignDriverUlid || isAssigning}
                    className="bg-[#6A0FAD] hover:bg-[#5a0d91] disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-colors flex items-center gap-2"
                  >
                    {isAssigning ? <><Loader2 className="w-3 h-3 animate-spin" /> Assigning...</> : "Assign Agent"}
                  </button>
                  <button 
                    onClick={() => { setSelectedIds([]); setAssignDriverUlid(""); }}
                    className="text-neutral-400 hover:text-neutral-700 text-xs font-bold px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* List */}
            <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-neutral-100 overflow-hidden mb-8">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#2A2A2A] text-white">
                    <th className="py-4 px-4 w-12 text-center border-r border-white/10">
                      <input 
                        type="checkbox" 
                        disabled={filteredOrders.filter(o => o.status !== "DELIVERED").length === 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(filteredOrders.filter(o => o.status !== "DELIVERED").map(o => o.ulid));
                          } else {
                            setSelectedIds([]);
                          }
                        }} 
                        checked={
                          filteredOrders.filter(o => o.status !== "DELIVERED").length > 0 && 
                          selectedIds.length === filteredOrders.filter(o => o.status !== "DELIVERED").length
                        } 
                      />
                    </th>
                    <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-wider">Order ID</th>
                    <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-wider">Customer</th>
                    <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-wider">Address & Zone</th>
                    <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-wider">Bowls</th>
                    <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-wider">Delivery Slot</th>
                    <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-wider">Agent</th>
                    <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-wider text-center">Status</th>
                    <th className="py-4 px-4 text-[10px] font-bold uppercase tracking-wider text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {isLoading ? (
                    <tr><td colSpan={9} className="py-12 text-center text-neutral-500"><BowlLoader className="w-8 h-8 animate-spin mx-auto text-[#6A0FAD]" /></td></tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr><td colSpan={9} className="py-12 text-center text-neutral-500 font-medium">No deliveries found for this slot.</td></tr>
                  ) : filteredOrders.map(order => (
                    <tr key={order.ulid} className={`hover:bg-neutral-50/50 ${order.status === "DELIVERED" ? "opacity-70" : ""}`}>
                      <td className="py-4 px-4 text-center border-r border-neutral-100">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(order.ulid)} 
                          onChange={() => toggleSelect(order.ulid)} 
                          className={`accent-[#6A0FAD] ${order.status === "DELIVERED" ? "cursor-not-allowed opacity-50" : ""}`}
                          disabled={order.status === "DELIVERED"}
                        />
                      </td>
                      <td className="py-4 px-4 text-sm font-medium text-neutral-900">#{order.order_number || order.ulid.slice(-6)}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-amber-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {order.customer?.name?.charAt(0).toUpperCase() || "U"}
                          </div>
                          <span className="font-bold text-neutral-900 truncate max-w-[120px]">{order.customer?.name}</span>
                          <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-neutral-900 font-medium text-sm truncate max-w-[180px]">{order.customer?.address || "No Address"}</div>
                        <div className="text-[10px] font-bold text-[#6A0FAD] uppercase tracking-wider mt-0.5">{order.customer?.zone?.name || "All Zones"}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-[#4a0980] text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {order.items?.length || 0}
                          </div>
                          <span className="text-neutral-600 text-sm truncate max-w-[150px]">
                            {order.items?.map((i:any) => i.bowl?.name).join(', ') || "Items"}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-neutral-500 font-medium text-sm">12:30-1:30 PM</td>
                      <td className="py-4 px-4">
                        {order.driver ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center overflow-hidden shrink-0">
                              <User className="w-3 h-3 text-neutral-500" />
                            </div>
                            <span className="text-neutral-900 font-bold text-sm">{order.driver.name}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded border border-red-100 uppercase">
                            ⚠ Unassigned
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center justify-center px-3 py-1 font-bold text-[11px] rounded-full 
                          ${order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : 
                            order.status === 'DISPATCHED' ? 'bg-[#eaddf7] text-[#6A0FAD]' : 
                            'bg-yellow-100 text-yellow-700'}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center text-neutral-400 relative action-menu-container">
                        <button onClick={() => setActionMenuUlid(actionMenuUlid === order.ulid ? "" : order.ulid)} className="hover:text-neutral-900 p-2 rounded-lg hover:bg-neutral-100 transition-colors">
                          <MoreVertical className="w-4 h-4 mx-auto" />
                        </button>
                        {actionMenuUlid === order.ulid && (
                          <div className="absolute right-8 top-1/2 -translate-y-1/2 mt-0 w-40 bg-white border border-neutral-200 rounded-xl shadow-lg z-[60] overflow-hidden">
                            <button onClick={() => handleSelectForReassign(order.ulid)} className="w-full text-left px-4 py-2.5 text-xs font-bold text-neutral-700 hover:bg-neutral-50 hover:text-[#6A0FAD] transition-colors border-b border-neutral-100">
                              Reassign Driver
                            </button>
                            <button onClick={() => handleRemoveDriver(order.ulid)} className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors">
                              Remove Driver
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-neutral-100 p-3 text-center">
                <button className="text-[#6A0FAD] font-bold text-sm hover:underline">View All Records</button>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
