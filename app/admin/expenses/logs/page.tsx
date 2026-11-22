"use client";

import { BowlLoader } from "@/components/admin/BowlLoader";
import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Pencil, Calendar, Filter } from "lucide-react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { endpoints } from "@/lib/apiService";
import AsyncExpenseCategorySelect from "@/components/admin/AsyncExpenseCategorySelect";
import { BulkExpenseModal } from "@/components/admin/BulkExpenseModal";
import { FileSpreadsheet } from "lucide-react";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { EMPTY_EXPENSE_FILTERS, ExpenseFilters, ExpenseFiltersModal } from "@/components/admin/ExpenseFiltersModal";
import { useAuth } from "@/lib/AuthContext";
import { PERMISSIONS } from "@/lib/permissions";

const toLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const initialExpenseFilters = (): ExpenseFilters => {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { ...EMPTY_EXPENSE_FILTERS, date_from: toLocalDate(monthStart), date_to: toLocalDate(monthEnd) };
};

export default function ExpenseLogsPage() {
  const { hasPermission, isAdmin } = useAuth();
  const canCreateExpenses = hasPermission(PERMISSIONS.expenses.create);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [totalAmount, setTotalAmount] = useState(0);
  const [filters, setFilters] = useState<ExpenseFilters>(initialExpenseFilters);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentRecipients, setPaymentRecipients] = useState<string[]>([]);
  const [formData, setFormData] = useState({ category_ulid: "", amount: "", expense_date: new Date().toISOString().slice(0, 10), notes: "", sent_from: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  
  const [deleteUlid, setDeleteUlid] = useState<string | null>(null);
  const [editUlid, setEditUlid] = useState<string | null>(null);

  useEffect(() => {
    async function loadPaymentRecipients() {
      try {
        const res: any = await endpoints.settings.getPaymentRecipients();
        if (res && res.recipients) {
          setPaymentRecipients(res.recipients);
        }
      } catch (err) {
        console.error("Failed to load payment recipients", err);
      }
    }
    loadPaymentRecipients();
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const expRes = await endpoints.expenses.list({ 
        page,
        limit: 20,
        category_ulid: filters.category_ulid || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        min_amount: filters.min_amount === "" ? undefined : Number(filters.min_amount),
        max_amount: filters.max_amount === "" ? undefined : Number(filters.max_amount),
        sent_from: filters.sent_from || undefined,
        recorded_by: filters.recorded_by.trim() || undefined,
        search: filters.search.trim() || undefined,
      }) as any;
      setExpenses(expRes.expenses || expRes.items || []);
      setTotalAmount(expRes.totalAmount || 0);
      setTotalPages(Math.max(1, Math.ceil((expRes.totalCount || expRes.total_count || 0) / 20)));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const handleSave = async () => {
    if (!formData.category_ulid || !formData.amount || !formData.expense_date) return setErrorMsg("Category, Amount, and Date are required");
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount)
      };
      
      if (editUlid) {
        await endpoints.expenses.update(editUlid, payload);
      } else {
        await endpoints.expenses.create(payload);
      }
      
      setIsModalOpen(false);
      setFormData({ category_ulid: "", amount: "", expense_date: new Date().toISOString().slice(0, 10), notes: "", sent_from: "" });
      setEditUlid(null);
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
            <p className="text-neutral-500 mt-1">Filtered total: <span className="font-bold text-red-600">₹{totalAmount.toFixed(2)}</span></p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <div className="flex flex-wrap gap-3">
              <ProbaeButton onClick={() => setIsFiltersOpen(true)} className="!w-auto flex items-center justify-center gap-2 h-[48px] !bg-white !text-neutral-700 border border-neutral-200 hover:!bg-neutral-50 whitespace-nowrap px-4">
                <Filter className="w-4 h-4 shrink-0" /> Filters
                {activeFilterCount > 0 && <span className="rounded-full bg-[#6A0FAD] px-2 py-0.5 text-xs font-black text-white">{activeFilterCount}</span>}
              </ProbaeButton>
              {canCreateExpenses && <ProbaeButton onClick={() => setIsBulkModalOpen(true)} className="!w-auto flex items-center justify-center gap-2 h-[48px] !bg-neutral-800 !text-white hover:!bg-neutral-900 border-none whitespace-nowrap px-4">
                <FileSpreadsheet className="w-4 h-4 shrink-0" /> Bulk Upload
              </ProbaeButton>}
              {canCreateExpenses && (
              <ProbaeButton onClick={() => {
                setEditUlid(null);
                setFormData({
                  expense_date: new Date().toISOString().slice(0, 10),
                  category_ulid: "",
                  amount: "",
                  notes: "",
                  sent_from: ""
                });
                setIsModalOpen(true);
              }} className="!w-auto flex items-center justify-center gap-2 h-[48px] whitespace-nowrap px-4">
                <Plus className="w-4 h-4 shrink-0" /> Add Expense
              </ProbaeButton>
              )}
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div className="py-12 flex justify-center"><BowlLoader className="w-10 h-10 text-[#6A0FAD]" /></div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-neutral-200 overflow-hidden flex flex-col flex-1 min-h-0">
            <div className="overflow-auto flex-1 scrollbar-thin">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/50">
                  <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase">Date</th>
                  <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase">Category</th>
                  <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase">Amount</th>
                  <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase">Sent From</th>
                  <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase">Notes</th>
                  <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase">Recorded By</th>
                  <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {expenses.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-neutral-500">No expenses match these filters.</td></tr>
                ) : expenses.map((e) => (
                  <tr key={e.ulid} className="hover:bg-neutral-50/30 transition-colors">
                    <td className="py-4 px-6 font-medium text-neutral-900 flex items-center gap-2"><Calendar className="w-4 h-4 text-neutral-400"/> {e.expense_date}</td>
                    <td className="py-4 px-6 font-bold text-neutral-700">{e.category?.name || "Unknown"}</td>
                    <td className="py-4 px-6 font-black text-red-600">₹{e.amount.toFixed(2)}</td>
                    <td className="py-4 px-6 text-sm">
                      {e.sent_from ? (
                        <span className="px-2.5 py-1 bg-[#6A0FAD]/10 text-[#6A0FAD] font-bold text-xs rounded-lg">
                          {e.sent_from}
                        </span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-sm text-neutral-500 max-w-xs truncate">{e.notes || "-"}</td>
                    <td className="py-4 px-6 text-sm text-neutral-500">{e.recorded_by_name || "System"}</td>
                    <td className="py-4 px-6 text-right">
                      {isAdmin && (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => {
                          setEditUlid(e.ulid);
                          setFormData({
                            expense_date: e.expense_date,
                            category_ulid: e.category?.ulid || "",
                            amount: e.amount.toString(),
                            notes: e.notes || "",
                            sent_from: e.sent_from || ""
                          });
                          setIsModalOpen(true);
                        }} className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteUlid(e.ulid)} className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          
          {totalPages > 1 && (
            <div className="py-4 px-6 border-t border-neutral-100 flex items-center justify-between shrink-0 bg-white rounded-b-2xl">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-bold text-neutral-600 bg-neutral-100 rounded-lg disabled:opacity-50 hover:bg-neutral-200 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm font-bold text-neutral-500">Page {page} of {totalPages}</span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm font-bold text-neutral-600 bg-neutral-100 rounded-lg disabled:opacity-50 hover:bg-neutral-200 transition-colors"
              >
                Next
              </button>
            </div>
          )}
          </div>
        )}
      </div>
      
      <BulkExpenseModal 
        isOpen={isBulkModalOpen} 
        onClose={() => setIsBulkModalOpen(false)} 
        onSuccess={() => {
          setIsBulkModalOpen(false);
          fetchData();
        }} 
      />
      <ExpenseFiltersModal
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        initialFilters={filters}
        paymentRecipients={paymentRecipients}
        onApply={(nextFilters) => {
          setFilters(nextFilters);
          setPage(1);
          setIsFiltersOpen(false);
        }}
      />
      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-black text-neutral-900 mb-4">{editUlid ? "Edit Expense" : "Record Expense"}</h2>
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
                  selectedCategory={editUlid ? expenses.find(e => e.ulid === editUlid)?.category : null}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Amount (₹)</label>
                <input type="number" step="0.01" value={formData.amount} onChange={e => setFormData(p => ({...p, amount: e.target.value}))} className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Sent From (Payment Recipient)</label>
                <select 
                  value={formData.sent_from} 
                  onChange={e => setFormData(p => ({...p, sent_from: e.target.value}))}
                  className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]"
                >
                  <option value="">— Select Recipient (Optional) —</option>
                  {paymentRecipients.map((name, i) => (
                    <option key={i} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Notes (Optional)</label>
                <textarea value={formData.notes} onChange={e => setFormData(p => ({...p, notes: e.target.value}))} className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]" rows={2} />
              </div>
            </div>
            
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-bold text-neutral-500 hover:text-neutral-900 transition-colors">Cancel</button>
              <ProbaeButton onClick={handleSave} disabled={isSubmitting || !formData.category_ulid || !formData.amount} className="!w-auto">{isSubmitting ? "Saving..." : (editUlid ? "Save Changes" : "Record Expense")}</ProbaeButton>
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
