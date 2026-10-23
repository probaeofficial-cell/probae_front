"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { BowlLoader } from "@/components/admin/BowlLoader";
import { endpoints } from "@/lib/apiService";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Search,
  Calendar,
  X,
  ChevronRight,
  Settings,
  LayoutGrid,
  Table as TableIcon,
  RefreshCw,
  Clock,
  ArrowRight,
  User,
  ShieldCheck,
  Receipt
} from "lucide-react";

interface SettlementRecipient {
  name: string;
  total_income: number;
  total_expense: number;
  net_balance: number;
  status: "BALANCED" | "SURPLUS" | "DEFICIT";
  status_label: string;
  to_balance_message: string;
  to_balance_amount: number;
  income_count: number;
  expense_count: number;
}

interface SettlementSummary {
  total_income: number;
  total_expense: number;
  net_balance: number;
  total_recipients: number;
  balanced_count: number;
  surplus_count: number;
  deficit_count: number;
}

interface SettlementData {
  recipients: SettlementRecipient[];
  summary: SettlementSummary;
  date_from: string | null;
  date_to: string | null;
}

interface DrilldownTransaction {
  ulid: string;
  customer_name: string;
  customer_ulid: string;
  amount: number;
  transaction_type: string;
  payment_method: string | null;
  description: string;
  reference_id: string | null;
  date: string | null;
}

interface DrilldownExpense {
  ulid: string;
  category_name: string;
  amount: number;
  expense_date: string;
  notes: string | null;
  created_at: string | null;
}

interface DrilldownData {
  recipient_name: string;
  total_income: number;
  total_expense: number;
  net_balance: number;
  status: "BALANCED" | "SURPLUS" | "DEFICIT";
  transactions: DrilldownTransaction[];
  expenses: DrilldownExpense[];
}

function getISTParts(d = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA produces YYYY-MM-DD
  const dateStr = formatter.format(d);
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  return { year, month, day, dateStr };
}

