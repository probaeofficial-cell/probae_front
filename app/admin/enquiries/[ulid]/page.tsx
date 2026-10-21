"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageCircle,
  Copy,
  Check,
  Calendar,
  Clock,
  Flame,
  Utensils,
  Activity,
  User,
  MapPin,
  AlertTriangle,
  ChefHat,
  ShieldAlert,
  ChevronDown,
  Sparkles,
  ExternalLink,
  FileText,
  Heart,
  Scale,
  Award,
  RefreshCw,
} from "lucide-react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { BowlLoader } from "@/components/admin/BowlLoader";
import { endpoints } from "@/lib/apiService";
import { useAuth } from "@/lib/AuthContext";

type EnquiryStatus = "NEW" | "CONTACTED" | "CONVERTED" | "CLOSED";

interface EnquiryItem {
  ulid: string;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  plan_interest: string | null;
  status: EnquiryStatus;
  created_at: string | null;
  updated_at: string | null;
}

interface ParsedBowl {
  day: string;
  slot: string;
  name: string;
  calories?: string;
  protein?: string;
  carbs?: string;
  fat?: string;
  price?: string;
}

interface ParsedEnquiry {
  isStructured: boolean;
  customer: {
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
    sex: string | null;
    age: string | null;
    height: string | null;
    weight: string | null;
    bmi: string | null;
    activityLevel: string | null;
    goal: string | null;
    dietaryPreferences: string[];
    allergies: string[];
    chefInstructions: string | null;
  };
  plan: {
    name: string | null;
    planType: string | null;
    duration: string | null;
    frequency: string | null;
    mealSlots: string[];
    dailyCalories: string | null;
    calorieDistribution: string | null;
  };
  pricing: {
    grossPrice: string | null;
    discount: string | null;
    finalPrice: string | null;
  };
  scheduledBowls: ParsedBowl[];
}

const statuses: EnquiryStatus[] = ["NEW", "CONTACTED", "CONVERTED", "CLOSED"];
const statusStyles: Record<EnquiryStatus, { bg: string; text: string; dot: string }> = {
  NEW: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", dot: "bg-blue-500" },
  CONTACTED: { bg: "bg-amber-50 border-amber-200", text: "text-amber-800", dot: "bg-amber-500" },
  CONVERTED: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  CLOSED: { bg: "bg-neutral-100 border-neutral-200", text: "text-neutral-700", dot: "bg-neutral-400" },
};

