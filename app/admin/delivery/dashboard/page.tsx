"use client";

import { useState } from "react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Plus,
  ShoppingBag,
  ClipboardList,
  Map,
  Globe,
  MapPin,
  TrendingDown,
  TrendingUp,
  Search,
  Filter,
  Phone,
  MoreVertical,
  Zap,
  Briefcase,
  Star,
  User
} from "lucide-react";
import { ProbaeButton } from "@/components/admin/ProbaeButton";

export default function DeliveryDashboard() {
  const [selectedIds, setSelectedIds] = useState<string[]>(["PB1042"]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-[#F5F6F8]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-[#F5F6F8] overflow-hidden">
        <Header />
        
        <div className="mt-4 flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-[1400px] mx-auto pb-12">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">Delivery Management</h1>
                <p className="text-sm text-neutral-500 mt-1">Track today's deliveries, zone performance and completion status.</p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-sm">
                  <button className="p-2 hover:bg-neutral-50 text-neutral-400"><ChevronLeft className="w-4 h-4" /></button>
                  <div className="px-4 py-2 text-sm font-bold text-neutral-700 border-x border-neutral-200">14 Aug 2026</div>
                  <button className="p-2 hover:bg-neutral-50 text-neutral-400 border-r border-neutral-200"><ChevronRight className="w-4 h-4" /></button>
                  <button className="px-4 py-2 text-sm font-bold text-[#6A0FAD] hover:bg-neutral-50">Today</button>
                </div>
                <button className="p-2.5 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 shadow-sm text-neutral-500">
                  <RotateCcw className="w-4 h-4" />
                </button>
                <ProbaeButton className="!w-auto !py-2.5 shadow-sm">
                  <Plus className="w-4 h-4 mr-2" /> Add / Assign Delivery
                </ProbaeButton>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Orders */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-6">
                  <span className="text-sm font-medium text-neutral-500">Total Orders</span>
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-[#6A0FAD]">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h2 className="text-4xl font-black text-neutral-900">30</h2>
                  <p className="text-xs text-neutral-500 mt-2">Today's scheduled deliveries</p>
                </div>
              </div>

              {/* Completion */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-6">
                  <span className="text-sm font-medium text-neutral-500">Completion</span>
                  <div className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-md">68%</div>
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <h2 className="text-4xl font-black text-neutral-900">12</h2>
                    <span className="text-sm font-bold text-neutral-400">/ 30</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-100 rounded-full mt-3 overflow-hidden flex">
                    <div className="h-full bg-green-500 w-[40%] rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Pending */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-6">
                  <span className="text-sm font-medium text-neutral-500">Pending</span>
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h2 className="text-4xl font-black text-neutral-900">18</h2>
                  <p className="text-xs text-neutral-500 mt-2">Deliveries remaining</p>
                </div>
              </div>

              {/* Active Zones */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-6">
                  <span className="text-sm font-medium text-neutral-500">Active Zones</span>
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-600">
                    <Map className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h2 className="text-4xl font-black text-neutral-900">4</h2>
                  <p className="text-xs text-neutral-500 mt-2">Operational zones today</p>
                </div>
              </div>
            </div>

            {/* Status Filters */}
            <div className="flex items-center gap-3 mb-10 overflow-x-auto pb-2">
              <span className="text-sm font-medium text-neutral-500 mr-2 whitespace-nowrap">Status Filters:</span>
              <button className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-xs font-bold whitespace-nowrap hover:bg-green-200 transition-colors">
                <div className="w-2 h-2 rounded-full bg-green-600"></div> Completed (12)
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-purple-200/50 text-[#6A0FAD] border border-purple-200 rounded-full text-xs font-bold whitespace-nowrap hover:bg-purple-200 transition-colors">
                <div className="w-2 h-2 rounded-full bg-[#6A0FAD]"></div> Out for Delivery (5)
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold whitespace-nowrap hover:bg-yellow-200 transition-colors">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div> Pending (11)
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-full text-xs font-bold whitespace-nowrap hover:bg-red-100 transition-colors">
                <div className="w-2 h-2 rounded-full bg-red-500"></div> Failed/Issue (2)
              </button>
            </div>

            {/* Delivery Zones */}
            <h2 className="text-xl font-bold text-neutral-900 mb-4">Delivery Zones</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {/* All Zones */}
              <div className="bg-[#4a0980] p-6 rounded-2xl shadow-md text-white relative overflow-hidden flex flex-col justify-between">
                <Globe className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10" />
                <div className="relative z-10 mb-8">
                  <h3 className="text-xl font-black mb-1">All Zones</h3>
                  <p className="text-sm text-purple-200">System Wide Overview</p>
                </div>
                <div className="relative z-10 space-y-5">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-2">
                      <span>Completion</span>
                      <span>68%</span>
                    </div>
                    <div className="w-full h-1.5 bg-purple-900/50 rounded-full overflow-hidden">
                      <div className="h-full bg-white w-[68%] rounded-full"></div>
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-purple-200 font-medium mb-0.5 uppercase tracking-wider">Total Deliveries</p>
                      <p className="text-xl font-black">30</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-purple-200 font-medium mb-0.5 uppercase tracking-wider">Avg Cost</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xl font-black">₹34</p>
                        <span className="flex items-center text-[10px] bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded font-bold">
                          <TrendingDown className="w-3 h-3 mr-0.5" /> 1.2%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hilite */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex flex-col justify-between">
                <div className="mb-8">
                  <h3 className="text-lg font-black text-neutral-900 mb-1">Hilite</h3>
                  <p className="text-xs text-neutral-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> 4.2 km from centre
                  </p>
                </div>
                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-neutral-900 mb-2">
                      <span>Completion</span>
                      <span>8/10</span>
                    </div>
                    <div className="flex gap-1 h-1.5">
                      {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="flex-1 bg-green-600 rounded-full"></div>)}
                      {[1,2].map(i => <div key={i} className="flex-1 bg-neutral-100 rounded-full"></div>)}
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-neutral-400 font-bold mb-0.5 uppercase tracking-wider">Agents</p>
                      <p className="text-lg font-black text-neutral-900">2</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-neutral-400 font-bold mb-0.5 uppercase tracking-wider">Avg Cost</p>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-black text-neutral-900">₹28</p>
                        <span className="flex items-center text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">
                          <TrendingDown className="w-3 h-3 mr-0.5" /> 2.1%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kallayi */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex flex-col justify-between relative">
                <div className="absolute top-6 right-6 w-2 h-2 bg-orange-500 rounded-full"></div>
                <div className="mb-8">
                  <h3 className="text-lg font-black text-neutral-900 mb-1">Kallayi</h3>
                  <p className="text-xs text-neutral-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> 12.4 km from centre
                  </p>
                </div>
                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-neutral-900 mb-2">
                      <span>Completion</span>
                      <span>2/12</span>
                    </div>
                    <div className="flex gap-1 h-1.5">
                      {[1,2].map(i => <div key={i} className="flex-1 bg-green-600 rounded-full"></div>)}
                      {[1,2,3,4,5,6,7,8,9,10].map(i => <div key={i} className="flex-1 bg-[#f0e6f7] rounded-full"></div>)}
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-neutral-400 font-bold mb-0.5 uppercase tracking-wider">Agents</p>
                      <p className="text-lg font-black text-neutral-900">3</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-neutral-400 font-bold mb-0.5 uppercase tracking-wider">Avg Cost</p>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-black text-neutral-900">₹42</p>
                        <span className="flex items-center text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-bold">
                          <TrendingUp className="w-3 h-3 mr-0.5" /> 5.4%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden mb-8">
              {/* Toolbar */}
              <div className="p-4 sm:px-6 py-5 border-b border-neutral-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-neutral-900">Today's Deliveries</h2>
                  <span className="px-2 py-1 bg-neutral-100 text-neutral-600 text-xs font-medium rounded-md">30 Records</span>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder="Search ID, Name..." 
                      className="w-full pl-9 pr-4 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#6A0FAD] text-neutral-900"
                    />
                  </div>
                  <select className="border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-700 bg-white outline-none hidden sm:block">
                    <option>All Zones</option>
                    <option>Hilite</option>
                    <option>Kallayi</option>
                  </select>
                  <button className="flex items-center gap-2 px-4 py-2 border border-neutral-200 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 whitespace-nowrap">
                    <Filter className="w-4 h-4" /> Filter
                  </button>
                </div>
              </div>

              {/* Selection Bar */}
              {selectedIds.length > 0 && (
                <div className="px-6 py-3 bg-[#faf5ff] border-b border-[#e9d5ff] flex justify-between items-center">
                  <span className="text-sm font-medium text-[#6A0FAD]">{selectedIds.length} delivery selected</span>
                  <button className="px-4 py-1.5 bg-white border border-neutral-200 text-neutral-700 text-sm font-bold rounded-lg shadow-sm hover:bg-neutral-50 transition-colors">
                    Mark Selected Complete
                  </button>
                </div>
              )}

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-[#1C1C1C] text-white">
                      <th className="py-3 px-6 font-bold text-xs uppercase tracking-wider w-12 text-center">
                        <input type="checkbox" className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 accent-[#6A0FAD]" />
                      </th>
                      <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider">Order ID</th>
                      <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider">Customer</th>
                      <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider">Address & Zone</th>
                      <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider">Bowls</th>
                      <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider">Delivery Slot</th>
                      <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider">Agent</th>
                      <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-center">Status</th>
                      <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {/* Row 1 */}
                    <tr className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-4 px-6 text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes("PB1042")}
                          onChange={() => toggleSelect("PB1042")}
                          className="w-4 h-4 rounded border-neutral-300 accent-[#6A0FAD] cursor-pointer" 
                        />
                      </td>
                      <td className="py-4 px-4 font-medium text-neutral-900">#PB1042</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-800 text-white flex items-center justify-center font-bold text-xs">S</div>
                          <span className="font-medium text-neutral-900 flex items-center gap-2">Safna <Phone className="w-3.5 h-3.5 text-neutral-400" /></span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-neutral-900 font-medium truncate max-w-[200px]">Beach Road, 4th Cross</div>
                        <div className="text-[10px] font-bold text-[#6A0FAD] uppercase tracking-wider mt-0.5">Hilite</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-[#4a0980] text-white flex items-center justify-center text-xs font-bold">2</div>
                          <span className="text-neutral-600 truncate max-w-[150px]">Chckn Pwr, Bal Oat</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-neutral-500 font-medium">12:30–1:30 PM</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center overflow-hidden">
                            <User className="w-3 h-3 text-neutral-500" />
                          </div>
                          <span className="text-neutral-900 font-medium">Aju</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-3 py-1 bg-yellow-100 text-yellow-700 font-bold text-[11px] rounded-full">
                          Pending
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button className="p-1 hover:bg-neutral-200 rounded-lg text-neutral-400 transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>

                    {/* Row 2 */}
                    <tr className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-4 px-6 text-center">
                        <input 
                          type="checkbox"
                          checked={selectedIds.includes("PB1043")}
                          onChange={() => toggleSelect("PB1043")} 
                          className="w-4 h-4 rounded border-neutral-300 accent-[#6A0FAD] cursor-pointer" 
                        />
                      </td>
                      <td className="py-4 px-4 font-medium text-neutral-900">#PB1043</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-400 text-white flex items-center justify-center font-bold text-xs">R</div>
                          <span className="font-medium text-neutral-900 flex items-center gap-2">Rahul K <Phone className="w-3.5 h-3.5 text-neutral-400" /></span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-neutral-900 font-medium truncate max-w-[200px]">Cyberpark Phase 1</div>
                        <div className="text-[10px] font-bold text-[#6A0FAD] uppercase tracking-wider mt-0.5">Kallayi</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-[#4a0980] text-white flex items-center justify-center text-xs font-bold">1</div>
                          <span className="text-neutral-600 truncate max-w-[150px]">Vegan Delight</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-neutral-500 font-medium">1:00–2:00 PM</td>
                      <td className="py-4 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-red-200 text-red-600 bg-red-50 rounded-lg text-xs font-medium">
                          <span className="text-red-600 text-[10px]">⚠</span> Unassigned
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-3 py-1 bg-yellow-100 text-yellow-700 font-bold text-[11px] rounded-full">
                          Pending
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button className="p-1 hover:bg-neutral-200 rounded-lg text-neutral-400 transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>

                    {/* Row 3 */}
                    <tr className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-4 px-6 text-center">
                        <input 
                          type="checkbox"
                          checked={selectedIds.includes("PB1038")}
                          onChange={() => toggleSelect("PB1038")} 
                          className="w-4 h-4 rounded border-neutral-300 accent-[#6A0FAD] cursor-pointer" 
                        />
                      </td>
                      <td className="py-4 px-4 font-medium text-neutral-900">#PB1038</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs">M</div>
                          <span className="font-medium text-neutral-900 flex items-center gap-2">Maya T</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-neutral-900 font-medium truncate max-w-[200px]">Govt Hospital Rd</div>
                        <div className="text-[10px] font-bold text-[#6A0FAD] uppercase tracking-wider mt-0.5">Hilite</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-[#4a0980] text-white flex items-center justify-center text-xs font-bold">3</div>
                          <span className="text-neutral-600 truncate max-w-[150px]">Keto x2, Fruit Bowl</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-neutral-500 font-medium">11:30–12:30 PM</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center overflow-hidden">
                            <User className="w-3 h-3 text-neutral-500" />
                          </div>
                          <span className="text-neutral-900 font-medium">Binu</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center justify-center px-3 py-1 bg-green-100 text-green-700 font-bold text-[11px] rounded-full">
                          Completed
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button className="p-1 hover:bg-neutral-200 rounded-lg text-neutral-400 transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="border-t border-neutral-100 p-4 text-center">
                <button className="text-sm font-bold text-[#6A0FAD] hover:text-[#4a0980] transition-colors">View All Records</button>
              </div>
            </div>

            {/* Bottom Summary Bar */}
            <div className="bg-[#262626] rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center text-white gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-green-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-0.5">Fastest Zone</p>
                  <p className="font-bold">Hilite <span className="text-sm text-neutral-300 font-normal ml-1">(Avg 24m)</span></p>
                </div>
              </div>
              
              <div className="hidden md:block w-px h-10 bg-white/10"></div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-yellow-400">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-0.5">Highest Load</p>
                  <p className="font-bold">Kallayi <span className="text-sm text-neutral-300 font-normal ml-1">(12 Orders)</span></p>
                </div>
              </div>

              <div className="hidden md:block w-px h-10 bg-white/10"></div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-red-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-0.5">High Del. Cost</p>
                  <p className="font-bold">Kallayi <span className="text-sm text-neutral-300 font-normal ml-1">(₹42)</span></p>
                </div>
              </div>

              <div className="hidden md:block w-px h-10 bg-white/10"></div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
                  <Star className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-0.5">Active Agent</p>
                  <p className="font-bold">Aju <span className="text-sm text-neutral-300 font-normal ml-1">(6 Del.)</span></p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
