"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Header } from "@/components/admin/Header";
import { BowlLoader } from "@/components/admin/BowlLoader";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { ApiError, endpoints } from "@/lib/apiService";
import { useAuth } from "@/lib/AuthContext";
import type { RbacPermission, RbacRole, RbacRoleDetail } from "@/lib/types";

const inputClass = "w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm text-neutral-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";
const explicitPermissionDependencies: Record<string, string[]> = {
  "customers:read": ["plans:read"],
};

function getPermissionDependencies(code: string, catalog: RbacPermission[]) {
  const permission = catalog.find((entry) => entry.code === code);
  if (!permission) return explicitPermissionDependencies[code] ?? [];
  const dependencies = [...(explicitPermissionDependencies[code] ?? [])];
  const moduleRead = `${permission.module}:read`;
  if (permission.action !== "read" && catalog.some((entry) => entry.code === moduleRead)) {
    dependencies.push(moduleRead);
  }
  return dependencies;
}

function addPermissionDependencies(codes: string[], catalog: RbacPermission[]) {
  const expanded = new Set(codes);
  const pending = [...expanded];
  while (pending.length) {
    for (const dependency of getPermissionDependencies(pending.pop()!, catalog)) {
      if (!expanded.has(dependency)) {
        expanded.add(dependency);
        pending.push(dependency);
      }
    }
  }
  return [...expanded];
}

function removePermissionDependencies(codes: string[], code: string, catalog: RbacPermission[]) {
  const removed = new Set([code]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const candidate of codes) {
      if (!removed.has(candidate) && getPermissionDependencies(candidate, catalog).some((dependency) => removed.has(dependency))) {
        removed.add(candidate);
        changed = true;
      }
    }
  }
  return codes.filter((candidate) => !removed.has(candidate));
}