function parseEnquiryMessage(message: string | null, enquiry: EnquiryItem): ParsedEnquiry {
  const result: ParsedEnquiry = {
    isStructured: false,
    customer: {
      name: enquiry.name,
      phone: enquiry.phone,
      email: enquiry.email,
      address: null,
      sex: null,
      age: null,
      height: null,
      weight: null,
      bmi: null,
      activityLevel: null,
      goal: null,
      dietaryPreferences: [],
      allergies: [],
      chefInstructions: null,
    },
    plan: {
      name: enquiry.plan_interest,
      planType: null,
      duration: null,
      frequency: null,
      mealSlots: [],
      dailyCalories: null,
      calorieDistribution: null,
    },
    pricing: {
      grossPrice: null,
      discount: null,
      finalPrice: null,
    },
    scheduledBowls: [],
  };

  if (!message) return result;

  const text = message.trim();

  // Check if message is from the structured onboarding finalization
  if (
    text.includes("=== CUSTOMER ONBOARDING PLAN FINALIZATION ===") ||
    text.includes("=== SELECTED PLAN DETAILS ===") ||
    text.includes("=== PRICING BREAKDOWN ===") ||
    text.includes("=== SCHEDULED BOWLS ===") ||
    text.includes("Meal Slots:") ||
    text.includes("Daily Purchased Calories:")
  ) {
    result.isStructured = true;
  }

  // Address
  const addressMatch = text.match(/Delivery Address:\s*([^\n]+)/i);
  if (addressMatch) result.customer.address = addressMatch[1].trim();

  // Biometrics line: "Sex: Male | Age: 25 | Height: 180cm | Weight: 75kg"
  const sexMatch = text.match(/Sex:\s*([^|\n]+)/i);
  if (sexMatch) result.customer.sex = sexMatch[1].trim();

  const ageMatch = text.match(/Age:\s*([^|\n]+)/i);
  if (ageMatch) result.customer.age = ageMatch[1].trim();

  const heightMatch = text.match(/Height:\s*([^|\n]+)/i);
  if (heightMatch) result.customer.height = heightMatch[1].trim();

  const weightMatch = text.match(/Weight:\s*([^|\n]+)/i);
  if (weightMatch) result.customer.weight = weightMatch[1].trim();

  // Calculate BMI if height and weight numbers are present
  if (result.customer.height && result.customer.weight) {
    const h = parseFloat(result.customer.height.replace(/[^0-9.]/g, ""));
    const w = parseFloat(result.customer.weight.replace(/[^0-9.]/g, ""));
    if (h > 60 && w > 20) {
      const bmiVal = (w / ((h / 100) * (h / 100))).toFixed(1);
      result.customer.bmi = bmiVal;
    }
  }

  // Activity & Goal: "Activity Level: Lightly Active | Goal: Muscle Gain"
  const actMatch = text.match(/Activity Level:\s*([^|\n]+)/i);
  if (actMatch) result.customer.activityLevel = actMatch[1].trim();

  const goalMatch = text.match(/Goal:\s*([^\n]+)/i);
  if (goalMatch) result.customer.goal = goalMatch[1].trim();

  // Dietary Preferences & Allergies
  const dietMatch = text.match(/Dietary Preferences:\s*([^\n]+)/i);
  if (dietMatch) {
    const raw = dietMatch[1].trim();
    if (raw && raw.toLowerCase() !== "none") {
      result.customer.dietaryPreferences = raw.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  const allergyMatch = text.match(/Allergies:\s*([^\n]+)/i);
  if (allergyMatch) {
    const raw = allergyMatch[1].trim();
    if (raw && raw.toLowerCase() !== "none") {
      result.customer.allergies = raw.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  // Chef instructions
  const chefMatch = text.match(/Chef Instructions:\s*([^\n]+)/i);
  if (chefMatch) {
    const raw = chefMatch[1].trim();
    if (raw && raw.toLowerCase() !== "none") {
      result.customer.chefInstructions = raw;
    }
  }

  // Plan Details
  const planMatch = text.match(/Plan:\s*([^\n]+)/i);
  if (planMatch) {
    const planStr = planMatch[1].trim();
    if (planStr.includes("[CUSTOM]")) {
      result.plan.planType = "CUSTOM";
    } else if (planStr.includes("[STANDARD]")) {
      result.plan.planType = "STANDARD";
    }
    result.plan.name = planStr.replace(/\[(CUSTOM|STANDARD)\]/i, "").trim();
  }

  const durationMatch = text.match(/Duration:\s*([^|\n]+)/i);
  if (durationMatch) result.plan.duration = durationMatch[1].trim();

  const freqMatch = text.match(/Frequency:\s*([^\n]+)/i);
  if (freqMatch) result.plan.frequency = freqMatch[1].trim();

  const mealSlotsMatch = text.match(/Meal Slots:\s*([^\n]+)/i);
  if (mealSlotsMatch) {
    result.plan.mealSlots = mealSlotsMatch[1].split(",").map((s) => s.trim()).filter(Boolean);
  }

  const dailyCalsMatch = text.match(/Daily Purchased Calories:\s*([^\n]+)/i);
  if (dailyCalsMatch) result.plan.dailyCalories = dailyCalsMatch[1].trim();

  const calDistMatch = text.match(/Calorie Distribution:\s*([^\n]+)/i);
  if (calDistMatch) result.plan.calorieDistribution = calDistMatch[1].trim();

  // Pricing
  const grossMatch = text.match(/Gross Price:\s*₹?([^\n]+)/i);
  if (grossMatch) result.pricing.grossPrice = grossMatch[1].trim();

  const discMatch = text.match(/Discount:\s*([^\n]+)/i);
  if (discMatch) result.pricing.discount = discMatch[1].trim();

  const finalMatch = text.match(/Final Price:\s*₹?([^\n]+)/i);
  if (finalMatch) result.pricing.finalPrice = finalMatch[1].trim();

  // Scheduled Bowls Parser
  // e.g.: "Day 1 [LUNCH]: Mighty Platter 94 (1000 kcal, P:43g C:92g F:91g - ₹59)"
  const bowlLines = text.split("\n");
  for (const line of bowlLines) {
    const match = line.match(/Day\s*(\d+)\s*\[([^\]]+)\]:\s*([^(]+)\(([^)]+)\)/i);
    if (match) {
      const dayIndex = match[1].trim();
      const slot = match[2].trim();
      const bowlName = match[3].trim();
      const rawDetails = match[4].trim();

      let calories = "";
      const calM = rawDetails.match(/(\d+)\s*kcal/i);
      if (calM) calories = `${calM[1]} kcal`;

      let protein = "";
      const pM = rawDetails.match(/P:\s*(\d+g?)/i);
      if (pM) protein = pM[1];

      let carbs = "";
      const cM = rawDetails.match(/C:\s*(\d+g?)/i);
      if (cM) carbs = cM[1];

      let fat = "";
      const fM = rawDetails.match(/F:\s*(\d+g?)/i);
      if (fM) fat = fM[1];

      let price = "";
      const prM = rawDetails.match(/₹\s*(\d+(?:\.\d+)?)/i);
      if (prM) price = `₹${prM[1]}`;

      result.scheduledBowls.push({
        day: `Day ${dayIndex}`,
        slot,
        name: bowlName,
        calories,
        protein,
        carbs,
        fat,
        price,
      });
      result.isStructured = true;
    }
  }

  return result;
}

export default function EnquiryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const ulid = params?.ulid as string;

  const [enquiry, setEnquiry] = useState<EnquiryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showRawMessage, setShowRawMessage] = useState(false);

  const loadEnquiry = useCallback(async () => {
    if (!ulid) return;
    setLoading(true);
    setError("");
    try {
      const data = await endpoints.enquiries.get(ulid);
      setEnquiry(data);
    } catch (err: unknown) {
      console.error("Failed to load enquiry:", err);
      setError(err instanceof Error ? err.message : "Could not load enquiry details.");
    } finally {
      setLoading(false);
    }
  }, [ulid]);

  useEffect(() => {
    void loadEnquiry();
  }, [loadEnquiry]);

  const handleStatusChange = async (newStatus: EnquiryStatus) => {
    if (!enquiry || enquiry.status === newStatus) return;
    setUpdatingStatus(true);
    try {
      await endpoints.enquiries.updateStatus(enquiry.ulid, newStatus);
      setEnquiry((prev) => (prev ? { ...prev, status: newStatus } : null));
    } catch (err: unknown) {
      console.error("Failed to update status:", err);
      alert(err instanceof Error ? err.message : "Failed to update enquiry status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCopySummary = () => {
    if (!enquiry) return;
    const summary = [
      `PROBAE ENQUIRY - ${enquiry.name}`,
      `Phone: ${enquiry.phone}`,
      enquiry.email ? `Email: ${enquiry.email}` : null,
      `Plan: ${enquiry.plan_interest || "Custom Plan"}`,
      `Status: ${enquiry.status}`,
      `Date: ${enquiry.created_at ? new Date(enquiry.created_at).toLocaleString() : "N/A"}`,
      "",
      "--- DETAILS ---",
      enquiry.message || "No additional message.",
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (authLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <BowlLoader className="h-8 w-8 text-[#6A0FAD]" />
      </div>
    );
  }

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-[#E6E6E6]">
        <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-hidden rounded-tl-3xl bg-white p-6 shadow-sm">
          <BowlLoader className="h-10 w-10 text-[#6A0FAD]" />
          <p className="mt-4 text-sm font-semibold text-neutral-500">Loading enquiry preview...</p>
        </div>
      </div>
    );
  }

  if (error || !enquiry) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-[#E6E6E6]">
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-tl-3xl bg-white p-6 shadow-sm">
          <Header />
          <Breadcrumbs segments={["Admin", "Enquiries", "Not Found"]} />
          <div className="my-auto flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-neutral-900">Enquiry Not Found</h2>
            <p className="mt-2 max-w-md text-sm text-neutral-500">{error || "This enquiry may have been removed or does not exist."}</p>
            <Link
              href="/admin/enquiries"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#6A0FAD] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#5a0d93]"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Enquiries
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const parsed = parseEnquiryMessage(enquiry.message, enquiry);
  const cleanPhone = enquiry.phone.replace(/[^0-9]/g, "");
  const whatsappUrl = `https://wa.me/${cleanPhone.startsWith("91") ? cleanPhone : "91" + cleanPhone}?text=${encodeURIComponent(
    `Hi ${enquiry.name}, thank you for reaching out to ProBae regarding your meal plan!`
  )}`;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#E6E6E6]">
      <div className="flex h-full min-h-0 flex-col overflow-y-auto rounded-tl-3xl bg-white p-3 shadow-[0_0_15px_rgba(0,0,0,0.05)] sm:p-5 lg:p-8">
        <Header />
        <Breadcrumbs segments={["Admin", "Enquiries", enquiry.name]} />

        {/* Back navigation & Quick controls */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
          <Link
            href="/admin/enquiries"
            className="inline-flex items-center gap-2 text-sm font-bold text-neutral-600 transition hover:text-[#6A0FAD]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to All Enquiries
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs font-bold text-neutral-700 shadow-sm transition hover:bg-neutral-50"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-neutral-500" /> Copy Summary
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => void loadEnquiry()}
              className="rounded-xl border border-neutral-200 bg-white p-2 text-neutral-600 transition hover:bg-neutral-50"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Top Hero Banner */}
        <div className="mt-6 rounded-3xl border border-neutral-100 bg-gradient-to-br from-neutral-900 via-neutral-900 to-[#2A0E44] p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            {/* Identity */}
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#6A0FAD] to-[#F97316] text-2xl font-black text-white shadow-lg sm:h-20 sm:w-20 sm:text-3xl">
                {enquiry.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{enquiry.name}</h1>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                      statusStyles[enquiry.status].bg
                    } ${statusStyles[enquiry.status].text}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${statusStyles[enquiry.status].dot}`} />
                    {enquiry.status}
                  </span>
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-300 sm:text-sm">
                  <span className="font-semibold text-[#FFD700]">
                    {parsed.plan.name || enquiry.plan_interest || "Custom Plan Enquiry"}
                  </span>
                  <span>•</span>
                  <span>
                    Received {enquiry.created_at ? new Date(enquiry.created_at).toLocaleString() : "Date unknown"}
                  </span>
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-mono text-neutral-300">
                    ID: {enquiry.ulid}
                  </span>
                  {parsed.plan.planType && (
                    <span className="rounded-lg bg-[#F97316]/20 px-2.5 py-1 text-xs font-bold text-[#F97316]">
                      {parsed.plan.planType} PLAN
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Status Selector & Quick Communication CTA */}
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row xl:items-center">
              {/* Status Picker */}
              <div className="flex items-center gap-2 rounded-2xl bg-white/10 p-1.5 backdrop-blur-md">
                <span className="pl-3 text-xs font-bold uppercase tracking-wider text-neutral-400">Status</span>
                <select
                  value={enquiry.status}
                  disabled={updatingStatus}
                  onChange={(e) => void handleStatusChange(e.target.value as EnquiryStatus)}
                  className="rounded-xl border border-white/20 bg-neutral-900 px-3 py-2 text-xs font-bold text-white outline-none transition focus:border-[#FFD700]"
                >
                  {statuses.map((st) => (
                    <option key={st} value={st} className="bg-neutral-900 text-white">
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Direct Actions */}
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${enquiry.phone}`}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-emerald-500 active:scale-95 sm:flex-none"
                >
                  <Phone className="h-4 w-4" /> Call
                </a>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[#20ba59] active:scale-95 sm:flex-none"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
                {enquiry.email && (
                  <a
                    href={`mailto:${enquiry.email}`}
                    className="inline-flex items-center justify-center rounded-xl bg-white/10 p-2.5 text-white transition hover:bg-white/20"
                    title={`Email: ${enquiry.email}`}
                  >
                    <Mail className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid: Details & Rotation */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column (7 cols): Plan Breakdown, Scheduled Bowls, Calorie Goals */}
          <div className="space-y-6 lg:col-span-7">
            {/* 1. Plan Overview Card */}
            <div className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#6A0FAD]/10 text-[#6A0FAD]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-neutral-900">Configured Meal Plan</h3>
                    <p className="text-xs text-neutral-500">Customer&apos;s selected rotation & schedule</p>
                  </div>
                </div>
                {parsed.pricing.finalPrice && (
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Total Price</span>
                    <p className="text-2xl font-black text-[#16A34A]">₹{parsed.pricing.finalPrice}</p>
                  </div>
                )}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-2xl bg-neutral-50 p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Duration</span>
                  <p className="mt-1 font-bold text-neutral-900">{parsed.plan.duration || "Custom"}</p>
                </div>
                <div className="rounded-2xl bg-neutral-50 p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Frequency</span>
                  <p className="mt-1 font-bold text-neutral-900">{parsed.plan.frequency || "Weekly"}</p>
                </div>
                <div className="rounded-2xl bg-neutral-50 p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Daily Calories</span>
                  <p className="mt-1 font-bold text-[#F97316]">{parsed.plan.dailyCalories || "Target calibrated"}</p>
                </div>
                <div className="rounded-2xl bg-neutral-50 p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Meal Slots</span>
                  <p className="mt-1 font-bold text-neutral-900">
                    {parsed.plan.mealSlots.length > 0 ? parsed.plan.mealSlots.join(", ") : "Lunch"}
                  </p>
                </div>
              </div>

              {parsed.plan.calorieDistribution && (
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#6A0FAD]/5 px-4 py-3 text-xs font-semibold text-[#6A0FAD]">
                  <span>Slot Calorie Allocation:</span>
                  <span className="font-bold">{parsed.plan.calorieDistribution}</span>
                </div>
              )}
            </div>

            {/* 2. Scheduled Bowl Rotation */}
            <div className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F97316]/10 text-[#F97316]">
                    <Utensils className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-neutral-900">Scheduled Bowls Rotation</h3>
                    <p className="text-xs text-neutral-500">
                      {parsed.scheduledBowls.length > 0
                        ? `${parsed.scheduledBowls.length} bowls customized for this plan`
                        : "Custom rotation schedule"}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-600">
                  {parsed.scheduledBowls.length} Meals
                </span>
              </div>

              {parsed.scheduledBowls.length > 0 ? (
                <div className="mt-5 space-y-3">
                  {parsed.scheduledBowls.map((bowl, idx) => (
                    <div
                      key={idx}
                      className="group flex flex-col justify-between gap-3 rounded-2xl border border-neutral-100 bg-neutral-50/70 p-4 transition hover:border-[#6A0FAD]/30 hover:bg-white hover:shadow-md sm:flex-row sm:items-center"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#6A0FAD] to-[#8A3FD1] text-xs font-black text-white shadow-sm">
                          {bowl.day.replace("Day ", "D")}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-neutral-900 group-hover:text-[#6A0FAD] transition">
                              {bowl.name}
                            </h4>
                            <span className="rounded-md bg-[#F97316]/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[#F97316]">
                              {bowl.slot}
                            </span>
                          </div>
                          {/* Macros pills */}
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                            {bowl.calories && (
                              <span className="font-semibold text-neutral-700">{bowl.calories}</span>
                            )}
                            {bowl.protein && (
                              <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
                                P: {bowl.protein}
                              </span>
                            )}
                            {bowl.carbs && (
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                                C: {bowl.carbs}
                              </span>
                            )}
                            {bowl.fat && (
                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                F: {bowl.fat}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {bowl.price && (
                        <div className="flex shrink-0 items-center justify-end">
                          <span className="rounded-xl bg-white px-3 py-1.5 text-sm font-black text-neutral-900 shadow-sm border border-neutral-200">
                            {bowl.price}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl bg-neutral-50 p-6 text-center text-sm text-neutral-500">
                  <p>Standard bowl blueprint applies for this enquiry.</p>
                </div>
              )}
            </div>

            {/* 3. Raw Enquiry Message View */}
            <div className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm">
              <div
                className="flex cursor-pointer items-center justify-between"
                onClick={() => setShowRawMessage(!showRawMessage)}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900">Original Enquiry Message</h4>
                    <p className="text-xs text-neutral-400">View raw payload from onboarding/website submission</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"
                  aria-label="Toggle raw message"
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${showRawMessage ? "rotate-180" : ""}`}
                  />
                </button>
              </div>

              {showRawMessage && (
                <div className="mt-4 rounded-2xl bg-neutral-900 p-4 font-mono text-xs text-neutral-200 shadow-inner">
                  <pre className="whitespace-pre-wrap leading-relaxed">{enquiry.message || "No raw message text."}</pre>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (5 cols): Pricing, Customer Details, Biometrics, Health */}
          <div className="space-y-6 lg:col-span-5">
            {/* 1. Pricing Breakdown Card */}
            <div className="rounded-3xl border border-neutral-100 bg-gradient-to-b from-white to-neutral-50 p-6 shadow-sm sm:p-7">
              <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-neutral-900">Pricing Summary</h3>
                  <p className="text-xs text-neutral-500">Subscription calculation</p>
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between text-neutral-600">
                  <span>Gross Cost</span>
                  <span className="font-semibold text-neutral-900">₹{parsed.pricing.grossPrice || "—"}</span>
                </div>
                {parsed.pricing.discount && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount Applied</span>
                    <span className="font-bold">{parsed.pricing.discount}</span>
                  </div>
                )}
                <div className="border-t border-neutral-200 pt-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-base font-bold text-neutral-900">Final Price</span>
                    <span className="text-3xl font-black text-[#16A34A]">
                      ₹{parsed.pricing.finalPrice || parsed.pricing.grossPrice || "—"}
                    </span>
                  </div>
                  <p className="mt-1 text-right text-[11px] text-neutral-400">All taxes & meal preparation included</p>
                </div>
              </div>
            </div>

            {/* 2. Customer & Delivery Information */}
            <div className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-neutral-900">Customer & Contact</h3>
                  <p className="text-xs text-neutral-500">Contact details for dispatch team</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <span className="text-xs font-semibold text-neutral-400">Full Name</span>
                  <p className="font-bold text-neutral-900">{enquiry.name}</p>
                </div>

                <div>
                  <span className="text-xs font-semibold text-neutral-400">Phone Number</span>
                  <div className="mt-0.5 flex items-center justify-between">
                    <a
                      href={`tel:${enquiry.phone}`}
                      className="font-bold text-[#6A0FAD] hover:underline"
                    >
                      {enquiry.phone}
                    </a>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                    >
                      Chat
                    </a>
                  </div>
                </div>

                {enquiry.email && (
                  <div>
                    <span className="text-xs font-semibold text-neutral-400">Email Address</span>
                    <p className="font-medium text-neutral-700">{enquiry.email}</p>
                  </div>
                )}

                <div>
                  <span className="text-xs font-semibold text-neutral-400">Delivery Address</span>
                  <div className="mt-1 flex items-start gap-2 rounded-2xl bg-neutral-50 p-3.5 text-sm text-neutral-800">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#F97316]" />
                    <p className="leading-relaxed">
                      {parsed.customer.address || "No address provided in enquiry."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Physical & Biometrics Profile */}
            {(parsed.customer.sex ||
              parsed.customer.age ||
              parsed.customer.height ||
              parsed.customer.weight ||
              parsed.customer.goal) && (
              <div className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm sm:p-7">
                <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-neutral-900">Health & Biometrics</h3>
                    <p className="text-xs text-neutral-500">Calculated targets & fitness metrics</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {parsed.customer.sex && (
                    <div className="rounded-2xl bg-neutral-50 p-3">
                      <span className="text-[10px] font-bold uppercase text-neutral-400">Sex</span>
                      <p className="font-bold text-neutral-900">{parsed.customer.sex}</p>
                    </div>
                  )}
                  {parsed.customer.age && (
                    <div className="rounded-2xl bg-neutral-50 p-3">
                      <span className="text-[10px] font-bold uppercase text-neutral-400">Age</span>
                      <p className="font-bold text-neutral-900">{parsed.customer.age} yrs</p>
                    </div>
                  )}
                  {parsed.customer.height && (
                    <div className="rounded-2xl bg-neutral-50 p-3">
                      <span className="text-[10px] font-bold uppercase text-neutral-400">Height</span>
                      <p className="font-bold text-neutral-900">{parsed.customer.height}</p>
                    </div>
                  )}
                  {parsed.customer.weight && (
                    <div className="rounded-2xl bg-neutral-50 p-3">
                      <span className="text-[10px] font-bold uppercase text-neutral-400">Weight</span>
                      <p className="font-bold text-neutral-900">{parsed.customer.weight}</p>
                    </div>
                  )}
                  {parsed.customer.bmi && (
                    <div className="rounded-2xl bg-purple-50 p-3">
                      <span className="text-[10px] font-bold uppercase text-purple-600">Calculated BMI</span>
                      <p className="font-bold text-purple-900">{parsed.customer.bmi}</p>
                    </div>
                  )}
                  {parsed.customer.goal && (
                    <div className="rounded-2xl bg-orange-50 p-3">
                      <span className="text-[10px] font-bold uppercase text-orange-600">Goal</span>
                      <p className="font-bold text-orange-950">{parsed.customer.goal}</p>
                    </div>
                  )}
                </div>

                {parsed.customer.activityLevel && (
                  <div className="mt-3 rounded-2xl bg-neutral-50 p-3 text-xs text-neutral-600">
                    <span className="font-semibold text-neutral-400">Activity Level: </span>
                    <span className="font-bold text-neutral-900">{parsed.customer.activityLevel}</span>
                  </div>
                )}
              </div>
            )}

            {/* 4. Dietary Restrictions, Allergies & Chef Notes */}
            <div className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex items-center gap-2.5 border-b border-neutral-100 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <ChefHat className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-neutral-900">Dietary & Kitchen Notes</h3>
                  <p className="text-xs text-neutral-500">Preferences, allergies & special requests</p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {/* Dietary Preferences */}
                <div>
                  <span className="text-xs font-semibold text-neutral-400">Dietary Preferences</span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {parsed.customer.dietaryPreferences.length > 0 ? (
                      parsed.customer.dietaryPreferences.map((pref, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800"
                        >
                          {pref}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-neutral-500">Standard / No dietary restrictions</span>
                    )}
                  </div>
                </div>

                {/* Allergies */}
                <div>
                  <span className="text-xs font-semibold text-neutral-400">Reported Allergies</span>
                  <div className="mt-1.5">
                    {parsed.customer.allergies.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {parsed.customer.allergies.map((allergy, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 rounded-full bg-red-100 border border-red-200 px-3 py-1 text-xs font-bold text-red-800"
                          >
                            <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
                            {allergy}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-500">No allergies specified</span>
                    )}
                  </div>
                </div>

                {/* Chef Instructions */}
                {parsed.customer.chefInstructions && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                      Chef Instructions
                    </span>
                    <p className="mt-1 text-sm font-medium text-amber-950">
                      &ldquo;{parsed.customer.chefInstructions}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 5. Convert to Customer Action */}
            <div className="rounded-3xl border border-neutral-100 bg-neutral-900 p-6 text-white shadow-xl sm:p-7">
              <h4 className="text-base font-bold text-white">Convert to Customer</h4>
              <p className="mt-1 text-xs text-neutral-400">
                Ready to activate this plan? Head to Customer Creation to set up delivery coordinates and billing.
              </p>
              <div className="mt-4 flex gap-3">
                <Link
                  href="/admin/customers/new"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#F97316] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#ea580c]"
                >
                  Create Customer <ExternalLink className="h-3.5 w-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => void handleStatusChange("CONVERTED")}
                  disabled={enquiry.status === "CONVERTED" || updatingStatus}
                  className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-xs font-bold text-white transition hover:bg-white/20 disabled:opacity-50"
                >
                  Mark Converted
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
