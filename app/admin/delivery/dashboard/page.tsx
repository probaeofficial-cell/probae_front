"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/admin/Header";
import { MapPin, Phone, User, Plus, Search, Filter, Loader2, RefreshCw, Briefcase, Map, ClipboardList, MoreVertical } from "lucide-react";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { endpoints } from "@/lib/apiService";

export default function DeliveryDashboard() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Bulk Assign states
  const [assignDriverUlid, setAssignDriverUlid] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const [ordersRes, driversRes] = await Promise.all([
        endpoints.orders.list({ target_date: today, limit: 100 }),
        endpoints.logistics.getDrivers()
      ]);
      
      const allOrders = (ordersRes as any).orders || [];
      // Include pending/unassembled for assignment, plus dispatched/delivered
      setOrders(allOrders);
      setDrivers((driversRes as any) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkAssign = async () => {
    if (!assignDriverUlid || selectedIds.length === 0) return;
    setIsAssigning(true);
    try {
      await endpoints.orders.bulkAssignDriver({
        order_ulids: selectedIds,
        driver_ulid: assignDriverUlid
      });
      setSelectedIds([]);
      setAssignDriverUlid("");
      fetchData();
    } catch (e: any) {
      alert("Failed to assign driver: " + (e.detail || e.message));
    } finally {
      setIsAssigning(false);
    }
  };

  // Metrics
  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === "DELIVERED").length;
  const pendingOrders = orders.filter(o => o.status === "PENDING" || o.status === "DISPATCHED").length;
  const completionPercentage = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;

  return (
    <div className="flex flex-col flex-1 h-full bg-[#F5F6F8]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-[#F5F6F8] overflow-hidden">
        <Header />
        
        <div className="mt-4 flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-[1400px] mx-auto pb-12">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold text-neutral-900">Delivery Management</h1>
                <p className="text-neutral-500 font-medium mt-1">Track today's deliveries, zone performance and completion status.</p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-white px-4 py-2.5 rounded-xl border border-neutral-200 flex items-center font-bold text-sm text-neutral-700 shadow-sm">
                  <span className="text-neutral-400 mr-3">&lt;</span>
                  {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  <span className="text-neutral-400 ml-3 mr-3">&gt;</span>
                  <span className="text-[#6A0FAD] bg-purple-50 px-2 py-0.5 rounded">Today</span>
                </div>
                <button onClick={fetchData} className="w-10 h-10 bg-white rounded-xl border border-neutral-200 flex items-center justify-center text-neutral-500 hover:bg-neutral-50 transition-colors shadow-sm">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <ProbaeButton variant="primary" onClick={() => {}} className="shadow-lg shadow-purple-500/20">
                  <Plus className="w-4 h-4 mr-2" />
                  Add / Assign Delivery
                </ProbaeButton>
              </div>
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
                <span className="w-2 h-2 rounded-full bg-[#6A0FAD] mr-2"></span> Out for Delivery ({orders.filter(o => o.status === "DISPATCHED").length})
              </button>
              <button className="shrink-0 inline-flex items-center px-4 py-2 bg-yellow-100 text-yellow-700 font-bold text-xs rounded-full border border-yellow-200">
                <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span> Pending ({orders.filter(o => o.status === "PENDING").length})
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
            {selectedIds.length > 0 && (
              <div className="bg-white p-4 rounded-xl shadow-sm mb-4 flex items-center justify-between border border-purple-100">
                <span className="font-bold text-[#6A0FAD] text-sm">{selectedIds.length} delivery selected</span>
                <div className="flex items-center gap-3">
                  <select 
                    value={assignDriverUlid}
                    onChange={(e) => setAssignDriverUlid(e.target.value)}
                    className="bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none text-neutral-700"
                  >
                    <option value="">Select Agent...</option>
                    {drivers.map(d => (
                      <option key={d.ulid} value={d.ulid}>{d.name}</option>
                    ))}
                  </select>
                  <button onClick={handleBulkAssign} disabled={!assignDriverUlid || isAssigning} className="bg-white border border-neutral-200 text-neutral-700 text-xs font-bold px-4 py-2 rounded-lg hover:bg-neutral-50">
                    {isAssigning ? <Loader2 className="w-3 h-3 animate-spin" /> : "Assign Agent"}
                  </button>
                  <button className="bg-white border border-neutral-200 text-neutral-700 text-xs font-bold px-4 py-2 rounded-lg hover:bg-neutral-50">
                    Mark Selected Complete
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
                      <input type="checkbox" onChange={(e) => {
                        if (e.target.checked) setSelectedIds(orders.map(o => o.ulid));
                        else setSelectedIds([]);
                      }} checked={selectedIds.length > 0 && selectedIds.length === orders.length} />
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
                    <tr><td colSpan={9} className="py-12 text-center text-neutral-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>
                  ) : orders.length === 0 ? (
                    <tr><td colSpan={9} className="py-12 text-center text-neutral-500 font-medium">No deliveries found for today.</td></tr>
                  ) : orders.map(order => (
                    <tr key={order.ulid} className="hover:bg-neutral-50/50">
                      <td className="py-4 px-4 text-center border-r border-neutral-100">
                        <input type="checkbox" checked={selectedIds.includes(order.ulid)} onChange={() => toggleSelect(order.ulid)} className="accent-[#6A0FAD]" />
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
                      <td className="py-4 px-4 text-center text-neutral-400">
                        <button className="hover:text-neutral-900"><MoreVertical className="w-4 h-4 mx-auto" /></button>
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
