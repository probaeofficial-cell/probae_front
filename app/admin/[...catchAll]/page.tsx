"use client";

import React from "react";
import { Header } from "@/components/admin/Header";
import { AlertOctagon, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminNotFound() {
  const router = useRouter();

  return (
    <div className="flex flex-col flex-1 h-full bg-[#fafafa]">
      <div className="p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.1)] flex flex-col bg-white overflow-y-auto">
        <Header />

        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto text-center py-12">
          <div className="w-20 h-20 rounded-3xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 mb-6 shadow-sm">
            <AlertOctagon className="w-10 h-10 animate-pulse" />
          </div>

          <h1 className="text-3xl font-extrabold text-neutral-800 tracking-tight">404 - Page Not Found</h1>
          <p className="text-neutral-500 text-sm mt-3 leading-relaxed">
            The page you are looking for does not exist or is currently under development. Please check the URL or navigate back.
          </p>

          <button
            type="button"
            onClick={() => router.push("/admin/dashboard")}
            className="mt-8 flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-all shadow-sm shadow-violet-100 hover:shadow-md hover:scale-[1.01]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
