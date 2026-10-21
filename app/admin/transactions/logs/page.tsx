"use client";

import { BowlLoader } from "@/components/admin/BowlLoader";
import { useState, useEffect } from "react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { endpoints } from "@/lib/apiService";
import { ArrowUpRight, ArrowDownRight, Search, Trash2, Wallet } from "lucide-react";
import { ConfirmationModal } from "@/components/ConfirmationModal";

export default function TransactionLogsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [totalDepositAmount, setTotalDepositAmount] = useState(0);
  const [totalDebitAmount, setTotalDebitAmount] = useState(0);
  const [totalDepositCount, setTotalDepositCount] = useState(0);
  const [totalDebitCount, setTotalDebitCount] = useState(0);

  const [transactionType, setTransactionType] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [deleteUlid, setDeleteUlid] = useState<string | null>(null);
  const [errorModalMsg, setErrorModalMsg] = useState<string | null>(null);

  // Debounce search term input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

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
      const d = new Date(month + "-01T00:00:00");
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);

      const data = await endpoints.globalTransactions.list({
        page,
        limit,
        transaction_type: transactionType || undefined,
        search: debouncedSearch.trim() || undefined,
        date_from: firstDay,
        date_to: lastDay,
      }) as any;

      setTransactions(data.transactions || []);
      const count = data.total_count || 0;
      setTotalCount(count);
      setTotalPages(Math.ceil(count / limit) || 1);
      setTotalDepositAmount(data.total_deposit_amount || 0);
      setTotalDebitAmount(data.total_debit_amount || 0);
      setTotalDepositCount(data.total_deposit_count || 0);
      setTotalDebitCount(data.total_debit_count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, limit, transactionType, month, debouncedSearch]);

  const netBalance = totalDepositAmount - totalDebitAmount;

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        <Header />
        <div className="mt-4 flex-1 flex flex-col min-h-0">
          <Breadcrumbs segments={["Transactions", "Logs"]} />
          
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
            <div>
              <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Transaction Logs</h1>
              <p className="text-neutral-500 font-medium text-sm mt-1">Review financial ledger entries, customer deposits, and order debits</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <input 
                type="month" 
                value={month} 
                onChange={e => { setMonth(e.target.value); setPage(1); }}
                className="bg-white border border-neutral-200 rounded-xl px-4 py-2 text-sm font-bold text-neutral-700 outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 shadow-sm"
              />
            </div>
          </div>

          {/* Top Summary Metrics Cards - Interactive & reflect the active switch */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5 shrink-0">
            {/* Total Deposits Card */}
            <button
              type="button"
              onClick={() => {
                setTransactionType(transactionType === "DEPOSIT" ? "" : "DEPOSIT");
                setPage(1);
              }}
              className={`p-4 sm:p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                transactionType === "DEPOSIT"
                  ? "bg-green-50/70 border-green-500 ring-2 ring-green-500/20 shadow-sm"
                  : "bg-white border-neutral-200/80 hover:border-green-300 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Total Deposits</span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                  transactionType === "DEPOSIT" ? "bg-green-600 text-white" : "bg-green-100 text-green-700"
                }`}>
                  <ArrowDownRight className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-green-700 tracking-tight">
                  ₹{totalDepositAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-semibold text-neutral-500">
                    {totalDepositCount} credit {totalDepositCount === 1 ? "entry" : "entries"}
                  </span>
                  {transactionType === "DEPOSIT" && (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-200 text-green-800">
                      Active Filter
                    </span>
                  )}
                </div>
              </div>
            </button>

            {/* Total Debits Card */}
            <button
              type="button"
              onClick={() => {
                setTransactionType(transactionType === "DEBIT" ? "" : "DEBIT");
                setPage(1);
              }}
              className={`p-4 sm:p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                transactionType === "DEBIT"
                  ? "bg-red-50/70 border-red-500 ring-2 ring-red-500/20 shadow-sm"
                  : "bg-white border-neutral-200/80 hover:border-red-300 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Total Debits</span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                  transactionType === "DEBIT" ? "bg-red-600 text-white" : "bg-red-100 text-red-700"
                }`}>
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-red-700 tracking-tight">
                  ₹{totalDebitAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-semibold text-neutral-500">
                    {totalDebitCount} debit {totalDebitCount === 1 ? "entry" : "entries"}
                  </span>
                  {transactionType === "DEBIT" && (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-200 text-red-800">
                      Active Filter
                    </span>
                  )}
                </div>
              </div>
            </button>

            {/* Net Flow / Balance Card */}
            <button
              type="button"
              onClick={() => {
                setTransactionType("");
                setPage(1);
              }}
              className={`p-4 sm:p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                transactionType === ""
                  ? "bg-[#6A0FAD]/5 border-[#6A0FAD] ring-2 ring-[#6A0FAD]/20 shadow-sm"
                  : "bg-white border-neutral-200/80 hover:border-purple-300 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Net Volume / Cashflow</span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                  transactionType === "" ? "bg-[#6A0FAD] text-white" : "bg-purple-100 text-[#6A0FAD]"
                }`}>
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className={`text-2xl sm:text-3xl font-black tracking-tight ${
                  netBalance >= 0 ? "text-neutral-900" : "text-amber-700"
                }`}>
                  ₹{netBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-semibold text-neutral-500">
                    {totalDepositCount + totalDebitCount} total transactions
                  </span>
                  {transactionType === "" && (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-200 text-[#6A0FAD]">
                      All Shown
                    </span>
                  )}
                </div>
              </div>
            </button>
          </div>

          {/* Controls Row: 3 Tabs on left, Search on right */}
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-4 shrink-0">
            {/* 3 Tabs: All Transactions | Deposits | Debits */}
            <div className="relative flex bg-neutral-100 p-1.5 rounded-2xl w-full md:w-[480px]">
              <div 
                className={`absolute top-1.5 bottom-1.5 left-1.5 w-[calc(33.333%-0.25rem)] bg-white rounded-xl shadow-sm transition-transform duration-300 ease-out ${
                  transactionType === "" ? "translate-x-0" : transactionType === "DEPOSIT" ? "translate-x-[100%]" : "translate-x-[200%]"
                }`}
              />
              <button
                type="button"
                onClick={() => { setTransactionType(""); setPage(1); }}
                className={`relative z-10 flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs sm:text-sm transition-colors duration-300 ${
                  transactionType === "" ? "text-[#6A0FAD]" : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                All ({totalDepositCount + totalDebitCount})
              </button>
              <button
                type="button"
                onClick={() => { setTransactionType("DEPOSIT"); setPage(1); }}
                className={`relative z-10 flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs sm:text-sm transition-colors duration-300 ${
                  transactionType === "DEPOSIT" ? "text-green-700" : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                <ArrowDownRight className="w-4 h-4 text-green-600" />
                Deposits ({totalDepositCount})
              </button>
              <button
                type="button"
                onClick={() => { setTransactionType("DEBIT"); setPage(1); }}
                className={`relative z-10 flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs sm:text-sm transition-colors duration-300 ${
                  transactionType === "DEBIT" ? "text-red-700" : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-red-600" />
                Debits ({totalDebitCount})
              </button>
            </div>

            {/* Search Box */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search customer or ref ID..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm font-medium text-neutral-900 placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD] focus:bg-white transition-all shadow-sm"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 flex justify-center"><BowlLoader className="w-10 h-10 text-[#6A0FAD]" /></div>
          ) : (
            <div className="bg-white rounded-3xl shadow-sm border border-neutral-200 overflow-hidden flex flex-col flex-1 min-h-0">
              <div className="overflow-auto flex-1 scrollbar-thin">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-100 bg-neutral-50/50 sticky top-0 z-10">
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
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-neutral-500 font-medium">
                          {transactionType === "DEPOSIT"
                            ? "No deposit transactions found for this selection."
                            : transactionType === "DEBIT"
                            ? "No debit transactions found for this selection."
                            : "No transactions found for this selection."}
                        </td>
                      </tr>
                    ) : transactions.map((t) => (
                      <tr key={t.ulid} className="hover:bg-neutral-50/30 transition-colors">
                        <td className="py-4 px-6 font-medium text-neutral-900 whitespace-nowrap">{new Date(t.created_at).toLocaleString()}</td>
                        <td className="py-4 px-6 font-bold text-neutral-900">{t.customer_name}</td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          {t.transaction_type === "DEPOSIT" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-black bg-green-50 text-green-700">
                              <ArrowDownRight className="w-3.5 h-3.5" /> Credit
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-black bg-red-50 text-red-700">
                              <ArrowUpRight className="w-3.5 h-3.5" /> Debit
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 font-black text-neutral-900 whitespace-nowrap">₹{t.amount.toFixed(2)}</td>
                        <td className="py-4 px-6 text-sm text-neutral-600">
                          <div>{t.payment_method || "-"}</div>
                          {t.payment_to && (
                            <span className="text-xs text-neutral-400 font-normal">→ {t.payment_to}</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-sm text-neutral-500 font-mono">{t.reference_id || "-"}</td>
                        <td className="py-4 px-6 text-right">
                          <button 
                            onClick={() => setDeleteUlid(t.ulid)} 
                            className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            title="Delete transaction"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Enhanced Pagination Footer */}
              <div className="py-3 px-6 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 bg-neutral-50/50">
                <div className="flex items-center gap-4 text-xs font-medium text-neutral-500">
                  <span>
                    {totalCount === 0
                      ? "0 transactions"
                      : `Showing ${(page - 1) * limit + 1}–${Math.min(page * limit, totalCount)} of ${totalCount} transactions`}
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-400">Rows:</span>
                    <select
                      value={limit}
                      onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
                      className="bg-white border border-neutral-200 rounded-lg px-2 py-1 text-xs font-bold text-neutral-700 outline-none focus:ring-1 focus:ring-[#6A0FAD]"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || isLoading}
                    className="px-3 py-1.5 text-xs font-bold text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-white transition-colors"
                  >
                    Previous
                  </button>
                  
                  {/* Page Number Pills */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        disabled={isLoading}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                          page === pageNum
                            ? "bg-[#6A0FAD] text-white shadow-sm"
                            : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || isLoading || totalCount === 0}
                    className="px-3 py-1.5 text-xs font-bold text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-white transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
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
