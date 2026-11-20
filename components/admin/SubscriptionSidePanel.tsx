
"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X, Calendar, Edit3, PauseCircle, RefreshCw, CheckCircle2, Clock, SlidersHorizontal, Sparkles, Trash2, AlertTriangle } from "lucide-react";
import { api, endpoints } from "@/lib/apiService";
import { getMediaUrl } from "@/lib/utils";
import { BowlLoader } from "@/components/admin/BowlLoader";
import { BowlCustomizerModal } from "@/components/admin/BowlCustomizerModal";

export function SubscriptionSidePanel({ subscription, onClose, onUpdate }: { subscription: any, onClose: () => void, onUpdate?: () => void }) {
  const [activeTab, setActiveTab] = useState<"overview" | "schedule">("overview");
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [systemSettings, setSystemSettings] = useState({ R2_BASE_URL: "" });
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelResult, setCancelResult] = useState<any>(null);

  const [customizerModal, setCustomizerModal] = useState<{
    isOpen: boolean;
    bowlUlid: string;
    bowlName: string;
    dayIndex: number;
    mealSlot: string;
    scheduleUlid: string;
    initialIngredients: any[];
    packagingCost: number;
    fixedCost: number;
  }>({
    isOpen: false,
    bowlUlid: "",
    bowlName: "",
    dayIndex: 1,
    mealSlot: "",
    scheduleUlid: "",
    initialIngredients: [],
    packagingCost: 0,
    fixedCost: 0,
  });

  useEffect(() => {
    api.get("/settings/").then((res: any) => {
      if (res && res.R2_BASE_URL) setSystemSettings({ R2_BASE_URL: res.R2_BASE_URL });
    }).catch(() => {});
  }, []);
  
  const s = subscription;
  const progressPct = s.progress.total > 0 ? Math.round((s.progress.done / s.progress.total) * 100) : 0;
  const canCancel = s.customer.can_cancel_plan && ["Active", "Paused", "Ending Soon"].includes(s.status);
  const allocatedBowls = Math.max(0, Number(s.plan.total_bowls || 0));
  const remainingBowls = Math.min(allocatedBowls, Math.max(0, Number(s.progress.left || 0)));
  const consumedBowls = Math.max(0, allocatedBowls - remainingBowls);
  const amountPaid = Math.max(0, Number(s.plan.amount_paid || 0));
  const estimatedRefund = allocatedBowls > 0 ? Number((amountPaid * remainingBowls / allocatedBowls).toFixed(2)) : 0;
  const consumedValue = Number((amountPaid - estimatedRefund).toFixed(2));
  const formatMoney = (amount: number) => `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const cancelSubscription = async () => {
    setIsCancelling(true);
    setCancelError("");
    try {
      const result: any = await endpoints.customers.cancelPlan(s.customer.ulid, {
        remove_transaction: true,
        remove_remaining_bowls: true,
        delete_future_orders: true,
        reason: "Cancelled from subscription details",
      });
      setCancelResult(result);
    } catch (error: any) {
      setCancelError(error?.detail || error?.message || "Could not cancel this subscription. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };
  
  useEffect(() => {
    if (activeTab === "schedule") {
      loadSchedule();
    }
  }, [activeTab, s.customer.ulid]);

  useEffect(() => {
    if (!showCancelConfirm) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isCancelling && !cancelResult) setShowCancelConfirm(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [showCancelConfirm, isCancelling, cancelResult]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/customers/${s.customer.ulid}/meal-schedule`);
      setSchedule(res as any);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden sticky top-8">
      {/* Header */}
      <div className="p-6 border-b flex justify-between items-start">
        <div className="flex gap-4 items-center">
          <div className="w-12 h-12 rounded-full bg-neutral-200 overflow-hidden relative">
            {s.customer.image ? (
              <img src={getMediaUrl(systemSettings.R2_BASE_URL, s.customer.image) || undefined} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#6A0FAD] font-bold text-lg bg-[#6A0FAD]/10">
                {s.customer.name.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-black text-black">{s.customer.name}</h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                s.status === 'Active' ? 'bg-green-100 text-green-700' :
                s.status === 'Ending Soon' ? 'bg-orange-100 text-orange-700' :
                'bg-neutral-100 text-neutral-700'
              }`}>
                • {s.status}
              </span>
            </div>
            <p className="text-xs text-neutral-500 font-medium">#{s.customer.ulid.slice(-4)} • {s.customer.phone}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full text-neutral-400">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-100">
        <button 
          onClick={() => setActiveTab("overview")}
          className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-colors ${activeTab === 'overview' ? 'border-[#6A0FAD] text-[#6A0FAD]' : 'border-transparent text-neutral-400 hover:text-neutral-600'}`}
        >
          OVERVIEW
        </button>
        <button 
          onClick={() => setActiveTab("schedule")}
          className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-colors ${activeTab === 'schedule' ? 'border-[#6A0FAD] text-[#6A0FAD]' : 'border-transparent text-neutral-400 hover:text-neutral-600'}`}
        >
          MEAL SCHEDULE
        </button>
      </div>
      
      <div className="p-6 overflow-y-auto transition-all duration-300 ease-in-out animate-in fade-in duration-300" style={{ maxHeight: "calc(100vh - 300px)" }}>
        {activeTab === "overview" ? (
          <>
            {/* Blueprint */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Subscription Blueprint</h3>
                <span className="bg-[#6A0FAD]/10 text-[#6A0FAD] px-3 py-1 rounded-full text-xs font-bold">
                  {s.plan.name} ({s.plan.total_bowls} Bowls)
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                  <p className="text-xs text-neutral-400 font-bold mb-1">Start Date</p>
                  <p className="text-sm font-black text-black">
                    {s.plan?.start_date ? String(s.plan.start_date).split('T')[0] : 'N/A'}
                  </p>
                </div>
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                  <p className="text-xs text-neutral-400 font-bold mb-1">Meal Slots</p>
                  <p className="text-sm font-black text-black">{s.plan.included_meal_slots.map((m:string)=>m.charAt(0).toUpperCase()+m.slice(1)).join(' + ')}</p>
                </div>
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                  <p className="text-xs text-neutral-400 font-bold mb-1">Est. Completion</p>
                  <p className="text-sm font-black text-black">{s.est_completion}</p>
                </div>
              </div>
            </div>
            
            {/* Progress Details */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Plan Progress Details</h3>
                <span className="text-[#6A0FAD] text-sm font-black">{progressPct}% Fulfilled</span>
              </div>
              <div className="w-full bg-neutral-200 h-2.5 rounded-full overflow-hidden flex mb-4">
                <div className="bg-[#6A0FAD] h-full" style={{ width: `${progressPct}%` }}></div>
                <div className="bg-green-400 h-full" style={{ width: `${s.progress.total > 0 ? (s.progress.left/s.progress.total)*100 : 0}%` }}></div>
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-[#6A0FAD]/10 p-2 rounded-lg text-center">
                  <p className="text-[10px] font-bold text-[#6A0FAD] mb-0.5 uppercase">Done</p>
                  <p className="text-sm font-black text-[#6A0FAD]">{s.progress.done}</p>
                </div>
                <div className="bg-green-100 p-2 rounded-lg text-center">
                  <p className="text-[10px] font-bold text-green-700 mb-0.5 uppercase">Left</p>
                  <p className="text-sm font-black text-green-700">{s.progress.left}</p>
                </div>
                <div className="bg-neutral-100 p-2 rounded-lg text-center">
                  <p className="text-[10px] font-bold text-neutral-500 mb-0.5 uppercase">Hold</p>
                  <p className="text-sm font-black text-neutral-600">{s.progress.hold}</p>
                </div>
                <div className="bg-red-50 p-2 rounded-lg text-center">
                  <p className="text-[10px] font-bold text-red-500 mb-0.5 uppercase">Disq.</p>
                  <p className="text-sm font-black text-red-600">{s.progress.disq}</p>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button className="flex items-center justify-center gap-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs py-3 rounded-xl transition-colors">
                <Edit3 className="w-4 h-4" /> Manage Plan
              </button>
              {s.status === 'Paused' ? (
                <button 
                  onClick={async () => {
                    try {
                      await api.patch(`/customers/${s.customer.ulid}/delivery-status`, { status: "ACTIVE" });
                      if (onUpdate) onUpdate();
                    } catch (e) { alert("Failed to resume plan"); }
                  }}
                  className="flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 text-green-600 font-bold text-xs py-3 rounded-xl transition-colors"
                >
                  <RefreshCw className="w-4 h-4" /> Resume Plan
                </button>
              ) : (
                <button 
                  onClick={async () => {
                    try {
                      await api.patch(`/customers/${s.customer.ulid}/delivery-status`, { status: "PAUSED" });
                      if (onUpdate) onUpdate();
                    } catch (e) { alert("Failed to pause plan"); }
                  }}
                  className="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs py-3 rounded-xl transition-colors"
                >
                  <PauseCircle className="w-4 h-4" /> Pause Plan
                </button>
              )}
            </div>
            <button disabled={s.status !== "Ending Soon" && s.progress.left > 0} className="w-full flex items-center justify-center gap-2 bg-[#6A0FAD] hover:bg-[#5a0c96] text-white font-bold text-sm py-3.5 rounded-xl transition-colors shadow-lg shadow-[#6A0FAD]/20 disabled:opacity-50 disabled:cursor-not-allowed">
              <RefreshCw className="w-4 h-4" /> Renew Subscription Plan
            </button>
            {canCancel && (
              <button
                type="button"
                onClick={() => { setCancelError(""); setCancelResult(null); setShowCancelConfirm(true); }}
                className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white py-3 text-sm font-bold text-red-700 transition-colors hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" /> Cancel subscription
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-4">
            {loading ? (
              <div className="flex justify-center py-10"><BowlLoader /></div>
            ) : schedule.length === 0 ? (
              <p className="text-center text-sm text-neutral-400 py-10">No meals scheduled.</p>
            ) : (
              schedule.map((item, i) => (
                <div key={item.ulid} className="bg-white border rounded-xl p-4 shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-xs font-black text-black bg-neutral-100 px-2 py-1 rounded-md">Day {item.day_index}</span>
                    <span className="text-xs font-bold text-neutral-500 capitalize">{item.meal_slot}</span>
                    {item.status === 'PROCESSED' ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" /> Delivered</span>
                    ) : item.status === 'SKIPPED' ? (
                      <span className="text-[10px] font-bold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">Skipped</span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full"><Clock className="w-3 h-3" /> Pending</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {item.bowls.map((bowl: any, j: number) => (
                      <div key={j} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-neutral-100 relative overflow-hidden flex-shrink-0">
                          {bowl.image && <img src={getMediaUrl(systemSettings.R2_BASE_URL, bowl.image) || undefined} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-black truncate">{bowl.name}</p>
                            {item.is_customized && (
                              <span className="text-[9px] font-black bg-purple-100 text-[#6A0FAD] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <Sparkles className="w-2.5 h-2.5" /> CUSTOM
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-500 font-medium">
                            {bowl.calories || 0} kcal {bowl.price ? `• ₹${bowl.price}` : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const ings = (item.is_customized && item.custom_ingredients && item.custom_ingredients.length > 0)
                              ? item.custom_ingredients
                              : (bowl.base_ingredients || []);
                            setCustomizerModal({
                              isOpen: true,
                              bowlUlid: bowl.ulid,
                              bowlName: bowl.name,
                              dayIndex: item.day_index,
                              mealSlot: item.meal_slot,
                              scheduleUlid: item.ulid,
                              initialIngredients: ings,
                              packagingCost: 0,
                              fixedCost: 0,
                            });
                          }}
                          className="px-2.5 py-1.5 text-xs font-bold text-[#6A0FAD] bg-[#6A0FAD]/10 hover:bg-[#6A0FAD]/20 rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" /> Customize
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <BowlCustomizerModal
        isOpen={customizerModal.isOpen}
        onClose={() => setCustomizerModal(prev => ({ ...prev, isOpen: false }))}
        bowlUlid={customizerModal.bowlUlid}
        bowlName={customizerModal.bowlName}
        dayIndex={customizerModal.dayIndex}
        mealSlot={customizerModal.mealSlot}
        scheduleUlid={customizerModal.scheduleUlid}
        customerUlid={s.customer.ulid}
        initialIngredients={customizerModal.initialIngredients}
        basePackagingCost={customizerModal.packagingCost}
        baseFixedCost={customizerModal.fixedCost}
        onSave={async () => {
          await loadSchedule();
          if (onUpdate) onUpdate();
        }}
      />

      {showCancelConfirm && typeof document !== "undefined" && createPortal((
        <div className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-neutral-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="cancel-subscription-title">
          <div className="my-auto w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-7">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${cancelResult ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
              {cancelResult ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
            </div>
            <h3 id="cancel-subscription-title" className="mt-4 text-xl font-black text-neutral-900">{cancelResult ? "Subscription cancelled" : "Cancel this subscription?"}</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              {cancelResult ? cancelResult.message : "This removes the assigned plan and returns the unused bowl value to the wallet. The original plan charge stays in the ledger; the refund is recorded as a separate credit. Future created orders for this plan are cancelled."}
            </p>
            {cancelResult && (
              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-neutral-200 p-3 text-center">
                <div><p className="text-[10px] font-bold uppercase text-neutral-500">Paid</p><p className="mt-1 text-xs font-black text-neutral-900">{formatMoney(Number(cancelResult.amount_paid || 0))}</p></div>
                <div><p className="text-[10px] font-bold uppercase text-neutral-500">Used · {cancelResult.consumed_bowls}/{cancelResult.allocated_bowls}</p><p className="mt-1 text-xs font-black text-neutral-900">{formatMoney(Number(cancelResult.consumed_value || 0))}</p></div>
                <div><p className="text-[10px] font-bold uppercase text-[#6A0FAD]">Refund · {cancelResult.refundable_bowls}</p><p className="mt-1 text-xs font-black text-[#6A0FAD]">{formatMoney(Number(cancelResult.refund_amount || 0))}</p></div>
              </div>
            )}
            {!cancelResult && <>
              <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm">
                <p className="font-bold text-neutral-900">{s.customer.name}</p>
                <p className="mt-0.5 text-neutral-500">{s.plan.name}</p>
              </div>
              {amountPaid > 0 && allocatedBowls > 0 ? (
                <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-neutral-200 p-3 text-center">
                  <div><p className="text-[10px] font-bold uppercase text-neutral-500">Paid</p><p className="mt-1 text-xs font-black text-neutral-900">{formatMoney(amountPaid)}</p></div>
                  <div><p className="text-[10px] font-bold uppercase text-neutral-500">Consumed · {consumedBowls}</p><p className="mt-1 text-xs font-black text-neutral-900">{formatMoney(consumedValue)}</p></div>
                  <div><p className="text-[10px] font-bold uppercase text-[#6A0FAD]">Refund · {remainingBowls} left</p><p className="mt-1 text-xs font-black text-[#6A0FAD]">{formatMoney(estimatedRefund)}</p></div>
                </div>
              ) : (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">The recorded payment amount is unavailable in this view. The server will use the plan payment and bowl allocation records to calculate the refund.</p>
              )}
              <p className="mt-2 text-[11px] text-neutral-400">Final amount is recalculated from the latest remaining bowl count when you confirm.</p>
            </>}
            {cancelError && <p role="alert" className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{cancelError}</p>}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {cancelResult ? (
                <button type="button" onClick={() => { setShowCancelConfirm(false); onUpdate?.(); if (!onUpdate) onClose(); }} className="rounded-xl bg-[#6A0FAD] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#570c8d]">Done</button>
              ) : <>
                <button type="button" disabled={isCancelling} onClick={() => setShowCancelConfirm(false)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-neutral-600 hover:bg-neutral-100 disabled:opacity-50">Keep subscription</button>
                <button type="button" disabled={isCancelling} onClick={cancelSubscription} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-wait disabled:opacity-60">
                  {isCancelling ? <BowlLoader className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                  {isCancelling ? "Cancelling…" : "Confirm cancellation"}
                </button>
              </>}
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}