function messageFor(error: unknown) {
  return error instanceof ApiError ? error.message : error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export default function RolesPermissionsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [permissions, setPermissions] = useState<RbacPermission[]>([]);
  const [selected, setSelected] = useState<RbacRoleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [roleRows, permissionRows] = await Promise.all([
        endpoints.rbac.listRoles(),
        endpoints.rbac.listPermissions(),
      ]);
      setRoles(roleRows);
      setPermissions(permissionRows);
    } catch (loadError) {
      setError(messageFor(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user?.role?.toUpperCase() !== "ADMIN") router.replace("/admin");
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!authLoading && user?.role?.toUpperCase() === "ADMIN") void load();
  }, [authLoading, load, user]);

  const groupedPermissions = useMemo(() => {
    return permissions.reduce<Record<string, RbacPermission[]>>((groups, permission) => {
      (groups[permission.module] ??= []).push(permission);
      return groups;
    }, {});
  }, [permissions]);

  const resetForm = () => {
    setEditing(false);
    setName("");
    setCode("");
    setDescription("");
    setSelectedCodes([]);
  };

  const startCreate = () => {
    setSelected(null);
    setEditing(true);
    setName("");
    setCode("");
    setDescription("");
    setSelectedCodes([]);
    setError("");
  };

  const startEdit = async (role: RbacRole) => {
    setError("");
    setNotice("");
    try {
      const detail = await endpoints.rbac.getRole(role.ulid);
      setSelected(detail);
      setName(detail.name);
      setCode(detail.code);
      setDescription(detail.description ?? "");
      setSelectedCodes(addPermissionDependencies(detail.permissions.map((permission) => permission.code), permissions));
      setEditing(true);
    } catch (loadError) {
      setError(messageFor(loadError));
    }
  };

  const openRole = async (role: RbacRole) => {
    setEditing(false);
    setError("");
    try {
      const detail = await endpoints.rbac.getRole(role.ulid);
      setSelected(detail);
      setSelectedCodes(addPermissionDependencies(detail.permissions.map((permission) => permission.code), permissions));
    } catch (loadError) {
      setError(messageFor(loadError));
    }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Role name is required.");
      return;
    }
    if (!selected && !/^[A-Za-z][A-Za-z0-9_-]*$/.test(code.trim())) {
      setError("Use a role code that starts with a letter and contains only letters, numbers, hyphens, or underscores.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      let role: RbacRole;
      if (!selected) {
        role = await endpoints.rbac.createRole({ name: name.trim(), code: code.trim(), description: description.trim() || null });
      } else {
        role = await endpoints.rbac.updateRole(selected.ulid, { name: name.trim(), description: description.trim() || null });
      }

      const existingCodes = selected?.permissions.map((permission) => permission.code) ?? [];
      const toRemove = existingCodes.filter((permissionCode) => !selectedCodes.includes(permissionCode));
      const toAdd = selectedCodes.filter((permissionCode) => !existingCodes.includes(permissionCode));
      for (const permissionCode of toRemove) await endpoints.rbac.removeRolePermission(role.ulid, permissionCode);
      if (toAdd.length) await endpoints.rbac.addRolePermissions(role.ulid, toAdd);

      const detail = await endpoints.rbac.getRole(role.ulid);
      setSelected(detail);
      setSelectedCodes(addPermissionDependencies(detail.permissions.map((permission) => permission.code), permissions));
      setRoles(await endpoints.rbac.listRoles());
      setEditing(false);
      setNotice(selected ? "Role updated." : "Role created.");
    } catch (saveError) {
      setError(messageFor(saveError));
      // The role record may have saved before a permission update failed. Reload
      // to show the persisted state and let the administrator retry safely.
      await load();
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async () => {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      await endpoints.rbac.deleteRole(selected.ulid);
      setSelected(null);
      resetForm();
      setRoles(await endpoints.rbac.listRoles());
      setNotice("Role deleted.");
      setDeleteOpen(false);
    } catch (deleteError) {
      setError(messageFor(deleteError));
      setDeleteOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user || user.role?.toUpperCase() !== "ADMIN") {
    return <div className="flex h-screen items-center justify-center"><BowlLoader className="h-8 w-8 text-[#6A0FAD]" /></div>;
  }

  return (
    <div className="flex h-full flex-1 flex-col bg-[#E6E6E6]">
      <div className="flex h-full flex-col overflow-hidden bg-[#E6E6E6] p-4 sm:p-8">
        <Header />
        <main className="flex-1 space-y-6 overflow-y-auto pb-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Roles &amp; Permissions</h1>
              <p className="mt-1 text-sm text-neutral-500">Create staff roles and choose the permissions assigned to each role.</p>
            </div>
            <ProbaeButton onClick={startCreate}><Plus className="h-4 w-4" /> Create role</ProbaeButton>
          </div>

          {notice && <div role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{notice}</div>}
          {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

          {loading ? (
            <div className="rounded-2xl bg-white p-12 text-center"><BowlLoader className="mx-auto h-8 w-8 text-[#6A0FAD]" /><p className="mt-3 text-sm text-neutral-500">Loading roles and permissions…</p></div>
          ) : (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(260px,0.75fr)_minmax(0,1.5fr)]">
              <section className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-neutral-500">Roles ({roles.length})</h2>
                {roles.length === 0 ? <p className="rounded-xl bg-neutral-50 p-5 text-sm text-neutral-500">No roles yet. Create a role to get started.</p> : (
                  <ul className="space-y-2">
                    {roles.map((role) => <li key={role.ulid}>
                      <button type="button" onClick={() => void openRole(role)} className={`w-full rounded-xl border p-3 text-left transition ${selected?.ulid === role.ulid ? "border-violet-300 bg-violet-50" : "border-neutral-100 hover:bg-neutral-50"}`}>
                        <span className="flex items-center justify-between gap-3">
                          <span className="font-semibold text-neutral-800">{role.name}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${role.is_active ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"}`}>{role.is_active ? "Active" : "Inactive"}</span>
                        </span>
                        <span className="mt-1 block text-xs text-neutral-500">{role.code}</span>
                      </button>
                    </li>)}
                  </ul>
                )}
              </section>

              <section className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
                {!editing && !selected && <div className="flex min-h-52 flex-col items-center justify-center text-center"><ShieldCheck className="mb-3 h-10 w-10 text-violet-300" /><h2 className="font-semibold text-neutral-800">Select a role</h2><p className="mt-1 text-sm text-neutral-500">Role details and permissions will appear here.</p></div>}

                {editing && <form onSubmit={save} className="space-y-5">
                  <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-neutral-900">{selected ? "Edit role" : "Create role"}</h2><button type="button" onClick={resetForm} className="text-sm font-semibold text-neutral-500 hover:text-neutral-800">Cancel</button></div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-neutral-700">Role name<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={150} className={`${inputClass} mt-1.5`} /></label>
                    {!selected && <label className="text-sm font-semibold text-neutral-700">Role code<input value={code} onChange={(event) => setCode(event.target.value.replace(/\s/g, ""))} required maxLength={100} pattern="[A-Za-z][A-Za-z0-9_-]*" className={`${inputClass} mt-1.5`} placeholder="e.g. ORDER_MANAGER" /></label>}
                    <label className={`text-sm font-semibold text-neutral-700 ${selected ? "sm:col-span-2" : "sm:col-span-2"}`}>Description (optional)<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} className={`${inputClass} mt-1.5`} /></label>
                  </div>
                  <div>
                    <h3 className="mb-1 text-sm font-bold text-neutral-800">Permissions</h3>
                    <p className="mb-3 text-xs text-neutral-500">Required read access is selected automatically when you choose an action or a related feature.</p>
                    {permissions.length === 0 ? <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">No active permissions are available in the backend catalog.</p> : <div className="space-y-4">
                      {Object.entries(groupedPermissions).map(([module, modulePermissions]) => <fieldset key={module} className="rounded-xl border border-neutral-200 p-4">
                        <legend className="px-1 text-sm font-bold capitalize text-neutral-800">{module.replaceAll("_", " ")}</legend>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {modulePermissions.map((permission) => <label key={permission.code} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50">
                            <input type="checkbox" checked={selectedCodes.includes(permission.code)} onChange={(event) => setSelectedCodes((current) => event.target.checked ? addPermissionDependencies([...current, permission.code], permissions) : removePermissionDependencies(current, permission.code, permissions))} className="mt-0.5 accent-violet-700" />
                            <span><span className="block font-medium">{permission.name}</span><span className="block text-[11px] text-neutral-400">{permission.code}</span></span>
                          </label>)}
                        </div>
                      </fieldset>)}
                    </div>}
                  </div>
                  <div className="flex justify-end border-t border-neutral-100 pt-4"><ProbaeButton type="submit" disabled={saving}>{saving ? <><BowlLoader className="h-4 w-4" /> Saving…</> : <><Check className="h-4 w-4" /> Save role &amp; permissions</>}</ProbaeButton></div>
                </form>}

                {!editing && selected && <div>
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 pb-4">
                    <div><div className="flex items-center gap-2"><h2 className="text-lg font-bold text-neutral-900">{selected.name}</h2><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${selected.is_active ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"}`}>{selected.is_active ? "Active" : "Inactive"}</span></div><p className="mt-1 text-sm text-neutral-500">{selected.code}{selected.description ? ` · ${selected.description}` : ""}</p><p className="mt-1 text-xs text-neutral-400">Assigned to {selected.assigned_staff_count} staff member{selected.assigned_staff_count === 1 ? "" : "s"}</p></div>
                    <div className="flex gap-2"><button type="button" onClick={() => void startEdit(selected)} className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"><Pencil className="h-4 w-4" /> Edit</button><button type="button" disabled={selected.is_system || selected.assigned_staff_count > 0} onClick={() => setDeleteOpen(true)} title={selected.assigned_staff_count ? "Remove this role from staff before deleting" : undefined} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-4 w-4" /> Delete</button></div>
                  </div>
                  <div className="mt-5"><h3 className="mb-3 text-sm font-bold text-neutral-800">Assigned permissions ({selected.permissions.length})</h3>{selected.permissions.length === 0 ? <p className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-500">This role has no permissions assigned.</p> : <div className="space-y-4">{Object.entries(selected.permissions.reduce<Record<string, RbacPermission[]>>((groups, permission) => { (groups[permission.module] ??= []).push(permission); return groups; }, {})).map(([module, modulePermissions]) => <div key={module}><h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">{module.replaceAll("_", " ")}</h4><div className="flex flex-wrap gap-2">{modulePermissions.map((permission) => <span key={permission.code} className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-800" title={permission.code}>{permission.name}</span>)}</div></div>)}</div>}<button type="button" onClick={() => void startEdit(selected)} className="mt-5 text-sm font-semibold text-[#6A0FAD] hover:underline">Manage permissions</button></div>
                </div>}
              </section>
            </div>
          )}
        </main>
      </div>
      <ConfirmationModal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} onCancel={() => setDeleteOpen(false)} onConfirm={() => void deleteRole()} title="Delete role?" message={<>This will permanently delete <strong>{selected?.name}</strong>. Roles assigned to staff cannot be deleted.</>} type="delete" confirmText={saving ? "Deleting…" : "Delete role"} isLoading={saving} />
    </div>
  );
}
