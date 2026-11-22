"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { endpoints } from "@/lib/apiService";
import type { BadgeAssignment } from "@/lib/api/sections/badges";
import { getMediaUrl } from "@/lib/utils";

export default function AssignedBadgesPage() {
  const [rows, setRows] = useState<BadgeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await endpoints.badges.assignments()); setError(""); }
    catch (e: any) { setError(e?.message || "Could not load assignments."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const remove = async (row: BadgeAssignment) => {
    if (row.badge.assignment_source !== "MANUAL" || !window.confirm(`Remove ${row.badge.name} from ${row.customer_name}?`)) return;
    try { await endpoints.badges.removeAssignment(row.badge.ulid, row.customer_ulid); setNotice("Badge assignment removed."); await load(); }
    catch (e: any) { setError(e?.message || "Could not remove assignment."); }
  };
  return <div className="flex h-full flex-col bg-[#E6E6E6]"><div className="m-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl bg-white p-5 shadow-sm sm:m-8 sm:p-8"><Header/><Breadcrumbs segments={["Admin", "Badges", "Assigned Badges"]}/><h1 className="mt-5 text-2xl font-black text-neutral-900">Assigned badges</h1><p className="mt-1 text-sm text-neutral-500">See which customers have earned or received each badge.</p>
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{notice && <p role="status" className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
    <div className="mt-5 flex-1 overflow-auto rounded-2xl border border-neutral-200"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-neutral-50 text-xs uppercase text-neutral-500"><tr><th className="p-4">Badge</th><th className="p-4">Customer</th><th className="p-4">Points</th><th className="p-4">Assigned by</th><th className="p-4">Date</th><th className="p-4 text-right">Action</th></tr></thead><tbody className="divide-y divide-neutral-100">{loading ? <tr><td colSpan={6} className="p-8 text-center text-neutral-600">Loading assignments…</td></tr> : rows.length === 0 ? <tr><td colSpan={6} className="p-10 text-center text-neutral-500">No badges have been assigned yet.</td></tr> : rows.map(row => <tr key={`${row.badge.ulid}-${row.customer_ulid}`} className="text-neutral-700"><td className="p-4"><div className="flex items-center gap-3"><img src={getMediaUrl(row.badge.image_filename) || ""} alt="" className="h-10 w-10 rounded-lg object-cover"/><span className="font-bold text-neutral-900">{row.badge.name}</span></div></td><td className="p-4"><div className="font-semibold text-neutral-900">{row.customer_name}</div><div className="text-xs text-neutral-500">{row.customer_phone}</div></td><td className="p-4 font-semibold text-violet-800">+{row.badge.points_awarded}</td><td className="p-4"><span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-700">{row.badge.assignment_source}</span></td><td className="p-4 text-neutral-600">{new Date(row.badge.assigned_at).toLocaleDateString()}</td><td className="p-4 text-right">{row.badge.assignment_source === "MANUAL" && <button onClick={() => void remove(row)} className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50">Remove</button>}</td></tr>)}</tbody></table></div>
  </div></div>;
}
