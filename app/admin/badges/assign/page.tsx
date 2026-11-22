"use client";

import { FormEvent, useEffect, useState } from "react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import BadgeSelect from "@/components/admin/BadgeSelect";
import AsyncCustomerSelect from "@/components/admin/AsyncCustomerSelect";
import { endpoints } from "@/lib/apiService";
import type { Badge } from "@/lib/api/sections/badges";
import { getMediaUrl } from "@/lib/utils";

export default function AssignBadgePage() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [badgeUlid, setBadgeUlid] = useState("");
  const [customerUlid, setCustomerUlid] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    endpoints.badges.list()
      .then((badgeList: Badge[]) => setBadges(badgeList.filter(b => b.is_active && b.assignment_mode === "MANUAL")))
      .catch((e: any) => setError(e?.message || "Could not load badges."))
      .finally(() => setLoading(false));
  }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!badgeUlid || !customerUlid) return;
    setError(""); setNotice(""); setSaving(true);
    try { await endpoints.badges.assign(badgeUlid, customerUlid); setNotice("Badge assigned successfully."); setCustomerUlid(""); }
    catch (e: any) { setError(e?.message || "Could not assign badge."); }
    finally { setSaving(false); }
  };
  return <div className="flex h-full flex-col bg-[#E6E6E6]"><div className="m-4 flex min-h-0 flex-1 flex-col overflow-auto rounded-3xl bg-white p-5 shadow-sm sm:m-8 sm:p-8"><Header/><Breadcrumbs segments={["Admin", "Badges", "Assign Badge"]}/><div className="mx-auto mt-5 w-full max-w-2xl"><h1 className="text-2xl font-black text-neutral-900">Assign a badge</h1><p className="mt-1 text-sm text-neutral-500">Choose a manual badge and a customer.</p>
    {loading ? <p className="py-8 text-center text-neutral-500">Loading…</p> : <form onSubmit={submit} className="mt-5 space-y-5">{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{notice && <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
      <div><label className="block text-sm font-semibold text-neutral-900">Badge</label><BadgeSelect badges={badges} value={badgeUlid} onChange={setBadgeUlid} placeholder="Select a manual badge"/></div>
      {badgeUlid && badges.find(b=>b.ulid===badgeUlid) && <div className="flex items-center gap-3 rounded-xl bg-neutral-50 p-3"><img src={getMediaUrl(badges.find(b=>b.ulid===badgeUlid)!.image_filename)||""} alt="" className="h-12 w-12 rounded-lg object-cover"/><span className="text-sm text-neutral-600">{badges.find(b=>b.ulid===badgeUlid)?.description}</span></div>}
      <div><label className="mb-1 block text-sm font-semibold text-neutral-900">Customer</label><AsyncCustomerSelect value={customerUlid} onChange={(id: string | number) => setCustomerUlid(id === 0 ? "" : String(id))} placeholder="Select a customer" allowAny={false} valueKey="ulid"/></div>
      <div className="flex justify-end"><ProbaeButton disabled={saving || !badges.length || !badgeUlid || !customerUlid} className="!w-auto">{saving ? "Assigning…" : "Assign badge"}</ProbaeButton></div>
      {!badges.length && <p className="text-sm text-amber-700">No manual badges are available. Create a badge with Manual assignment first.</p>}
    </form>}</div></div></div>;
}
