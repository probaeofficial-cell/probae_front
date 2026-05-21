"use client";
import React, { useState, useEffect } from "react";
import { TwoFactorSetup } from "@/components/admin/TwoFactorSetup";
import { Header } from "@/components/admin/Header";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { Bell, User, Mail, Shield, ToggleLeft, ToggleRight, Check } from "lucide-react";

export default function SettingsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Notification preferences state (simulated)
  const [emailNotif, setEmailNotif] = useState(true);
  const [stockAlert, setStockAlert] = useState(true);
  const [orderUpdate, setOrderUpdate] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/admin/login");
    }
  }, [user, isLoading, router]);

  const handleSaveSettings = async () => {
    setSaveStatus("saving");
    // Simulate api request
    await new Promise((r) => setTimeout(r, 650));
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2500);
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
      <div className="p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.1)] flex flex-col bg-white overflow-y-auto">
        {/* Header Area */}
        <Header />

        {/* Content Area */}
        <div className="flex-1 max-w-3xl mx-auto w-full">
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
                <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shrink-0">
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

            {/* ── Notification Preferences Card ──────────────────── */}
            <div className="bg-white border border-neutral-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shrink-0">
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
                      <ToggleRight className="w-12 h-8 text-violet-600 cursor-pointer" />
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
                      <ToggleRight className="w-12 h-8 text-violet-600 cursor-pointer" />
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
                      <ToggleRight className="w-12 h-8 text-violet-600 cursor-pointer" />
                    ) : (
                      <ToggleLeft className="w-12 h-8 text-neutral-300 cursor-pointer" />
                    )}
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-end mt-6 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={saveStatus === "saving"}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    saveStatus === "saved"
                      ? "bg-emerald-500 text-white"
                      : "bg-violet-600 hover:bg-violet-700 text-white shadow-sm shadow-violet-100"
                  } disabled:opacity-60`}
                >
                  {saveStatus === "saving" && (
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  )}
                  {saveStatus === "saved" && <Check className="w-4 h-4" />}
                  {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Preferences Saved!" : "Save Preferences"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
