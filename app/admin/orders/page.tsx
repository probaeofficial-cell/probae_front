"use client";
import { useState, useEffect } from "react";
import { Loader2, Calendar, Eye, ChevronLeft, ChevronRight, Plus, ListChecks } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { endpoints } from "@/lib/apiService";

export default function OrdersPage() {
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split("T")[0]);
  const [activeTab, setActiveTab] = useState<"PLAN" | "CUSTOM">("PLAN");
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const handleStatusChange = async (ulid: string, newStatus: string) => {
    try {
      await endpoints.orders.updateStatus(ulid, newStatus);
      setOrders(orders.map(o => o.ulid === ulid ? { ...o, status: newStatus } : o));
    } catch (e) {
      console.error("Failed to update status", e);
      alert("Failed to update status");
    }
  };

  const fetchOrders = async (source: string, pageNum: number, dateFilter: string) => {
    setIsLoading(true);
    try {
      const data = await endpoints.orders.list({ source, page: pageNum, limit: 10, target_date: dateFilter }) as any;
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
    fetchOrders(activeTab, page, targetDate);
  }, [activeTab, page, targetDate]);

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        <Header />
        <Breadcrumbs segments={["Admin", "Orders & KDS", "Daily Orders"]} />
        <div className="mt-4 flex-1 flex flex-col min-h-0">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
            <div>
              <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Daily Orders</h1>
              <p className="text-neutral-500 font-medium mt-1">Manage subscription dispatches and custom orders</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-white border border-neutral-200 rounded-xl px-3 py-2 shadow-sm">
                <Calendar className="w-4 h-4 text-neutral-400 mr-2" />
                <input 
                  type="date" 
                  value={targetDate} 
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="bg-transparent text-sm font-bold text-neutral-700 outline-none"
                />
              </div>

              <Link href="/admin/orders/new">
                <ProbaeButton className="!w-auto flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Custom Order
                </ProbaeButton>
              </Link>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 pb-10">
            <div className="relative flex mb-6 shrink-0 bg-neutral-100 p-1.5 rounded-2xl w-full max-w-[400px]">
              {/* Sliding background */}
              <div 
                className={`absolute top-1.5 bottom-1.5 left-1.5 w-[calc(50%-0.375rem)] bg-white rounded-xl shadow-sm transition-transform duration-300 ease-out ${
                  activeTab === "PLAN" ? "translate-x-0" : "translate-x-full"
                }`}
              />

              <button
                onClick={() => { setActiveTab("PLAN"); setPage(1); }}
                className={`relative z-10 flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-colors duration-300 ${activeTab === "PLAN" ? "text-[#6A0FAD]" : "text-neutral-500 hover:text-neutral-700 hover:text-neutral-900"}`}
              >
                <Calendar className="w-4 h-4" /> Plan Orders
              </button>
              <button
                onClick={() => { setActiveTab("CUSTOM"); setPage(1); }}
                className={`relative z-10 flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-colors duration-300 ${activeTab === "CUSTOM" ? "text-[#6A0FAD]" : "text-neutral-500 hover:text-neutral-700 hover:text-neutral-900"}`}
              >
                <ListChecks className="w-4 h-4" /> Custom Orders
              </button>
            </div>

            <div className="flex flex-col h-[calc(100%-4.5rem)] bg-white rounded-2xl border border-neutral-200">

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
                        <td colSpan={6} className="px-6 py-8 text-center">
                          <div className="flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#6A0FAD]" /></div>
                        </td>
                      </tr>
                    ) : orders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-neutral-500 font-medium">No orders found.</td>
                      </tr>
                    ) : (
                      orders.map((order) => (
                        <tr key={order.ulid} className="hover:bg-neutral-50/50 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs text-neutral-500 whitespace-nowrap">{order.ulid.substring(order.ulid.length - 6)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-bold text-neutral-900">{order.customer?.name || "Unknown"}</div>
                            <div className="text-xs text-neutral-500 font-medium">#{order.customer?.ulid.substring(order.customer.ulid.length - 6) || ""}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-neutral-400" />
                              <span className="font-bold text-neutral-900">{new Date(order.target_date).toLocaleDateString()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select 
                              value={order.status}
                              onChange={(e) => handleStatusChange(order.ulid, e.target.value)}
                              className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 outline-none cursor-pointer hover:bg-blue-200 transition-colors appearance-none"
                            >
                              <option value="CREATED">CREATED</option>
                              <option value="PREPARED">PREPARED</option>
                              <option value="DISPATCHED">DISPATCHED</option>
                              <option value="DELIVERED">DELIVERED</option>
                              <option value="CANCELLED">CANCELLED</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <div className="font-black text-neutral-900">₹{order.total_order_price.toFixed(2)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <Link 
                                href={`/admin/orders/${order.ulid}`}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between shrink-0 p-4 border-t border-neutral-200">
                <span className="text-sm text-neutral-500 font-medium">Page {page} of {totalPages}</span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || isLoading}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-[#f8f5fb] text-neutral-600 hover:bg-[#f1edf7] disabled:opacity-50 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || isLoading}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-[#f8f5fb] text-neutral-600 hover:bg-[#f1edf7] disabled:opacity-50 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
