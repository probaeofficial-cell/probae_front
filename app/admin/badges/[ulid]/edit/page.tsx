"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { BadgeForm } from "@/components/admin/BadgeForm";
import { endpoints } from "@/lib/apiService";
import type { Badge } from "@/lib/api/sections/badges";

export default function EditBadgePage() {
  const { ulid } = useParams<{ ulid: string }>();
  const [badge, setBadge] = useState<Badge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    endpoints.badges.list()
      .then(items => {
        if (cancelled) return;
        const match = items.find(item => item.ulid === ulid);
        if (match) setBadge(match);
        else setError("Badge not found.");
      })
      .catch((e: any) => { if (!cancelled) setError(e?.message || "Could not load badge."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ulid]);

  if (badge) return <BadgeForm badge={badge} />;
  return <div className="flex h-full flex-col bg-[#E6E6E6]"><div className="m-4 flex min-h-0 flex-1 flex-col rounded-3xl bg-white p-5 shadow-sm sm:m-8 sm:p-8"><Header/><Breadcrumbs segments={["Admin", "Badges", "Edit Badge"]}/><h1 className="mt-5 text-2xl font-black text-neutral-900">Edit badge</h1><p className="mt-4 text-sm text-neutral-600">{loading ? "Loading badge…" : error}</p></div></div>;
}
