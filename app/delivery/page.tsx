"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { MapPin, Phone, CheckCircle, IndianRupee, Loader2, Package, RefreshCw } from "lucide-react";
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

  if (authLoading || !user) {
    return (
      <div className="flex h-full items-center justify-center bg-[#F5F6F8]">
        <Loader2 className="w-8 h-8 animate-spin text-[#6A0FAD]" />
      </div>
    );
  }

  const activeOrders = orders.filter(o => o.status === "DISPATCHED");
  const completedOrders = orders.filter(o => o.status === "DELIVERED");

  return (
    <div className="flex flex-col flex-1 h-full bg-[#F5F6F8]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-[#F5F6F8] overflow-hidden">
        <Header />

        <div className="mt-4 flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-[900px] mx-auto pb-12">

            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">My Deliveries</h1>
                <p className="text-neutral-500 font-medium mt-1">Your assigned deliveries for today.</p>
              </div>
              <button
                onClick={fetchDeliveries}
                className="w-10 h-10 bg-white rounded-xl border border-neutral-200 flex items-center justify-center text-neutral-500 hover:bg-neutral-50 transition-colors shadow-sm"
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
                            <div>
                              <span className="text-sm text-neutral-700 font-medium leading-tight block">
                                {order.customer?.address || "No address provided"}
                              </span>
                              {order.customer?.location_description && (
                                <span className="text-xs text-neutral-400 mt-0.5 italic block">{order.customer.location_description}</span>
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
                                {item.bowl?.name || "Bowl"}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* COD Action */}
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
                          <div className="flex items-center justify-between bg-green-50 rounded-2xl p-4 border border-green-100">
                            <span className="text-green-700 font-bold text-sm flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" /> Prepaid
                            </span>
                            <span className="font-black text-green-800 text-lg flex items-center">
                              <IndianRupee className="w-4 h-4" />
                              {order.billed_price}
                            </span>
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
