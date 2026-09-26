"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ProbaeSearch } from "@/components/admin/ProbaeSearch";
import { api } from "@/lib/apiService";
import { BowlLoader } from "@/components/admin/BowlLoader";
import { SubscriptionSidePanel } from "@/components/admin/SubscriptionSidePanel";
import { MoreVertical, X, CheckCircle2, Hourglass, PauseCircle, ChevronLeft, ChevronRight } from "lucide-react";

export default function SubscriptionsDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  
  // Pagination
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;
  
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [allCustomers, setAllCustomers] = useState<any[]>([]);


  useEffect(() => {
    if (showAddModal && allCustomers.length === 0) {
      api.get("/customers?limit=1000").then((res: any) => {
         if (res && res.customers) {
           setAllCustomers(res.customers);
         } else if (Array.isArray(res)) {
           setAllCustomers(res);
         }
      }).catch(err => {
         console.error("Failed to load customers:", err);
         setAllCustomers([]); // prevent infinite loading if it fails completely
      });
    }
  }, [showAddModal]);

  useEffect(() => {
    loadDashboard();
  }, []);


  const handleExport = () => {
    if (!data) return;
    const headers = ["Customer ID", "Name", "Phone", "Plan Name", "Started On", "Total Bowls", "Delivered", "Remaining", "On Hold", "Est Completion", "Status"];
    const rows = data.subscriptions.map((s: any) => [
      s.customer.ulid,
      s.customer.name,
      s.customer.phone,
      s.plan.name,
      s.plan.start_date,
      s.plan.total_bowls,
      s.progress.done,
      s.progress.left,
      s.progress.hold,
      s.est_completion,
      s.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + 
      [headers.join(","), ...rows.map((e: any[]) => e.map(field => `"${field}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `subscriptions_audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get("/customers/subscriptions/dashboard");
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
        <div className="p-8 pb-32 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-[#F9FAFB] items-center justify-center">
          <BowlLoader className="w-12 h-12 text-[#6A0FAD] animate-bounce" />
          <p className="mt-4 text-sm font-bold text-neutral-500 uppercase tracking-widest">Loading Dashboard...</p>
        </div>
      </div>
    );
  }
  if (!data) return <div>Failed to load data</div>;

  const { kpis, subscriptions } = data;

  // Apply Filters
  const filteredSubs = subscriptions.filter((s: any) => {
    const matchesSearch = s.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.customer.phone.includes(searchTerm) ||
                          s.customer.ulid.includes(searchTerm);
                          
    const matchesStatus = statusFilter === "All" || s.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Apply Pagination
  const totalPages = Math.ceil(filteredSubs.length / rowsPerPage);
  const paginatedSubs = filteredSubs.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  return (
    <>
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-[#F9FAFB] overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full animate-slide-up-fade">
          <Header />
          <Breadcrumbs segments={["Admin", "Subscriptions"]} />
          <div className="mt-8"></div>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-0 mb-8">
            <div>
              <h1 className="text-2xl font-black text-black flex flex-wrap items-center gap-3">
                Subscription Management
                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Sync Active</span>
              </h1>
              <p className="text-neutral-500 text-sm font-medium mt-1">Track active customer plans, bowl utilization, and automatic schedule projections.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <button onClick={handleExport} className="w-full sm:w-auto px-4 py-2 border border-neutral-200 bg-white rounded-xl text-sm font-bold text-neutral-600 hover:bg-neutral-50 transition-colors">
                Export Audit
              </button>
              <button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto px-4 py-2 bg-[#6A0FAD] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#6A0FAD]/20 hover:bg-[#5a0c96] transition-colors">
                + Add Subscription
              </button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <h3 className="text-xs font-bold text-neutral-500 uppercase">Active Subscriptions</h3>
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600"><CheckCircle2 className="w-4 h-4" /></div>
              </div>
              <div className="mt-4">
                <p className="text-4xl font-black text-black">{kpis.activeSubscriptions}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <h3 className="text-xs font-bold text-neutral-500 uppercase">Bowls Remaining</h3>
                <div className="w-8 h-8 rounded-full bg-[#6A0FAD]/10 flex items-center justify-center text-[#6A0FAD]"><BowlLoader className="w-4 h-4"  /></div>
              </div>
              <div className="mt-4">
                <p className="text-4xl font-black text-[#6A0FAD]">{kpis.bowlsRemaining} <span className="text-sm text-neutral-400 font-medium">/ {kpis.totalBowls} total</span></p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <h3 className="text-xs font-bold text-neutral-500 uppercase">Ending Soon</h3>
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600"><Hourglass className="w-4 h-4" /></div>
              </div>
              <div className="mt-4">
                <p className="text-4xl font-black text-orange-500">{kpis.endingSoon}</p>
                <p className="text-xs font-bold text-orange-600 bg-orange-50 inline-block px-2 py-0.5 rounded mt-1">&le; 3 bowls left</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <h3 className="text-xs font-bold text-neutral-500 uppercase">On Hold / Paused</h3>
                <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600"><PauseCircle className="w-4 h-4" /></div>
              </div>
              <div className="mt-4">
                <p className="text-4xl font-black text-neutral-800">{kpis.onHold}</p>
              </div>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-6">
            <div className="flex-1 w-full max-w-md">
              <ProbaeSearch
                placeholder="Search customer by name, phone, or ID..."
                value={searchTerm}
                onChange={(v) => { setSearchTerm(v); setPage(1); }}
              />
            </div>
            <div className="flex w-full md:w-auto gap-3">
              <select 
                value={statusFilter} 
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="h-[42px] w-full md:w-auto pl-4 pr-8 bg-white border border-neutral-200 rounded-xl text-sm font-bold text-neutral-700 outline-none focus:border-[#6A0FAD] cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Ending Soon">Ending Soon</option>
                <option value="On Hold">On Hold</option>
              </select>
            </div>
          </div>

          {/* Table Layout */}
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="flex-1 flex flex-col gap-4 min-w-0 w-full">
              <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-x-auto w-full">
                <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
                  <thead className="bg-[#1a1a1a]">
                    <tr className="text-[10px] text-neutral-400 uppercase tracking-widest border-b border-[#333]">
                      <th className="p-4 font-bold">Customer</th>
                      <th className="p-4 font-bold">Plan & Tiers</th>
                      <th className="p-4 font-bold">Meal Slot</th>
                      <th className="p-4 font-bold">Plan Progress</th>
                      <th className="p-4 font-bold text-center">Rem.</th>
                      <th className="p-4 font-bold text-center">Hold</th>
                      <th className="p-4 font-bold text-center">Est. Completion</th>
                      <th className="p-4 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-sm font-medium">
                    {paginatedSubs.map((sub: any) => {
                      const isSelected = selectedSub?.customer.ulid === sub.customer.ulid;
                      const progressPct = sub.progress.total > 0 ? Math.round((sub.progress.done / sub.progress.total) * 100) : 0;
                      
                      return (
                        <tr 
                          key={sub.customer.ulid} 
                          onClick={() => setSelectedSub(isSelected ? null : sub)}
                          className={`cursor-pointer transition-colors ${isSelected ? 'bg-[#6A0FAD]/5 border-l-4 border-l-[#6A0FAD]' : 'bg-white hover:bg-neutral-50 border-l-4 border-l-transparent'} text-black`}
                        >
                          <td className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-neutral-200 overflow-hidden relative">
                              {sub.customer.image ? (
                                <Image src={`/uploads/${sub.customer.image}`} alt="" fill className="object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[#6A0FAD] font-bold bg-[#6A0FAD]/10">
                                  {sub.customer.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-black">{sub.customer.name}</p>
                              <p className="text-xs text-neutral-500">#{sub.customer.ulid.slice(-4)} • {sub.customer.phone}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <p className="font-bold text-black">{sub.plan.name}</p>
                            <p className="text-xs text-neutral-500">{sub.plan.total_bowls} Bowls Total</p>
                          </td>
                          <td className="p-4">
                            <span className="bg-neutral-100 text-neutral-700 px-3 py-1 rounded-full text-xs font-bold">
                              {sub.plan.included_meal_slots.map((s:string)=>s.charAt(0).toUpperCase()+s.slice(1)).join(' + ')}
                            </span>
                          </td>
                          <td className="p-4 w-48">
                            <div className="flex justify-between text-xs mb-1 font-bold">
                              <span className="text-[#6A0FAD]">{sub.progress.done} / {sub.progress.total} Bowls</span>
                              <span className="text-neutral-400">{progressPct}%</span>
                            </div>
                            <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-[#6A0FAD] h-full rounded-full" style={{ width: `${progressPct}%` }}></div>
                            </div>
                          </td>
                          <td className="p-4 text-center font-black">{sub.progress.left}</td>
                          <td className="p-4 text-center font-black text-neutral-500">{sub.progress.hold}</td>
                          <td className="p-4">
                            <p className="font-bold text-black">{sub.est_completion}</p>
                            <p className="text-xs text-neutral-500">{sub.progress.left > 0 ? `${Math.ceil(sub.progress.left / sub.plan.included_meal_slots.length)} days remaining` : 'Done'}</p>
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              sub.status === 'Active' ? 'bg-green-100 text-green-700' :
                              sub.status === 'Ending Soon' ? 'bg-orange-100 text-orange-700' :
                              'bg-neutral-100 text-neutral-700'
                            }`}>
                              • {sub.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {paginatedSubs.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-neutral-500 font-bold">No subscriptions found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="flex justify-between items-center px-2">
                <p className="text-xs text-neutral-500 font-bold">
                  Showing {Math.min((page - 1) * rowsPerPage + 1, filteredSubs.length)} - {Math.min(page * rowsPerPage, filteredSubs.length)} of {filteredSubs.length} entries
                </p>
                <div className="flex gap-2">
                  <button 
                    disabled={page === 1} 
                    onClick={() => setPage(page - 1)}
                    className="w-8 h-8 flex items-center justify-center rounded bg-white border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    disabled={page >= totalPages} 
                    onClick={() => setPage(page + 1)}
                    className="w-8 h-8 flex items-center justify-center rounded bg-white border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Side Panel */}
            {selectedSub && (
              <div className="w-full lg:w-96 flex-shrink-0 transition-all duration-300">
                <SubscriptionSidePanel 
                  subscription={selectedSub} 
                  onClose={() => setSelectedSub(null)} 
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* Add Subscription Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-6 border-b border-neutral-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-black">Assign Subscription</h2>
                <p className="text-sm text-neutral-500 font-medium mt-1">Select an existing customer to assign a plan.</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="w-10 h-10 bg-neutral-100 hover:bg-neutral-200 rounded-full flex items-center justify-center text-neutral-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto bg-neutral-50 min-h-[300px]">
              <ProbaeSearch 
                placeholder="Search by name or phone..." 
                value={customerSearch} 
                onChange={setCustomerSearch} 
              />
              <div className="mt-4 flex flex-col gap-2">
                {allCustomers
                  .filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch))
                  .slice(0, 5)
                  .map(c => (
                    <div 
                      key={c.ulid} 
                      onClick={() => router.push(`/admin/customers/${c.ulid}`)}
                      className="bg-white p-4 rounded-xl border border-neutral-200 flex justify-between items-center cursor-pointer hover:border-[#6A0FAD] hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#6A0FAD]/10 text-[#6A0FAD] font-bold flex items-center justify-center">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900 group-hover:text-[#6A0FAD] transition-colors">{c.name}</p>
                          <p className="text-xs font-bold text-neutral-500">{c.phone}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-[#6A0FAD] transition-colors" />
                    </div>
                  ))}
                  {allCustomers.length > 0 && allCustomers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch)).length === 0 && (
                    <p className="text-center text-sm font-bold text-neutral-400 py-8">No customers found.</p>
                  )}
                  {allCustomers.length === 0 && (
                    <div className="flex justify-center py-8"><BowlLoader className="w-8 h-8 text-[#6A0FAD]" /></div>
                  )}
              </div>
            </div>
            <div className="p-6 border-t border-neutral-100 bg-white">
              <button onClick={() => router.push('/admin/customers/new')} className="w-full py-4 rounded-xl border-2 border-dashed border-neutral-300 text-neutral-500 font-bold hover:bg-neutral-50 hover:border-neutral-400 hover:text-neutral-700 transition-colors">
                + Create entirely new customer
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
