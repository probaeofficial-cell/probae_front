"use client";

import { BowlLoader } from "@/components/admin/BowlLoader";
import { useState, useEffect } from "react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { endpoints } from "@/lib/apiService";
import { ArrowUpRight, ArrowDownRight, Search, Trash2 } from "lucide-react";
import { ConfirmationModal } from "@/components/ConfirmationModal";

export default function TransactionLogsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [transactionType, setTransactionType] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [deleteUlid, setDeleteUlid] = useState<string | null>(null);
  const [errorModalMsg, setErrorModalMsg] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteUlid) return;
    try {
      await endpoints.globalTransactions.delete(deleteUlid);
      fetchLogs();
    } catch (err: any) {
      setErrorModalMsg(err.detail || err.message || "Failed to delete transaction");
    } finally {
      setDeleteUlid(null);
    }
  };

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const d = new Date(month);
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);

      const data = await endpoints.globalTransactions.list({
        page,
        limit: 20,
        transaction_type: transactionType || undefined,
        date_from: firstDay,
        date_to: lastDay
      }) as any;
      setTransactions(data.transactions);
      setTotalPages(Math.ceil(data.total_count / 20) || 1);
    } catch (err) {
      // console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, transactionType, month]);

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
      <Header />
      <div className="mt-4 flex-1 flex flex-col min-h-0">
        <Breadcrumbs segments={["Transactions", "Logs"]} />
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Transaction Logs</h1>
          
          <div className="flex flex-wrap items-center gap-4">
            <select 
              value={transactionType} 
              onChange={e => { setTransactionType(e.target.value); setPage(1); }}
              className="bg-white border border-neutral-200 rounded-xl px-4 py-2 text-sm font-bold text-neutral-700 outline-none focus:ring-2 focus:ring-[#6A0FAD]/20"
            >
              <option value="">All Types</option>
              <option value="DEPOSIT">Income (Deposit)</option>
              <option value="DEBIT">Expense / Sales (Debit)</option>
              <option value="REFUND">Refund</option>
            </select>
            
            <input 
              type="month" 
              value={month} 
              onChange={e => { setMonth(e.target.value); setPage(1); }}
              className="bg-white border border-neutral-200 rounded-xl px-4 py-2 text-sm font-bold text-neutral-700 outline-none focus:ring-2 focus:ring-[#6A0FAD]/20"
            />
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
                  <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase">Customer</th>
                  <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase">Type</th>
                  <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase">Amount</th>
                  <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase">Method</th>
                  <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase">Reference</th>
                  <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {transactions.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-neutral-500">No transactions found.</td></tr>
                ) : transactions.map((t) => (
                  <tr key={t.ulid} className="hover:bg-neutral-50/30 transition-colors">
                    <td className="py-4 px-6 font-medium text-neutral-900">{new Date(t.created_at).toLocaleString()}</td>
                    <td className="py-4 px-6 font-bold text-neutral-900">{t.customer_name}</td>
                    <td className="py-4 px-6">
                      {t.transaction_type === "DEPOSIT" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-black bg-green-50 text-green-700"><ArrowDownRight className="w-3.5 h-3.5" /> Credit</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-black bg-red-50 text-red-700"><ArrowUpRight className="w-3.5 h-3.5" /> Debit</span>
                      )}
                    </td>
                    <td className="py-4 px-6 font-black text-neutral-900">₹{t.amount.toFixed(2)}</td>
                    <td className="py-4 px-6 text-sm text-neutral-500">{t.payment_method || "-"}</td>
                    <td className="py-4 px-6 text-sm text-neutral-500 font-mono">{t.reference_id || "-"}</td>
                    <td className="py-4 px-6 text-right">
                      <button onClick={() => setDeleteUlid(t.ulid)} className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="py-4 px-6 border-t border-neutral-100 flex items-center justify-between shrink-0">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-bold text-neutral-600 bg-neutral-100 rounded-lg disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm font-bold text-neutral-500">Page {page} of {totalPages}</span>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm font-bold text-neutral-600 bg-neutral-100 rounded-lg disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
      
      <ConfirmationModal
        isOpen={!!errorModalMsg}
        title="Error"
        message={errorModalMsg || ""}
        cancelText="Close"
        onClose={() => setErrorModalMsg(null)}
        type="error"
      />
      <ConfirmationModal
        isOpen={!!deleteUlid}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? If this is a deposit or debit, the customer's wallet balance will be automatically reversed. This cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        onClose={() => setDeleteUlid(null)}
        type="delete"
      />
    </div>
  );
}
