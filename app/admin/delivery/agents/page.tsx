"use client";

import { BowlLoader } from "@/components/admin/BowlLoader";
import { useState, useEffect } from "react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { Users, CheckCircle, Truck, Search, Plus, MoreVertical, Loader2 } from "lucide-react";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { endpoints } from "@/lib/apiService";
import Image from "next/image";

export default function DeliveryAgents() {
  const PAGE_SIZE = 10;
  const [agents, setAgents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: "", phone: "", password: "", is_active: true });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    setIsLoading(true);
    try {
      // Pass false to get all agents (active and inactive)
      const data = await endpoints.logistics.getDrivers(false) as any[];
      setAgents(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAgent = async () => {
    setIsSaving(true);
    try {
      await endpoints.logistics.createDriver(newAgent);
      setIsModalOpen(false);
      setNewAgent({ name: "", phone: "", password: "", is_active: true });
      fetchAgents();
    } catch (e: any) {
      alert("Failed to create agent: " + (e.detail || e.message));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAgentStatus = async (ulid: string, currentStatus: boolean) => {
    try {
      await endpoints.logistics.updateDriver(ulid, { is_active: !currentStatus });
      fetchAgents();
    } catch (e: any) {
      alert("Failed to update agent: " + (e.detail || e.message));
    }
  };

  const activeCount = agents.filter(a => a.is_active).length;

  const filteredAgents = agents.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.phone.includes(searchQuery)
  );
  const totalPages = Math.max(1, Math.ceil(filteredAgents.length / PAGE_SIZE));
  const pagedAgents = filteredAgents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const handleSearch = (q: string) => { setSearchQuery(q); setCurrentPage(1); };

  return (
    <div className="flex flex-col flex-1 h-full bg-[#F5F6F8]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-[#F5F6F8] overflow-hidden">
        <Header />
        
        <div className="mt-4 flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-[1400px] mx-auto pb-12">
            
            <Breadcrumbs segments={["ORDERS", "DELIVERY AGENTS"]} />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mt-6 mb-8">
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">Delivery Agent Management</h1>
                <p className="text-neutral-500 font-medium mt-1">Manage delivery agents, assigned zones and current workload.</p>
              </div>
              <ProbaeButton onClick={() => setIsModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Delivery Agent
              </ProbaeButton>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-[#FCF9FF] rounded-3xl p-6 shadow-sm border border-purple-100 flex justify-between items-center relative overflow-hidden">
                <div className="z-10">
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Total Agents</p>
                  <p className="text-4xl font-black text-neutral-900">{agents.length}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center z-10">
                  <Users className="w-6 h-6 text-[#6A0FAD]" />
                </div>
              </div>
              
              <div className="bg-[#F8FFF9] rounded-3xl p-6 shadow-sm border border-green-100 flex justify-between items-center relative overflow-hidden">
                <div className="z-10">
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Active</p>
                  <p className="text-4xl font-black text-green-700">{activeCount}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center z-10">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>

              <div className="bg-[#FCF9FF] rounded-3xl p-6 shadow-sm border border-purple-100 flex justify-between items-center relative overflow-hidden">
                <div className="z-10">
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">On Delivery</p>
                  <p className="text-4xl font-black text-[#6A0FAD]">0</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center z-10">
                  <Truck className="w-6 h-6 text-[#6A0FAD]" />
                </div>
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              <div className="flex-1 bg-white border border-neutral-200 rounded-2xl px-4 py-3 flex items-center">
                <Search className="w-5 h-5 text-neutral-400 mr-3" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Search by agent name or phone number..." 
                  className="w-full bg-transparent outline-none text-neutral-900 font-medium"
                />
              </div>
              <div className="flex gap-4">
                <div className="bg-white border border-neutral-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                  <span className="text-sm font-bold text-neutral-900">Zone:</span>
                  <select className="bg-transparent outline-none text-neutral-500 font-medium pr-4">
                    <option>All Zones</option>
                  </select>
                </div>
                <div className="bg-white border border-neutral-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                  <span className="text-sm font-bold text-neutral-900">Status:</span>
                  <select className="bg-transparent outline-none text-neutral-500 font-medium pr-4">
                    <option>All</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-neutral-100 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#2A2A2A] text-white">
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider">Agent Code</th>
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider">Agent</th>
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider">Phone Number</th>
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider">Username</th>
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-center">Assigned Zones</th>
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-center">Active Orders</th>
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-center">Status</th>
                    <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {isLoading ? (
                    <tr><td colSpan={8} className="py-12 text-center text-neutral-500"><BowlLoader className="w-8 h-8 animate-spin mx-auto text-[#6A0FAD]" /></td></tr>
                  ) : pagedAgents.length === 0 ? (
                    <tr><td colSpan={8} className="py-12 text-center text-neutral-500 font-medium">No agents found matching your search.</td></tr>
                  ) : pagedAgents.map((agent, localIdx) => {
                    const globalIdx = (currentPage - 1) * PAGE_SIZE + localIdx;
                    return (
                      <tr key={agent.ulid} className="hover:bg-neutral-50/50 group">
                        <td className="py-5 px-6">
                          <span className="font-mono text-neutral-400 font-medium text-sm">DA-{String(globalIdx + 1).padStart(3, '0')}</span>
                        </td>
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#f0e6f7] text-[#6A0FAD] flex items-center justify-center font-bold text-sm shadow-inner">
                              {agent.name.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="font-bold text-neutral-900">{agent.name}</span>
                          </div>
                        </td>
                        <td className="py-5 px-6">
                          <span className="text-neutral-500 font-mono text-sm">{agent.phone}</span>
                        </td>
                        <td className="py-5 px-6">
                          <span className="text-neutral-700 font-medium text-sm">{agent.username || "—"}</span>
                        </td>
                        <td className="py-5 px-6 text-center">
                          <span className="inline-flex px-3 py-1 bg-neutral-100 text-neutral-600 rounded-lg text-xs font-bold">All Zones</span>
                        </td>
                        <td className="py-5 px-6 text-center">
                          <span className="font-black text-[#6A0FAD] text-lg">0</span>
                        </td>
                        <td className="py-5 px-6 text-center">
                          {agent.is_active ? (
                            <span className="inline-flex items-center justify-center px-4 py-1.5 bg-green-100 text-green-700 font-bold text-xs rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2"></span>
                              Available
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center px-4 py-1.5 bg-neutral-100 text-neutral-500 font-bold text-xs rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 mr-2"></span>
                              Offline
                            </span>
                          )}
                        </td>
                        <td className="py-5 px-6 text-center relative">
                          <button 
                            className="w-8 h-8 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-400 mx-auto transition-colors"
                            onClick={() => toggleAgentStatus(agent.ulid, agent.is_active)}
                            title={agent.is_active ? "Disable Agent" : "Enable Agent"}
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-100 bg-neutral-50/50">
                  <span className="text-sm font-medium text-neutral-500">
                    Showing <span className="text-neutral-900 font-bold">{(currentPage - 1) * PAGE_SIZE + 1}</span> to <span className="text-neutral-900 font-bold">{Math.min(currentPage * PAGE_SIZE, filteredAgents.length)}</span> of <span className="text-neutral-900 font-bold">{filteredAgents.length}</span> agents
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-bold text-neutral-700 disabled:opacity-50 hover:bg-neutral-50"
                    >
                      Previous
                    </button>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm font-bold text-neutral-700 disabled:opacity-50 hover:bg-neutral-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
            <h2 className="text-xl font-bold text-neutral-900 mb-6">Add Delivery Agent</h2>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Agent Name</label>
                <input type="text" value={newAgent.name} onChange={e => setNewAgent({...newAgent, name: e.target.value})} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#6A0FAD] text-neutral-900" />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Phone Number (Login Username)</label>
                <input type="text" value={newAgent.phone} onChange={e => setNewAgent({...newAgent, phone: e.target.value})} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#6A0FAD] text-neutral-900" />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Login Password</label>
                <input type="password" value={newAgent.password} onChange={e => setNewAgent({...newAgent, password: e.target.value})} className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#6A0FAD] text-neutral-900" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-sm text-neutral-500 hover:bg-neutral-100 transition-colors">Cancel</button>
              <ProbaeButton onClick={handleSaveAgent} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Agent"}
              </ProbaeButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
