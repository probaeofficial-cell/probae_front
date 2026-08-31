"use client";
import { BowlLoader } from "@/components/admin/BowlLoader";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  BarChart3,
  ListOrdered,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ProbaeSearch } from "@/components/admin/ProbaeSearch";
import { endpoints } from "@/lib/apiService";
import { PackagingComponent } from "@/lib/types";
import { PackagingStockAdjustmentModal } from "@/components/admin/packaging/PackagingStockAdjustmentModal";
import { PackagingStockLogModal } from "@/components/admin/packaging/PackagingStockLogModal";

export default function PackagingComponentStockPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [components, setComponents] = useState<PackagingComponent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [selectedComponent, setSelectedComponent] = useState<PackagingComponent | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/admin/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 600);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchComponents = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await endpoints.packaging.getComponents(page, pageSize, debouncedSearch) as any;
      setComponents(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to fetch packaging components", err);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, debouncedSearch]);

  useEffect(() => {
    fetchComponents();
  }, [fetchComponents]);

  const totalPages = Math.ceil(total / pageSize);

  const getStockStatus = (comp: PackagingComponent) => {
    const stock = Number(comp.current_stock);
    const threshold = Number(comp.stock_threshold);
    if (stock <= 0) return { label: "Out of Stock", color: "text-red-600", bg: "bg-red-50 border-red-100", icon: <XCircle className="w-4 h-4 text-red-500" /> };
    if (threshold > 0 && stock <= threshold) return { label: "Low Stock", color: "text-amber-600", bg: "bg-amber-50 border-amber-100", icon: <AlertTriangle className="w-4 h-4 text-amber-500" /> };
    return { label: "In Stock", color: "text-green-600", bg: "bg-green-50 border-green-100", icon: <CheckCircle2 className="w-4 h-4 text-green-500" /> };
  };

  const handleAdjustSuccess = (updated: PackagingComponent) => {
    setComponents(prev => prev.map(c => c.ulid === updated.ulid ? updated : c));
    setSelectedComponent(updated);
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        <Header />
        <Breadcrumbs segments={["Admin", "Packaging", "Components", "Stock Management"]} />

        <div className="mt-4 flex-1 flex flex-col min-h-0">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
            <div>
              <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Packaging Stock</h1>
              <p className="text-neutral-500 font-medium mt-1">Monitor and adjust packaging component inventory</p>
            </div>
            <ProbaeSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search components..."
              hideSort
              hideFilter
            />
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <BowlLoader className="w-10 h-10 animate-spin text-[#6A0FAD]" />
              </div>
            ) : components.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <Package className="w-16 h-16 text-neutral-200" />
                <div className="text-center">
                  <p className="font-black text-neutral-400 text-lg">No components found</p>
                  <p className="text-neutral-400 text-sm mt-1">Try adjusting your search</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-50 border-b border-neutral-200 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3.5 text-left font-black text-neutral-500 uppercase tracking-wider text-xs">Component</th>
                        <th className="px-6 py-3.5 text-center font-black text-neutral-500 uppercase tracking-wider text-xs">Threshold</th>
                        <th className="px-6 py-3.5 text-center font-black text-neutral-500 uppercase tracking-wider text-xs">Current Stock</th>
                        <th className="px-6 py-3.5 text-center font-black text-neutral-500 uppercase tracking-wider text-xs">Status</th>
                        <th className="px-6 py-3.5 text-right font-black text-neutral-500 uppercase tracking-wider text-xs">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {components.map(comp => {
                        const status = getStockStatus(comp);
                        return (
                          <tr key={comp.ulid} className="hover:bg-neutral-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-sm font-black text-purple-300 shrink-0">
                                  {comp.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-neutral-900">{comp.name}</div>
                                  <div className="text-xs text-neutral-400">₹{Number(comp.cost).toFixed(2)} / unit</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="font-bold text-neutral-600">{Number(comp.stock_threshold)} pcs</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`text-xl font-black ${Number(comp.current_stock) <= 0 ? "text-red-500" : Number(comp.current_stock) <= Number(comp.stock_threshold) && Number(comp.stock_threshold) > 0 ? "text-amber-500" : "text-green-600"}`}>
                                {Number(comp.current_stock)}
                              </span>
                              <span className="text-xs text-neutral-400 ml-1">pcs</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${status.bg} ${status.color}`}>
                                {status.icon}
                                {status.label}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => { setSelectedComponent(comp); setIsAdjustModalOpen(true); }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#6A0FAD]/10 text-[#6A0FAD] hover:bg-[#6A0FAD]/20 transition-colors"
                                >
                                  <BarChart3 className="w-3.5 h-3.5" />
                                  Adjust
                                </button>
                                <button
                                  onClick={() => { setSelectedComponent(comp); setIsLogModalOpen(true); }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                                >
                                  <ListOrdered className="w-3.5 h-3.5" />
                                  Logs
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between shrink-0 p-4 border-t border-neutral-200">
                  <span className="text-sm text-neutral-500 font-medium">Page {page} of {totalPages} · {total} components</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-[#f8f5fb] text-neutral-600 hover:bg-[#f1edf7] disabled:opacity-50 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages || totalPages === 0}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-[#f8f5fb] text-neutral-600 hover:bg-[#f1edf7] disabled:opacity-50 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {isAdjustModalOpen && selectedComponent && (
        <PackagingStockAdjustmentModal
          component={selectedComponent}
          onClose={() => setIsAdjustModalOpen(false)}
          onSuccess={handleAdjustSuccess}
        />
      )}
      {isLogModalOpen && selectedComponent && (
        <PackagingStockLogModal
          component={selectedComponent}
          onClose={() => setIsLogModalOpen(false)}
        />
      )}
    </div>
  );
}
