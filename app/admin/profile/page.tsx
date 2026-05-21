"use client";

import React, { useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Header } from "@/components/admin/Header";
import { Camera, Mail, User, Shield, Save, Check, AlertCircle } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();

  const [displayName, setDisplayName] = useState(
    user?.email?.split("@")[0] ?? "Admin"
  );
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle avatar file selection
  const handleFileChange = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setAvatarSrc(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    handleFileChange(file);
  }, []);

  const avatarLetter = (displayName || user?.email || "A").charAt(0).toUpperCase();

  const handleSave = async () => {
    setSaveStatus("saving");
    // Simulate API call – replace with real endpoint later
    await new Promise((r) => setTimeout(r, 900));
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2500);
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-[#fafafa]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.1)] flex flex-col bg-white overflow-hidden">
        <Header />

        <div className="flex-1 overflow-y-auto pr-4 scrollbar-thin">
          <div className="max-w-3xl mx-auto w-full">
          {/* Page title */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-neutral-800">My Profile</h1>
            <p className="text-neutral-500 text-sm mt-1">
              Manage your account information and preferences.
            </p>
          </div>

          <div className="space-y-6">
            {/* ── Avatar Card ───────────────────────────────────────── */}
            <div className="bg-white border border-neutral-100 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
              {/* Avatar preview */}
              <div className="relative flex-shrink-0">
                <div
                  className={`w-24 h-24 rounded-full overflow-hidden border-4 ${
                    isDragging ? "border-violet-400 scale-105" : "border-white"
                  } shadow-lg transition-all`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                >
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white text-3xl font-bold">
                      {avatarLetter}
                    </div>
                  )}
                </div>

                {/* Camera button overlay */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-violet-600 hover:bg-violet-700 rounded-full flex items-center justify-center shadow-md transition-colors"
                >
                  <Camera className="w-4 h-4 text-white" />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                />
              </div>

              {/* Info + upload hint */}
              <div className="flex-1 text-center sm:text-left">
                <p className="text-lg font-semibold text-neutral-800">{displayName}</p>
                <p className="text-sm text-neutral-500">{user?.email}</p>
                <p className="text-xs text-neutral-400 mt-2">
                  Click the camera icon or drag & drop an image to update your avatar.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 text-sm text-violet-600 hover:text-violet-700 font-medium transition-colors"
                >
                  Upload new photo
                </button>
              </div>
            </div>

            {/* ── Personal Information Card ──────────────────────────── */}
            <div className="bg-white border border-neutral-100 rounded-2xl p-6 shadow-sm">
              <h2 className="text-base font-semibold text-neutral-800 mb-4">Personal Information</h2>

              <div className="space-y-4">
                {/* Display name */}
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1.5 uppercase tracking-wide">
                    Display Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 text-sm text-neutral-800 transition-all"
                      placeholder="Your name"
                    />
                  </div>
                </div>

                {/* Email (read-only) */}
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1.5 uppercase tracking-wide">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="email"
                      value={user?.email ?? ""}
                      readOnly
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-500 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1">Email cannot be changed.</p>
                </div>

                {/* Role (read-only) */}
                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1.5 uppercase tracking-wide">
                    Role
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      value={user?.role ?? "—"}
                      readOnly
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-sm text-neutral-500 cursor-not-allowed capitalize"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Security Card ──────────────────────────────────────── */}
            <div className="bg-white border border-neutral-100 rounded-2xl p-6 shadow-sm">
              <h2 className="text-base font-semibold text-neutral-800 mb-1">Security</h2>
              <p className="text-sm text-neutral-400 mb-4">
                Two-factor authentication is currently{" "}
                <span
                  className={`font-semibold ${
                    user?.two_factor_enabled ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {user?.two_factor_enabled ? "enabled" : "disabled"}
                </span>.
              </p>

              <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 border border-neutral-100">
                {user?.two_factor_enabled ? (
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-neutral-800">
                    {user?.two_factor_enabled
                      ? "Your account is protected with 2FA"
                      : "Enable 2FA for stronger security"}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {user?.two_factor_enabled
                      ? "Google Authenticator is active on this account."
                      : "Protect your account with a time-based one-time password."}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Save Button ───────────────────────────────────────── */}
            <div className="flex justify-end pb-8">
              <button
                type="button"
                onClick={handleSave}
                disabled={saveStatus === "saving"}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  saveStatus === "saved"
                    ? "bg-green-500 text-white"
                    : saveStatus === "error"
                    ? "bg-red-500 text-white"
                    : "bg-violet-600 hover:bg-violet-700 text-white"
                } disabled:opacity-60`}
              >
                {saveStatus === "saving" && (
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                )}
                {saveStatus === "saved" && <Check className="w-4 h-4" />}
                {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved!" : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
