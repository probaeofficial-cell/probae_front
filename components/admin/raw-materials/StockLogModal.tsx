import React, { useState, useEffect } from "react";
import { X, Loader2, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { RawMaterial } from "@/lib/types";
import { endpoints } from "@/lib/apiService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  material: RawMaterial;
}

export function StockLogModal({ isOpen, onClose, material }: Props) {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await endpoints.rawMaterials.getStockLogs(material.ulid);
      setLogs(data);
    } catch (err) {
      console.error("Failed to fetch stock logs", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
      <div 
        className="bg-white rounded-[32px] w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden relative border border-neutral-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-100/50">
          <div>
            <h2 className="text-xl font-extrabold text-neutral-800 tracking-tight">Stock Log</h2>
            <p className="text-sm font-medium text-neutral-500">{material.name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4">
            <div className="h-80 overflow-y-auto pr-2 scrollbar-thin">
                {isLoading ? (
                    <div className="flex h-full items-center justify-center">
                        <Loader2 className="w-6 h-6 text-[#6b21a8] animate-spin" />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm font-semibold text-neutral-400">
                        No stock logs found.
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {logs.map((log) => {
                            const isPositive = log.quantity_change > 0;
                            const isNegative = log.quantity_change < 0;
                            return (
                                <div key={log.ulid} className="p-4 bg-neutral-50/50 rounded-2xl border border-neutral-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                            isPositive ? "bg-green-100 text-green-600" : isNegative ? "bg-red-100 text-red-600" : "bg-neutral-100 text-neutral-600"
                                        }`}>
                                            {isPositive ? <ArrowUpRight className="w-5 h-5" /> : isNegative ? <ArrowDownRight className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-neutral-800 text-sm">
                                                {isPositive ? "Added Stock" : isNegative ? "Removed Stock" : "Adjusted Stock"}
                                            </p>
                                            <p className="text-xs font-medium text-neutral-400">
                                                {new Date(log.created_at).toLocaleString()}
                                            </p>
                                            {log.description && (
                                                <p className="text-[11px] font-medium text-neutral-500 mt-1">{log.description}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-black text-lg ${isPositive ? "text-green-600" : isNegative ? "text-red-600" : "text-neutral-600"}`}>
                                            {isPositive ? "+" : ""}{Number(log.quantity_change)}{material.unit}
                                        </p>
                                        <p className="text-xs font-medium text-neutral-400 mt-0.5">
                                            Balance: {Number(log.new_stock)}{material.unit}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}
