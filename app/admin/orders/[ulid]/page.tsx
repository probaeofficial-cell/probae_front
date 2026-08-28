"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ChevronDown, ChevronUp, Loader2, Trash2,
  Edit3, Check, X, Download, Package, User, Calendar,
  Flame, Beef, Wheat, Droplets, Leaf, AlertTriangle,
  ClipboardList, CheckCircle2
} from "lucide-react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { endpoints } from "@/lib/apiService";

const STATUS_ORDER = ["CREATED", "PREPARED", "DISPATCHED", "DELIVERED", "CANCELLED"];

const STATUS_STYLES: Record<string, string> = {
  CREATED:    "bg-sky-100 text-sky-800 border-sky-200",
  PREPARED:   "bg-amber-100 text-amber-800 border-amber-200",
  DISPATCHED: "bg-violet-100 text-violet-800 border-violet-200",
  DELIVERED:  "bg-emerald-100 text-emerald-800 border-emerald-200",
  CANCELLED:  "bg-rose-100 text-rose-800 border-rose-200",
};

const MACRO_COLORS: Record<string, string> = {
  PROTEIN: "bg-rose-50 border-rose-100 text-rose-700",
  CARB:    "bg-amber-50 border-amber-100 text-amber-700",
  FAT:     "bg-blue-50 border-blue-100 text-blue-700",
  ADD_ON:  "bg-neutral-50 border-neutral-200 text-neutral-600",
};

