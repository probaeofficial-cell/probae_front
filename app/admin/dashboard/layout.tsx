import { Sidebar } from "@/components/admin/Sidebar";
import React from "react";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full bg-[#141414] text-white overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Top Navbar could go here if needed, but keeping it simple for now */}
        {children}
      </main>
    </div>
  );
}
