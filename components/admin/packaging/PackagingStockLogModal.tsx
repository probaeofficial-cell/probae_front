"use client";
import { BowlLoader } from "@/components/admin/BowlLoader";
import React, { useState, useEffect } from "react";
import { X, ArrowUpCircle, ArrowDownCircle, Package, ShoppingBag, Sliders, ShieldCheck } from "lucide-react";
import { endpoints } from "@/lib/apiService";
import { PackagingComponent, PackagingComponentStockLog, ChildStickerSummary } from "@/lib/types";

interface Props {
  component: PackagingComponent | ChildStickerSummary;
  onClose: () => void;
}

export function PackagingStockLogModal({ component, onClose }: Props) {
  const [logs, setLogs] = useState<PackagingComponentStockLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const pageSize = 20;

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const res = await endpoints.packaging.getComponentStockLogs(component.ulid, page, pageSize) as any;
        setLogs(res.items || []);
        setTotal(res.total || 0);
      } catch (err) {
        console.error("Failed to load stock logs", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, [component.ulid, page]);

  const totalPages = Math.ceil(total / pageSize);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
      " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
      <div
        className="bg-white rounded-[32px] w-full max-w-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden border border-neutral-100 max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-100 shrink-0">
          <div>
            <h2 className="text-xl font-extrabold text-neutral-800 tracking-tight">Stock Transaction Ledger</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-neutral-900 font-bold">{component.name}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Current Stock Banner */}
        <div className="px-6 py-3 bg-purple-50 border-b border-purple-100 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Current Available Stock</span>
            <span className="text-lg font-black text-purple-900">{Number(component.current_stock)} pcs</span>
          </div>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <BowlLoader className="w-8 h-8 text-[#6A0FAD]" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Package className="w-12 h-12 text-neutral-200" />
              <p className="text-neutral-400 font-medium">No stock transactions recorded yet</p>
            </div>
          ) : (
            logs.map(log => {
              const change = log.quantity_change ?? 0;
              const isPositive = change > 0;
              const txType = (log.transaction_type || (isPositive ? "STOCK_IN" : "STOCK_OUT")).toUpperCase();
              const isKds = log.reference_type === "KDS_PACKING" || Boolean(log.order_ulid);

              return (
                <div key={log.id} className="flex items-start gap-3.5 p-4 rounded-2xl bg-neutral-50 border border-neutral-100 hover:bg-neutral-100/50 transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    txType === "STOCK_IN"
                      ? "bg-emerald-100 text-emerald-700"
                      : txType === "STOCK_OUT"
                      ? "bg-red-100 text-red-600"
                      : "bg-purple-100 text-[#6A0FAD]"
                  }`}>
                    {isKds ? (
                      <ShoppingBag className="w-5 h-5 text-red-600" />
                    ) : txType === "STOCK_IN" ? (
                      <ArrowUpCircle className="w-5 h-5 text-emerald-600" />
                    ) : txType === "STOCK_OUT" ? (
                      <ArrowDownCircle className="w-5 h-5 text-red-600" />
                    ) : (
                      <Sliders className="w-5 h-5 text-[#6A0FAD]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                          txType === "STOCK_IN"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : txType === "STOCK_OUT"
                            ? "bg-red-50 text-red-600 border-red-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}>
                          {txType.replace("_", " ")}
                        </span>
                        {isKds && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-50 text-[#6A0FAD] border border-purple-200">
                            KDS PACKING
                          </span>
                        )}
                        <span className={`text-sm font-black ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
                          {isPositive ? `+${change}` : change} pcs
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-400 font-medium whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </span>
                    </div>

                    <div className="text-xs text-neutral-600 font-semibold mt-1">
                      Balance: <span className="font-mono text-neutral-500">{log.previous_stock} pcs</span> → <span className="font-mono font-bold text-neutral-900">{log.new_stock} pcs</span>
                    </div>

                    {/* Remarks & References */}
                    {(log.remarks || log.description) && (
                      <div className="text-xs text-neutral-700 font-medium mt-1 bg-white px-2.5 py-1 rounded-lg border border-neutral-100">
                        {log.remarks || log.description}
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-neutral-400">
                      {log.order_ulid && (
                        <div className="font-mono text-[#6A0FAD] font-semibold truncate">
                          Order: {log.order_ulid}
                        </div>
                      )}
                      {log.reference_id && log.reference_id !== log.order_ulid && (
                        <div className="font-mono text-neutral-500 truncate">
                          Ref: {log.reference_id}
                        </div>
                      )}
                      <div className="ml-auto flex items-center gap-1 text-neutral-500">
                        <ShieldCheck className="w-3 h-3 text-neutral-400" />
                        {log.created_by ? log.created_by.name : isKds ? "KDS Kitchen Staff" : "System"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-neutral-100 flex items-center justify-between shrink-0">
            <span className="text-xs text-neutral-500 font-medium">Page {page} of {totalPages} ({total} entries)</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-neutral-100 text-neutral-600 disabled:opacity-40 hover:bg-neutral-200 transition-colors"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[#6A0FAD] text-white disabled:opacity-40 hover:bg-[#5a0c94] transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
