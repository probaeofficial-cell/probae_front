
"use client";

import { ConfirmationModal } from "@/components/ConfirmationModal";
import { PriceTrends } from "@/components/admin/raw-materials/PriceTrends";
import { TrendingUp } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { endpoints } from "@/lib/apiService";
import type { RawMaterial, Vendor } from "@/lib/types";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import {
  Calendar,
  Search,
  Store,
  PenLine,
  Trash2,
  CheckCircle2,
  ChevronDown,
  ListOrdered,
  CalendarDays,
  CalendarRange,
  Loader2
} from "lucide-react";

interface DraftPurchase {
  id: string;
  rawMaterial: RawMaterial;
  vendor: Vendor | null;
  quantity: number;
  actualPrice: number; // per unit
}

export default function PurchaseHistoryPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<"record" | "daily" | "trends" | "monthly">("record");
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Data
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  
  // RM Pagination State
  const [deletingPurchaseId, setDeletingPurchaseId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchDaily, setSearchDaily] = useState("");
  const [searchMonthly, setSearchMonthly] = useState("");
  
  const [rmPage, setRmPage] = useState(1);
  const [rmHasMore, setRmHasMore] = useState(true);
  const [rmIsLoading, setRmIsLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingNodeRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Form State
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [searchRM, setSearchRM] = useState("");
  const [debouncedSearchRM, setDebouncedSearchRM] = useState("");
  const [isRMDropdownOpen, setIsRMDropdownOpen] = useState(false);
  const [selectedRM, setSelectedRM] = useState<RawMaterial | null>(null);
  
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("0");
  const [actualPrice, setActualPrice] = useState<string>("0");

  const [draftPurchases, setDraftPurchases] = useState<DraftPurchase[]>([]);

  // Daily/Monthly View State
  const [dailyDate, setDailyDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [monthlyMonth, setMonthlyMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [fetchedPurchases, setFetchedPurchases] = useState<any[]>([]);
  
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/admin/login");
    } else if (user) {
      fetchInitialData();
    }
  }, [user, authLoading, router]);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      const vendorData = await endpoints.vendors.getVendors(1, 100);
      setVendors(vendorData.items || []);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to load vendors", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchRM(searchRM), 300);
    return () => clearTimeout(timer);
  }, [searchRM]);

  const fetchRawMaterialsAsync = async (pageNum: number, query: string, isNew: boolean) => {
    setRmIsLoading(true);
    try {
      const res = await endpoints.rawMaterials.getRawMaterials(pageNum, 15, query || undefined);
      const newItems = res.items || [];
      
      if (isNew) {
        setRawMaterials(newItems);
      } else {
        setRawMaterials(prev => {
          const combined = [...prev, ...newItems];
          const unique = Array.from(new Set(combined.map(item => item.id))).map(id => combined.find(item => item.id === id)!);
          return unique;
        });
      }
      setRmHasMore((pageNum * 15) < res.total);
    } catch (err) {
      console.error("Failed to fetch raw materials", err);
    } finally {
      setRmIsLoading(false);
    }
  };

  useEffect(() => {
    if (isRMDropdownOpen) {
      setRmPage(1);
      fetchRawMaterialsAsync(1, debouncedSearchRM, true);
    }
  }, [debouncedSearchRM, isRMDropdownOpen]);

  const handleObserver = (entries: IntersectionObserverEntry[]) => {
    const target = entries[0];
    if (target.isIntersecting && rmHasMore && !rmIsLoading) {
      setRmPage(p => {
        const next = p + 1;
        fetchRawMaterialsAsync(next, debouncedSearchRM, false);
        return next;
      });
    }
  };

  useEffect(() => {
    const option = { root: null, rootMargin: "20px", threshold: 0 };
    observerRef.current = new IntersectionObserver(handleObserver, option);
    if (loadingNodeRef.current) observerRef.current.observe(loadingNodeRef.current);
    return () => { if (observerRef.current) observerRef.current.disconnect(); };
  }, [rmHasMore, rmIsLoading, debouncedSearchRM]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsRMDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  const fetchDailyPurchases = async () => {
    try {
      setIsLoading(true);
      const res = await endpoints.rawMaterials.purchases.getDaily(dailyDate, 1, 1000);
      setFetchedPurchases(res?.items || []);
    } catch (err: any) {
      showToast(err.message || "Failed to load purchases", "error");
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchMonthlyPurchases = async () => {
    try {
      setIsLoading(true);
      const res = await endpoints.rawMaterials.purchases.getMonthly(monthlyMonth, 1, 1000);
      setFetchedPurchases(res?.items || []);
    } catch (err: any) {
      showToast(err.message || "Failed to load purchases", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const executeDeletePurchase = async () => {
    if (deletingPurchaseId === null) return;
    setIsDeleting(true);
    try {
      await endpoints.rawMaterials.purchases.delete(deletingPurchaseId);
      showToast("Purchase deleted and stock reverted.", "success");
      setDeletingPurchaseId(null);
      if (activeTab === "daily") fetchDailyPurchases();
      if (activeTab === "monthly") fetchMonthlyPurchases();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to delete purchase", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (activeTab === "daily") fetchDailyPurchases();
    if (activeTab === "monthly") fetchMonthlyPurchases();
  }, [activeTab, dailyDate, monthlyMonth]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSelectRM = (rm: RawMaterial) => {
    setSelectedRM(rm);
    setSearchRM(rm.name);
    setIsRMDropdownOpen(false);
    
    const stdCost = rm.standard_price || rm.price || 0;
    setActualPrice(stdCost.toString());
    
    if (rm.vendor) {
      setSelectedVendorId(rm.vendor.id.toString());
    } else {
      setSelectedVendorId("");
    }
  };

  const stdCostPerUnit = selectedRM ? (selectedRM.standard_price || selectedRM.price || 0) : 0;
  const numQty = parseFloat(quantity) || 0;
  const numActualPrice = parseFloat(actualPrice) || 0;
  
  const totalStandardCost = stdCostPerUnit * numQty;
  const totalPurchaseAmount = numActualPrice * numQty;
  const variance = totalPurchaseAmount - totalStandardCost;

  const handleAddPurchase = () => {
    if (!selectedRM) return showToast("Select a raw material", "error");
    if (numQty <= 0) return showToast("Quantity must be greater than 0", "error");
    if (numActualPrice < 0) return showToast("Actual price cannot be negative", "error");
    
    const vendor = vendors.find(v => v.id.toString() === selectedVendorId) || null;
    
    const newDraft: DraftPurchase = {
      id: Math.random().toString(36).substring(7),
      rawMaterial: selectedRM,
      vendor,
      quantity: numQty,
      actualPrice: numActualPrice
    };
    
    setDraftPurchases([...draftPurchases, newDraft]);
    
    setSelectedRM(null);
    setSearchRM("");
    setQuantity("0");
    setActualPrice("0");
    setSelectedVendorId("");
    showToast("Added to draft list", "success");
  };

  const removeDraft = (id: string) => {
    setDraftPurchases(draftPurchases.filter(d => d.id !== id));
  };

  const handleSubmitBatch = async () => {
    if (draftPurchases.length === 0) return showToast("No purchases to submit", "error");
    
    try {
      setIsLoading(true);
      const payload = draftPurchases.map(d => {
        const stdCost = d.rawMaterial.standard_price || d.rawMaterial.price || 0;
        return {
          purchase_date: selectedDate + "T00:00:00Z",
          raw_material_id: d.rawMaterial.id,
          vendor_id: d.vendor ? d.vendor.id : null,
          quantity: d.quantity,
          unit: d.rawMaterial.unit,
          standard_cost: stdCost,
          actual_price: d.actualPrice,
          total_amount: d.actualPrice * d.quantity,
          variance: (d.actualPrice * d.quantity) - (stdCost * d.quantity)
        };
      });
      
      await endpoints.rawMaterials.purchases.batchCreate(payload);
      setDraftPurchases([]);
      showToast("Purchases submitted successfully", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to submit purchases", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  
  const draftTotalStandard = draftPurchases.reduce((acc, curr) => acc + ((curr.rawMaterial.standard_price || curr.rawMaterial.price || 0) * curr.quantity), 0);
  const draftTotalActual = draftPurchases.reduce((acc, curr) => acc + (curr.actualPrice * curr.quantity), 0);
  const draftTotalVariance = draftTotalActual - draftTotalStandard;

  if (authLoading) return <div className="p-8"><Loader2 className="w-8 h-8 animate-spin text-[#6b21a8]" /></div>;

  return (
    <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden font-sans">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-lg border animate-in slide-in-from-top-2 flex items-center gap-3 ${
          toast.type === "error" ? "bg-red-50 border-red-100 text-red-600" : "bg-green-50 border-green-100 text-green-600"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : null}
          <span className="font-semibold text-sm">{toast.message}</span>
        </div>
      )}

      <Header />
      <Breadcrumbs segments={["Admin", "Raw Materials", "Purchase History"]} />

      <div className="flex-1 flex flex-col overflow-hidden pt-2 pb-6 px-2 sm:pt-2 sm:pb-8 sm:px-4">
        
        {/* Tabs Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-start items-center shrink-0">
          <div className="flex bg-neutral-100 p-1 rounded-2xl w-full sm:w-auto overflow-x-auto">
            <button onClick={() => setActiveTab("record")} className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === "record" ? "bg-white text-[#6b21a8] shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}><ListOrdered className="w-4 h-4" />Record Purchase</button>
            <button onClick={() => setActiveTab("daily")} className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === "daily" ? "bg-white text-[#6b21a8] shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}><CalendarDays className="w-4 h-4" />Daily View</button>
            <button onClick={() => setActiveTab("monthly")} className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === "monthly" ? "bg-white text-[#6b21a8] shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}><CalendarRange className="w-4 h-4" />Monthly View</button>
            <button onClick={() => setActiveTab("trends")} className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === "trends" ? "bg-white text-[#6b21a8] shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}><TrendingUp className="w-4 h-4" />Price Trends</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-7xl mx-auto w-full">
            
            {activeTab === "record" && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                
                <div className="xl:col-span-5 bg-white border border-neutral-200 rounded-[32px] p-8 shadow-sm">
                  <h2 className="text-2xl font-bold text-neutral-900">Add Purchase</h2>
                  <p className="text-sm text-neutral-500 mt-1 mb-8">Enter the details of the raw material purchased.</p>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-neutral-700 mb-2">Purchase Date</label>
                      <div className="relative">
                        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full bg-[#f8f5fb] border-none rounded-2xl px-4 py-3.5 text-neutral-800 font-medium focus:ring-2 focus:ring-[#6b21a8]/20 outline-none" />
                      </div>
                    </div>
                    
                    <div className="relative" ref={dropdownRef}>
                      <label className="block text-sm font-bold text-neutral-700 mb-2">Raw Material</label>
                      <div className="relative">
                        <input type="text" placeholder="Search raw material..." value={searchRM} onChange={e => { setSearchRM(e.target.value); setIsRMDropdownOpen(true); if (!e.target.value) setSelectedRM(null); }} onFocus={() => setIsRMDropdownOpen(true)} className="w-full bg-[#f8f5fb] border-none rounded-2xl pl-4 pr-12 py-3.5 text-neutral-800 font-medium focus:ring-2 focus:ring-[#6b21a8]/20 outline-none placeholder:text-neutral-400" />
                        <Search className="w-5 h-5 text-neutral-400 absolute right-4 top-1/2 -translate-y-1/2" />
                      </div>
                      
                      {isRMDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto z-20 p-2">
                          {rawMaterials.map(rm => (
                            <button type="button" key={rm.id} onClick={() => handleSelectRM(rm)} className="w-full text-left px-4 py-3 hover:bg-neutral-50 rounded-xl transition-colors">
                              <div className="font-bold text-neutral-800">{rm.name}</div>
                              <div className="text-xs text-neutral-500 mt-0.5">Stock: {rm.current_stock} {rm.unit}</div>
                            </button>
                          ))}

                          {rawMaterials.length === 0 && !rmIsLoading && (
                            <div className="p-4 text-center text-sm text-neutral-500 font-medium">No raw materials found.</div>
                          )}

                          <div ref={loadingNodeRef} className="py-2 flex justify-center">
                            {rmIsLoading && <Loader2 className="w-5 h-5 text-[#6b21a8] animate-spin" />}
                          </div>
                        </div>
                      )}
                    </div>

                    {selectedRM && (
                      <div className="flex items-center gap-4 text-sm font-bold border-l-4 border-[#6b21a8] pl-4 py-1">
                        <span className="text-neutral-400">UNIT: <span className="text-neutral-800">{selectedRM.unit}</span></span>
                        <span className="text-neutral-200">|</span>
                        <span className="text-neutral-400">STANDARD COST: <span className="text-neutral-800">{formatCurrency(stdCostPerUnit)} / {selectedRM.unit}</span></span>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-bold text-neutral-700 mb-2">Vendor</label>
                      <div className="relative">
                        <select value={selectedVendorId} onChange={e => setSelectedVendorId(e.target.value)} className="w-full bg-[#f8f5fb] border-none rounded-2xl pl-4 pr-12 py-3.5 text-neutral-800 font-medium appearance-none focus:ring-2 focus:ring-[#6b21a8]/20 outline-none">
                          <option value="">Select Vendor...</option>
                          {vendors.map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                          ))}
                        </select>
                        <Store className="w-5 h-5 text-neutral-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-neutral-700 mb-2">Quantity</label>
                        <div className="relative">
                          <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full bg-[#f8f5fb] border-none rounded-2xl px-4 py-3.5 text-neutral-800 font-bold focus:ring-2 focus:ring-[#6b21a8]/20 outline-none pr-10" />
                          {selectedRM && (
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-400 pointer-events-none">
                              {selectedRM.unit}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-neutral-700 mb-2">Actual Price</label>
                        <div className="relative">
                          <input type="number" value={actualPrice} onChange={e => setActualPrice(e.target.value)} className="w-full bg-[#f8f5fb] border-none rounded-2xl px-4 py-3.5 text-neutral-800 font-bold focus:ring-2 focus:ring-[#6b21a8]/20 outline-none pr-10" />
                          <PenLine className="w-4 h-4 text-neutral-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <hr className="border-neutral-100 my-6 border-dashed" />

                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-neutral-500 font-medium">Standard Cost:</span>
                        <span className="text-neutral-800 font-bold">{formatCurrency(totalStandardCost)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#6b21a8] font-bold text-lg">Purchase Amount:</span>
                        <span className="text-[#6b21a8] text-xl font-bold">{formatCurrency(totalPurchaseAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-neutral-500 font-medium">Variance:</span>
                        <span className={`font-bold ${variance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                        </span>
                      </div>
                    </div>

                    <button onClick={handleAddPurchase} className="w-full bg-[#6b21a8] text-white font-bold rounded-2xl py-4 hover:bg-[#581c87] transition-colors mt-6 flex items-center justify-center gap-2">
                      <span>+ Add Purchase</span>
                    </button>

                  </div>
                </div>

                <div className="xl:col-span-7 bg-white border border-neutral-200 rounded-[32px] overflow-hidden flex flex-col shadow-sm h-full max-h-[800px]">
                  <div className="p-8 pb-4 shrink-0">
                    <h2 className="text-2xl font-bold text-neutral-900">Today's Purchases</h2>
                    <p className="text-sm text-neutral-500 mt-1">Purchases recorded for {new Date(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>

                  <div className="flex-1 overflow-y-auto overflow-x-auto scrollbar-thin px-8 pb-4">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-[#f3e8ff] z-10 text-xs font-bold text-neutral-500 tracking-wider whitespace-nowrap">
                        <tr>
                          <th className="py-4 px-4 rounded-l-xl">RAW MATERIAL</th>
                          <th className="py-4 px-2">QTY</th>
                          <th className="py-4 px-2">VENDOR</th>
                          <th className="py-4 px-2">ACTUAL PRICE</th>
                          <th className="py-4 px-2">AMOUNT</th>
                          <th className="py-4 px-2">VARIANCE</th>
                          <th className="py-4 px-4 text-right rounded-r-xl">ACTION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 whitespace-nowrap">
                        {draftPurchases.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-12">
                              <div className="flex flex-col items-center justify-center text-neutral-400">
                                <Store className="w-10 h-10 mb-3 opacity-20" />
                                <span className="font-semibold text-neutral-500">No purchases added yet</span>
                                <span className="text-sm">Use the form on the left to record items.</span>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          draftPurchases.map((d) => {
                            const stdCost = d.rawMaterial.standard_price || d.rawMaterial.price || 0;
                            const varAmount = (d.actualPrice * d.quantity) - (stdCost * d.quantity);
                            return (
                              <tr key={d.id} className="hover:bg-neutral-50 transition-colors">
                                <td className="py-4 px-4"><div className="font-bold text-neutral-800">{d.rawMaterial.name}</div></td>
                                <td className="py-4 px-2 font-medium text-neutral-700">{d.quantity} {d.rawMaterial.unit}</td>
                                <td className="py-4 px-2 text-sm text-neutral-500">{d.vendor ? d.vendor.name : "-"}</td>
                                <td className="py-4 px-2 text-sm font-medium text-neutral-600">{formatCurrency(d.actualPrice)}/{d.rawMaterial.unit}</td>
                                <td className="py-4 px-2 font-bold text-neutral-900">{formatCurrency(d.actualPrice * d.quantity)}</td>
                                <td className={`py-4 px-2 font-bold ${varAmount > 0 ? 'text-red-500' : 'text-green-500'}`}>{varAmount > 0 ? '+' : ''}{formatCurrency(varAmount)}</td>
                                <td className="py-4 px-4 text-right"><button onClick={() => removeDraft(d.id)} className="text-neutral-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-xl"><Trash2 className="w-4 h-4" /></button></td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-[#f8f5fb] p-8 shrink-0 border-t border-[#f3e8ff]">
                    <div className="flex justify-between items-center text-sm mb-2"><span className="text-neutral-500 font-medium">Total Standard Cost:</span><span className="font-bold text-neutral-800">{formatCurrency(draftTotalStandard)}</span></div>
                    <div className="flex justify-between items-center text-sm mb-6"><span className="text-neutral-500 font-medium">Total Variance:</span><span className={`font-bold ${draftTotalVariance > 0 ? 'text-red-500' : 'text-green-500'}`}>{draftTotalVariance > 0 ? '+' : ''}{formatCurrency(draftTotalVariance)}</span></div>
                    <div className="flex justify-between items-center mb-6"><span className="font-black text-lg text-neutral-900">TOTAL VALUE:</span><span className="font-black text-2xl text-[#6b21a8]">{formatCurrency(draftTotalActual)}</span></div>
                    <hr className="border-neutral-200 mb-6" />
                    <div className="flex gap-4">
                      <button onClick={handleSubmitBatch} disabled={draftPurchases.length === 0 || isLoading} className="flex-1 bg-[#6b21a8] text-white font-bold rounded-2xl py-4 flex items-center justify-center gap-2 hover:bg-[#581c87] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                        <span>Submit Purchase</span>
                      </button>
                      <button onClick={() => setDraftPurchases([])} disabled={draftPurchases.length === 0} className="px-8 bg-white border-2 border-neutral-200 text-neutral-700 font-bold rounded-2xl hover:bg-neutral-50 transition-colors disabled:opacity-50">Clear All</button>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {activeTab === "daily" && (
              <div className="bg-white border border-neutral-200 rounded-[32px] overflow-hidden shadow-sm">
                <div className="p-8 border-b border-neutral-100 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                  <div><h2 className="text-2xl font-bold text-neutral-900">Daily Purchases</h2><p className="text-sm text-neutral-500 mt-1">Review all raw material purchases made on a specific day.</p></div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-initial">
                      <input type="text" placeholder="Search raw material..." value={searchDaily} onChange={(e) => setSearchDaily(e.target.value)} className="w-full sm:w-64 bg-[#f8f5fb] border-none rounded-2xl pl-4 pr-10 py-3 text-sm text-neutral-800 font-medium focus:ring-2 focus:ring-[#6b21a8]/20 outline-none placeholder:text-neutral-400" />
                      <Search className="w-4 h-4 text-neutral-400 absolute right-4 top-1/2 -translate-y-1/2" />
                    </div>
                    <input type="date" value={dailyDate} onChange={e => setDailyDate(e.target.value)} className="bg-[#f8f5fb] border-none rounded-2xl px-4 py-3 text-sm text-neutral-800 font-bold focus:ring-2 focus:ring-[#6b21a8]/20 outline-none" />
                  </div>
                </div>
                <div className="p-8 overflow-x-auto">
                  {isLoading ? (
                    <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#6b21a8]" /></div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-[#f8f5fb] text-xs font-bold text-neutral-500 tracking-wider whitespace-nowrap">
                        <tr>
                          <th className="py-4 px-6 rounded-l-xl">DATE</th>
                          <th className="py-4 px-4">RAW MATERIAL</th>
                          <th className="py-4 px-4">QTY</th>
                          <th className="py-4 px-4">VENDOR</th>
                          <th className="py-4 px-4">ACTUAL PRICE</th>
                          <th className="py-4 px-4">AMOUNT</th>
                          <th className="py-4 px-4">VARIANCE</th>
                          <th className="py-4 px-6 rounded-r-xl text-right">ACTION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 whitespace-nowrap">
                        {fetchedPurchases.filter(p => (p.raw_material?.name || "").toLowerCase().includes(searchDaily.toLowerCase())).length === 0 ? (
                          <tr><td colSpan={8} className="text-center py-12"><span className="font-semibold text-neutral-400">No purchases found.</span></td></tr>
                        ) : (
                          fetchedPurchases.filter(p => (p.raw_material?.name || "").toLowerCase().includes(searchDaily.toLowerCase())).map((p) => (
                            <tr key={p.id} className="hover:bg-neutral-50 transition-colors">
                              <td className="py-4 px-6 text-sm text-neutral-500">{new Date(p.purchase_date).toLocaleDateString()}</td>
                              <td className="py-4 px-4 font-bold text-neutral-800">{p.raw_material?.name}</td>
                              <td className="py-4 px-4 font-medium text-neutral-700">{p.quantity} {p.unit}</td>
                              <td className="py-4 px-4 text-sm text-neutral-500">{p.vendor?.name || "-"}</td>
                              <td className="py-4 px-4 text-sm font-medium text-neutral-600">{formatCurrency(p.actual_price)}/{p.unit}</td>
                              <td className="py-4 px-4 font-bold text-neutral-900">{formatCurrency(p.total_amount)}</td>
                              <td className={`py-4 px-4 font-bold ${p.variance > 0 ? 'text-red-500' : 'text-green-500'}`}>{p.variance > 0 ? '+' : ''}{formatCurrency(p.variance)}</td>
                              <td className="py-4 px-6 text-right">
                                <button onClick={() => setDeletingPurchaseId(p.id)} className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors ml-auto">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
            
            {activeTab === "monthly" && (
              <div className="flex flex-col gap-6">
                
                {/* Monthly Stats Cards */}
                {(() => {
                  const filtered = fetchedPurchases.filter(p => (p.raw_material?.name || "").toLowerCase().includes(searchMonthly.toLowerCase()));
                  const totalActual = filtered.reduce((sum, p) => sum + p.total_amount, 0);
                  const totalVariance = filtered.reduce((sum, p) => sum + p.variance, 0);
                  const totalStandard = totalActual - totalVariance;
                  const variancePercent = totalStandard > 0 ? (totalVariance / totalStandard) * 100 : 0;
                  
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Total Purchase Card */}
                      <div className="bg-white border border-neutral-200 rounded-[24px] p-6 relative overflow-hidden shadow-sm flex flex-col justify-between h-[120px]">
                        <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-[#f9f8fc] rounded-full z-0"></div>
                        <div className="relative z-10 text-[10px] font-bold text-neutral-500 tracking-wider mb-1 uppercase">Total Purchase</div>
                        <div className="relative z-10 text-2xl font-black text-neutral-900 mb-1">{formatCurrency(totalActual)}</div>
                        <div className="relative z-10 text-[10px] font-medium text-neutral-400">Actual purchase value</div>
                      </div>

                      {/* Standard Cost Card */}
                      <div className="bg-white border border-neutral-200 rounded-[24px] p-6 relative overflow-hidden shadow-sm flex flex-col justify-between h-[120px]">
                        <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-[#fcf9f9] rounded-full z-0"></div>
                        <div className="relative z-10 text-[10px] font-bold text-neutral-500 tracking-wider mb-1 uppercase">Standard Cost</div>
                        <div className="relative z-10 text-2xl font-black text-neutral-900 mb-1">{formatCurrency(totalStandard)}</div>
                        <div className="relative z-10 text-[10px] font-medium text-neutral-400">Expected cost setup</div>
                      </div>

                      {/* Purchase Variance Card */}
                      <div className="bg-white border border-neutral-200 rounded-[24px] p-6 relative overflow-hidden shadow-sm flex flex-col justify-between h-[120px]">
                        <div className="relative z-10 text-[10px] font-bold text-neutral-500 tracking-wider mb-1 uppercase">Purchase Variance</div>
                        <div className={`relative z-10 text-2xl font-black flex items-center gap-1 mb-1 ${totalVariance > 0 ? 'text-[#ff6b2b]' : 'text-green-500'}`}>
                          {totalVariance > 0 ? '+' : ''}{formatCurrency(totalVariance)}
                        </div>
                        <div className="relative z-10 text-[10px] font-medium text-neutral-400">Actual vs Standard</div>
                      </div>

                      {/* Variance % Card */}
                      <div className="bg-white border border-neutral-200 rounded-[24px] p-6 relative overflow-hidden shadow-sm flex flex-col justify-between h-[120px]">
                        <div className="relative z-10 text-[10px] font-bold text-neutral-500 tracking-wider mb-1 uppercase">Variance %</div>
                        <div className={`relative z-10 text-2xl font-black flex items-center gap-1 mb-1 ${variancePercent > 0 ? 'text-[#ff6b2b]' : 'text-green-500'}`}>
                          {variancePercent > 0 ? '+' : ''}{variancePercent.toFixed(1)}%
                        </div>
                        <div className="relative z-10 text-[10px] font-medium text-neutral-400">Overall variance</div>
                      </div>
                    </div>
                  );
                })()}

                <div className="bg-white border border-neutral-200 rounded-[32px] overflow-hidden shadow-sm">
                  <div className="p-8 border-b border-neutral-100 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div><h2 className="text-2xl font-bold text-neutral-900">Monthly Purchases</h2><p className="text-sm text-neutral-500 mt-1">Review finalized purchase history for a specific month.</p></div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="relative flex-1 sm:flex-initial">
                        <input type="text" placeholder="Search raw material..." value={searchMonthly} onChange={(e) => setSearchMonthly(e.target.value)} className="w-full sm:w-64 bg-[#f8f5fb] border-none rounded-2xl pl-4 pr-10 py-3 text-sm text-neutral-800 font-medium focus:ring-2 focus:ring-[#6b21a8]/20 outline-none placeholder:text-neutral-400" />
                        <Search className="w-4 h-4 text-neutral-400 absolute right-4 top-1/2 -translate-y-1/2" />
                      </div>
                      <input type="month" value={monthlyMonth} onChange={e => setMonthlyMonth(e.target.value)} className="bg-[#f8f5fb] border-none rounded-2xl px-4 py-3 text-sm text-neutral-800 font-bold focus:ring-2 focus:ring-[#6b21a8]/20 outline-none" />
                    </div>
                  </div>
                  <div className="p-8 overflow-x-auto">
                    {isLoading ? (
                      <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#6b21a8]" /></div>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-[#f8f5fb] text-xs font-bold text-neutral-500 tracking-wider whitespace-nowrap">
                          <tr>
                            <th className="py-4 px-6 rounded-l-xl">DATE</th>
                            <th className="py-4 px-4">RAW MATERIAL</th>
                            <th className="py-4 px-4">QTY</th>
                            <th className="py-4 px-4">VENDOR</th>
                            <th className="py-4 px-4">ACTUAL PRICE</th>
                            <th className="py-4 px-4">AMOUNT</th>
                            <th className="py-4 px-4">VARIANCE</th>
                            <th className="py-4 px-6 rounded-r-xl text-right">ACTION</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 whitespace-nowrap">
                          {fetchedPurchases.filter(p => (p.raw_material?.name || "").toLowerCase().includes(searchMonthly.toLowerCase())).length === 0 ? (
                            <tr><td colSpan={8} className="text-center py-12"><span className="font-semibold text-neutral-400">No purchases found.</span></td></tr>
                          ) : (
                            fetchedPurchases.filter(p => (p.raw_material?.name || "").toLowerCase().includes(searchMonthly.toLowerCase())).map((p) => (
                              <tr key={p.id} className="hover:bg-neutral-50 transition-colors">
                                <td className="py-4 px-6 text-sm text-neutral-500">{new Date(p.purchase_date).toLocaleDateString()}</td>
                                <td className="py-4 px-4 font-bold text-neutral-800">{p.raw_material?.name}</td>
                                <td className="py-4 px-4 font-medium text-neutral-700">{p.quantity} {p.unit}</td>
                                <td className="py-4 px-4 text-sm text-neutral-500">{p.vendor?.name || "-"}</td>
                                <td className="py-4 px-4 text-sm font-medium text-neutral-600">{formatCurrency(p.actual_price)}/{p.unit}</td>
                                <td className="py-4 px-4 font-bold text-neutral-900">{formatCurrency(p.total_amount)}</td>
                                <td className={`py-4 px-4 font-bold ${p.variance > 0 ? 'text-red-500' : 'text-green-500'}`}>{p.variance > 0 ? '+' : ''}{formatCurrency(p.variance)}</td>
                                <td className="py-4 px-6 text-right">
                                  <button onClick={() => setDeletingPurchaseId(p.id)} className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors ml-auto">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "trends" && (

              <PriceTrends />

            )}
</div>
        </div>
      </div>
      <ConfirmationModal
        isOpen={deletingPurchaseId !== null}
        onClose={() => setDeletingPurchaseId(null)}
        onConfirm={executeDeletePurchase}
        title="Delete Purchase Record"
        message="Are you sure you want to delete this purchase? This will permanently remove the record and dynamically subtract the added quantity from the current stock."
        type="delete"
        confirmText="Delete Record"
        isLoading={isDeleting}
      />
    </div>
  );
}
