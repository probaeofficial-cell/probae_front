"use client";

import { BowlLoader } from "@/components/admin/BowlLoader";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/admin/Sidebar";
import React, { useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";

export default function DeliveryLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  
  const isLoginPage = pathname === "/delivery/login";

  useEffect(() => {
    if (isLoading) return;

    if (isLoginPage) {
      if (user) {
        if (user.role === "delivery") {
          router.push("/delivery");
        } else {
          router.push("/admin/dashboard");
        }
      }
    } else {
      if (!user) {
        router.push("/delivery/login");
      }
    }
  }, [isLoginPage, isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full bg-[#141414] text-white items-center justify-center">
        <BowlLoader className="h-8 w-8 text-[#6A0FAD]" />
      </div>
    );
  }

  // Prevent UI flashing before redirect occurs, and avoid returning null which hangs Next.js App Router
  if ((isLoginPage && user) || (!isLoginPage && !user)) {
    return (
      <div className="flex h-screen w-full bg-[#141414] text-white items-center justify-center">
        <BowlLoader className="h-8 w-8 text-[#6A0FAD]" />
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-full bg-[#141414] text-white overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
