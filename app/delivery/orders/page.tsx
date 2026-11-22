"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { endpoints } from "@/lib/apiService";
import { BowlLoader } from "@/components/admin/BowlLoader";
import { CheckCircle, MapPin, Navigation, Package, Phone, RefreshCw } from "lucide-react";

type Period = "today" | "week" | "month";

type DeliveryOrder = {
  id: number;
  ulid: string;
  order_number?: string | null;
  status: string;
  target_date: string;
  billed_price?: number | string | null;
  total_order_price?: number | string | null;
  requires_cod: boolean;
  is_billed: boolean;
  customer?: {
    name: string;
    phone?: string | null;
    address?: string | null;
    location_description?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  items: Array<{ id: number; bowl_name: string; meal_slot: string; quantity: number }>;
};

const periodLabels: Record<Period, string> = { today: "Today", week: "This week", month: "This month" };

export default function DeliveryOrdersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [period, setPeriod] = useState<Period>("today");
  const [mealSlot, setMealSlot] = useState("ALL");
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [summary, setSummary] = useState<Record<Period, { order_count: number; amount: number }> | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingUlid, setProcessingUlid] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await endpoints.orders.myDeliveryOverview(period) as {
        orders?: DeliveryOrder[];
        summary?: Record<Period, { order_count: number; amount: number }>;
      };
      setOrders(response.orders || []);
      setSummary(response.summary || null);
    } catch (err: unknown) {
      const apiError = err as { detail?: string; message?: string };
      setError(apiError.detail || apiError.message || "Could not load your assigned orders.");
    } finally {
      setLoading(false);
    }
  }, [period]);

  const updateDeliveryStatus = async (order: DeliveryOrder) => {
    setProcessingUlid(order.ulid);
    setError("");
    try {
      if (order.requires_cod && !order.is_billed) {
        await endpoints.orders.confirmCod(order.ulid);
      } else {
        await endpoints.orders.markDelivered(order.ulid);
      }
      await loadOrders();
    } catch (err: unknown) {
      const apiError = err as { detail?: string; message?: string };
      setError(apiError.detail || apiError.message || "Could not update this delivery.");
    } finally {
      setProcessingUlid(null);
    }
  };

  useEffect(() => {
    if (!authLoading && user?.role?.toLowerCase() === "delivery") void loadOrders();
  }, [authLoading, user, loadOrders]);

  const availableMealSlots = useMemo(() => Array.from(new Set(
    orders.flatMap((order) => order.items.map((item) => item.meal_slot?.trim() || "Other meals")),
  )).sort((a, b) => a.localeCompare(b)), [orders]);

  const visibleOrders = useMemo(() => orders.filter((order) =>
    mealSlot === "ALL" || order.items.some((item) => (item.meal_slot?.trim() || "Other meals") === mealSlot),
  ), [orders, mealSlot]);

  const groupedItems = useMemo(() => (items: DeliveryOrder["items"]) => {
    const selectedItems = mealSlot === "ALL"
      ? items
      : items.filter((item) => (item.meal_slot?.trim() || "Other meals") === mealSlot);
    return selectedItems.reduce<Record<string, DeliveryOrder["items"]>>((groups, item) => {
      const slot = item.meal_slot?.trim() || "Other meals";
      (groups[slot] ||= []).push(item);
      return groups;
    }, {});
  }, [mealSlot]);

  if (authLoading || !user) {
    return <div className="flex h-full items-center justify-center bg-[#E6E6E6]"><BowlLoader className="h-10 w-10" /></div>;
  }

  const delivered = visibleOrders.filter((order) => order.status === "DELIVERED");
  const pending = visibleOrders.filter((order) => order.status !== "DELIVERED");

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#E6E6E6] p-4 sm:p-8">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-hidden rounded-3xl bg-white p-5 shadow-sm sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-neutral-900">My Orders</h1>
            <p className="mt-1 text-sm font-medium text-neutral-500">Assigned deliveries, customer details, and meals by slot.</p>
          </div>
          <button onClick={() => void loadOrders()} aria-label="Refresh orders" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600 hover:bg-neutral-200">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto">
          {(["today", "week", "month"] as Period[]).map((value) => (
            <button key={value} onClick={() => { setPeriod(value); setMealSlot("ALL"); }} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${period === value ? "bg-[#6A0FAD] text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}>
              {periodLabels[value]}
            </button>
          ))}
          <label className="ml-auto flex shrink-0 items-center gap-2 text-xs font-bold text-neutral-500">
            Meal slot
            <select value={mealSlot} onChange={(event) => setMealSlot(event.target.value)} className="max-w-[180px] rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-semibold text-neutral-700 outline-none focus:border-[#6A0FAD]">
              <option value="ALL">All slots</option>
              {availableMealSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
            </select>
          </label>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Assigned · {periodLabels[period]}</p>
            <p className="mt-2 text-2xl font-black text-[#6A0FAD]">{visibleOrders.length}</p>
          </div>
          <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Delivered · {periodLabels[period]}</p>
            <p className="mt-2 text-2xl font-black text-green-700">{summary?.[period]?.order_count ?? delivered.length}</p>
          </div>
          <div className="col-span-2 rounded-2xl border border-green-100 bg-green-50 p-4 sm:col-span-2">
            <p className="text-xs font-bold uppercase tracking-wide text-green-800">Delivered value · {periodLabels[period]}</p>
            <p className="mt-2 text-2xl font-black text-green-800">₹{Number(summary?.[period]?.amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p>
            <p className="mt-1 text-xs text-green-700">Sum of billed amounts for delivered orders</p>
          </div>
        </div>

        {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

        <div className="min-h-0 flex-1 overflow-y-auto pb-4">
          {loading ? (
            <div className="flex justify-center py-14"><BowlLoader className="h-10 w-10" /></div>
          ) : visibleOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-200 py-14 text-center">
              <Package className="mx-auto mb-3 h-8 w-8 text-neutral-300" />
              <p className="font-semibold text-neutral-600">{orders.length === 0 ? `No assigned orders for ${periodLabels[period].toLowerCase()}.` : `No ${mealSlot} orders in this period.`}</p>
            </div>
          ) : (
            period === "today" ? (
              <div className="overflow-x-auto rounded-2xl border border-neutral-200">
                <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                  <thead className="bg-neutral-50 text-[11px] uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th className="px-4 py-3 font-black">Order</th>
                      <th className="px-4 py-3 font-black">Customer</th>
                      <th className="px-4 py-3 font-black">Delivery address</th>
                      <th className="px-4 py-3 font-black">Meals by slot</th>
                      <th className="px-4 py-3 font-black">Value</th>
                      <th className="px-4 py-3 font-black">Status</th>
                      <th className="px-4 py-3 font-black">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {visibleOrders.map((order) => {
                      const slots = groupedItems(order.items || []);
                      const amount = Number(order.billed_price ?? order.total_order_price ?? 0);
                      return (
                        <tr key={order.ulid} className="align-top hover:bg-neutral-50/70">
                          <td className="whitespace-nowrap px-4 py-4">
                            <p className="font-black text-neutral-900">{order.order_number || order.ulid.slice(-8)}</p>
                            <p className="mt-1 font-mono text-[10px] text-neutral-400">{order.ulid}</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-bold text-neutral-900">{order.customer?.name || "Customer unavailable"}</p>
                            {order.customer?.phone ? <a href={`tel:${order.customer.phone}`} className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-[#6A0FAD]"><Phone className="h-3 w-3" />{order.customer.phone}</a> : <p className="mt-1 text-xs text-neutral-400">No phone</p>}
                          </td>
                          <td className="max-w-[240px] px-4 py-4 text-xs text-neutral-700">
                            <p>{order.customer?.address || "No address provided"}</p>
                            {order.customer?.location_description && <p className="mt-1 text-neutral-500">{order.customer.location_description}</p>}
                            {order.customer?.latitude != null && order.customer?.longitude != null && <a href={`https://www.google.com/maps/search/?api=1&query=${order.customer.latitude},${order.customer.longitude}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 font-bold text-[#6A0FAD]"><Navigation className="h-3 w-3" />Map</a>}
                          </td>
                          <td className="min-w-[220px] px-4 py-4">
                            <div className="space-y-2">
                              {Object.entries(slots).map(([slot, items]) => <div key={slot}><p className="text-[10px] font-black uppercase tracking-wide text-[#6A0FAD]">{slot}</p><p className="mt-0.5 text-xs text-neutral-700">{items.map((item) => `${item.bowl_name} × ${item.quantity}`).join(", ")}</p></div>)}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 font-bold text-neutral-900">₹{amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                          <td className="whitespace-nowrap px-4 py-4">
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${order.status === "DELIVERED" ? "bg-green-100 text-green-800" : "bg-violet-100 text-violet-800"}`}>{order.status === "DELIVERED" ? "Delivered" : "To deliver"}</span>
                            {order.requires_cod && !order.is_billed && <p className="mt-2 text-[10px] font-bold text-amber-700">COD to collect</p>}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4">
                            {order.status === "DELIVERED" ? (
                              <span className="text-xs font-semibold text-green-700">Complete</span>
                            ) : (
                              <button
                                onClick={() => void updateDeliveryStatus(order)}
                                disabled={processingUlid === order.ulid}
                                className="rounded-lg bg-[#6A0FAD] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-violet-800 disabled:cursor-wait disabled:opacity-60"
                              >
                                {processingUlid === order.ulid ? "Updating…" : order.requires_cod && !order.is_billed ? "Confirm cash & deliver" : "Mark delivered"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : <div className="space-y-7">
              {[{ title: "To deliver", rows: pending }, { title: "Delivered", rows: delivered }].map(({ title, rows }) => rows.length > 0 && (
                <section key={title}>
                  <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-neutral-500">{title} ({rows.length})</h2>
                  <div className="space-y-4">
                    {rows.map((order) => {
                      const slots = groupedItems(order.items || []);
                      const amount = Number(order.billed_price ?? order.total_order_price ?? 0);
                      return (
                        <article key={order.ulid} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
                          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-lg font-black text-neutral-900">Order {order.order_number || order.ulid.slice(-8)}</p>
                              <p className="mt-1 text-xs font-medium text-neutral-500">ID: {order.ulid} · {new Date(`${order.target_date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ${order.status === "DELIVERED" ? "bg-green-100 text-green-800" : "bg-violet-100 text-violet-800"}`}>
                              {order.status === "DELIVERED" ? <><CheckCircle className="mr-1 inline h-3 w-3" />Delivered</> : "Out for delivery"}
                            </span>
                          </div>

                          <div className="mb-4 grid gap-3 rounded-xl bg-neutral-50 p-4 sm:grid-cols-2">
                            <div>
                              <p className="font-bold text-neutral-900">{order.customer?.name || "Customer details unavailable"}</p>
                              {order.customer?.phone && <a href={`tel:${order.customer.phone}`} className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-[#6A0FAD]"><Phone className="h-3.5 w-3.5" />{order.customer.phone}</a>}
                            </div>
                            <div className="text-sm text-neutral-700">
                              <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" /><div>{order.customer?.address || "No address provided"}{order.customer?.location_description && <p className="mt-1 text-xs text-neutral-500">{order.customer.location_description}</p>}</div></div>
                              {order.customer?.latitude != null && order.customer?.longitude != null && <a href={`https://www.google.com/maps/search/?api=1&query=${order.customer.latitude},${order.customer.longitude}`} target="_blank" rel="noopener noreferrer" className="ml-6 mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#6A0FAD]"><Navigation className="h-3 w-3" />Open in Maps</a>}
                            </div>
                          </div>

                          <div className="space-y-3">
                            {Object.entries(slots).map(([slot, items]) => (
                              <div key={slot} className="rounded-xl border border-neutral-100 p-3">
                                <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-[#6A0FAD]">{slot}</h3>
                                <ul className="space-y-1.5">{items.map((item) => <li key={item.id} className="flex justify-between gap-3 text-sm text-neutral-700"><span>{item.bowl_name}</span><span className="shrink-0 font-bold">× {item.quantity}</span></li>)}</ul>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-sm">
                            <span className="text-neutral-500">{order.requires_cod && !order.is_billed ? "COD to collect" : "Order value"}</span>
                            <span className="font-black text-neutral-900">₹{amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
