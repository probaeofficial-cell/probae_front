import React from "react";
import { Header } from "@/components/admin/Header";

export default function DashboardPage() {
  return (
    <div className="flex flex-col flex-1 h-full bg-[#fafafa]">
      <div className="p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.1)] flex flex-col bg-white overflow-hidden">
        <Header />

        <div className="flex-1 bg-white overflow-y-auto">
          {/* Dashboard Content */}
          <h1 className="text-3xl font-bold text-neutral-800 mb-2">Welcome to Probae Admin</h1>
          <p className="text-neutral-500">Select an item from the sidebar to view data.</p>
        </div>
      </div>
    </div>
  );
}
