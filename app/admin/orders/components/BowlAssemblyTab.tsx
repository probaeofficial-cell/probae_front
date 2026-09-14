"use client";
import { BowlLoader } from "@/components/admin/BowlLoader";
import React, { useState, useEffect, useMemo } from "react";
import { Loader2, Package, Search, CheckCircle2, Circle, User } from "lucide-react";
import { endpoints } from "@/lib/apiService";
import { ConfirmationModal } from "@/components/ConfirmationModal";

export function BowlAssemblyTab({ targetDate }: { targetDate: string }) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "ASSEMBLED">("PENDING");

  const [confirmAction, setConfirmAction] = useState<{ulid: string, status: string} | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [targetDate]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await endpoints.kds.getAssemblyList(targetDate) as any;
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmUpdate = async () => {
    if (!confirmAction) return;
    setIsUpdating(true);
    try {
      await endpoints.kds.updateAssemblyStatus(confirmAction.ulid, confirmAction.status);
      await fetchData();
    } catch (e) {
      console.error("Failed to update status", e);
    } finally {
      setIsUpdating(false);
      setConfirmAction(null);
    }
  };

  const filteredBowls = useMemo(() => {
    if (!data?.bowls) return [];
    return data.bowls.filter((bowl: any) => {
      const matchesSearch = 
        bowl.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bowl.bowl_name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "ALL" || bowl.assembly_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [data, searchQuery, statusFilter]);

  if (isLoading) {
    return <div className="p-8 flex justify-center"><BowlLoader className="animate-spin w-8 h-8 text-neutral-400" /></div>;
  }

  if (!data) return <div className="p-8 text-center text-neutral-500">Failed to load assembly list.</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#6A0FAD]">Bowl Assembly Station</h2>
          <p className="text-sm text-neutral-500">Target Date: {targetDate}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Total Bowls</p>
            <div className="text-2xl font-black text-[#ff751f]">{data.total_bowls}</div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input 
            type="text" 
            placeholder="Search by customer or bowl name..." 
            className="w-full pl-9 pr-4 py-2 rounded-xl border text-black border-neutral-200 outline-none focus:border-[#6A0FAD] focus:ring-1 focus:ring-[#6A0FAD] text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2 p-1 bg-neutral-100 rounded-xl w-full md:w-auto overflow-x-auto">
          {(["PENDING", "ASSEMBLED", "ALL"] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${
                statusFilter === s ? "bg-white text-[#6A0FAD] shadow-sm" : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              {s === "PENDING" ? "Unassembled" : s === "ASSEMBLED" ? "Assembled" : "All Bowls"}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredBowls.length === 0 ? (
          <div className="col-span-full p-8 text-center text-neutral-500 bg-white rounded-2xl border">
            No bowls found matching your filters.
          </div>
        ) : (
          filteredBowls.map((bowl: any, idx: number) => (
            <div key={`${bowl.order_item_ulid}-${idx}`} className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden flex flex-col">
              <div className="p-4 border-b bg-neutral-50 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      bowl.assembly_status === "ASSEMBLED" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                    }`}>
                      {bowl.assembly_status}
                    </span>
                    <span className="text-xs font-bold text-neutral-400 bg-neutral-200 px-2 py-0.5 rounded-md">
                      Qty: {bowl.quantity}
                    </span>
                  </div>
                  <h3 className="font-bold text-neutral-900 text-lg truncate">{bowl.bowl_name}</h3>
                  <div className="flex flex-col gap-1 mt-1 text-sm text-neutral-500">
                    <div className="flex items-center gap-1.5 text-neutral-700 font-medium">
                      <User className="w-3.5 h-3.5" />
                      <span className="truncate">{bowl.customer_name}</span>
                    </div>
                    {bowl.packaging_name && (
                      <div className="flex items-center gap-1.5 text-neutral-500 text-xs">
                        <Package className="w-3.5 h-3.5" />
                        <span>Pack in: {bowl.packaging_name}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="shrink-0 flex flex-col gap-2">
                  {bowl.assembly_status === "PENDING" ? (
                    <button
                      onClick={() => setConfirmAction({ ulid: bowl.order_item_ulid, status: "ASSEMBLED" })}
                      className="flex flex-col items-center justify-center bg-white border border-neutral-200 text-neutral-400 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-colors w-16 h-16 rounded-xl"
                    >
                      <Circle className="w-6 h-6 mb-1" />
                      <span className="text-[10px] font-bold leading-none">MARK</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmAction({ ulid: bowl.order_item_ulid, status: "PENDING" })}
                      className="flex flex-col items-center justify-center bg-green-50 border border-green-200 text-green-600 transition-colors w-16 h-16 rounded-xl"
                    >
                      <CheckCircle2 className="w-6 h-6 mb-1" />
                      <span className="text-[10px] font-bold leading-none">DONE</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="p-4 flex-1">
                <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-3">Bowl Composition:</p>
                <div className="space-y-2">
                  {bowl.components?.map((comp: any) => (
                    <div key={comp.ingredient_id} className="flex items-center justify-between py-2 border-b border-neutral-50 last:border-0">
                      <span className="text-sm font-medium text-neutral-700">{comp.name}</span>
                      <span className="text-sm font-bold text-[#6A0FAD]">{comp.weight_needed}g</span>
                    </div>
                  ))}
                  {(!bowl.components || bowl.components.length === 0) && (
                    <p className="text-xs text-neutral-400 italic">No components found.</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmationModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmUpdate}
        title="Confirm Assembly Update"
        message={
          confirmAction?.status === "ASSEMBLED" 
            ? "Are you sure you want to mark this bowl as ASSEMBLED?" 
            : "Are you sure you want to revert this bowl back to UNASSEMBLED (PENDING)?"
        }
        type={confirmAction?.status === "ASSEMBLED" ? "success" : "warning"}
        confirmText={confirmAction?.status === "ASSEMBLED" ? "Yes, Mark Assembled" : "Yes, Revert"}
        cancelText="Cancel"
        isLoading={isUpdating}
      />
    </div>
  );
}
