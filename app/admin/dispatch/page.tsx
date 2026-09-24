"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { MessageCircle, CheckCircle2, Send } from "lucide-react";
import { endpoints } from "@/lib/apiService";
type OrderSchema = any;

export default function DispatchOrdersPage() {
  const [orders, setOrders] = useState<OrderSchema[]>([]);
  const [loadingMsg, setLoadingMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      // Fetch today's DELIVERED orders
      const targetDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
      const data: any = await endpoints.orders.list({
        target_date: targetDate,
        status: "DELIVERED",
        limit: 100
      });
      setOrders(data.orders);
    } catch (e) {
      console.error("Failed to fetch delivered orders:", e);
    }
  };

  const handleSendWhatsApp = async (order: OrderSchema) => {
    const popup = window.open('about:blank', '_blank', 'noopener,noreferrer');
    if (!popup) {
      alert("Please allow popups to open WhatsApp.");
      return;
    }
    
    setLoadingMsg(order.ulid);
    try {
      const data: any = await endpoints.orders.generateMessage(order.ulid, "WHATSAPP", "ORDER_DELIVERED");
      
      const phone = order.customer.phone.replace(/[^0-9]/g, '');
      const encodedMsg = encodeURIComponent(data.compiled_message);
      
      popup.location.replace(`https://web.whatsapp.com/send?phone=${phone}&text=${encodedMsg}`);
      
      await endpoints.orders.markMessageSent(order.ulid, "WHATSAPP");
      
      setOrders(prev => prev.map(o => o.ulid === order.ulid ? { ...o, whatsapp_sent: true } : o));
    } catch (e: any) {
      popup.close();
      alert(e.response?.data?.detail || "Failed to generate message");
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
          <div className="flex justify-between items-center mb-6 shrink-0">
            <div>
              <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Manual Dispatch</h1>
              <p className="text-neutral-500 font-medium mt-1">Send WhatsApp notifications for today's delivered orders</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-white border border-neutral-200 rounded-2xl shadow-sm">
            <table className="w-full text-left border-collapse">
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
                      <div className="font-bold text-neutral-800">{order.customer.name}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-neutral-600">{order.customer.phone}</span>
                    </td>
                    <td className="py-4 px-6">
                      {order.whatsapp_sent ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-sm font-bold border border-green-100">
                          <CheckCircle2 className="w-4 h-4" /> Sent
                        </span>
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
                      No delivered orders found for today.
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
