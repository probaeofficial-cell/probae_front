"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { MapPin, Phone, CheckCircle, IndianRupee, Loader2, Package, RefreshCw, Navigation } from "lucide-react";
import { Header } from "@/components/admin/Header";
import { endpoints } from "@/lib/apiService";

export default function DeliveryPortal() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingUlid, setProcessingUlid] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/delivery/login");
      } else if (user.role !== "delivery") {
        router.push("/admin/dashboard");
      } else {
        fetchDeliveries();
      }
    }
  }, [user, authLoading]);

  const fetchDeliveries = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const data = await endpoints.orders.myDeliveries() as any;
      setOrders(data.orders || []);
    } catch (e: any) {
      setErrorMsg(e.detail || e.message || "Failed to load deliveries");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmCod = async (ulid: string) => {
    setProcessingUlid(ulid);
    setErrorMsg("");
    try {
      await endpoints.orders.confirmCod(ulid);
      await fetchDeliveries();
    } catch (e: any) {
      setErrorMsg("Failed to confirm payment: " + (e.detail || e.message));
    } finally {
      setProcessingUlid(null);
    }
  };

  const handleMarkDelivered = async (ulid: string) => {
    setProcessingUlid(ulid);
    setErrorMsg("");
    try {
      await endpoints.orders.markDelivered(ulid);
      await fetchDeliveries();
    } catch (e: any) {
      setErrorMsg("Failed to mark delivered: " + (e.detail || e.message));
    } finally {
      setProcessingUlid(null);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex h-full items-center justify-center bg-[#F5F6F8]">
        <Loader2 className="w-8 h-8 animate-spin text-[#6A0FAD]" />
      </div>
    );
  }

  const activeOrders = orders.filter(o => o.status !== "DELIVERED" && o.status !== "CANCELLED");
  const completedOrders = orders.filter(o => o.status === "DELIVERED");

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        <Header />
        
        <div className="mt-4 flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto min-h-0 pb-10 px-1 max-w-2xl mx-auto w-full">

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-black text-neutral-900 tracking-tight">My Deliveries</h1>
                <p className="text-sm text-neutral-500 font-medium mt-1">Today's assigned route</p>
              </div>
              <button 
                onClick={fetchDeliveries}
                className="w-10 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-xl flex items-center justify-center transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-100 flex flex-col items-start">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-3">Pending</p>
                <span className="text-4xl font-black text-[#6A0FAD]">{activeOrders.length}</span>
              </div>
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-100 flex flex-col items-start">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-3">Completed</p>
                <span className="text-4xl font-black text-green-600">{completedOrders.length}</span>
              </div>
            </div>

            {/* Error */}
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 mb-6 font-medium text-sm">
                {errorMsg}
              </div>
            )}

            {/* Orders List */}
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-neutral-100 shadow-sm">
                <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-neutral-300" />
                </div>
                <p className="text-neutral-500 font-medium">No assigned deliveries for today.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Active Orders */}
                {activeOrders.length > 0 && (
                  <>
                    <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-wider px-1">Active</h2>
                    {activeOrders.map(order => (
                      <div key={order.ulid} className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-100">
                        <div className="flex justify-between items-start mb-5">
                          <div>
                            <h3 className="font-bold text-neutral-900 text-lg">{order.customer?.name}</h3>
                            <p className="text-xs font-mono text-neutral-400 mt-0.5">#{order.order_number || order.ulid.slice(-8)}</p>
                          </div>
                          <span className="px-3 py-1.5 bg-[#eaddf7] text-[#6A0FAD] font-bold text-[10px] rounded-full uppercase tracking-wider">
                            Out for Delivery
                          </span>
                        </div>

                        <div className="space-y-3 mb-6 bg-neutral-50 rounded-2xl p-4">
                          <div className="flex items-start gap-3">
                            <MapPin className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <span className="text-sm text-neutral-700 font-medium leading-tight block">
                                {order.customer?.address || "No address provided"}
                              </span>
                              {order.customer?.location_description && (
                                <span className="text-xs text-neutral-400 mt-0.5 italic block">{order.customer.location_description}</span>
                              )}
                              
                              {order.customer?.latitude && order.customer?.longitude && (
                                <a 
                                  href={`https://www.google.com/maps/search/?api=1&query=${order.customer.latitude},${order.customer.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#6A0FAD] hover:text-violet-700 bg-white border border-[#eaddf7] shadow-sm px-3 py-1.5 rounded-lg transition-colors"
                                >
                                  <Navigation className="w-3.5 h-3.5" />
                                  Open in Maps
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Phone className="w-4 h-4 text-neutral-400 shrink-0" />
                            <span className="text-sm text-neutral-700 font-medium">{order.customer?.phone || "No phone"}</span>
                          </div>
                        </div>

                        {/* Items */}
                        {order.items?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-6">
                            {order.items.map((item: any, i: number) => (
                              <span key={i} className="inline-flex items-center px-3 py-1 bg-neutral-100 text-neutral-700 text-xs font-bold rounded-lg">
                                {item.bowl_name || "Bowl"}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        {order.requires_cod && !order.is_billed ? (
                          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Collect Cash</span>
                              <span className="font-black text-amber-900 text-xl flex items-center">
                                <IndianRupee className="w-4 h-4" />
                                {order.billed_price}
                              </span>
                            </div>
                            <button
                              onClick={() => handleConfirmCod(order.ulid)}
                              disabled={processingUlid === order.ulid}
                              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center shadow-lg shadow-amber-500/20 disabled:opacity-70"
                            >
                              {processingUlid === order.ulid ? <Loader2 className="w-5 h-5 animate-spin" /> : "✓ Payment Received"}
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3 bg-green-50 rounded-2xl p-4 border border-green-100">
                            <div className="flex items-center justify-between">
                              <span className="text-green-700 font-bold text-sm flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" /> Prepaid
                              </span>
                              <span className="font-black text-green-800 text-lg flex items-center">
                                <IndianRupee className="w-4 h-4" />
                                {order.billed_price}
                              </span>
                            </div>
                            <button
                              onClick={() => handleMarkDelivered(order.ulid)}
                              disabled={processingUlid === order.ulid}
                              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center shadow-lg shadow-green-600/20 disabled:opacity-70 mt-2"
                            >
                              {processingUlid === order.ulid ? <Loader2 className="w-5 h-5 animate-spin" /> : "Mark as Delivered"}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}

                {/* Completed Orders */}
                {completedOrders.length > 0 && (
                  <>
                    <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider px-1 pt-4">Completed Today</h2>
                    <div className="space-y-3 opacity-60">
                      {completedOrders.map(order => (
                        <div key={order.ulid} className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-100 flex justify-between items-center">
                          <div>
                            <p className="font-bold text-neutral-900">{order.customer?.name}</p>
                            <p className="text-xs font-mono text-neutral-400">#{order.order_number || order.ulid.slice(-8)}</p>
                          </div>
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
