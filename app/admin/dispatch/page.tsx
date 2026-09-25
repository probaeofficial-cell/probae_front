"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { MessageCircle, CheckCircle2, Send, X, Calendar } from "lucide-react";
import { endpoints } from "@/lib/apiService";
type OrderSchema = any;

export default function DispatchOrdersPage() {
  const [targetDate, setTargetDate] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0]);
  const [orders, setOrders] = useState<OrderSchema[]>([]);
  const [loadingMsg, setLoadingMsg] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders(targetDate);
  }, [targetDate]);

  const fetchOrders = async (date: string) => {
    try {
      const data: any = await endpoints.orders.list({
        target_date: date,
        status: "DELIVERED",
        limit: 100
      });
      setOrders(data.orders);
    } catch (e) {
      console.error("Failed to fetch delivered orders:", e);
    }
  };

  const handleSendWhatsApp = async (order: OrderSchema) => {
    const rawPhone = String(order.customer?.phone || "");
    let phone = rawPhone.replace(/\D/g, "");
    if (phone.startsWith("91")) {
      const nationalNumber = phone.slice(2).replace(/^0+/, "");
      phone = `91${nationalNumber}`;
    } else {
      if (phone.startsWith("0") && phone.length === 11) phone = phone.slice(1);
      if (phone.length === 10) phone = `91${phone}`;
    }
    if (phone.length < 10) {
      setErrorMessage("This customer does not have a valid phone number.");
      return;
    }

    // Open synchronously from the click so browser popup blockers allow the chat.
    // Adding noopener here makes window.open return null in several browsers.
    const popup = window.open("about:blank", "_blank");
    if (!popup) {
      setErrorMessage("Please allow popups to open WhatsApp, then try again.");
      return;
    }

    setErrorMessage(null);
    setLoadingMsg(order.ulid);
    try {
      const data: any = await endpoints.orders.generateMessage(order.ulid, "WHATSAPP", "ORDER_DELIVERED");

      if (!data?.compiled_message) throw new Error("The WhatsApp message template produced an empty message.");
      popup.opener = null;
      popup.location.href = `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(data.compiled_message)}`;
      // Opening a WhatsApp chat does not prove that the message was sent. Save
      // the per-order sent flag only after the admin confirms sending it.
      setPendingConfirmation(order.ulid);
    } catch (e: any) {
      popup.close();
      setErrorMessage(e.detail || e.message || "Failed to open the WhatsApp chat.");
    } finally {
      setLoadingMsg(null);
    }
  };

  const confirmMessageSent = async (orderUlid: string) => {
    setLoadingMsg(orderUlid);
    setErrorMessage(null);
    try {
      await endpoints.orders.markMessageSent(orderUlid, "WHATSAPP");
      setOrders(prev => prev.map(order => order.ulid === orderUlid ? { ...order, whatsapp_sent: true } : order));
      setPendingConfirmation(null);
    } catch (e: any) {
      setErrorMessage(e.detail || e.message || "Could not save the sent status for this order.");
    } finally {
      setLoadingMsg(null);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        <Header />
        <Breadcrumbs segments={["Admin", "Delivery", "Dispatch Orders"]} />
        
        <div className="mt-4 flex-1 flex flex-col min-h-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6 shrink-0">
            <div>
              <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Manual Dispatch</h1>
              <p className="text-neutral-500 font-medium mt-1">Send WhatsApp notifications for delivered orders on the selected date</p>
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-2 shadow-sm">
              <Calendar className="h-4 w-4 text-[#6A0FAD]" />
              <span className="text-xs font-bold uppercase tracking-wide text-neutral-500">Date</span>
              <input
                type="date"
                value={targetDate}
                onChange={(event) => setTargetDate(event.target.value)}
                className="bg-transparent py-1 text-sm font-semibold text-neutral-800 outline-none"
              />
            </label>
          </div>

          {errorMessage && (
            <div role="alert" className="mb-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              <span>{errorMessage}</span>
              <button type="button" onClick={() => setErrorMessage(null)} aria-label="Dismiss error"><X className="h-4 w-4" /></button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase">Order ID</th>
                  <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase">Customer</th>
                  <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase">Phone</th>
                  <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {orders.map(order => (
                  <tr key={order.ulid} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-mono text-sm text-neutral-600 font-medium">{order.order_number || order.ulid.slice(-8)}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-neutral-800">{order.customer?.name || "Unknown customer"}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-neutral-600">{order.customer?.phone || "No phone number"}</span>
                    </td>
                    <td className="py-4 px-6">
                      {order.whatsapp_sent ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-sm font-bold border border-green-100">
                          <CheckCircle2 className="w-4 h-4" /> Sent
                        </span>
                      ) : pendingConfirmation === order.ulid ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-neutral-500">Sent in WhatsApp?</span>
                          <button
                            type="button"
                            onClick={() => confirmMessageSent(order.ulid)}
                            disabled={loadingMsg === order.ulid}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <Send className="h-4 w-4" /> Confirm sent
                          </button>
                          <button type="button" onClick={() => setPendingConfirmation(null)} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-bold text-neutral-600 hover:bg-neutral-50">
                            Not sent
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSendWhatsApp(order)}
                          disabled={loadingMsg === order.ulid}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#25D366] text-white text-sm font-bold shadow-sm hover:bg-[#20bd5a] transition-all disabled:opacity-50"
                        >
                          {loadingMsg === order.ulid ? (
                            <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                          ) : (
                            <MessageCircle className="w-4 h-4" />
                          )}
                          WhatsApp
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-neutral-500 font-medium">
                      No delivered orders found for {targetDate}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
