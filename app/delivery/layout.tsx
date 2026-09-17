"use client";

import { usePathname } from "next/navigation";
import { DeliverySidebar } from "@/components/delivery/DeliverySidebar";
import React from "react";

export default function DeliveryLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/delivery/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-full bg-[#141414] text-white overflow-hidden">
      <DeliverySidebar />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
