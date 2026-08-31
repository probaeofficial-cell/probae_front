"use client";
import { BowlLoader } from "@/components/admin/BowlLoader";
import React, { useState, useEffect } from "react";
import { X, ArrowUpCircle, ArrowDownCircle, Package, ShoppingBag } from "lucide-react";
import { endpoints } from "@/lib/apiService";
import { PackagingComponent, PackagingComponentStockLog } from "@/lib/types";

interface Props {
  component: PackagingComponent;
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
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        className="bg-white rounded-[32px] w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden border border-neutral-100 max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-100 shrink-0">
          <div>
            <h2 className="text-xl font-extrabold text-neutral-800 tracking-tight">Stock Logs</h2>
            <p className="text-sm text-neutral-500 font-medium mt-0.5">{component.name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Current Stock Banner */}
        <div className="px-6 py-3 bg-purple-50 border-b border-purple-100 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-purple-700">Current Stock</span>
            <span className="text-lg font-black text-purple-700">{Number(component.current_stock)} pcs</span>
          </div>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <BowlLoader className="w-8 h-8 animate-spin text-[#6A0FAD]" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Package className="w-12 h-12 text-neutral-200" />
              <p className="text-neutral-400 font-medium">No stock logs yet</p>
            </div>
          ) : (
            logs.map(log => {
              const isPositive = log.quantity_change > 0;
              return (
                <div key={log.id} className="flex items-start gap-3 p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isPositive ? "bg-green-100" : "bg-red-100"}`}>
                    {log.order_ulid ? (
                      <ShoppingBag className={`w-4 h-4 ${isPositive ? "text-green-600" : "text-red-500"}`} />
                    ) : isPositive ? (
                      <ArrowUpCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <ArrowDownCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-base font-black ${isPositive ? "text-green-600" : "text-red-500"}`}>
                        {isPositive ? `+${log.quantity_change}` : log.quantity_change} pcs
                      </span>
                      <span className="text-xs text-neutral-400 font-medium">{formatDate(log.created_at)}</span>
                    </div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      {log.previous_stock} → {log.new_stock} pcs
                    </div>
                    {log.description && (
                      <div className="text-xs text-neutral-600 font-medium mt-1">{log.description}</div>
                    )}
                    {log.order_ulid && (
                      <div className="text-xs text-purple-600 font-mono mt-1 truncate">Order: {log.order_ulid}</div>
                    )}
                    {log.created_by && (
                      <div className="text-xs text-neutral-400 mt-0.5">by {log.created_by.name}</div>
                    )}
                    {!log.created_by && !log.order_ulid && (
                      <div className="text-xs text-neutral-400 mt-0.5">System</div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-neutral-100 flex items-center justify-between shrink-0">
            <span className="text-sm text-neutral-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm font-bold rounded-xl bg-neutral-100 text-neutral-600 disabled:opacity-40 hover:bg-neutral-200 transition-colors"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm font-bold rounded-xl bg-[#6A0FAD] text-white disabled:opacity-40 hover:bg-[#5a0c94] transition-colors"
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
