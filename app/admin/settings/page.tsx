"use client";
import React from "react";
import { TwoFactorSetup } from "@/components/admin/TwoFactorSetup";
import { Sidebar } from "@/components/admin/Sidebar";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SettingsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/admin/login");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fafafa]">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full bg-[#fafafa]">
      <div className="p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.1)] flex flex-col bg-white">
        {/* Header Area */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Settings</h1>
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 max-w-3xl gap-6">
          <div className="p-6 bg-white rounded-xl shadow-sm border border-neutral-200">
            <h2 className="text-xl font-bold mb-2">Profile Information</h2>
            <p className="text-sm text-neutral-500 mb-4">View your profile details.</p>
            <div className="space-y-3">
              <div>
                <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Email</span>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Role</span>
                <p className="font-medium capitalize">{user.role}</p>
              </div>
            </div>
          </div>
          
          <TwoFactorSetup />
        </div>
      </div>
    </div>
  );
}
