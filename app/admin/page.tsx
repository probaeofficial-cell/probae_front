"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BowlLoader } from "@/components/admin/BowlLoader";
import { useAuth } from "@/lib/AuthContext";
import { getAdminLandingPath } from "@/lib/sidebarConfig";

export default function AdminPage() {
  const router = useRouter();
  const { user, isLoading, permissionsLoaded, hasPermission } = useAuth();

  useEffect(() => {
    if (!user || isLoading) return;
    if (user.role?.toUpperCase() === "ADMIN" || permissionsLoaded) {
      router.replace(getAdminLandingPath(user.role?.toUpperCase() ?? null, hasPermission));
    }
  }, [hasPermission, isLoading, permissionsLoaded, router, user]);

  return (
    <div className="flex h-full items-center justify-center">
      <BowlLoader className="h-8 w-8 text-[#6A0FAD]" />
    </div>
  );
}
