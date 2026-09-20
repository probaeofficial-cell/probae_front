"use client";
import React, { useState, useEffect } from "react";
import { endpoints } from "@/lib/apiService";
import { Plus, ArrowDown, ArrowUp, RotateCcw } from "lucide-react";
import { ProbaeButton } from "@/components/admin/ProbaeButton";

export function CustomerLedger({ customerUlid, initialBalance, onBalanceChange }: { customerUlid: string; initialBalance: number; onBalanceChange?: (newBalance: number) => void }) {
  const [balance, setBalance] = useState(initialBalance);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("UPI");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, [customerUlid, page]);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const res = await endpoints.transactions.list(customerUlid, page) as any;
      setTransactions(res.transactions || []);
      setTotalCount(res.total_count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const val = parseFloat(amount);
      if (isNaN(val) || val <= 0) {
        alert("Enter a valid positive amount");
        return;
      }
      await endpoints.transactions.logPayment(customerUlid, {
        amount: val,
        method,
        description
      });
      setShowModal(false);
      setAmount("");
      setDescription("");
      const newBalance = balance + val;
      setBalance(newBalance);
      onBalanceChange?.(newBalance);
      setPage(1);
      fetchTransactions();
    } catch (err) {
      console.error(err);
      alert("Failed to log payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isNegative = balance < 0;
  const totalPages = Math.ceil(totalCount / 20) || 1;

  return (
    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-100 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm">
        <div>
          <h2 className="text-neutral-500 font-bold uppercase tracking-wider text-sm mb-1">Prepaid Wallet Balance</h2>
          <div className={`text-4xl font-black flex items-center gap-2 ${isNegative ? "text-red-600" : "text-green-600"}`}>
            ₹{balance.toFixed(2)}
            {isNegative && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full uppercase tracking-wider ml-2">PAYMENT DUE</span>}
          </div>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-[#6A0FAD] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-[#5a0c93] transition-colors"
        >
          <Plus className="w-5 h-5" /> Log Payment
        </button>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-3xl border border-neutral-100 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50">
          <h3 className="font-bold text-neutral-900">Transaction History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-neutral-50/50 text-[10px] uppercase tracking-wider text-neutral-500 font-bold border-b border-neutral-100">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Ref ID</th>
                <th className="px-6 py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">Loading...</td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">No transactions recorded yet.</td>
                </tr>
              ) : (
                transactions.map((tx: any) => (
                  <tr key={tx.ulid} className="border-b border-neutral-50 hover:bg-neutral-50/50">
                    <td className="px-6 py-4 text-sm text-neutral-600 whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleString()}
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
                    <td className="px-6 py-4 text-sm font-medium text-neutral-900">{tx.description}</td>
                    <td className="px-6 py-4 text-xs text-neutral-500 font-mono">{tx.reference_id || '-'}</td>
                    <td className={`px-6 py-4 text-right font-black ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="py-4 px-6 border-t border-neutral-100 flex items-center justify-between bg-neutral-50">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm font-bold text-neutral-600 bg-white border border-neutral-200 rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm font-bold text-neutral-500">Page {page} of {totalPages}</span>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 text-sm font-bold text-neutral-600 bg-white border border-neutral-200 rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl scale-100 animate-in zoom-in-95">
            <div className="p-6 border-b border-neutral-100 bg-neutral-50">
              <h2 className="text-xl font-black text-neutral-900">Log Payment</h2>
            </div>
            <form onSubmit={handleAddPayment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Amount (₹)</label>
                <input 
                  type="number" 
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
                  <option value="UPI">UPI / Scan</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Description / Notes</label>
                <input 
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. UPI Ref #123456 (optional)"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-neutral-900 bg-white focus:border-[#6A0FAD] focus:ring-1 focus:ring-[#6A0FAD] outline-none font-medium"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 rounded-xl text-neutral-500 font-bold hover:bg-neutral-100">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 disabled:opacity-50">
                  {isSubmitting ? "Saving..." : "Log Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
