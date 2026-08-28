"use client";
import { useState, useEffect } from "react";
import { Loader2, ExternalLink, Calendar, Eye, X, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { endpoints } from "@/lib/apiService";

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<"PLAN" | "CUSTOM">("PLAN");
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOrders = async (source: string, pageNum: number) => {
    setIsLoading(true);
    try {
      const data = await endpoints.orders.list({ source, page: pageNum, limit: 10 }) as any;
      if (data.success) {
        setOrders(data.orders);
        setTotalPages(Math.ceil(data.total_count / data.limit) || 1);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(activeTab, page);
  }, [activeTab, page]);

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        <Header />
        <Breadcrumbs segments={["Admin", "Orders"]} />
        <div className="mt-4 flex-1 flex flex-col min-h-0">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 shrink-0">
            <div>
              <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Orders</h1>
              <p className="text-neutral-500 font-medium mt-1">Manage subscription dispatches and custom orders</p>
            </div>
            <Link href="/admin/orders/new">
              <ProbaeButton className="!w-auto flex items-center gap-2">
                <Plus className="w-4 h-4" /> Create Custom Order
              </ProbaeButton>
            </Link>
          </div>

          <div className="flex-1 overflow-x-auto min-h-0 bg-white rounded-2xl border border-neutral-200 flex flex-col">
            <div className="flex border-b border-neutral-200 shrink-0">
              <button 
                className={`flex-1 py-3 font-bold text-xs tracking-wide uppercase transition-colors ${activeTab === "PLAN" ? "text-[#6A0FAD] border-b-2 border-[#6A0FAD] bg-[#6A0FAD]/5" : "text-neutral-500 hover:bg-neutral-50"}`}
                onClick={() => { setActiveTab("PLAN"); setPage(1); }}
              >
                Plan Orders
              </button>
              <button 
                className={`flex-1 py-3 font-bold text-xs tracking-wide uppercase transition-colors ${activeTab === "CUSTOM" ? "text-[#6A0FAD] border-b-2 border-[#6A0FAD] bg-[#6A0FAD]/5" : "text-neutral-500 hover:bg-neutral-50"}`}
                onClick={() => { setActiveTab("CUSTOM"); setPage(1); }}
              >
                Custom Orders
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#F3F4F6] border-b border-neutral-200">
                    <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap">ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap">Customer</th>
                    <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap">Target Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap text-right">Price</th>
                    <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-neutral-500 font-medium flex justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-[#6A0FAD]" />
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-neutral-500 font-medium">No orders found for this category.</td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.ulid} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-neutral-500 whitespace-nowrap">{order.ulid.substring(order.ulid.length - 6)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-bold text-neutral-900">{order.customer?.name || "Unknown"}</div>
                          <div className="text-xs text-neutral-500 font-medium">#{order.customer?.ulid.substring(order.customer.ulid.length - 6)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-neutral-400" />
                            <span className="font-bold text-neutral-900">{new Date(order.target_date).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800">
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="font-black text-neutral-900">₹{order.total_order_price.toFixed(2)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setSelectedOrder(order)} 
                              className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between shrink-0 mt-6">
            <span className="text-sm text-neutral-500 font-medium">Page {page} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-[#f8f5fb] text-neutral-600 hover:bg-[#f1edf7] disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || isLoading}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-[#f8f5fb] text-neutral-600 hover:bg-[#f1edf7] disabled:opacity-50 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Recipe Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-neutral-100 flex justify-between items-center bg-white shrink-0">
              <div>
                <h2 className="text-2xl font-black text-neutral-900">Order Recipe Snapshot</h2>
                <p className="text-sm text-neutral-500 font-medium mt-1">ID: {selectedOrder.ulid}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-neutral-100 rounded-full transition-colors"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-neutral-50/50 flex-1">
              <div className="space-y-6">
                {selectedOrder.items.map((item: any, idx: number) => (
                  <div key={item.id} className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <div className="text-[10px] font-black text-[#6A0FAD] uppercase tracking-widest mb-1">{item.meal_slot}</div>
                        <h3 className="text-lg font-bold text-neutral-900">{item.bowl_name}</h3>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-neutral-900">{Math.round(item.adjusted_calories)} kcal</div>
                        <div className="text-xs text-neutral-500 font-medium">₹{item.adjusted_price.toFixed(2)}</div>
                      </div>
                    </div>
                    
                    <div className="overflow-hidden rounded-xl border border-neutral-200">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-[#F3F4F6] text-[10px] uppercase tracking-wider text-neutral-500 font-bold border-b border-neutral-200">
                          <tr>
                            <th className="px-4 py-3">Ingredient</th>
                            <th className="px-4 py-3">Tag</th>
                            <th className="px-4 py-3 text-right">Base</th>
                            <th className="px-4 py-3 text-right font-black text-[#6A0FAD]">Scaled Weight</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {item.adjusted_ingredients.map((ing: any, i: number) => (
                            <tr key={i} className="hover:bg-neutral-50">
                              <td className="px-4 py-3 font-medium text-neutral-900">{ing.name}</td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-100 text-neutral-600">{ing.macro_tag}</span>
                              </td>
                              <td className="px-4 py-3 text-right text-neutral-500">{ing.original_weight}g</td>
                              <td className="px-4 py-3 text-right font-black text-[#6A0FAD] bg-[#6A0FAD]/5">{ing.new_weight}g</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
