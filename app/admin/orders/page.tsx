"use client";
import { BowlLoader } from "@/components/admin/BowlLoader";
import { useState, useEffect } from "react";
import { Loader2, Calendar, Eye, ChevronLeft, ChevronRight, Plus, ListChecks, Filter, X } from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { ProbaeSearch } from "@/components/admin/ProbaeSearch";
import AsyncCustomerSelect from "@/components/admin/AsyncCustomerSelect";
import { endpoints } from "@/lib/apiService";

export default function OrdersPage() {
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");
  const [customerId, setCustomerId] = useState<number | 0>(0);
  const [status, setStatus] = useState("");
  
  const [activeTab, setActiveTab] = useState<"PLAN" | "CUSTOM">("PLAN");
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [tempSearch, setTempSearch] = useState("");
  const [tempTargetDate, setTempTargetDate] = useState("");
  const [tempCustomerId, setTempCustomerId] = useState<number | 0>(0);
  const [tempStatus, setTempStatus] = useState("");

  const handleStatusChange = async (ulid: string, newStatus: string) => {
    try {
      await endpoints.orders.updateStatus(ulid, newStatus);
      setOrders(orders.map(o => o.ulid === ulid ? { ...o, status: newStatus } : o));
    } catch (e) {
      console.error("Failed to update status", e);
      alert("Failed to update status");
    }
  };

  const fetchOrders = async (source: string, pageNum: number, dateFilter: string, searchQuery: string, customerIdFilter: number, statusFilter: string) => {
    setIsLoading(true);
    try {
      const data = await endpoints.orders.list({ source, page: pageNum, limit: 10, target_date: dateFilter, search: searchQuery || undefined, customer_id: customerIdFilter || 0, status: statusFilter || undefined }) as any;
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
    fetchOrders(activeTab, page, targetDate, search, customerId, status);
  }, [activeTab, page, targetDate, search, customerId, status]);

  return (<>
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
            
            <div className="flex flex-wrap md:flex-nowrap items-center gap-3 md:gap-4 w-full md:w-auto">
              <button 
                onClick={() => {
                  setTempSearch(search);
                  setTempTargetDate(targetDate);
                  setTempCustomerId(customerId);
                  setTempStatus(status);
                  setIsFilterModalOpen(true);
                }}
                className={`flex items-center justify-center w-11 h-11 rounded-2xl border transition-all ${
                  (search || targetDate || customerId || status) 
                    ? "bg-[#6A0FAD]/10 border-[#6A0FAD]/30 text-[#6A0FAD]" 
                    : "bg-white border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:bg-neutral-50"
                }`}
              >
                <Filter className="w-5 h-5" />
              </button>

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
                          <div className="flex justify-center"><BowlLoader className="w-6 h-6 animate-spin text-[#6A0FAD]" /></div>
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
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/50">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-[#6A0FAD]" />
                <h3 className="font-bold text-neutral-800 text-lg">Filter Orders</h3>
              </div>
              <button onClick={() => setIsFilterModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 transition-colors p-1 bg-white rounded-full border border-neutral-200 shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[60vh]">
              
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase tracking-wide">Customer</label>
                <AsyncCustomerSelect 
                  value={tempCustomerId}
                  onChange={setTempCustomerId}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase tracking-wide">Order ID</label>
                <input 
                  type="text" 
                  value={tempSearch}
                  onChange={(e) => setTempSearch(e.target.value)}
                  placeholder="Enter specific Order ID..."
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 outline-none focus:border-[#6A0FAD] focus:ring-2 focus:ring-[#6A0FAD]/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase tracking-wide">Status</label>
                <select 
                  value={tempStatus}
                  onChange={(e) => setTempStatus(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 outline-none focus:border-[#6A0FAD] focus:ring-2 focus:ring-[#6A0FAD]/20 transition-all appearance-none"
                >
                  <option value="">Any Status</option>
                  <option value="CREATED">CREATED</option>
                  <option value="PREPARED">PREPARED</option>
                  <option value="DISPATCHED">DISPATCHED</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase tracking-wide">Target Date</label>
                <input 
                  type="date" 
                  value={tempTargetDate}
                  onChange={(e) => setTempTargetDate(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 outline-none focus:border-[#6A0FAD] focus:ring-2 focus:ring-[#6A0FAD]/20 transition-all"
                />
              </div>
            </div>
            
            <div className="p-4 border-t border-neutral-100 flex gap-3 bg-neutral-50/50">
              <button 
                onClick={() => {
                  setSearch("");
                  setTargetDate("");
                  setCustomerId(0);
                  setStatus("");
                  setPage(1);
                  setIsFilterModalOpen(false);
                }}
                className="flex-1 py-2.5 bg-white border border-neutral-200 text-neutral-700 rounded-xl font-bold text-sm hover:bg-neutral-50 transition-colors shadow-sm"
              >
                Clear
              </button>
              <button 
                onClick={() => setIsFilterModalOpen(false)}
                className="flex-1 py-2.5 bg-white border border-neutral-200 text-neutral-700 rounded-xl font-bold text-sm hover:bg-neutral-50 transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setSearch(tempSearch);
                  setTargetDate(tempTargetDate);
                  setCustomerId(tempCustomerId);
                  setStatus(tempStatus);
                  setPage(1);
                  setIsFilterModalOpen(false);
                }}
                className="flex-1 py-2.5 bg-[#6A0FAD] border border-transparent text-white rounded-xl font-bold text-sm hover:bg-[#5a0c94] transition-colors shadow-sm"
              >
                Filter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
</>);
}