export default function OrderDetailPage() {
  const { ulid } = useParams<{ ulid: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState<string | null>(null); // holds the pending new status
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  // ─── fetch ───────────────────────────────────────────────────────────────
  const fetchOrder = async () => {
    setIsLoading(true);
    try {
      const data = await endpoints.orders.get(ulid) as any;
      if (data.success) setOrder(data.order);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [ulid]);

  // ─── status ───────────────────────────────────────────────────────────────
  const requestStatusChange = (newStatus: string) => {
    if (newStatus === order?.status) return;
    setStatusConfirm(newStatus);
  };

  const confirmStatusChange = async () => {
    if (!statusConfirm) return;
    setStatusLoading(true);
    const pending = statusConfirm;
    setStatusConfirm(null);
    try {
      await endpoints.orders.updateStatus(ulid, pending);
      setOrder((o: any) => ({ ...o, status: pending }));
    } catch (e: any) {
      setErrorMsg(e?.message || "Failed to update status. Please try again.");
    } finally {
      setStatusLoading(false);
    }
  };

  // ─── delete ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await endpoints.orders.delete(ulid);
      router.push("/admin/orders");
    } catch (e: any) {
      setDeleteModal(false);
      setErrorMsg(e?.message || "Failed to delete order. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── invoice (print-to-PDF) ───────────────────────────────────────────────
  const handleDownloadInvoice = () => {
    const printContent = invoiceRef.current;
    if (!printContent) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Invoice – ${order?.ulid}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:system-ui,sans-serif;color:#111;padding:32px;font-size:14px}
        h1{font-size:22px;font-weight:900;margin-bottom:4px}
        .sub{color:#6b7280;font-size:12px;margin-bottom:24px}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
        .card{border:1px solid #e5e7eb;border-radius:12px;padding:16px}
        .label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;margin-bottom:4px}
        .value{font-weight:700;font-size:14px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th{text-align:left;padding:6px 10px;background:#f9fafb;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;border-bottom:1px solid #e5e7eb}
        td{padding:6px 10px;border-bottom:1px solid #f3f4f6}
        .bowl-title{font-weight:800;font-size:13px;margin:16px 0 6px}
        .total{display:flex;justify-content:flex-end;margin-top:16px;font-size:16px;font-weight:900}
        .badge{display:inline-block;padding:2px 10px;border-radius:100px;font-size:10px;font-weight:700;text-transform:uppercase}
      </style></head><body>
      ${printContent.innerHTML}
      </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  // ─── collapse toggle ──────────────────────────────────────────────────────
  const toggleItem = (itemUlid: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      next.has(itemUlid) ? next.delete(itemUlid) : next.add(itemUlid);
      return next;
    });
  };

  const canEdit   = order?.status === "CREATED";
  const canDelete = order?.status === "CREATED" || order?.status === "PREPARED";

  if (isLoading) return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl bg-white flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#6A0FAD]" />
      </div>
    </div>
  );

  if (!order) return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl bg-white flex flex-col items-center justify-center gap-4">
        <p className="text-neutral-500 font-bold">Order not found.</p>
        <Link href="/admin/orders" className="text-[#6A0FAD] font-bold underline">Back to Orders</Link>
      </div>
    </div>
  );

  const totalCalories = order.items.reduce((s: number, i: any) => s + i.adjusted_calories, 0);

  // ─── invoice template (rendered off-screen) ───────────────────────────────
  const InvoiceTemplate = () => (
    <div ref={invoiceRef} style={{ display: "none" }}>
      <h1>Probae Order Invoice</h1>
      <div className="sub">Order ID: {order.ulid} &nbsp;·&nbsp; Date: {order.target_date}</div>
      <div className="grid">
        <div className="card">
          <div className="label">Customer</div>
          <div className="value">{order.customer?.name}</div>
          <div style={{ color: "#6b7280", fontSize: 12 }}>{order.customer?.phone}</div>
        </div>
        <div className="card">
          <div className="label">Status</div>
          <div className="value">{order.status}</div>
          <div className="label" style={{ marginTop: 8 }}>Source</div>
          <div className="value">{order.order_source}</div>
        </div>
      </div>
      {order.items.map((item: any) => (
        <div key={item.ulid}>
          <div className="bowl-title">{item.meal_slot} – {item.bowl_name} (x{item.quantity})</div>
          <table>
            <thead>
              <tr>
                <th>Ingredient</th><th>Tag</th><th>Base Weight</th><th>Scaled Weight</th>
              </tr>
            </thead>
            <tbody>
              {item.adjusted_ingredients?.map((ing: any, i: number) => (
                <tr key={i}>
                  <td>{ing.name}</td>
                  <td>{ing.macro_tag}</td>
                  <td>{ing.original_weight}g</td>
                  <td><strong>{ing.new_weight}g</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
            {Math.round(item.adjusted_calories)} kcal &nbsp;·&nbsp; ₹{item.adjusted_price.toFixed(2)}
          </div>
        </div>
      ))}
      <div className="total">Total: ₹{order.total_order_price.toFixed(2)}</div>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-y-auto">
        <Header />
        <Breadcrumbs segments={["Orders", `Order #${order.ulid.slice(-6)}`]} />

        {/* ── Top Bar ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin/orders"
              className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-colors shrink-0">
              <ArrowLeft className="w-5 h-5 text-neutral-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-neutral-900">Order Detail</h1>
              <p className="text-xs font-mono text-neutral-400 mt-0.5">{order.ulid}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {canDelete && (
              <button
                onClick={() => setDeleteModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 text-sm font-bold transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
            <button
              onClick={handleDownloadInvoice}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-neutral-200 text-neutral-700 bg-white hover:bg-neutral-50 text-sm font-bold transition-colors"
            >
              <Download className="w-4 h-4" /> Invoice
            </button>
          </div>
        </div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT: bowls */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xs font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> Bowl Breakdown
            </h2>

            {order.items.map((item: any, idx: number) => {
              const isOpen = expandedItems.has(item.ulid);
              const macros = item.adjusted_macros || {};
              return (
                <div key={item.ulid} className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
                  {/* Collapsed header */}
                  <button
                    onClick={() => toggleItem(item.ulid)}
                    className="w-full flex items-center justify-between p-5 hover:bg-neutral-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#6A0FAD]/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-black text-[#6A0FAD]">{idx + 1}</span>
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-[#6A0FAD] uppercase tracking-widest mb-0.5">{item.meal_slot}</div>
                        <div className="font-bold text-neutral-900 text-sm">{item.bowl_name}</div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-neutral-500 font-medium flex items-center gap-1">
                            <Flame className="w-3 h-3 text-orange-500" /> {Math.round(item.adjusted_calories)} kcal
                          </span>
                          <span className="text-xs text-neutral-400">×{item.quantity}</span>
                          <span className="text-xs font-bold text-neutral-700">₹{item.adjusted_price.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="hidden sm:flex items-center gap-2 mr-2">
                        {[
                          { label: "P", val: macros.protein, color: "text-rose-500" },
                          { label: "C", val: macros.carbs, color: "text-amber-500" },
                          { label: "F", val: macros.fat, color: "text-blue-500" },
                        ].map(({ label, val, color }) => (
                          <span key={label} className={`text-[10px] font-black ${color}`}>
                            {label} {Math.round(val || 0)}g
                          </span>
                        ))}
                      </div>
                      {isOpen
                        ? <ChevronUp className="w-5 h-5 text-neutral-400" />
                        : <ChevronDown className="w-5 h-5 text-neutral-400" />
                      }
                    </div>
                  </button>

                  {/* Expanded: ingredient table */}
                  {isOpen && (
                    <div className="border-t border-neutral-100">
                      {/* Macro summary strip */}
                      <div className="grid grid-cols-4 divide-x divide-neutral-100 bg-neutral-50/60">
                        {[
                          { icon: <Beef className="w-3.5 h-3.5 text-rose-500" />, label: "Protein", val: macros.protein },
                          { icon: <Wheat className="w-3.5 h-3.5 text-amber-500" />, label: "Carbs", val: macros.carbs },
                          { icon: <Droplets className="w-3.5 h-3.5 text-blue-500" />, label: "Fat", val: macros.fat },
                          { icon: <Leaf className="w-3.5 h-3.5 text-green-500" />, label: "Fiber", val: macros.fiber },
                        ].map(({ icon, label, val }) => (
                          <div key={label} className="flex flex-col items-center py-3 px-2">
                            <div className="flex items-center gap-1 mb-0.5">{icon}
                              <span className="text-[10px] font-bold text-neutral-500 uppercase">{label}</span>
                            </div>
                            <span className="text-sm font-black text-neutral-900">{(val || 0).toFixed(1)}g</span>
                          </div>
                        ))}
                      </div>

                      {/* Ingredient rows */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <tbody className="divide-y divide-neutral-50">
                            {(item.adjusted_ingredients || []).map((ing: any, i: number) => {
                              const tagStyle = MACRO_COLORS[ing.macro_tag] || MACRO_COLORS["ADD_ON"];
                              const weightChanged = Math.abs(ing.new_weight - ing.original_weight) > 0.5;
                              return (
                                <tr key={i} className="hover:bg-neutral-50/80">
                                  <td className="px-5 py-3 font-medium text-neutral-800">{ing.name}</td>
                                  <td className="px-3 py-3">
                                    <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-black border ${tagStyle}`}>
                                      {ing.macro_tag}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3 text-right text-neutral-400 text-xs">{ing.original_weight}g</td>
                                  <td className="px-5 py-3 text-right">
                                    <span className={`text-sm font-black ${weightChanged ? "text-[#6A0FAD]" : "text-neutral-700"}`}>
                                      {ing.new_weight}g
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Per-item footer */}
                      <div className="flex items-center justify-between px-5 py-3 bg-neutral-50 border-t border-neutral-100">
                        <span className="text-xs text-neutral-500 font-medium">
                          {Math.round(item.adjusted_calories)} kcal &nbsp;·&nbsp; Qty: {item.quantity}
                        </span>
                        <span className="text-sm font-black text-neutral-900">₹{(item.adjusted_price * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* RIGHT: info sidebar */}
          <div className="space-y-5">

            {/* Status card */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-4">Order Status</h3>
              <div className="space-y-2">
                {STATUS_ORDER.map((s) => {
                  const isActive = order.status === s;
                  const isPast   = STATUS_ORDER.indexOf(s) < STATUS_ORDER.indexOf(order.status) && order.status !== "CANCELLED";
                  return (
                    <button
                      key={s}
                      disabled={statusLoading || s === order.status}
                      onClick={() => requestStatusChange(s)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all
                        ${isActive ? STATUS_STYLES[s] + " ring-2 ring-offset-1 ring-current" : ""}
                        ${!isActive && !statusLoading ? "border-neutral-100 text-neutral-400 hover:border-neutral-300 hover:text-neutral-600" : ""}
                        ${statusLoading ? "opacity-50 cursor-wait" : ""}
                      `}
                    >
                      <span>{s}</span>
                      {isActive && <CheckCircle2 className="w-4 h-4" />}
                      {isPast && !isActive && <Check className="w-3 h-3 opacity-40" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Customer card */}
            {order.customer && (
              <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" /> Customer
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="font-black text-neutral-900">{order.customer.name}</p>
                    <p className="text-xs text-neutral-500 font-medium">{order.customer.phone}</p>
                    {order.customer.email && <p className="text-xs text-neutral-400">{order.customer.email}</p>}
                  </div>
                  {order.customer.goal && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Goal</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#6A0FAD]/10 text-[#6A0FAD] text-[10px] font-black uppercase">{order.customer.goal}</span>
                    </div>
                  )}
                  {order.customer.calorie_profile?.mealCalories && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Calorie Targets</p>
                      <div className="space-y-1">
                        {Object.entries(order.customer.calorie_profile.mealCalories).map(([slot, cals]: [string, any]) => (
                          <div key={slot} className="flex justify-between text-xs">
                            <span className="text-neutral-500 font-medium capitalize">{slot}</span>
                            <span className="font-bold text-neutral-800">{Math.round(cals)} kcal</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <Link href={`/admin/customers/${order.customer.ulid}`}
                    className="block text-center text-xs font-bold text-[#6A0FAD] hover:underline mt-2">
                    View Full Profile →
                  </Link>
                </div>
              </div>
            )}

            {/* Order summary card */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-black text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Package className="w-4 h-4" /> Order Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500 font-medium flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Target Date
                  </span>
                  <span className="font-bold text-neutral-900">
                    {new Date(order.target_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500 font-medium">Source</span>
                  <span className="font-bold text-neutral-900">{order.order_source}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500 font-medium flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-400" /> Total Calories
                  </span>
                  <span className="font-bold text-neutral-900">{Math.round(totalCalories)} kcal</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500 font-medium">Bowls</span>
                  <span className="font-bold text-neutral-900">{order.items.length}</span>
                </div>
                <div className="h-px bg-neutral-100 my-1" />
                <div className="flex justify-between">
                  <span className="text-sm font-black text-neutral-900">Total Price</span>
                  <span className="text-lg font-black text-[#6A0FAD]">₹{order.total_order_price.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Edit / Expand all */}
            {canEdit && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-amber-700 flex items-center gap-2 mb-3">
                  <Edit3 className="w-3.5 h-3.5" /> This order can be edited
                </p>
                <Link href={`/admin/orders/new?edit=${ulid}`}>
                  <ProbaeButton className="!w-full !text-sm !py-2.5 !bg-amber-500 !border-amber-500 hover:!bg-white hover:!text-amber-600">
                    <Edit3 className="w-4 h-4 mr-2" /> Edit Order
                  </ProbaeButton>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden invoice template */}
      <InvoiceTemplate />

      {/* ── Delete Confirm Modal ── */}
      {deleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-rose-600" />
            </div>
            <h2 className="text-xl font-black text-neutral-900 text-center mb-2">Delete Order?</h2>
            <p className="text-sm text-neutral-500 text-center mb-8 font-medium">
              This will permanently remove the order and all its bowl items. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal(false)}
                className="flex-1 py-3 rounded-2xl border border-neutral-200 font-bold text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <ProbaeButton
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 !bg-rose-600 !border-rose-600 hover:!bg-white hover:!text-rose-600"
              >
                {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
              </ProbaeButton>
            </div>
          </div>
        </div>
      )}

      {/* ── Status Confirm Modal ── */}
      {statusConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${STATUS_STYLES[statusConfirm]}`}>
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-neutral-900 text-center mb-2">Change Status?</h2>
            <p className="text-sm text-neutral-500 text-center mb-2 font-medium">
              You are about to change this order's status to:
            </p>
            <p className={`text-center text-lg font-black uppercase tracking-wider mb-8 ${STATUS_STYLES[statusConfirm].split(" ")[1]}`}>
              {statusConfirm}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setStatusConfirm(null)}
                className="flex-1 py-3 rounded-2xl border border-neutral-200 font-bold text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <ProbaeButton
                onClick={confirmStatusChange}
                disabled={statusLoading}
                className="flex-1"
              >
                {statusLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
              </ProbaeButton>
            </div>
          </div>
        </div>
      )}

      {/* ── Error Modal ── */}
      {errorMsg && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <X className="w-7 h-7 text-rose-600" />
            </div>
            <h2 className="text-xl font-black text-neutral-900 text-center mb-2">Something went wrong</h2>
            <p className="text-sm text-neutral-500 text-center mb-8 font-medium break-words">{errorMsg}</p>
            <ProbaeButton onClick={() => setErrorMsg(null)}>
              Dismiss
            </ProbaeButton>
          </div>
        </div>
      )}
    </div>
  );
}
