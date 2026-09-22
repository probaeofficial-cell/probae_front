"use client";
import { BowlLoader } from "@/components/admin/BowlLoader";
import { ConfirmationModal } from "@/components/ConfirmationModal";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ChevronDown, ChevronUp, Loader2, Trash2,
  Edit3, Check, X, Download, Package, User, Calendar,
  Flame, Beef, Wheat, Droplets, Leaf, AlertTriangle,
  ClipboardList, CheckCircle2
} from "lucide-react";
import { Phone, MapPin, Printer, Sun, Moon, UtensilsCrossed } from "lucide-react";
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
  const [prepList, setPrepList] = useState<any>(null);
  const [isPrepWarning, setIsPrepWarning] = useState<boolean>(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  // ─── fetch ───────────────────────────────────────────────────────────────

  // ─── settings ─────────────────────────────────────────────────────────────
  const [systemSettings, setSystemSettings] = useState<any>({});
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await endpoints.settings.getSystemSettings();
        setSystemSettings(settings);
      } catch (error) {
        console.error(error);
      }
    };
    fetchSettings();
  }, []);

  const getMediaUrl = (r2Base: string, filename?: string) => {
    if (!filename) return null;
    return `${r2Base.replace(/\/$/, '')}/${filename}`;
  };

  const getNextStatus = (currentStatus: string) => {
    if (currentStatus === "CREATED") return { label: "Mark as Prepared", value: "PREPARED" };
    if (currentStatus === "PREPARED") return { label: "Dispatch >", value: "DISPATCHED" };
    // Removed DISPATCHED -> DELIVERED to force using Delivery Today dashboard
    return null;
  };

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
    
    let hasUnprepared = false;
    if (newStatus === "DISPATCHED") {
      const hasUnassembled = order?.items?.some((item: any) => 
        item.assembly_status !== "COMPLETED" && item.assembly_status !== "ASSEMBLED" && item.assembly_status !== "PACKAGED"
      );
      if (hasUnassembled) {
        setErrorMsg("Cannot dispatch: One or more bowls are still unassembled.");
        return;
      }

      if (prepList && prepList.components) {
        // Check if any ingredient in the order is not PREPARED
        const orderIngredientIds = new Set<number>();
        order?.items?.forEach((item: any) => {
          item.adjusted_ingredients?.forEach((ing: any) => {
            const id = ing.ingredient_id || ing.id;
            if (id) orderIngredientIds.add(id);
          });
        });
        
        hasUnprepared = prepList.components.some((comp: any) => 
          orderIngredientIds.has(comp.ingredient_id) && comp.status !== "PREPARED"
        );
      }
    }
    
    setIsPrepWarning(hasUnprepared);
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
  const canDelete = order?.status === "CREATED";

  if (isLoading) return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl bg-white flex items-center justify-center">
        <BowlLoader className="w-10 h-10 animate-spin text-[#6A0FAD]" />
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

  const totalMacros = order.items.reduce((acc: any, item: any) => {
    return {
      protein: acc.protein + (item.adjusted_macros?.protein || 0),
      carbs: acc.carbs + (item.adjusted_macros?.carbs || 0),
      fat: acc.fat + (item.adjusted_macros?.fat || 0),
      fiber: acc.fiber + (item.adjusted_macros?.fiber || 0),
    };
  }, { protein: 0, carbs: 0, fat: 0, fiber: 0 });


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

  return (<>
    <div className="flex flex-col flex-1 h-full bg-[#f8f9fa] overflow-y-auto">
      <div className="p-4 sm:p-8 flex flex-col mx-auto w-full max-w-7xl">
        <Breadcrumbs segments={["Admin", "Orders & KDS", `Order #${order.ulid.slice(-6)}`]} />
        
        <div className="mt-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2.5 rounded-full bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-colors shadow-sm shrink-0"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Order Details</h1>
              <p className="text-neutral-500 font-medium mt-1">Manage fulfilment for #{order.order_number|| order.ulid.substring(order.ulid.length - 6)}</p>
            </div>
          </div>
          <div className="flex gap-3">
            {order.status === "CREATED" && (
              <button 
                onClick={() => setDeleteModal(true)} 
                className="px-6 py-2.5 rounded-full border border-red-200 text-red-600 bg-white hover:bg-red-50 flex items-center gap-2 shadow-sm transition-colors font-bold"
              >
                Delete Order
              </button>
            )}
            <button 
              onClick={handleDownloadInvoice} 
              className="px-6 py-2.5 rounded-full border border-neutral-300 font-bold text-neutral-700 bg-white hover:bg-neutral-50 flex items-center gap-2 shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" /> Print Ticket
            </button>
            {getNextStatus(order.status) && (
              <button 
                onClick={() => requestStatusChange(getNextStatus(order.status)!.value)} 
                className="px-6 py-2.5 rounded-full bg-[#4B0082] text-white font-bold hover:bg-[#3a0066] flex items-center gap-2 shadow-sm transition-colors"
              >
                {getNextStatus(order.status)!.label}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Left Column */}
          <div className="lg:w-[320px] shrink-0 space-y-6">
            
            {/* Customer Profile Card */}
            <div className="bg-[#fff9ff] rounded-3xl p-6 shadow-sm border border-[#f3e8f5]">
              <div className="flex gap-4 items-center mb-6">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-neutral-200 shrink-0 border border-neutral-200">
                  {order.customer?.image_filename ? (
                    <img src={getMediaUrl(systemSettings?.R2_BASE_URL, order.customer.image_filename) || undefined} className="object-cover w-full h-full" alt="avatar" />
                  ) : (
                    <div className="w-full h-full bg-[#6A0FAD]/10 text-[#6A0FAD] flex items-center justify-center font-black text-xl">
                      {order.customer?.name?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-black text-neutral-900 leading-tight">{order.customer?.name}</h2>
                  <span className="inline-block mt-1 bg-neutral-800 text-white text-[10px] uppercase font-black px-2 py-0.5 rounded-full tracking-wider">
                    {order.order_source === "PLAN" ? "SUBSCRIBER" : "CUSTOM"}
                  </span>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-neutral-500 text-sm font-medium">
                  <Phone className="w-4 h-4 text-neutral-400" /> 
                  <span>{order.customer?.phone || "No phone"}</span>
                </div>
                <div className="flex items-start gap-3 text-neutral-500 text-sm font-medium">
                  <MapPin className="w-4 h-4 text-neutral-400 mt-0.5 shrink-0" /> 
                  <span className="break-words line-clamp-2">{order.customer?.location_name || order.customer?.address || (order.customer?.latitude ? "Location pinned" : "No address set")}</span>
                </div>
              </div>
              
              <div className="bg-[#e8f5e9] rounded-2xl p-4 flex justify-between items-center mb-6">
                <span className="font-bold text-[#2e7d32] text-sm">Wallet Balance</span>
                <span className="text-xl font-black text-[#2e7d32]">₹0</span>
              </div>

              {order.plan_id && (
                <div>
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span className="text-neutral-700">Plan Progress</span>
                    <span className="text-neutral-500">Active</span>
                  </div>
                  <div className="h-2 w-full bg-[#ede7f6] rounded-full overflow-hidden">
                    <div className="h-full bg-[#4B0082]" style={{ width: '50%' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary Card */}
            <div className="bg-[#fff9ff] rounded-3xl p-6 shadow-sm border border-[#f3e8f5] space-y-5">
              <div className="flex justify-between items-center">
                <span className="font-bold text-neutral-500 text-sm">Payment Status</span>
                <span className="bg-[#008000] text-white font-black text-[10px] tracking-wider px-3 py-1 rounded-full uppercase">PAID</span>
              </div>
              <div className="h-px bg-neutral-200/50" />
              <div className="flex justify-between items-center">
                <span className="font-bold text-neutral-500 text-sm">Total Amount</span>
                <span className="text-xl font-black text-neutral-900">₹{order.total_order_price.toFixed(2)}</span>
              </div>
              <div className="h-px bg-neutral-200/50" />
              <div className="flex justify-between items-center">
                <span className="font-bold text-neutral-500 text-sm">Delivery Zone</span>
                <span className="bg-neutral-100 border border-neutral-200 text-neutral-800 font-black text-[10px] tracking-wider px-3 py-1 rounded-full">Zone A</span>
              </div>
            </div>

          </div>

          {/* Right Column */}
          <div className="flex-1 space-y-6">
            
            {/* Daily Macro Summary */}
            <div className="bg-white rounded-3xl shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-neutral-100 border-l-[6px] border-l-[#008000] p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h3 className="text-sm font-black text-neutral-400 uppercase tracking-widest">Daily Macro Summary</h3>
                <p className="text-xs font-medium text-neutral-400 mt-1">Auto-summed from today's bowls</p>
                <div className="grid grid-cols-4 gap-2 mt-4 w-full max-w-sm">
                  <div className="bg-[#4B0082] rounded-xl px-2 py-3 text-center flex flex-col justify-center">
                    <div className="text-white font-black text-lg sm:text-xl leading-none">{Math.round(totalMacros.protein)}g</div>
                    <div className="text-[#d1b3ff] text-[9px] sm:text-[10px] uppercase font-bold tracking-wider mt-1.5">Protein</div>
                  </div>
                  <div className="bg-[#4B0082] rounded-xl px-2 py-3 text-center flex flex-col justify-center">
                    <div className="text-white font-black text-lg sm:text-xl leading-none">{Math.round(totalMacros.carbs)}g</div>
                    <div className="text-[#d1b3ff] text-[9px] sm:text-[10px] uppercase font-bold tracking-wider mt-1.5">Carbs</div>
                  </div>
                  <div className="bg-[#4B0082] rounded-xl px-2 py-3 text-center flex flex-col justify-center">
                    <div className="text-white font-black text-lg sm:text-xl leading-none">{Math.round(totalMacros.fiber)}g</div>
                    <div className="text-[#d1b3ff] text-[9px] sm:text-[10px] uppercase font-bold tracking-wider mt-1.5">Fiber</div>
                  </div>
                  <div className="bg-[#4B0082] rounded-xl px-2 py-3 text-center flex flex-col justify-center">
                    <div className="text-white font-black text-lg sm:text-xl leading-none">{Math.round(totalMacros.fat)}g</div>
                    <div className="text-[#d1b3ff] text-[9px] sm:text-[10px] uppercase font-bold tracking-wider mt-1.5">Fat</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#e8f5e9] rounded-2xl p-6 text-center shrink-0 min-w-[160px]">
                <div className="text-4xl font-black text-[#2e7d32]">{Math.round(totalCalories)}</div>
                <div className="text-[#2e7d32] text-xs font-black uppercase tracking-widest mt-1">Total Kcal</div>
              </div>
            </div>

            {/* Bowls Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
              {order.items.map((item: any, idx: number) => {
                 let headerBg = "bg-purple-100 text-[#4B0082]";
                 let Icon = Moon;
                 const slotLower = item.meal_slot.toLowerCase();
                 if (slotLower.includes("break")) {
                   headerBg = "bg-[#fff3e0] text-[#e65100]";
                   Icon = Sun;
                 } else if (slotLower.includes("lunch")) {
                   headerBg = "bg-[#ffebee] text-[#c62828]";
                   Icon = Sun;
                 }

                 const isExpanded = expandedItems.has(item.ulid);
                 const totalWeight = item.adjusted_ingredients?.reduce((sum: number, ing: any) => sum + (ing.original_weight || 0), 0) || 0;

                 return (
                   <div key={item.ulid} className="bg-white rounded-3xl shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-neutral-100 overflow-hidden flex flex-col transition-all">
                     <div className={`px-4 py-3 flex justify-between items-center ${headerBg}`}>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-sm uppercase tracking-widest">{item.meal_slot}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                            item.assembly_status === "ASSEMBLED" 
                              ? "bg-green-500/20 text-green-800" 
                              : "bg-white/30"
                          }`}>
                            {item.assembly_status === "ASSEMBLED" ? "ASSEMBLED" : "UNASSEMBLED"}
                          </span>
                        </div>
                        <Icon className="w-4 h-4" />
                     </div>
                     <div className="aspect-[4/3] bg-neutral-100 overflow-hidden relative group cursor-pointer" onClick={() => toggleItem(item.ulid)}>
                        {item.image_filename ? (
                          <img src={getMediaUrl(systemSettings?.R2_BASE_URL, item.image_filename) || undefined} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" alt={item.bowl_name} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-300">
                            <UtensilsCrossed className="w-12 h-12" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 text-neutral-800 shadow-lg">
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </div>
                        </div>
                     </div>
                     <div className="p-5 flex flex-col flex-1">
                        <h4 className="font-bold text-neutral-900 text-sm mb-4 leading-snug">{item.bowl_name}</h4>
                        <div className="mt-auto flex flex-wrap justify-between items-center gap-y-2 gap-x-3">
                           <div className="flex flex-wrap items-center gap-2">
                             <span className="text-neutral-500 text-xs font-bold bg-neutral-100 px-2 py-1.5 rounded-md whitespace-nowrap">
                               {totalWeight > 0 ? `${Math.round(totalWeight)}g` : `${item.quantity}x`}
                             </span>
                             <span className="text-orange-600 text-xs font-bold bg-orange-50 px-2 py-1.5 rounded-md flex items-center gap-1 whitespace-nowrap">
                               <Flame className="w-3.5 h-3.5 shrink-0" /> {Math.round(item.adjusted_calories || 0)} kcal
                             </span>
                           </div>
                           <span className="text-lg font-black text-[#6A0FAD] shrink-0 ml-auto md:ml-0">₹{item.adjusted_price}</span>
                        </div>
                     </div>

                     {/* Expanded Ingredients Details */}
                     {isExpanded && (
                       <div className="bg-neutral-50 border-t border-neutral-100 p-4 text-xs animate-in slide-in-from-top-2">
                         <div className="flex justify-between items-center mb-3">
                           <h5 className="font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-2">
                             <Leaf className="w-3.5 h-3.5" /> Bowl Contents
                           </h5>
                         </div>
                         
                         <div className="flex gap-3 mb-4 p-3 bg-white rounded-xl border border-neutral-100 justify-between">
                           <div className="text-center">
                             <div className="text-[10px] font-black text-neutral-400 uppercase">Pro</div>
                             <div className="text-xs font-bold text-neutral-800">{Math.round(item.adjusted_macros?.protein || 0)}g</div>
                           </div>
                           <div className="text-center">
                             <div className="text-[10px] font-black text-neutral-400 uppercase">Carb</div>
                             <div className="text-xs font-bold text-neutral-800">{Math.round(item.adjusted_macros?.carbs || 0)}g</div>
                           </div>
                           <div className="text-center">
                             <div className="text-[10px] font-black text-neutral-400 uppercase">Fib</div>
                             <div className="text-xs font-bold text-neutral-800">{Math.round(item.adjusted_macros?.fiber || 0)}g</div>
                           </div>
                           <div className="text-center">
                             <div className="text-[10px] font-black text-neutral-400 uppercase">Fat</div>
                             <div className="text-xs font-bold text-neutral-800">{Math.round(item.adjusted_macros?.fat || 0)}g</div>
                           </div>
                         </div>
                         <div className="space-y-2">
                           {item.adjusted_ingredients?.map((ing: any, i: number) => (
                             <div key={i} className="flex justify-between items-center border-b border-neutral-200/50 pb-2 last:border-0 last:pb-0">
                               <span className="font-medium text-neutral-800 flex-1">{ing.name}</span>
                               <span className="text-neutral-400 font-medium ml-2">{Math.round(ing.original_weight)}g</span>
                             </div>
                           ))}
                           {(!item.adjusted_ingredients || item.adjusted_ingredients.length === 0) && (
                             <p className="text-neutral-400 italic">No ingredients found.</p>
                           )}
                         </div>
                       </div>
                     )}
                   </div>
                 )
              })}
            </div>
            
            {/* Cancel Button */}
            {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
              <div className="flex justify-end pt-6">
                <button 
                  onClick={() => requestStatusChange("CANCELLED")} 
                  className="px-8 py-3 rounded-full border-2 border-[#ff751f] text-[#ff751f] font-bold hover:bg-[#fff3eb] transition-colors"
                >
                  Cancel Order
                </button>
              </div>
            )}

          </div>
        </div>
      </div>

      <InvoiceTemplate />

      {/* ── Status Confirm Modal ── */}
      {statusConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${STATUS_STYLES[statusConfirm as keyof typeof STATUS_STYLES] || "bg-neutral-100 text-neutral-600"}`}>
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-neutral-900 text-center mb-2">Change Status?</h2>
            {isPrepWarning ? (
              <div className="bg-orange-50 border border-orange-200 text-orange-800 p-3 rounded-xl mb-4">
                <p className="text-xs font-bold flex items-center justify-center gap-1.5 mb-1">
                  <AlertTriangle className="w-4 h-4" /> INGREDIENTS NOT PREPARED
                </p>
                <p className="text-xs text-center font-medium">
                  Some ingredients for this order have not been marked as PREPARED in the Kitchen Display System yet. Are you sure you want to dispatch?
                </p>
              </div>
            ) : (
              <p className="text-sm text-neutral-500 text-center mb-2 font-medium">
                You are about to change this order's status to:
              </p>
            )}
            <p className={`text-center text-lg font-black uppercase tracking-wider mb-8 ${(STATUS_STYLES[statusConfirm as keyof typeof STATUS_STYLES] || "").split(" ")[1]}`}>
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
                {statusLoading ? <BowlLoader className="w-4 h-4 animate-spin" /> : "Confirm"}
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
  </>);
}