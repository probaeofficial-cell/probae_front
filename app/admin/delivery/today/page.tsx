"use client";

import { BowlLoader } from "@/components/admin/BowlLoader";
import { useState, useEffect } from "react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { endpoints } from "@/lib/apiService";
import { getMediaUrl } from "@/lib/utils";
import { MapPin, Phone, Truck, CheckCircle2, User, Loader2, Search, Filter, Navigation } from "lucide-react";

export default function DeliveryToday() {
  const [targetDate, setTargetDate] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [mealSlotFilter, setMealSlotFilter] = useState("ALL");
  const [mealSlots, setMealSlots] = useState<any[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [systemSettings, setSystemSettings] = useState({ R2_BASE_URL: "" });

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

  const fetchDeliveries = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const data = await endpoints.orders.list({ target_date: targetDate, status: "DISPATCHED", limit: 500 }) as any;
      if (data.success) {
        setOrders(data.orders || []);
      } else {
        setErrorMsg("Failed to load deliveries");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to load deliveries");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasInitialized) {
      fetchDeliveries();
    }
  }, [targetDate, hasInitialized]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await endpoints.settings.getSystemSettings();
        if (data && data.R2_BASE_URL !== undefined) {
          setSystemSettings({ R2_BASE_URL: data.R2_BASE_URL });
        }
      } catch (e) {
        console.error("Failed to load settings");
      }
    };
    fetchSettings();
  }, []);

  const handleMarkDelivered = async (ulid: string) => {
    setUpdatingId(ulid);
    try {
      const res = await endpoints.orders.updateStatus(ulid, "DELIVERED") as any;
      if (res.success) {
        setOrders(prev => prev.filter(o => o.ulid !== ulid));
      } else {
        alert("Failed to update status");
      }
    } catch (e) {
      alert("Error updating status");
    } finally {
      setUpdatingId(null);
    }
  };

  const getMapLink = (lat?: number | string, lng?: number | string, address?: string) => {
    if (lat && lng) {
      return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    }
    if (address) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    }
    return null;
  };

  const filteredOrders = orders.filter(order => {
    const cust = order.customer || {};
    const nameMatch = (cust.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const addressMatch = (cust.address || "").toLowerCase().includes(searchQuery.toLowerCase());
    const idMatch = order.ulid.toLowerCase().includes(searchQuery.toLowerCase());
    const searchMatch = nameMatch || addressMatch || idMatch;

    let slotMatch = true;
    if (mealSlotFilter !== "ALL") {
      // Find the name of the active slug
      const activeSlotObj = mealSlots.find(s => s.slug === mealSlotFilter);
      const slotName = activeSlotObj ? activeSlotObj.name : mealSlotFilter;
      // Some orders store slug, some store name, we match case-insensitively just in case
      slotMatch = (order.items || []).some((item: any) => {
        const itemSlot = (item.meal_slot || "").toLowerCase();
        return itemSlot === mealSlotFilter.toLowerCase() || itemSlot === (slotName || "").toLowerCase();
      });
    }

    return searchMatch && slotMatch;
  });

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        <Header />
        <Breadcrumbs segments={["Admin", "Delivery", "Today's Deliveries"]} />
        
        <div className="mt-4 flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-6xl mx-auto pb-12">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Active Deliveries</h1>
                <p className="text-sm font-medium text-neutral-500 mt-1">Orders currently out for delivery (DISPATCHED)</p>
              </div>
              
              <div className="flex items-center gap-2 bg-neutral-100 p-1.5 rounded-xl border border-neutral-200">
                <input 
                  type="date"
                  value={targetDate}
                  onChange={e => setTargetDate(e.target.value)}
                  className="bg-transparent border-none text-sm font-bold text-neutral-700 focus:ring-0 cursor-pointer outline-none px-2"
                />
              </div>
            </div>

            {/* Search */}
            <div className="mb-6 relative">
              <Search className="w-5 h-5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, address, or Order ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 h-[48px] rounded-xl border border-neutral-200 focus:border-[#6A0FAD] focus:ring-1 focus:ring-[#6A0FAD] outline-none text-sm font-medium text-neutral-900"
              />
            </div>

            {/* Meal Slot Pills */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-thin">
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

            {errorMsg && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">
                {errorMsg}
              </div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-64 bg-neutral-100 rounded-3xl animate-pulse"></div>
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-neutral-50 rounded-3xl border border-neutral-200 border-dashed">
                <Truck className="w-16 h-16 text-neutral-300 mb-4" />
                <h3 className="text-xl font-bold text-neutral-700 mb-1">No Deliveries Found</h3>
                <p className="text-neutral-500 font-medium">Try adjusting your filters or date.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredOrders.map(order => {
                  const customer = order.customer || {};
                  const mapLink = getMapLink(customer.latitude, customer.longitude, customer.address);
                  const isUpdating = updatingId === order.ulid;
                  
                  return (
                    <div key={order.ulid} className="bg-white rounded-3xl border border-neutral-200 p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-between overflow-hidden relative group">
                      
                      {/* Customer Info Header */}
                      <div className="flex justify-between items-start mb-6 pb-6 border-b border-neutral-100">
                        <div className="flex items-center gap-4">
                          {customer.image_filename ? (
                            <img src={getMediaUrl(systemSettings.R2_BASE_URL, customer.image_filename) as string} alt="Customer" className="w-12 h-12 rounded-full object-cover shadow-sm border border-neutral-200" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#f8f5fb] to-[#f0e6f7] text-[#6A0FAD] flex items-center justify-center shrink-0 border border-[#6A0FAD]/20 shadow-sm">
                              <User className="w-6 h-6" />
                            </div>
                          )}
                          <div>
                            <h3 className="text-lg font-black text-neutral-900 leading-tight">{customer.name || 'Unknown Customer'}</h3>
                            <p className="text-xs font-bold text-neutral-400 mt-1 uppercase tracking-wider">{order.ulid}</p>
                          </div>
                        </div>
                        <span className="px-3 py-1.5 bg-yellow-100 text-yellow-800 font-bold text-xs rounded-xl border border-yellow-200 uppercase tracking-wide">
                          {order.status}
                        </span>
                      </div>
                      
                      {/* Contact & Location */}
                      <div className="space-y-4 mb-6">
                        <div className="flex items-center gap-3 bg-neutral-50 p-3 rounded-2xl border border-neutral-100">
                          <div className="w-8 h-8 rounded-full bg-white border border-neutral-200 flex items-center justify-center shrink-0">
                            <Phone className="w-4 h-4 text-[#6A0FAD]" />
                          </div>
                          <a href={`tel:${customer.phone}`} className="text-sm font-bold text-neutral-700 hover:text-[#6A0FAD] transition-colors">
                            {customer.phone || 'No phone number provided'}
                          </a>
                        </div>
                        
                        <div className="flex items-start gap-3 bg-blue-50/50 p-3 rounded-2xl border border-blue-100">
                          <div className="w-8 h-8 rounded-full bg-white border border-blue-200 flex items-center justify-center shrink-0 mt-0.5">
                            <MapPin className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 pr-2">
                            <p className="text-sm font-bold text-neutral-800 leading-snug">
                              {customer.address || 'No address provided'}
                            </p>
                            {mapLink && (
                              <a href={mapLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg mt-3 transition-colors shadow-sm">
                                <Navigation className="w-3 h-3" /> Navigate
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Bowl Details */}
                      <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200 mb-6 flex-1">
                        <p className="text-xs font-black text-neutral-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                          <Truck className="w-3.5 h-3.5" /> Order Contents
                        </p>
                        
                        <div className="space-y-3">
                          {(order.items || []).map((item: any) => (
                            <div key={item.id} className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
                              <div className="p-3 border-b border-neutral-100 flex justify-between items-center bg-gradient-to-r from-white to-neutral-50">
                                <div>
                                  <span className="font-black text-neutral-900">{item.quantity}x {item.bowl?.name || 'Custom Bowl'}</span>
                                  <div className="text-xs text-neutral-500 font-bold mt-0.5">{item.adjusted_calories?.toFixed(0)} kcal</div>
                                </div>
                                <span className="px-2.5 py-1 bg-white border border-neutral-200 text-neutral-700 text-[10px] font-black rounded-lg shadow-sm tracking-wide">
                                  {item.meal_slot}
                                </span>
                              </div>
                              <div className="p-3">
                                <div className="flex flex-wrap gap-1.5">
                                  {(item.adjusted_ingredients || []).map((ing: any, idx: number) => (
                                    <span key={idx} className="px-2 py-1 bg-neutral-100 text-neutral-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                      {ing.name} <span className="text-[#6A0FAD]">({ing.new_weight || ing.weight}g)</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => handleMarkDelivered(order.ulid)}
                        disabled={isUpdating}
                        className="w-full py-4 bg-[#1c1c1c] text-white font-black rounded-2xl hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-[0_4px_15px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] active:scale-[0.98]"
                      >
                        {isUpdating ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" /> Updating Status...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-5 h-5" /> Mark Order as Delivered
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
