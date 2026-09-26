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
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