function formatYMD(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export default function UserSettlementsPage() {
  const [data, setData] = useState<SettlementData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [activeTab, setActiveTab] = useState<"All Time" | "This Month" | "This Week" | "Last 30 Days" | "Custom">("All Time");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SURPLUS" | "DEFICIT" | "BALANCED">("ALL");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Drilldown Modal
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [drilldownData, setDrilldownData] = useState<DrilldownData | null>(null);
  const [drilldownTab, setDrilldownTab] = useState<"timeline" | "inflow" | "outflow">("timeline");

  const handleTabChange = (tab: "All Time" | "This Month" | "This Week" | "Last 30 Days" | "Custom") => {
    setActiveTab(tab);

    if (tab === "All Time") {
      setDateFrom("");
      setDateTo("");
      return;
    }

    const { year, month, day, dateStr: todayIST } = getISTParts();

    if (tab === "This Month") {
      // 1st of the current IST month to the last day of the current IST month
      const firstDay = formatYMD(year, month, 1);
      const daysInMonth = new Date(year, month, 0).getDate();
      const lastDay = formatYMD(year, month, daysInMonth);
      setDateFrom(firstDay);
      setDateTo(lastDay);
    } else if (tab === "This Week") {
      // Current Monday to Sunday in IST
      const curr = new Date(year, month - 1, day);
      const dayOfWeek = curr.getDay(); // 0 is Sunday, 1 is Monday...
      const diffToMonday = curr.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(year, month - 1, diffToMonday);
      const sunday = new Date(year, month - 1, diffToMonday + 6);
      setDateFrom(formatYMD(monday.getFullYear(), monday.getMonth() + 1, monday.getDate()));
      setDateTo(formatYMD(sunday.getFullYear(), sunday.getMonth() + 1, sunday.getDate()));
    } else if (tab === "Last 30 Days") {
      const past = new Date(year, month - 1, day - 30);
      setDateFrom(formatYMD(past.getFullYear(), past.getMonth() + 1, past.getDate()));
      setDateTo(todayIST);
    }
  };

  const fetchData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const params: any = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (search.trim()) params.search = search.trim();

      const res: any = await endpoints.expenses.getSettlements(params);
      setData(res);
    } catch (err) {
      console.error("Failed to fetch settlements:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateFrom, dateTo, search]);

  const openDrilldown = async (recipientName: string) => {
    setSelectedRecipient(recipientName);
    setDrilldownLoading(true);
    setDrilldownTab("timeline");
    try {
      const params: any = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const res: any = await endpoints.expenses.getSettlementDetails(recipientName, params);
      setDrilldownData(res);
    } catch (err) {
      console.error("Failed to load drilldown details:", err);
    } finally {
      setDrilldownLoading(false);
    }
  };

  const closeDrilldown = () => {
    setSelectedRecipient(null);
    setDrilldownData(null);
  };

  // Filtered recipients
  const filteredRecipients = useMemo(() => {
    if (!data?.recipients) return [];
    return data.recipients.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      return true;
    });
  }, [data, statusFilter]);

  // Combined timeline items for drilldown
  const combinedTimeline = useMemo(() => {
    if (!drilldownData) return [];
    const inflows = drilldownData.transactions.map((t) => ({
      type: "INFLOW" as const,
      date: t.date ? t.date.split("T")[0] : "",
      time: t.date && t.date.includes("T") ? t.date.split("T")[1]?.slice(0, 5) : "",
      title: `Received from ${t.customer_name}`,
      subtitle: t.description || `Method: ${t.payment_method || "N/A"}`,
      ref: t.reference_id,
      amount: t.amount,
      rawDate: t.date || "",
    }));
    const outflows = drilldownData.expenses.map((e) => ({
      type: "OUTFLOW" as const,
      date: e.expense_date,
      time: e.created_at && e.created_at.includes("T") ? e.created_at.split("T")[1]?.slice(0, 5) : "",
      title: `Disbursed for ${e.category_name}`,
      subtitle: e.notes || "No notes provided",
      ref: null,
      amount: e.amount,
      rawDate: e.expense_date,
    }));
    return [...inflows, ...outflows].sort((a, b) => (b.rawDate > a.rawDate ? 1 : -1));
  }, [drilldownData]);

  if (isLoading && !data) {
    return (
      <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
        <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden justify-center items-center">
          <BowlLoader className="w-10 h-10 text-[#6A0FAD]" />
        </div>
      </div>
    );
  }

  const summary = data?.summary || {
    total_income: 0,
    total_expense: 0,
    net_balance: 0,
    total_recipients: 0,
    balanced_count: 0,
    surplus_count: 0,
    deficit_count: 0,
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        <Header />
        <Breadcrumbs segments={["Expenses", "User Settlements"]} />

        <div className="mt-4 flex-1 flex flex-col min-h-0 overflow-y-auto space-y-6 pb-20 pr-1 scrollbar-thin">
          {/* Top Title & Header Actions */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                  User Settlement Dashboard
                </h1>
                {isRefreshing && (
                  <RefreshCw className="w-5 h-5 text-[#6A0FAD] animate-spin" />
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <p className="text-xs sm:text-sm font-medium text-neutral-500">
                  Real-time reconciliation of money received (Paid To) vs expenses paid (Sent From) per recipient.
                </p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-neutral-100 text-[10px] font-bold text-neutral-600 uppercase tracking-wider">
                  IST (Asia/Kolkata)
                </span>
                {dateFrom && dateTo && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#6A0FAD]/10 text-[10px] font-bold text-[#6A0FAD]">
                    {dateFrom} to {dateTo}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <Link
                href="/admin/settings"
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl transition-colors shrink-0"
                title="Manage recipient names in Settings"
              >
                <Settings className="w-3.5 h-3.5 text-[#6A0FAD]" />
                Recipients Settings
              </Link>
              <button
                onClick={() => fetchData(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#6A0FAD]/10 hover:bg-[#6A0FAD]/20 text-[#6A0FAD] text-xs font-bold rounded-xl transition-colors shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            </div>
          </div>

          {/* Date Segmented Tabs & Search Bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shrink-0">
            {/* Date Preset Segmented Control */}
            <div className="flex items-center bg-neutral-100 p-1.5 rounded-2xl overflow-x-auto scrollbar-none shrink-0 min-h-[48px]">
              {(["All Time", "This Month", "This Week", "Last 30 Days", "Custom"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTabChange(t)}
                  className={`h-9 px-3.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all shrink-0 ${
                    activeTab === t
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Search Input & View Switcher */}
            <div className="flex items-center gap-2 flex-1 max-w-lg lg:ml-auto shrink-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search recipient name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl pl-10 pr-8 py-2 text-xs sm:text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* View Toggle */}
              <div className="flex items-center bg-neutral-100 p-1 rounded-xl shrink-0">
                <button
                  onClick={() => setViewMode("cards")}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === "cards" ? "bg-white text-[#6A0FAD] shadow-sm" : "text-neutral-500 hover:text-neutral-800"
                  }`}
                  title="Card View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === "table" ? "bg-white text-[#6A0FAD] shadow-sm" : "text-neutral-500 hover:text-neutral-800"
                  }`}
                  title="Table View"
                >
                  <TableIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Custom Date Pickers (Shown only when Custom is chosen) */}
          {activeTab === "Custom" && (
            <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-2xl flex flex-wrap items-center gap-4 shrink-0 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-neutral-500" />
                <span className="text-xs font-bold text-neutral-500 uppercase">From:</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs font-bold text-neutral-800 outline-none focus:border-[#6A0FAD]"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-500 uppercase">To:</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-xs font-bold text-neutral-800 outline-none focus:border-[#6A0FAD]"
                />
              </div>
            </div>
          )}

          {/* Top Level Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
            {/* Total Income Inflow */}
            <div className="group bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  Total Income Inflow
                </span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-neutral-900">
                ₹{summary.total_income.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Customer deposits received across users
              </p>
            </div>

            {/* Total Expense Outflow */}
            <div className="group bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  Total Expenses Disbursed
                </span>
                <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-neutral-900">
                ₹{summary.total_expense.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Company expenses paid by users
              </p>
            </div>

            {/* Net Holding / Balance Position */}
            <div className="group bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  Net Balance Position
                </span>
                <div className="w-10 h-10 rounded-2xl bg-[#6A0FAD]/10 text-[#6A0FAD] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Scale className="w-5 h-5" />
                </div>
              </div>
              <p
                className={`text-2xl sm:text-3xl font-black ${
                  summary.net_balance > 0
                    ? "text-amber-600"
                    : summary.net_balance < 0
                    ? "text-[#6A0FAD]"
                    : "text-emerald-600"
                }`}
              >
                {summary.net_balance > 0 ? "+" : ""}
                ₹{summary.net_balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                {summary.net_balance > 0
                  ? "Surplus cash currently held by users"
                  : summary.net_balance < 0
                  ? "Reimbursement due to users from company"
                  : "All user accounts completely balanced"}
              </p>
            </div>

            {/* Settlement Status Health */}
            <div className="group bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  Settlement Health
                </span>
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-2xl font-black text-emerald-600">
                    {summary.balanced_count}
                  </span>
                  <span className="text-xs font-bold text-neutral-500 ml-1">Balanced</span>
                </div>
                <div className="h-6 w-[1px] bg-neutral-200"></div>
                <div>
                  <span className="text-2xl font-black text-amber-600">
                    {summary.surplus_count + summary.deficit_count}
                  </span>
                  <span className="text-xs font-bold text-neutral-500 ml-1">Pending</span>
                </div>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                {summary.total_recipients} recipient{summary.total_recipients === 1 ? "" : "s"} tracked
              </p>
            </div>
          </div>

          {/* Status Quick Filter Buttons */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-2.5 sm:p-3 shadow-sm flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0 min-h-[56px]">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider pl-1 pr-1 shrink-0 hidden sm:inline-flex items-center gap-1.5">
              Status:
            </span>
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`h-10 px-4 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 border ${
                statusFilter === "ALL"
                  ? "bg-[#6A0FAD] text-white border-[#6A0FAD] shadow-sm"
                  : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100"
              }`}
            >
              <span>All Users</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                statusFilter === "ALL" ? "bg-white/25 text-white" : "bg-neutral-200 text-neutral-700"
              }`}>
                {data?.recipients.length || 0}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("SURPLUS")}
              className={`h-10 px-4 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 border ${
                statusFilter === "SURPLUS"
                  ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                  : "bg-amber-50/70 text-amber-800 border-amber-200 hover:bg-amber-100/70"
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Holding Cash / Surplus</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                statusFilter === "SURPLUS" ? "bg-white/25 text-white" : "bg-amber-200 text-amber-900"
              }`}>
                {summary.surplus_count}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("DEFICIT")}
              className={`h-10 px-4 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 border ${
                statusFilter === "DEFICIT"
                  ? "bg-purple-700 text-white border-purple-700 shadow-sm"
                  : "bg-purple-50/70 text-purple-800 border-purple-200 hover:bg-purple-100/70"
              }`}
            >
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span>Reimbursement Due</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                statusFilter === "DEFICIT" ? "bg-white/25 text-white" : "bg-purple-200 text-purple-900"
              }`}>
                {summary.deficit_count}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("BALANCED")}
              className={`h-10 px-4 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 border ${
                statusFilter === "BALANCED"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-emerald-50/70 text-emerald-800 border-emerald-200 hover:bg-emerald-100/70"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Balanced</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                statusFilter === "BALANCED" ? "bg-white/25 text-white" : "bg-emerald-200 text-emerald-900"
              }`}>
                {summary.balanced_count}
              </span>
            </button>
          </div>

          {/* Main Content: Cards View or Table View */}
          <div className="shrink-0">
          {filteredRecipients.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-neutral-200 shadow-sm text-center">
              <div className="w-14 h-14 rounded-full bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center mb-4">
                <Wallet className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-neutral-800">No Recipients Found</h3>
              <p className="text-sm text-neutral-500 mt-1 max-w-md mx-auto">
                No users match your criteria. Add recipient names in Settings or record transactions with &apos;Paid To&apos; / &apos;Sent From&apos;.
              </p>
              <Link
                href="/admin/settings"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#6A0FAD] text-white text-xs font-bold rounded-xl hover:bg-[#5a0d93] transition-colors"
              >
                Go to Settings
              </Link>
            </div>
          ) : viewMode === "cards" ? (
            /* Cards View */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredRecipients.map((r) => {
                const totalVol = r.total_income + r.total_expense;
                const incomePercent = totalVol > 0 ? Math.round((r.total_income / totalVol) * 100) : 50;

                return (
                  <div
                    key={r.name}
                    className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header: Avatar, Name & Status Badge */}
                      <div className="flex items-center justify-between gap-3 mb-5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-2xl bg-[#6A0FAD]/10 text-[#6A0FAD] font-black text-base flex items-center justify-center shrink-0">
                            {r.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-lg font-black text-neutral-900 truncate">
                              {r.name}
                            </h3>
                            <p className="text-xs text-neutral-400">
                              {r.income_count} deposit{r.income_count === 1 ? "" : "s"} • {r.expense_count} expense{r.expense_count === 1 ? "" : "s"}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0">
                          {r.status === "BALANCED" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Balanced
                            </span>
                          )}
                          {r.status === "SURPLUS" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertCircle className="w-3.5 h-3.5" /> Holding Cash
                            </span>
                          )}
                          {r.status === "DEFICIT" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-purple-50 text-[#6A0FAD] border border-purple-200">
                              <TrendingUp className="w-3.5 h-3.5" /> Due Refund
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Prominent Net Position */}
                      <div className="bg-[#f8f5fb] rounded-2xl p-4 mb-4 border border-[#6A0FAD]/10">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                            Net Difference
                          </span>
                          <span className="text-xs font-bold text-neutral-600">
                            {r.status === "BALANCED" && "₹0 Variance"}
                            {r.status === "SURPLUS" && "Cash Surplus"}
                            {r.status === "DEFICIT" && "Out of Pocket"}
                          </span>
                        </div>
                        <p
                          className={`text-2xl sm:text-3xl font-black mt-1 ${
                            r.net_balance > 0
                              ? "text-amber-600"
                              : r.net_balance < 0
                              ? "text-[#6A0FAD]"
                              : "text-emerald-600"
                          }`}
                        >
                          {r.net_balance > 0 ? "+" : ""}
                          ₹{r.net_balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs font-medium text-neutral-600 mt-1">
                          {r.status === "BALANCED" && "User has fully settled all receipts and expenses."}
                          {r.status === "SURPLUS" && `Holding ₹${r.to_balance_amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} of company cash. Needs to return or spend.`}
                          {r.status === "DEFICIT" && `Company owes ₹${r.to_balance_amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to user as reimbursement.`}
                        </p>
                      </div>

                      {/* Inflow & Outflow Side-by-Side */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                            <ArrowDownLeft className="w-3 h-3 text-emerald-600" /> Inflow (Paid To)
                          </span>
                          <p className="text-base font-black text-emerald-600 mt-1">
                            ₹{r.total_income.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                            <ArrowUpRight className="w-3 h-3 text-red-600" /> Outflow (Sent From)
                          </span>
                          <p className="text-base font-black text-red-600 mt-1">
                            ₹{r.total_expense.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      {/* Split Ratio Bar */}
                      <div className="mb-5">
                        <div className="flex justify-between items-center text-[10px] font-bold text-neutral-400 uppercase mb-1">
                          <span>Split: Inflow vs Outflow</span>
                          <span>{totalVol > 0 ? `${incomePercent}% In / ${100 - incomePercent}% Out` : "No Activity"}</span>
                        </div>
                        <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden flex">
                          <div
                            style={{ width: `${incomePercent}%` }}
                            className="bg-emerald-500 h-full transition-all"
                            title={`Inflow: ₹${r.total_income}`}
                          />
                          <div
                            style={{ width: `${100 - incomePercent}%` }}
                            className="bg-red-400 h-full transition-all"
                            title={`Outflow: ₹${r.total_expense}`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Drilldown Button */}
                    <button
                      onClick={() => openDrilldown(r.name)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-neutral-100 hover:bg-[#6A0FAD] text-neutral-700 hover:text-white text-xs font-bold rounded-2xl transition-all group"
                    >
                      <span>View Detailed Ledger</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="bg-white rounded-3xl shadow-sm border border-neutral-200 overflow-hidden flex flex-col">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-neutral-100 bg-neutral-50/60">
                      <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase">
                        Recipient
                      </th>
                      <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase">
                        Inflow (Paid To)
                      </th>
                      <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase">
                        Outflow (Sent From)
                      </th>
                      <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase">
                        Net Position
                      </th>
                      <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase">
                        Status
                      </th>
                      <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase">
                        Settlement Action
                      </th>
                      <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredRecipients.map((r) => (
                      <tr key={r.name} className="hover:bg-neutral-50/40 transition-colors">
                        <td className="py-4 px-6 font-bold text-neutral-900">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-[#6A0FAD]/10 text-[#6A0FAD] font-black text-xs flex items-center justify-center shrink-0">
                              {r.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span>{r.name}</span>
                              <p className="text-[11px] text-neutral-400 font-normal">
                                {r.income_count} in • {r.expense_count} out
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-sm font-bold text-emerald-600 whitespace-nowrap">
                          ₹{r.total_income.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-6 text-sm font-bold text-red-600 whitespace-nowrap">
                          ₹{r.total_expense.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-6 text-sm font-black whitespace-nowrap">
                          <span
                            className={
                              r.net_balance > 0
                                ? "text-amber-600"
                                : r.net_balance < 0
                                ? "text-[#6A0FAD]"
                                : "text-emerald-600"
                            }
                          >
                            {r.net_balance > 0 ? "+" : ""}
                            ₹{r.net_balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          {r.status === "BALANCED" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-black bg-emerald-50 text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Balanced
                            </span>
                          )}
                          {r.status === "SURPLUS" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-black bg-amber-50 text-amber-700">
                              <AlertCircle className="w-3.5 h-3.5" /> Holding Cash
                            </span>
                          )}
                          {r.status === "DEFICIT" && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-black bg-purple-50 text-purple-700">
                              <TrendingUp className="w-3.5 h-3.5" /> Company Owes
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-xs font-medium text-neutral-700 max-w-xs">
                          {r.status === "BALANCED" && (
                            <span className="text-emerald-700 font-bold">Settled (₹0.00)</span>
                          )}
                          {r.status === "SURPLUS" && (
                            <span className="text-amber-800">
                              Return / spend ₹{r.to_balance_amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                          {r.status === "DEFICIT" && (
                            <span className="text-purple-800">
                              Reimburse ₹{r.to_balance_amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <button
                            onClick={() => openDrilldown(r.name)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-[#6A0FAD]/10 text-neutral-700 hover:text-[#6A0FAD] text-xs font-bold rounded-lg transition-colors"
                          >
                            Ledger <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Drilldown Ledger Modal */}
      {selectedRecipient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-neutral-100 flex items-center justify-between shrink-0 bg-neutral-50/50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#6A0FAD]/10 text-[#6A0FAD] font-black text-lg sm:text-xl flex items-center justify-center shrink-0">
                  {selectedRecipient.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black text-neutral-900 truncate">
                      {selectedRecipient}
                    </h2>
                    {drilldownData && (
                      <span
                        className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                          drilldownData.status === "BALANCED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : drilldownData.status === "SURPLUS"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-purple-50 text-purple-700 border border-purple-200"
                        }`}
                      >
                        {drilldownData.status === "BALANCED" && "Balanced"}
                        {drilldownData.status === "SURPLUS" && "Holding Surplus Cash"}
                        {drilldownData.status === "DEFICIT" && "Reimbursement Due"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5 truncate">
                    Financial history {dateFrom || dateTo ? `from ${dateFrom || "Start"} to ${dateTo || "Today"}` : "for all time"}
                  </p>
                </div>
              </div>

              <button
                onClick={closeDrilldown}
                className="p-2 text-neutral-400 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Summary Row (Responsive Grid: 1 col on mobile, 3 on sm+) */}
            {drilldownData && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 sm:p-5 bg-neutral-50/60 border-b border-neutral-100 shrink-0">
                <div className="bg-white p-3.5 rounded-2xl border border-neutral-200">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" /> Total Received (Inflow)
                  </span>
                  <p className="text-lg sm:text-xl font-black text-emerald-600 mt-1">
                    ₹{drilldownData.total_income.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-neutral-400">
                    {drilldownData.transactions.length} customer payment{drilldownData.transactions.length === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-neutral-200">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5 text-red-600" /> Total Paid Out (Outflow)
                  </span>
                  <p className="text-lg sm:text-xl font-black text-red-600 mt-1">
                    ₹{drilldownData.total_expense.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-neutral-400">
                    {drilldownData.expenses.length} expense log{drilldownData.expenses.length === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-neutral-200">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5 text-[#6A0FAD]" /> Net Current Position
                  </span>
                  <p
                    className={`text-lg sm:text-xl font-black mt-1 ${
                      drilldownData.net_balance > 0
                        ? "text-amber-600"
                        : drilldownData.net_balance < 0
                        ? "text-[#6A0FAD]"
                        : "text-emerald-600"
                    }`}
                  >
                    {drilldownData.net_balance > 0 ? "+" : ""}
                    ₹{drilldownData.net_balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] font-bold text-neutral-500">
                    {drilldownData.status === "BALANCED" && "Completely Balanced (₹0)"}
                    {drilldownData.status === "SURPLUS" && "Holding company cash"}
                    {drilldownData.status === "DEFICIT" && "Company owes reimbursement"}
                  </p>
                </div>
              </div>
            )}

            {/* Drilldown Navigation Tabs */}
            <div className="px-4 sm:px-6 pt-3 border-b border-neutral-100 flex items-center gap-4 shrink-0 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setDrilldownTab("timeline")}
                className={`pb-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
                  drilldownTab === "timeline"
                    ? "border-[#6A0FAD] text-[#6A0FAD]"
                    : "border-transparent text-neutral-500 hover:text-neutral-800"
                }`}
              >
                Combined Activity ({combinedTimeline.length})
              </button>
              <button
                onClick={() => setDrilldownTab("inflow")}
                className={`pb-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
                  drilldownTab === "inflow"
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-neutral-500 hover:text-neutral-800"
                }`}
              >
                Inflow: Customer Payments ({drilldownData?.transactions.length || 0})
              </button>
              <button
                onClick={() => setDrilldownTab("outflow")}
                className={`pb-3 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
                  drilldownTab === "outflow"
                    ? "border-red-600 text-red-700"
                    : "border-transparent text-neutral-500 hover:text-neutral-800"
                }`}
              >
                Outflow: Expense Logs ({drilldownData?.expenses.length || 0})
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin">
              {drilldownLoading ? (
                <div className="py-12 flex justify-center">
                  <BowlLoader className="w-10 h-10 text-[#6A0FAD]" />
                </div>
              ) : drilldownTab === "timeline" ? (
                /* Combined Activity Timeline */
                combinedTimeline.length === 0 ? (
                  <div className="py-12 text-center text-neutral-400 text-sm">
                    No transactions or expenses recorded for this user in the selected period.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {combinedTimeline.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between gap-3 sm:gap-4 transition-colors ${
                          item.type === "INFLOW"
                            ? "bg-emerald-50/20 border-emerald-100 hover:bg-emerald-50/40"
                            : "bg-red-50/20 border-red-100 hover:bg-red-50/40"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              item.type === "INFLOW"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {item.type === "INFLOW" ? (
                              <ArrowDownLeft className="w-4 h-4" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-neutral-900 truncate">
                              {item.title}
                            </p>
                            <p className="text-[11px] sm:text-xs text-neutral-500 truncate">
                              {item.subtitle}
                              {item.ref ? ` • Ref: ${item.ref}` : ""}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p
                            className={`text-sm sm:text-base font-black ${
                              item.type === "INFLOW" ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {item.type === "INFLOW" ? "+" : "-"}₹
                            {item.amount.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                          <p className="text-[10px] sm:text-[11px] text-neutral-400">
                            {item.date} {item.time ? `• ${item.time}` : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : drilldownTab === "inflow" ? (
                /* Customer Payments Table */
                drilldownData?.transactions.length === 0 ? (
                  <div className="py-12 text-center text-neutral-400 text-sm">
                    No customer payments received for this user.
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[550px]">
                      <thead>
                        <tr className="border-b border-neutral-100 bg-neutral-50/60">
                          <th className="py-3 px-4 text-xs font-bold text-neutral-500 uppercase">
                            Date
                          </th>
                          <th className="py-3 px-4 text-xs font-bold text-neutral-500 uppercase">
                            Customer
                          </th>
                          <th className="py-3 px-4 text-xs font-bold text-neutral-500 uppercase">
                            Method
                          </th>
                          <th className="py-3 px-4 text-xs font-bold text-neutral-500 uppercase">
                            Description
                          </th>
                          <th className="py-3 px-4 text-xs font-bold text-neutral-500 uppercase text-right">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {drilldownData?.transactions.map((t) => (
                          <tr key={t.ulid} className="hover:bg-neutral-50/30 transition-colors">
                            <td className="py-3 px-4 text-xs font-medium text-neutral-600 whitespace-nowrap">
                              {t.date ? t.date.split("T")[0] : "—"}
                            </td>
                            <td className="py-3 px-4 text-xs sm:text-sm font-bold text-neutral-900">
                              {t.customer_name}
                            </td>
                            <td className="py-3 px-4 text-xs font-bold text-neutral-600">
                              <span className="px-2 py-0.5 bg-neutral-100 rounded-md">
                                {t.payment_method || "N/A"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs text-neutral-500 max-w-xs truncate">
                              {t.description || "—"}
                            </td>
                            <td className="py-3 px-4 text-xs sm:text-sm font-black text-emerald-600 text-right whitespace-nowrap">
                              +₹{t.amount.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                /* Expenses Table */
                drilldownData?.expenses.length === 0 ? (
                  <div className="py-12 text-center text-neutral-400 text-sm">
                    No expenses recorded as paid from this user.
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[550px]">
                      <thead>
                        <tr className="border-b border-neutral-100 bg-neutral-50/60">
                          <th className="py-3 px-4 text-xs font-bold text-neutral-500 uppercase">
                            Date
                          </th>
                          <th className="py-3 px-4 text-xs font-bold text-neutral-500 uppercase">
                            Category
                          </th>
                          <th className="py-3 px-4 text-xs font-bold text-neutral-500 uppercase">
                            Notes
                          </th>
                          <th className="py-3 px-4 text-xs font-bold text-neutral-500 uppercase text-right">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {drilldownData?.expenses.map((e) => (
                          <tr key={e.ulid} className="hover:bg-neutral-50/30 transition-colors">
                            <td className="py-3 px-4 text-xs font-medium text-neutral-600 whitespace-nowrap">
                              {e.expense_date}
                            </td>
                            <td className="py-3 px-4 text-xs sm:text-sm font-bold text-neutral-900">
                              {e.category_name}
                            </td>
                            <td className="py-3 px-4 text-xs text-neutral-500 max-w-xs truncate">
                              {e.notes || "—"}
                            </td>
                            <td className="py-3 px-4 text-xs sm:text-sm font-black text-red-600 text-right whitespace-nowrap">
                              -₹{e.amount.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-100 flex items-center justify-end shrink-0 bg-neutral-50/50">
              <button
                onClick={closeDrilldown}
                className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
