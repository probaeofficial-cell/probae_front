"use client";

import { BowlLoader } from "@/components/admin/BowlLoader";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/admin/Sidebar";
import React, { useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const isLoginPage = pathname === "/admin/login";

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
    } else if (!user) {
      router.push("/admin/login");
    }
  }, [isLoginPage, isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#141414] text-white">
        <BowlLoader className="h-8 w-8 text-[#6A0FAD]" />
      </div>
    );
  }

  if (isLoginPage && user) return null;
  if (!isLoginPage && !user) return null;

  if (isLoginPage) return <>{children}</>;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#141414] text-white">
      <Sidebar />
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>
      
      {/* Liquid Glass Version Bubble */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] pointer-events-none">
        <div className="pointer-events-auto backdrop-blur-xl bg-white/30 border border-white/50 shadow-[0_8px_32px_rgba(31,38,135,0.15)] rounded-full px-3 py-1.5 flex items-center justify-center hover:bg-white/40 transition-all duration-300 cursor-default">
          <span className="text-[10px] sm:text-xs font-black text-neutral-800/70 tracking-widest uppercase">
            v3.261009
          </span>
        </div>
      </div>
    </div>
  );
}
