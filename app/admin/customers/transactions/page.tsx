"use client";

import React, { useState, useEffect, useCallback } from "react";
import { endpoints } from "@/lib/apiService";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { BowlLoader } from "@/components/admin/BowlLoader";
import { Header } from "@/components/admin/Header";
import { CheckCircle2, AlertTriangle, ArrowDown, ArrowUp, RotateCcw, Trash2, Search, Plus, RefreshCw } from "lucide-react";
import { ProbaeButton } from "@/components/admin/ProbaeButton";

// -- Types
type Summary = {
  total_cash_deposits: number;
  total_upi_deposits: number;
  total_dispatched_revenue: number;
  total_outstanding_dues: number;
};

type Transaction = {
  ulid: string;
  customer_ulid: string;
  customer_name: string;
  transaction_type: "DEPOSIT" | "DEBIT" | "REFUND";
  amount: number;
  payment_method: string | null;
  reference_id: string | null;
  description: string | null;
  created_at: string;
};

// -- Helpers
function debounce(func: Function, wait: number) {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default function WalletAndTransactionsPage() {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // State: Metrics
  const [summary, setSummary] = useState<Summary | null>(null);
  
  // State: Payment Form Modal
  const [showModal, setShowModal] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ ulid: string, name: string, phone: string } | null>(null);
  
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("UPI");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State: Ledger Table
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  
  const [filterSearch, setFilterSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
  const fetchSummary = useCallback(async () => {
    try {
      const data = await endpoints.transactions.dailySummary() as any;
      setSummary(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await endpoints.transactions.listGlobal({
        page,
        limit,
        search: filterSearch,
        transaction_type: filterType || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        is_manual: true
      }) as any;
      setTransactions(data.transactions || []);
      setTotalCount(data.total_count || 0);
    } catch (e) {
      console.error(e);
      showToast("Failed to fetch transactions", "error");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, filterSearch, filterType, dateFrom, dateTo]);

  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);

  const searchCustomers = useCallback(debounce(async (q: string) => {
    try {
      const res = await endpoints.customers.list({ search: q, limit: 10 }) as any;
      setCustomers(res.customers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingCustomers(false);
    }
  }, 500), []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    if (customerSearchOpen && customers.length === 0 && !isSearchingCustomers) {
      setIsSearchingCustomers(true);
      searchCustomers("");
    }
  }, [customerSearchOpen]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerSearch(e.target.value);
    setIsSearchingCustomers(true);
    searchCustomers(e.target.value);
  };

  const handleFilterSearch = debounce((v: string) => {
    setPage(1);
    setFilterSearch(v);
  }, 500);

  const handleLogPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      return showToast("Please select a customer", "error");
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return showToast("Amount must be a positive number", "error");
    }

    setIsSubmitting(true);
    try {
      await endpoints.transactions.logPayment(selectedCustomer.ulid, {
        amount: Number(amount),
        method,
        description
      });
      showToast("Payment logged successfully!", "success");
      setAmount("");
      setDescription("");
      setSelectedCustomer(null);
      setShowModal(false);
      
      // Refresh data
      fetchSummary();
      setPage(1);
      fetchTransactions();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to log payment", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (ulid: string) => {
    if (!confirm("Are you sure you want to delete this transaction? This will reverse the wallet balance impact.")) return;
    try {
      await endpoints.transactions.delete(ulid);
      showToast("Transaction deleted successfully", "success");
      fetchSummary();
      fetchTransactions();
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to delete transaction", "error");
    }
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        <Header />
        <Breadcrumbs segments={["Admin", "Customers", "Wallet & Transactions"]} />
        
        <div className="mt-4 flex-1 flex flex-col min-h-0 overflow-y-auto space-y-6 pb-20 pr-2">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
            <h1 className="text-3xl font-black text-neutral-900 mt-2">Global Transactions & Billing</h1>
            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={() => { fetchSummary(); fetchTransactions(); }} 
                className="p-3 bg-neutral-100 rounded-xl hover:bg-neutral-200 transition-colors"
                title="Refresh Data"
              >
                <RefreshCw className="w-5 h-5 text-neutral-600" />
              </button>
              <ProbaeButton onClick={() => setShowModal(true)} className="flex items-center">
                <Plus className="w-5 h-5 mr-2" /> Log Payment
              </ProbaeButton>
            </div>
          </div>

          {/* TASK 2: METRICS DASHBOARD */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
            <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm flex flex-col justify-between h-32">
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Today's UPI Collections</p>
              <p className="text-3xl font-black text-[#6A0FAD]">
                ₹{summary ? summary.total_upi_deposits.toFixed(2) : "0.00"}
              </p>
            </div>
            <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm flex flex-col justify-between h-32">
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Today's Cash Collections</p>
              <p className="text-3xl font-black text-green-600">
                ₹{summary ? summary.total_cash_deposits.toFixed(2) : "0.00"}
              </p>
            </div>
            <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm flex flex-col justify-between h-32">
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Total Outstanding Dues</p>
              <p className="text-3xl font-black text-red-600">
                ₹{summary ? summary.total_outstanding_dues.toFixed(2) : "0.00"}
              </p>
            </div>
          </div>

          {/* TASK 4: GLOBAL LEDGER TABLE */}
          <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden flex flex-col shrink-0">
            <div className="p-6 border-b border-neutral-100 bg-neutral-50/50 flex flex-col xl:flex-row justify-between items-center gap-4">
              <h2 className="text-lg font-black text-neutral-900">Ledger History</h2>
              
              <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text"
                    placeholder="Search name or ref..."
                    onChange={(e) => handleFilterSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-neutral-200 text-sm text-neutral-900 focus:border-[#6A0FAD] focus:ring-1 focus:ring-[#6A0FAD] outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    type="date"
                    value={dateFrom}
                    onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                    className="px-4 py-2 rounded-xl border border-neutral-200 text-sm font-medium focus:border-[#6A0FAD] outline-none bg-white text-neutral-900"
                  />
                  <span className="text-neutral-400">-</span>
                  <input 
                    type="date"
                    value={dateTo}
                    onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                    className="px-4 py-2 rounded-xl border border-neutral-200 text-sm font-medium focus:border-[#6A0FAD] outline-none bg-white text-neutral-900"
                  />
                </div>

                <select
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value);
                    setPage(1);
                  }}
                  className="px-4 py-2 rounded-xl border border-neutral-200 text-sm font-medium focus:border-[#6A0FAD] outline-none bg-white min-w-[120px] text-neutral-900"
                >
                  <option value="">All Types</option>
                  <option value="DEPOSIT">Deposits</option>
                  <option value="DEBIT">Debits</option>
                  <option value="REFUND">Refunds</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[800px] border-collapse">
                <thead>
                  <tr className="bg-neutral-50/50 text-[10px] uppercase tracking-wider text-neutral-500 font-bold border-b border-neutral-100">
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                    <th className="px-6 py-4">Method / Ref</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center"><BowlLoader className="mx-auto h-8 w-8 text-[#6A0FAD]" /></td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-neutral-500">No transactions found</td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.ulid} className="border-b border-neutral-50 hover:bg-neutral-50/50 group">
                        <td className="px-6 py-4 text-sm text-neutral-500 whitespace-nowrap">
                          {new Date(tx.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 font-bold text-sm text-neutral-900">
                          <a href={`/admin/customers/${tx.customer_ulid}`} className="hover:text-[#6A0FAD] hover:underline">
                            {tx.customer_name}
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            tx.transaction_type === 'DEPOSIT' ? 'bg-green-100 text-green-700' :
                            tx.transaction_type === 'DEBIT' ? 'bg-red-100 text-red-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {tx.transaction_type === 'DEPOSIT' && <ArrowDown className="w-3 h-3" />}
                            {tx.transaction_type === 'DEBIT' && <ArrowUp className="w-3 h-3" />}
                            {tx.transaction_type === 'REFUND' && <RotateCcw className="w-3 h-3" />}
                            {tx.transaction_type}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-right font-black ${tx.transaction_type === 'DEPOSIT' ? 'text-green-600' : tx.transaction_type === 'DEBIT' ? 'text-red-600' : 'text-orange-600'}`}>
                          {tx.transaction_type === 'DEPOSIT' ? '+' : tx.transaction_type === 'DEBIT' ? '-' : ''}₹{tx.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="font-bold text-neutral-900">{tx.payment_method || '-'}</div>
                          <div className="text-xs text-neutral-400 font-mono">{tx.reference_id}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-neutral-600 max-w-[200px] truncate" title={tx.description || ""}>
                          {tx.description || '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => handleDelete(tx.ulid)}
                            className="text-neutral-300 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
                            title="Delete Transaction"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {totalPages > 1 && (
              <div className="py-4 px-6 border-t border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-bold text-neutral-600 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm font-bold text-neutral-500">Page {page} of {totalPages}</span>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm font-bold text-neutral-600 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Log Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl scale-100 animate-in zoom-in-95">
            <div className="p-6 border-b border-neutral-100 bg-neutral-50 flex justify-between items-center">
              <h2 className="text-xl font-black text-neutral-900">Log Payment</h2>
              <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-black">✕</button>
            </div>
            <form onSubmit={handleLogPayment} className="p-6 space-y-4">
              <div className="relative">
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Customer</label>
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Search..."
                    value={selectedCustomer ? selectedCustomer.name : customerSearch}
                    onChange={e => {
                      if (selectedCustomer) setSelectedCustomer(null);
                      handleSearchChange(e);
                    }}
                    onFocus={() => setCustomerSearchOpen(true)}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-neutral-900 bg-white focus:border-[#6A0FAD] focus:ring-1 focus:ring-[#6A0FAD] outline-none font-medium"
                  />
                  {customerSearchOpen && (
                    <div className="absolute z-[100] mt-1 w-full bg-white border border-neutral-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                      <div className="flex justify-between items-center px-4 py-2 bg-neutral-50 border-b border-neutral-100 sticky top-0">
                        <span className="text-xs font-bold text-neutral-500">Results</span>
                        <button type="button" onClick={() => setCustomerSearchOpen(false)} className="text-neutral-400 hover:text-black">✕</button>
                      </div>
                      {isSearchingCustomers ? (
                        <div className="p-4 text-center">
                           <BowlLoader className="mx-auto h-6 w-6 text-[#6A0FAD]" />
                        </div>
                      ) : customers.length === 0 ? (
                        <div className="p-4 text-center text-sm text-neutral-500">No customers found</div>
                      ) : (
                        customers.map(c => (
                          <button
                            key={c.ulid}
                            type="button"
                            className="w-full text-left px-4 py-3 hover:bg-neutral-50 border-b border-neutral-50 last:border-0"
                            onClick={() => {
                              setSelectedCustomer({ ulid: c.ulid, name: c.name, phone: c.phone });
                              setCustomerSearchOpen(false);
                              setCustomerSearch("");
                            }}
                          >
                            <div className="font-bold text-sm text-neutral-900">{c.name}</div>
                            <div className="text-xs text-neutral-500">{c.phone}</div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Amount (₹)</label>
                <input 
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-neutral-900 bg-white focus:border-[#6A0FAD] focus:ring-1 focus:ring-[#6A0FAD] outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Method</label>
                <select 
                  value={method}
                  onChange={e => setMethod(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-neutral-900 bg-white focus:border-[#6A0FAD] focus:ring-1 focus:ring-[#6A0FAD] outline-none font-medium"
                >
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Description</label>
                <input 
                  type="text"
                  placeholder="Notes..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-neutral-900 bg-white focus:border-[#6A0FAD] focus:ring-1 focus:ring-[#6A0FAD] outline-none font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 rounded-xl text-neutral-500 font-bold hover:bg-neutral-100 transition-colors">
                  Cancel
                </button>
                <ProbaeButton type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Logging..." : "Log Payment"}
                </ProbaeButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Toast Component */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl ${
            toast.type === "error" ? "bg-red-50 border border-red-100 text-red-600" : "bg-black text-white"
          }`}>
            {toast.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />}
            <span className="font-semibold text-sm">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
