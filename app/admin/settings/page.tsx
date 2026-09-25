"use client";
import React, { useState, useEffect } from "react";
import { TwoFactorSetup } from "@/components/admin/TwoFactorSetup";
import { Header } from "@/components/admin/Header";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { Bell, User, Mail, Shield, ToggleLeft, ToggleRight, Check, Database } from "lucide-react";
import { endpoints } from "@/lib/apiService";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { LocationPicker } from "@/components/admin/LocationPicker";

export default function SettingsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Notification preferences state (simulated)
  const [emailNotif, setEmailNotif] = useState(true);
  const [stockAlert, setStockAlert] = useState(true);
  const [orderUpdate, setOrderUpdate] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // System Configurations state
  const [systemSettings, setSystemSettings] = useState({ R2_BASE_URL: "", AUTO_ASSIGN_DRIVERS: "false" });
  const [sysSaveStatus, setSysSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Delivery pricing config state
  const [deliveryConfig, setDeliveryConfig] = useState({
    KITCHEN_LAT: "", KITCHEN_LNG: "", FREE_DELIVERY_KM: "", DELIVERY_CHARGE_PER_KM: ""
  });
  const [deliverySaveStatus, setDeliverySaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/admin/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    async function fetchSystemSettings() {
      try {
        const data = await endpoints.settings.getSystemSettings() as any;
        if (data && data.R2_BASE_URL !== undefined) {
          setSystemSettings({ R2_BASE_URL: data.R2_BASE_URL, AUTO_ASSIGN_DRIVERS: data.AUTO_ASSIGN_DRIVERS || "false" });
        }
        setDeliveryConfig({
          KITCHEN_LAT: data.KITCHEN_LAT || "",
          KITCHEN_LNG: data.KITCHEN_LNG || "",
          FREE_DELIVERY_KM: data.FREE_DELIVERY_KM || "",
          DELIVERY_CHARGE_PER_KM: data.DELIVERY_CHARGE_PER_KM || "",
        });
      } catch (error) {
        console.error("Error fetching system settings:", error);
      }
    }
    if (user) {
      fetchSystemSettings();
    }
  }, [user]);

  const handleSaveSettings = async () => {
    setSaveStatus("saving");
    // Simulate api request
    await new Promise((r) => setTimeout(r, 650));
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2500);
  };

  const handleSaveSystemSettings = async () => {
    setSysSaveStatus("saving");
    try {
      await endpoints.settings.updateSystemSettings({
        R2_BASE_URL: systemSettings.R2_BASE_URL,
        AUTO_ASSIGN_DRIVERS: systemSettings.AUTO_ASSIGN_DRIVERS,
      });
      setSysSaveStatus("saved");
    } catch (error) {
      console.error("Error saving system settings:", error);
      setSysSaveStatus("idle");
      return;
    }
    setTimeout(() => setSysSaveStatus("idle"), 2500);
  };

  const handleSaveDeliveryConfig = async () => {
    setDeliverySaveStatus("saving");
    try {
      await endpoints.settings.updateSystemSettings({
        KITCHEN_LAT: deliveryConfig.KITCHEN_LAT,
        KITCHEN_LNG: deliveryConfig.KITCHEN_LNG,
        FREE_DELIVERY_KM: deliveryConfig.FREE_DELIVERY_KM,
        DELIVERY_CHARGE_PER_KM: deliveryConfig.DELIVERY_CHARGE_PER_KM,
      });
      setDeliverySaveStatus("saved");
    } catch (error) {
      console.error("Error saving delivery config:", error);
      setDeliverySaveStatus("idle");
      return;
    }
    setTimeout(() => setDeliverySaveStatus("idle"), 2500);
  };

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fafafa]">
        <div className="animate-pulse text-neutral-500 font-medium">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full bg-[#fafafa]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.1)] flex flex-col bg-white overflow-hidden">
        {/* Header Area */}
        <Header />

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-4 scrollbar-thin">
          <div className="max-w-5xl mx-auto w-full">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-neutral-800">Settings</h1>
            <p className="text-neutral-500 text-sm mt-1">
              Manage your administrator credentials, notification configurations, and login safety preferences.
            </p>
          </div>

          <div className="space-y-6 pb-12">
            {/* ── Profile Information Card ─────────────────────────── */}
            <div className="bg-white border border-neutral-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center text-[#6A0FAD] shrink-0">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-neutral-800">Account Profile</h2>
                  <p className="text-sm text-neutral-500 mt-1">
                    Your registered account information details.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6 pt-4 border-t border-neutral-50">
                <div>
                  <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider block mb-1">Email Address</span>
                  <div className="flex items-center gap-2 text-neutral-700 font-medium">
                    <Mail className="w-4 h-4 text-neutral-400" />
                    <span>{user.email}</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider block mb-1">Access Level Role</span>
                  <div className="flex items-center gap-2 text-neutral-700 font-medium">
                    <Shield className="w-4 h-4 text-neutral-400" />
                    <span className="capitalize">{user.role}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Two-Factor Authentication Setup ────────────────── */}
            <TwoFactorSetup />

            {/* ── System Configurations Card ─────────────────────── */}
            <div className="bg-white border border-neutral-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center text-[#6A0FAD] shrink-0">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-neutral-800">System Configurations</h2>
                  <p className="text-sm text-neutral-500 mt-1">
                    Manage global environmental variables and cloud storage endpoints.
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-neutral-50">
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 mb-1.5 uppercase tracking-wide">
                    Cloudflare R2 Base URL
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={systemSettings.R2_BASE_URL}
                      onChange={(e) =>
                        setSystemSettings({ ...systemSettings, R2_BASE_URL: e.target.value })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 text-sm text-neutral-800 transition-all"
                      placeholder="e.g. https://pub-xxxxxx.r2.dev"
                    />
                  </div>
                </div>

                <div className="pt-4 mt-2 border-t border-neutral-100">
                  <label className="block text-sm font-semibold text-neutral-800 mb-1">
                    Auto-Assign Drivers on Dispatch
                  </label>
                  <p className="text-xs text-neutral-500 mb-3">
                    Automatically find and assign an available driver based on the customer's zone when an order is dispatched.
                  </p>
                  <button 
                    onClick={() => setSystemSettings({ ...systemSettings, AUTO_ASSIGN_DRIVERS: systemSettings.AUTO_ASSIGN_DRIVERS === "true" ? "false" : "true" })}
                    className="flex items-center gap-3 bg-neutral-50 px-4 py-3 rounded-xl border border-neutral-200 hover:bg-neutral-100 transition-colors w-full max-w-sm"
                  >
                    {systemSettings.AUTO_ASSIGN_DRIVERS === "true" ? <ToggleRight className="w-6 h-6 text-violet-600" /> : <ToggleLeft className="w-6 h-6 text-neutral-400" />}
                    <span className="text-sm font-bold text-neutral-700">{systemSettings.AUTO_ASSIGN_DRIVERS === "true" ? "Enabled (Auto-Assigns Driver)" : "Disabled (Manual Assignment Only)"}</span>
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-end mt-6 pt-4 border-t border-neutral-100">
                <ProbaeButton
                  type="button"
                  onClick={handleSaveSystemSettings}
                  disabled={sysSaveStatus === "saving" || sysSaveStatus === "saved"}
                  className="!w-auto px-5 py-2.5 text-sm"
                >
                  {sysSaveStatus === "saving" && (
                    <svg className="animate-spin w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  )}
                  {sysSaveStatus === "saved" && <Check className="w-4 h-4 mr-2" />}
                  {sysSaveStatus === "saving"
                    ? "Saving..."
                    : sysSaveStatus === "saved"
                    ? "Configurations Saved!"
                    : "Save Configurations"}
                </ProbaeButton>
              </div>
            </div>

            {/* ── Delivery Pricing Config Card ─────────────────────── */}
            <div className="bg-white border border-neutral-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                </div>
                <div>
                  <h2 className="font-bold text-neutral-800 text-lg">Delivery Pricing</h2>
                  <p className="text-sm text-neutral-500 mt-0.5">
                    Set the kitchen location and per-km delivery charge. Orders within the free radius are not charged.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                <div className="sm:col-span-2 mb-2">
                  <LocationPicker
                    label="Kitchen Location"
                    latitude={deliveryConfig.KITCHEN_LAT ? parseFloat(deliveryConfig.KITCHEN_LAT) : null}
                    longitude={deliveryConfig.KITCHEN_LNG ? parseFloat(deliveryConfig.KITCHEN_LNG) : null}
                    onChange={(lat, lng) => {
                      setDeliveryConfig(prev => ({
                        ...prev,
                        KITCHEN_LAT: lat ? lat.toString() : "",
                        KITCHEN_LNG: lng ? lng.toString() : ""
                      }));
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Free Delivery Radius (km)</label>
                  <input
                    type="number" step="0.1" min="0" placeholder="e.g. 5"
                    value={deliveryConfig.FREE_DELIVERY_KM}
                    onChange={e => setDeliveryConfig({ ...deliveryConfig, FREE_DELIVERY_KM: e.target.value })}
                    className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all"
                  />
                  <p className="text-[11px] text-neutral-400 mt-1">Customers within this radius get free delivery</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Charge Per km (₹)</label>
                  <input
                    type="number" step="0.5" min="0" placeholder="e.g. 10"
                    value={deliveryConfig.DELIVERY_CHARGE_PER_KM}
                    onChange={e => setDeliveryConfig({ ...deliveryConfig, DELIVERY_CHARGE_PER_KM: e.target.value })}
                    className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all"
                  />
                  <p className="text-[11px] text-neutral-400 mt-1">Charged for each km beyond the free radius</p>
                </div>
              </div>
              <div className="flex justify-end">
                <ProbaeButton
                  onClick={handleSaveDeliveryConfig}
                  disabled={deliverySaveStatus === "saving" || deliverySaveStatus === "saved"}
                  className="!w-auto px-6"
                >
                  {deliverySaveStatus === "saving" && (
                    <svg className="animate-spin w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  )}
                  {deliverySaveStatus === "saved" && <Check className="w-4 h-4 mr-2" />}
                  {deliverySaveStatus === "saving" ? "Saving..." : deliverySaveStatus === "saved" ? "Saved!" : "Save Delivery Config"}
                </ProbaeButton>
              </div>
            </div>

            {/* ── Notification Preferences Card ──────────────────── */}
            <div className="bg-white border border-neutral-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center text-[#6A0FAD] shrink-0">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-neutral-800">Notification Preferences</h2>
                  <p className="text-sm text-neutral-500 mt-1">
                    Control which real-time alerts and reports you receive as an administrator.
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-neutral-50">
                {/* Email Notifs */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-semibold text-neutral-800">Email Notifications</p>
                    <p className="text-xs text-neutral-400 mt-0.5">Receive daily activity summaries and critical alerts.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmailNotif(!emailNotif)}
                    className="transition-colors duration-200 outline-none rounded-full"
                  >
                    {emailNotif ? (
                      <ToggleRight className="w-12 h-8 text-[#6A0FAD] cursor-pointer" />
                    ) : (
                      <ToggleLeft className="w-12 h-8 text-neutral-300 cursor-pointer" />
                    )}
                  </button>
                </div>

                <div className="h-[1px] bg-neutral-50" />

                {/* Low Stock Notifs */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-semibold text-neutral-800">Low Stock Alerts</p>
                    <p className="text-xs text-neutral-400 mt-0.5">Alerts when inventory level of any item drops below threshold limit.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStockAlert(!stockAlert)}
                    className="transition-colors duration-200 outline-none rounded-full"
                  >
                    {stockAlert ? (
                      <ToggleRight className="w-12 h-8 text-[#6A0FAD] cursor-pointer" />
                    ) : (
                      <ToggleLeft className="w-12 h-8 text-neutral-300 cursor-pointer" />
                    )}
                  </button>
                </div>

                <div className="h-[1px] bg-neutral-50" />

                {/* Order Updates */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-semibold text-neutral-800">Order Updates</p>
                    <p className="text-xs text-neutral-400 mt-0.5">Alerts when a new order is received or dispatched.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOrderUpdate(!orderUpdate)}
                    className="transition-colors duration-200 outline-none rounded-full"
                  >
                    {orderUpdate ? (
                      <ToggleRight className="w-12 h-8 text-[#6A0FAD] cursor-pointer" />
                    ) : (
                      <ToggleLeft className="w-12 h-8 text-neutral-300 cursor-pointer" />
                    )}
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-end mt-6 pt-4 border-t border-neutral-100">
                <ProbaeButton
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={saveStatus === "saving" || saveStatus === "saved"}
                  className="!w-auto px-5 py-2.5 text-sm"
                >
                  {saveStatus === "saving" && (
                    <svg className="animate-spin w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  )}
                  {saveStatus === "saved" && <Check className="w-4 h-4 mr-2" />}
                  {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Preferences Saved!" : "Save Preferences"}
                </ProbaeButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
