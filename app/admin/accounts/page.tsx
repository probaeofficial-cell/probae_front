"use client";

import React, { useEffect, useState } from "react";
import { api as apiService } from "@/lib/apiService";
import { Wallet, Banknote, CreditCard, RefreshCw, AlertCircle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { BowlLoader } from "@/components/admin/BowlLoader";
import { useAuth } from "@/lib/AuthContext";

interface DailySummary {
  total_cash_deposits: number;
  total_upi_deposits: number;
  total_dispatched_revenue: number;
}

interface Transaction {
  ulid: string;
  customer_name: string;
  transaction_type: string;
  amount: number;
  payment_method: string | null;
  reference_id: string | null;
  created_at: string;
}

export default function AccountsDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const summaryRes = await apiService.get<DailySummary>('/transactions/daily-summary');
      setSummary(summaryRes);
      
      const txRes = await apiService.get<any>('/transactions?limit=50');
      setTransactions(txRes.transactions || []);
    } catch (err: any) {
      setError(err.message || "Failed to load accounts data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  if (authLoading || (!user && loading)) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <BowlLoader className="w-8 h-8 text-[#7c26d9]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        <Header />
        <Breadcrumbs segments={["Admin", "Finance", "Accounts"]} />
          
        <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-2xl pt-2 pb-6 px-6 sm:pt-2 sm:pb-8 sm:px-8">
          
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 shrink-0 gap-4">
            <div>
              <h1 className="text-xl font-bold text-neutral-800 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-500" />
                Global Accounts & Finance
              </h1>
              <p className="text-sm text-neutral-500 mt-1">
                Monitor global revenue, deposits, and daily summaries.
              </p>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50 text-sm h-[36px]"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 border border-red-200 mb-6 shrink-0">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="flex-1 overflow-auto pr-2 pb-6 scrollbar-thin rounded-2xl border border-neutral-100 p-2">
            
            {/* Top Metrics Cards */}
            {!loading && summary && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-2 mx-2">
                <div className="border border-neutral-200 rounded-2xl p-6 bg-white shadow-sm flex flex-col">
                  <div className="flex items-center gap-2 mb-2 text-neutral-500">
                    <Banknote className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold uppercase tracking-wider">Today's Cash</span>
                  </div>
                  <span className="text-3xl font-extrabold text-neutral-900">{formatCurrency(summary.total_cash_deposits)}</span>
                </div>

                <div className="border border-neutral-200 rounded-2xl p-6 bg-white shadow-sm flex flex-col">
                  <div className="flex items-center gap-2 mb-2 text-neutral-500">
                    <CreditCard className="w-4 h-4 text-purple-500" />
                    <span className="text-xs font-bold uppercase tracking-wider">Today's UPI</span>
                  </div>
                  <span className="text-3xl font-extrabold text-neutral-900">{formatCurrency(summary.total_upi_deposits)}</span>
                </div>

                <div className="border border-neutral-200 rounded-2xl p-6 bg-white shadow-sm flex flex-col">
                  <div className="flex items-center gap-2 mb-2 text-neutral-500">
                    <Wallet className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold uppercase tracking-wider">Dispatched Revenue</span>
                  </div>
                  <span className="text-3xl font-extrabold text-neutral-900">{formatCurrency(summary.total_dispatched_revenue)}</span>
                </div>
              </div>
            )}

            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3">
                <BowlLoader className="w-8 h-8 text-[#6b21a8]" />
                <span className="text-neutral-500 text-sm font-medium">Loading ledger...</span>
              </div>
            ) : transactions.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center bg-white border border-neutral-100 rounded-3xl p-8 text-center max-w-lg mx-auto m-6">
                <h3 className="text-neutral-800 font-bold text-lg">No Transactions</h3>
                <p className="text-neutral-500 text-sm mt-2 max-w-sm">
                  There are no financial transactions recorded yet.
                </p>
              </div>
            ) : (
              <div className="mx-2">
                <h3 className="font-bold text-neutral-800 mb-4 px-2 text-lg">Master Ledger</h3>
                <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                  <table className="w-full text-left text-sm text-neutral-600">
                    <thead className="text-xs uppercase bg-[#F9FAFB] text-neutral-500 font-bold tracking-wider">
                      <tr>
                        <th className="px-6 py-4 border-b border-neutral-200">Date/Time</th>
                        <th className="px-6 py-4 border-b border-neutral-200">Customer Name</th>
                        <th className="px-6 py-4 border-b border-neutral-200">Type</th>
                        <th className="px-6 py-4 border-b border-neutral-200">Method</th>
                        <th className="px-6 py-4 border-b border-neutral-200 text-right">Amount</th>
                        <th className="px-6 py-4 border-b border-neutral-200">Reference ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 bg-white">
                      {transactions.map((tx) => {
                        const isDeposit = tx.transaction_type === 'DEPOSIT';
                        
                        return (
                          <tr key={tx.ulid} className="hover:bg-neutral-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-neutral-500">
                              {new Date(tx.created_at).toLocaleString('en-IN', {
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                              })}
                            </td>
                            <td className="px-6 py-4 font-bold text-neutral-800">
                              {tx.customer_name}
                            </td>
                            <td className="px-6 py-4">
                              {isDeposit ? (
                                <span className="inline-flex items-center gap-1 bg-green-50 text-green-600 px-2 py-1 rounded-md text-xs font-bold border border-green-100">
                                  <ArrowUpRight className="w-3 h-3" /> IN
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 px-2 py-1 rounded-md text-xs font-bold border border-red-100">
                                  <ArrowDownRight className="w-3 h-3" /> OUT
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-neutral-500 font-medium">
                              {tx.payment_method || '-'}
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-neutral-900">
                              {formatCurrency(tx.amount)}
                            </td>
                            <td className="px-6 py-4 font-mono text-xs text-neutral-400">
                              {tx.reference_id}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
