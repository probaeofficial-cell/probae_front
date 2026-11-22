"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Award, Pencil, Plus, Trash2 } from "lucide-react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { endpoints } from "@/lib/apiService";
import type { Badge } from "@/lib/api/sections/badges";
import { getMediaUrl } from "@/lib/utils";

export default function BadgesPage() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try { setBadges(await endpoints.badges.list()); setError(""); }
    catch (e: any) { setError(e?.message || "Could not load badges."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const remove = async (badge: Badge) => {
    if (badge.assigned_count > 0 || !window.confirm(`Delete “${badge.name}”?`)) return;
    try { await endpoints.badges.delete(badge.ulid); await load(); }
    catch (e: any) { setError(e?.message || "Could not delete badge."); }
  };

  return <div className="flex h-full min-h-0 flex-col bg-[#E6E6E6]"><div className="m-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-sm sm:m-4 sm:rounded-3xl sm:p-6 lg:m-8 lg:p-8">
    <Header /><Breadcrumbs segments={["Admin", "Badges", "Badge List"]} />
    <div className="mt-4 flex flex-col items-start justify-between gap-3 sm:mt-5 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-black text-neutral-900">Badges</h1><p className="mt-1 text-sm text-neutral-500">Create and manage customer achievement badges.</p></div><Link href="/admin/badges/new" className="w-full sm:w-auto"><ProbaeButton className="!w-full sm:!w-auto"><Plus className="mr-2 h-4 w-4"/>Create Badge</ProbaeButton></Link></div>
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="mt-4 min-h-0 flex-1 overflow-auto sm:mt-5">
      <div className="grid gap-3 lg:hidden">
        {loading ? <div className="rounded-2xl border border-neutral-200 p-8 text-center text-sm text-neutral-500">Loading badges…</div> : badges.length === 0 ? <div className="rounded-2xl border border-neutral-200 p-8 text-center text-sm text-neutral-500"><Award className="mx-auto mb-2 h-7 w-7"/>No badges yet. Create the first badge.</div> : badges.map(badge => <article key={badge.ulid} className="rounded-2xl border border-neutral-200 p-4">
          <div className="flex min-w-0 items-start gap-3"><img src={getMediaUrl(badge.image_filename) || ""} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-neutral-200 object-cover"/><div className="min-w-0 flex-1"><h2 className="break-words font-bold text-neutral-900">{badge.name}</h2><p className="mt-1 break-words text-xs text-neutral-500">{badge.description || "No description"}</p></div><div className="flex shrink-0 gap-1"><Link href={`/admin/badges/${badge.ulid}/edit`} aria-label={`Edit ${badge.name}`} title="Edit badge" className="rounded-lg p-2 text-violet-700 hover:bg-violet-50"><Pencil className="h-4 w-4"/></Link><button disabled={badge.assigned_count > 0} onClick={() => void remove(badge)} aria-label={`Delete ${badge.name}`} title={badge.assigned_count ? "Remove assignments before deleting" : "Delete badge"} className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"><Trash2 className="h-4 w-4"/></button></div></div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-neutral-100 pt-3 text-sm"><div><span className="block text-xs font-medium text-neutral-500">Points</span><span className="font-semibold text-neutral-900">{badge.points}</span></div><div><span className="block text-xs font-medium text-neutral-500">Assignment</span><span className="mt-1 inline-block rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">{badge.assignment_mode}</span></div><div><span className="block text-xs font-medium text-neutral-500">Assigned</span><span className="font-semibold text-neutral-900">{badge.assigned_count}</span></div><div className="col-span-2"><span className="block text-xs font-medium text-neutral-500">Eligibility</span><span className="break-words text-neutral-700">{badge.assignment_mode === "MANUAL" ? "Admin assigns" : [badge.minimum_delivered_orders && `${badge.minimum_delivered_orders}+ delivered orders`, badge.minimum_subscriptions && `${badge.minimum_subscriptions}+ subscriptions`].filter(Boolean).join(" and ")}</span></div></div>
        </article>)}
      </div>
      <div className="hidden h-full overflow-x-auto rounded-2xl border border-neutral-200 lg:block"><table className="w-full min-w-[1040px] table-fixed text-left text-sm"><colgroup><col className="w-[34%]"/><col className="w-[9%]"/><col className="w-[14%]"/><col className="w-[25%]"/><col className="w-[9%]"/><col className="w-[9%]"/></colgroup><thead className="sticky top-0 bg-neutral-50 text-xs uppercase text-neutral-500"><tr><th className="p-4">Badge</th><th className="p-4">Points</th><th className="p-4">Assignment</th><th className="p-4">Eligibility</th><th className="p-4">Assigned</th><th className="p-4 text-right">Action</th></tr></thead><tbody className="divide-y divide-neutral-100">
        {loading ? <tr><td colSpan={6} className="p-8 text-center text-neutral-500">Loading badges…</td></tr> : badges.length === 0 ? <tr><td colSpan={6} className="p-10 text-center text-neutral-500"><Award className="mx-auto mb-2 h-7 w-7"/>No badges yet. Create the first badge.</td></tr> : badges.map(badge => <tr key={badge.ulid}>
          <td className="p-4"><div className="flex min-w-0 items-center gap-3"><img src={getMediaUrl(badge.image_filename) || ""} alt="" className="h-12 w-12 shrink-0 rounded-xl border border-neutral-200 object-cover"/><div className="min-w-0"><div className="break-words font-bold text-neutral-900">{badge.name}</div><div className="break-words text-xs text-neutral-500">{badge.description || "No description"}</div></div></div></td>
          <td className="whitespace-nowrap p-4 font-semibold text-neutral-700">{badge.points}</td><td className="p-4"><span className="whitespace-nowrap rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">{badge.assignment_mode}</span></td>
          <td className="break-words p-4 text-neutral-600">{badge.assignment_mode === "MANUAL" ? "Admin assigns" : [badge.minimum_delivered_orders && `${badge.minimum_delivered_orders}+ delivered orders`, badge.minimum_subscriptions && `${badge.minimum_subscriptions}+ subscriptions`].filter(Boolean).join(" and ")}</td>
          <td className="whitespace-nowrap p-4 font-semibold">{badge.assigned_count}</td><td className="p-4 text-right"><div className="flex justify-end gap-1"><Link href={`/admin/badges/${badge.ulid}/edit`} aria-label={`Edit ${badge.name}`} title="Edit badge" className="rounded-lg p-2 text-violet-700 hover:bg-violet-50"><Pencil className="h-4 w-4"/></Link><button disabled={badge.assigned_count > 0} onClick={() => void remove(badge)} title={badge.assigned_count ? "Remove assignments before deleting" : "Delete badge"} className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"><Trash2 className="h-4 w-4"/></button></div></td>
        </tr>)}
      </tbody></table></div>
    </div>
  </div></div>;
}
