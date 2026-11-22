"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, Save } from "lucide-react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { endpoints } from "@/lib/apiService";
import type { Badge } from "@/lib/api/sections/badges";
import { getMediaUrl } from "@/lib/utils";

const fieldClass = "mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

export function BadgeForm({ badge }: { badge?: Badge }) {
  const router = useRouter();
  const editing = Boolean(badge);
  const [name, setName] = useState(badge?.name || "");
  const [description, setDescription] = useState(badge?.description || "");
  const [assignmentMode, setAssignmentMode] = useState<"MANUAL" | "AUTO">(badge?.assignment_mode || "MANUAL");
  const [minimumDeliveredOrders, setMinimumDeliveredOrders] = useState(badge?.minimum_delivered_orders?.toString() || "");
  const [minimumSubscriptions, setMinimumSubscriptions] = useState(badge?.minimum_subscriptions?.toString() || "");
  const [points, setPoints] = useState(badge?.points?.toString() || "0");
  const [imageFilename, setImageFilename] = useState(badge?.image_filename || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Choose an image file."); return; }
    setUploading(true); setError("");
    try { const result = await endpoints.documents.upload(file); setImageFilename(result.filename); }
    catch (e: any) { setError(e?.message || "Image upload failed."); }
    finally { setUploading(false); }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError("");
    if (!imageFilename) { setError("Upload a badge image before saving."); return; }
    if (assignmentMode === "AUTO" && !minimumDeliveredOrders && !minimumSubscriptions) { setError("Choose at least one automatic eligibility condition."); return; }
    setSaving(true);
    const data = {
      name: name.trim(), description: description.trim() || null, image_filename: imageFilename,
      assignment_mode: assignmentMode,
      minimum_delivered_orders: assignmentMode === "AUTO" && minimumDeliveredOrders ? Number(minimumDeliveredOrders) : null,
      minimum_subscriptions: assignmentMode === "AUTO" && minimumSubscriptions ? Number(minimumSubscriptions) : null,
      points: Number(points || 0),
    };
    try {
      if (badge) await endpoints.badges.update(badge.ulid, data);
      else await endpoints.badges.create(data);
      router.push("/admin/badges");
    } catch (e: any) { setError(e?.message || `Could not ${editing ? "update" : "create"} badge.`); }
    finally { setSaving(false); }
  };

  const assignmentLocked = Boolean(badge && badge.assigned_count > 0);
  const title = editing ? "Edit customer badge" : "Create a customer badge";

  return <div className="flex h-full flex-col bg-[#E6E6E6]"><div className="m-4 flex min-h-0 flex-1 flex-col overflow-auto rounded-3xl bg-white p-5 shadow-sm sm:m-8 sm:p-8">
    <Header/><Breadcrumbs segments={["Admin", "Badges", editing ? "Edit Badge" : "Create Badge"]}/>
    <button type="button" onClick={() => router.push("/admin/badges")} className="mt-2 inline-flex w-fit items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-100"><ArrowLeft className="h-4 w-4"/>Back to badges</button>
    <div className="mx-auto mt-5 w-full max-w-3xl"><h1 className="text-2xl font-black text-neutral-900">{title}</h1><p className="mt-1 text-sm text-neutral-500">Update badge details, eligibility, and image. Manual badges can be assigned from the Assign Badge page.</p>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <form onSubmit={submit} className="mt-5 space-y-5 text-neutral-900">
        <section className="rounded-2xl border border-neutral-200 p-4 sm:p-5"><h2 className="font-bold text-neutral-900">1. Badge details</h2><p className="mt-1 text-xs text-neutral-500">These details are shown with the badge on the customer record.</p><label className="mt-4 block text-sm font-semibold">Badge name<input required maxLength={100} value={name} onChange={e=>setName(e.target.value)} className={fieldClass} placeholder="For example: 10 Meals Delivered"/></label><label className="mt-4 block text-sm font-semibold">Description<textarea value={description} onChange={e=>setDescription(e.target.value)} className={fieldClass} rows={3} maxLength={2000} placeholder="Explain what the customer did to earn or receive this badge."/></label><label className="mt-4 block text-sm font-semibold">Points awarded<input required type="number" min={0} step={1} value={points} onChange={e=>setPoints(e.target.value)} className={fieldClass} placeholder="0"/><span className="mt-1 block text-xs font-normal text-neutral-500">These points are credited once when the badge is assigned. Editing this value won’t change points already awarded.</span></label></section>
        <section className="rounded-2xl border border-neutral-200 p-4 sm:p-5"><h2 className="font-bold text-neutral-900">2. How should customers receive it?</h2><p className="mt-1 text-xs text-neutral-500">Choose automatic awards for activity milestones, or manual assignment when an admin decides.</p>{assignmentLocked && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Assignment type is locked because this badge has already been assigned.</p>}<div className="mt-4 grid gap-3 sm:grid-cols-2"><label className={`cursor-pointer rounded-2xl border p-4 text-neutral-900 ${assignmentMode === "MANUAL" ? "border-violet-500 bg-violet-50" : "border-neutral-200"}`}><input type="radio" name="assignmentMode" className="mr-2" checked={assignmentMode === "MANUAL"} disabled={assignmentLocked} onChange={()=>setAssignmentMode("MANUAL")}/><b className="text-neutral-900">Assign manually</b><p className="mt-1 text-xs text-neutral-600">Admins choose the customer when assigning the badge.</p></label><label className={`cursor-pointer rounded-2xl border p-4 text-neutral-900 ${assignmentMode === "AUTO" ? "border-violet-500 bg-violet-50" : "border-neutral-200"}`}><input type="radio" name="assignmentMode" className="mr-2" checked={assignmentMode === "AUTO"} disabled={assignmentLocked} onChange={()=>setAssignmentMode("AUTO")}/><b className="text-neutral-900">Award automatically</b><p className="mt-1 text-xs text-neutral-600">ProBae awards it when the customer reaches your milestone.</p></label></div>
          {assignmentMode === "AUTO" && <div className="mt-4 rounded-2xl bg-neutral-50 p-4"><h3 className="text-sm font-bold text-neutral-900">Eligibility milestones</h3><p className="mt-1 text-xs text-neutral-500">Set one or both. If you set both, the customer must meet both.</p><div className="mt-3 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">At least this many delivered orders<input type="number" min={1} step={1} value={minimumDeliveredOrders} onChange={e=>setMinimumDeliveredOrders(e.target.value)} className={fieldClass} placeholder="e.g. 10"/></label><label className="text-sm font-semibold">At least this many subscriptions taken<input type="number" min={1} step={1} value={minimumSubscriptions} onChange={e=>setMinimumSubscriptions(e.target.value)} className={fieldClass} placeholder="e.g. 2"/></label></div><p className="mt-3 text-xs text-neutral-500">Previously earned badges remain on the customer after criteria changes.</p></div>}
        </section>
        <section className="rounded-2xl border border-neutral-200 p-4 sm:p-5"><h2 className="font-bold text-neutral-900">3. Badge image</h2><p className="mt-1 text-xs text-neutral-500">Choose an image that clearly identifies the badge.</p><div className="mt-3 flex flex-wrap items-center gap-4"><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-bold text-neutral-800 hover:bg-neutral-50"><ImagePlus className="h-4 w-4 text-violet-700"/>{uploading ? "Uploading…" : imageFilename ? "Replace image" : "Upload image"}<input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={e=>void upload(e.target.files?.[0])}/></label>{imageFilename ? <div className="flex items-center gap-3"><img src={getMediaUrl(imageFilename) || ""} alt="Badge preview" className="h-16 w-16 rounded-xl border object-cover"/><span className="text-sm font-medium text-green-700">Image ready</span></div> : <span className="text-sm text-amber-700">An image is required to save the badge.</span>}</div></section>
        <div className="flex justify-end"><ProbaeButton disabled={saving || uploading} className="!w-auto"><Save className="mr-2 h-4 w-4"/>{saving ? "Saving…" : editing ? "Save changes" : "Save badge"}</ProbaeButton></div>
      </form>
    </div>
  </div></div>;
}
