"use client";

import { BowlLoader } from "@/components/admin/BowlLoader";
import { useState, useEffect } from "react";
import { Plus, Trash2, Calendar, FileText, Search } from "lucide-react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { endpoints } from "@/lib/apiService";
import AsyncExpenseCategorySelect from "@/components/admin/AsyncExpenseCategorySelect";
import { ConfirmationModal } from "@/components/ConfirmationModal";

export default function ExpenseLogsPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [totalAmount, setTotalAmount] = useState(0);
  
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterCategoryUlid, setFilterCategoryUlid] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ category_ulid: "", amount: "", expense_date: new Date().toISOString().slice(0, 10), notes: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [deleteUlid, setDeleteUlid] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const expRes = await endpoints.expenses.list({ 
        month,
        category_ulid: filterCategoryUlid || undefined,
        search: debouncedSearch || undefined
      }) as any;
      setExpenses(expRes.expenses || expRes.items || []);
      setTotalAmount(expRes.totalAmount || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [month, filterCategoryUlid, debouncedSearch]);

  const handleSave = async () => {
    if (!formData.category_ulid || !formData.amount || !formData.expense_date) return setErrorMsg("Category, Amount, and Date are required");
    setIsSubmitting(true);
    try {
      await endpoints.expenses.create({
        ...formData,
        amount: parseFloat(formData.amount)
      });
      setIsModalOpen(false);
      setFormData({ category_ulid: "", amount: "", expense_date: new Date().toISOString().slice(0, 10), notes: "" });
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUlid) return;
    try {
      await endpoints.expenses.del(deleteUlid);
      setDeleteUlid(null);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
      <Header />
      <div className="mt-4 flex-1 flex flex-col min-h-0">
        <Breadcrumbs segments={["Expenses", "Logs"]} />
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Expense Logs</h1>
            <p className="text-neutral-500 mt-1">Total for {month}: <span className="font-bold text-red-600">₹{totalAmount.toFixed(2)}</span></p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-[48px] pl-9 pr-4 bg-white border border-neutral-200 rounded-xl outline-none text-sm font-medium text-neutral-800 focus:border-[#6A0FAD] focus:ring-1 focus:ring-[#6A0FAD]"
              />
            </div>
            <div className="w-full sm:w-48 relative">
              <AsyncExpenseCategorySelect 
                value={filterCategoryUlid} 
                onChange={(val) => setFilterCategoryUlid(val)} 
                selectedCategory={null}
              />
              {filterCategoryUlid && (
                <button 
                  onClick={() => setFilterCategoryUlid("")} 
                  className="absolute right-8 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-red-500 z-10 p-1"
                  title="Clear filter"
                >
                  &times;
                </button>
              )}
            </div>
            <input 
              type="month" 
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="bg-white border border-neutral-200 rounded-xl px-4 py-2 h-[48px] text-sm font-bold text-neutral-700 outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 w-full sm:w-auto"
            />
            <ProbaeButton onClick={() => setIsModalOpen(true)} className="!w-auto flex items-center justify-center gap-2 h-[48px]">
              <Plus className="w-5 h-5" /> Add Expense
            </ProbaeButton>
          </div>
        </div>
        
        {isLoading ? (
          <div className="py-12 flex justify-center"><BowlLoader className="w-10 h-10 animate-spin text-[#6A0FAD]" /></div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-neutral-200 overflow-hidden flex flex-col flex-1 min-h-0">
            <div className="overflow-auto flex-1 scrollbar-thin">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/50">
                  <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase">Date</th>
                  <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase">Category</th>
                  <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase">Amount</th>
                  <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase">Notes</th>
                  <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase">Recorded By</th>
                  <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {expenses.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-neutral-500">No expenses recorded for this month.</td></tr>
                ) : expenses.map((e) => (
                  <tr key={e.ulid} className="hover:bg-neutral-50/30 transition-colors">
                    <td className="py-4 px-6 font-medium text-neutral-900 flex items-center gap-2"><Calendar className="w-4 h-4 text-neutral-400"/> {e.expense_date}</td>
                    <td className="py-4 px-6 font-bold text-neutral-700">{e.category?.name || "Unknown"}</td>
                    <td className="py-4 px-6 font-black text-red-600">₹{e.amount.toFixed(2)}</td>
                    <td className="py-4 px-6 text-sm text-neutral-500 max-w-xs truncate">{e.notes || "-"}</td>
                    <td className="py-4 px-6 text-sm text-neutral-500">{e.recorded_by_name || "System"}</td>
                    <td className="py-4 px-6 text-right">
                      <button onClick={() => setDeleteUlid(e.ulid)} className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
      
      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-black text-neutral-900 mb-4">Record Expense</h2>
            {errorMsg && <div className="mb-4 text-red-500 text-sm">{errorMsg}</div>}
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Date</label>
                <input type="date" value={formData.expense_date} onChange={e => setFormData(p => ({...p, expense_date: e.target.value}))} className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Category</label>
                <AsyncExpenseCategorySelect 
                  value={formData.category_ulid}
                  onChange={(ulid) => setFormData(p => ({...p, category_ulid: ulid}))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Amount (₹)</label>
                <input type="number" step="0.01" value={formData.amount} onChange={e => setFormData(p => ({...p, amount: e.target.value}))} className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Notes (Optional)</label>
                <textarea value={formData.notes} onChange={e => setFormData(p => ({...p, notes: e.target.value}))} className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]" rows={2} />
              </div>
            </div>
            
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-bold text-neutral-500 hover:text-neutral-900 transition-colors">Cancel</button>
              <ProbaeButton onClick={handleSave} disabled={isSubmitting || !formData.category_ulid || !formData.amount} className="!w-auto">{isSubmitting ? "Saving..." : "Record Expense"}</ProbaeButton>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!deleteUlid}
        onClose={() => setDeleteUlid(null)}
        onConfirm={handleDelete}
        title="Delete Expense"
        message="Are you sure you want to delete this expense log? This action cannot be undone."
        type="delete"
        confirmText="Delete"
      />
      </div>
    </div>
  );
}
