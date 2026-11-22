"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, Eye, User as UserIcon, Shield, Settings, Users as UsersIcon, X } from "lucide-react";
import { ApiError, endpoints } from "@/lib/apiService";
import type { RbacRole } from "@/lib/types";
import { Header } from "@/components/admin/Header";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { ProbaeSearch } from "@/components/admin/ProbaeSearch";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { BowlLoader } from "@/components/admin/BowlLoader";

export default function UsersListPage() {
  const router = useRouter();
  const [data, setData] = useState<any>({ users: [], total_users: 0, total_admins: 0, total_staff: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [staffOnly, setStaffOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [roleModalUser, setRoleModalUser] = useState<any>(null);
  const [availableRoles, setAvailableRoles] = useState<RbacRole[]>([]);
  const [roleChoice, setRoleChoice] = useState("");
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleError, setRoleError] = useState("");
  const [roleNotice, setRoleNotice] = useState("");
  const limit = 10;

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const skip = (page - 1) * limit;
      const res = await endpoints.adminUsers.list(skip, limit, search || undefined, staffOnly ? "staff" : undefined);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, staffOnly]);

  useEffect(() => {
    const handler = setTimeout(() => void fetchUsers(), 300);
    return () => clearTimeout(handler);
  }, [fetchUsers]);

  const openRoleAssignment = async (staff: any) => {
    setRoleModalUser(staff);
    setRoleChoice(staff.rbac_role?.ulid ?? "__none__");
    setRoleError("");
    setRoleNotice("");
    setRoleLoading(true);
    try {
      setAvailableRoles((await endpoints.rbac.listRoles()).filter((role) => role.is_active));
    } catch (error) {
      setRoleError(error instanceof ApiError ? error.message : "Could not load roles.");
    } finally {
      setRoleLoading(false);
    }
  };

  const saveStaffRole = async () => {
    if (!roleModalUser) return;
    setRoleSaving(true);
    setRoleError("");
    try {
      const result = await endpoints.rbac.assignStaffRole(roleModalUser.ulid, roleChoice === "__none__" ? null : roleChoice);
      setData((previous: any) => ({
        ...previous,
        users: previous.users.map((user: any) => user.ulid === roleModalUser.ulid ? { ...user, rbac_role: result.role } : user),
      }));
      setRoleNotice(result.role ? `Assigned ${result.role.name}.` : "Dynamic role assignment removed.");
      setRoleModalUser(null);
    } catch (error) {
      setRoleError(error instanceof ApiError ? error.message : "Could not update the staff role.");
    } finally {
      setRoleSaving(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]"><div className="p-4 sm:p-8 h-full flex flex-col bg-[#E6E6E6] overflow-hidden"><Header />
<Breadcrumbs segments={["ADMIN", "SYSTEM USERS"]} />
<div className="flex-1 overflow-y-auto space-y-8 pb-10">
      {roleNotice && <div role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{roleNotice}</div>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-xl font-bold text-neutral-900">Staff Management</h1><p className="text-sm text-neutral-500">Assign dynamic roles to STAFF accounts only.</p></div>
        <div className="flex rounded-xl border border-neutral-200 bg-white p-1">
          <button type="button" onClick={() => { setStaffOnly(false); setPage(1); }} className={`rounded-lg px-4 py-2 text-sm font-semibold ${!staffOnly ? "bg-violet-100 text-violet-800" : "text-neutral-500 hover:bg-neutral-50"}`}>All users</button>
          <button type="button" onClick={() => { setStaffOnly(true); setPage(1); }} className={`rounded-lg px-4 py-2 text-sm font-semibold ${staffOnly ? "bg-violet-100 text-violet-800" : "text-neutral-500 hover:bg-neutral-50"}`}>Staff roles ({data.total_staff})</button>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-stretch sm:items-center shrink-0">
        <ProbaeSearch
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search for user..."
          isLoading={loading}
          hideSort={true}
          hideFilter={true} 
        />
        <ProbaeButton
          onClick={() => router.push("/admin/users/create")}
          className="w-full sm:w-auto px-8 shrink-0"
        >
          Create User
        </ProbaeButton>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <UsersIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Customers</div>
            <div className="text-2xl font-black text-neutral-900">{data.total_users}</div>
          </div>
        </div>
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Admins</div>
            <div className="text-2xl font-black text-neutral-900">{data.total_admins}</div>
          </div>
        </div>
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Staff</div>
            <div className="text-2xl font-black text-neutral-900">{data.total_staff}</div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-3xl shadow-sm border border-neutral-100 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead>
            <tr className="border-b border-neutral-100 text-neutral-500 text-sm font-bold uppercase tracking-wider bg-neutral-50/50">
              <th className="py-4 px-6">User</th>
              <th className="py-4 px-6">Account Role / Staff Access</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="p-8 text-center"><BowlLoader className="mx-auto h-8 w-8 text-[#6A0FAD]" /></td></tr>
            ) : data.users.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-neutral-500">No users found.</td></tr>
            ) : data.users.map((u: any) => (
              <tr key={u.ulid} className="border-b border-neutral-50 hover:bg-neutral-50 transition-colors">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#6A0FAD]/10 flex items-center justify-center text-[#6A0FAD]">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-neutral-900">{u.full_name || u.username}</div>
                      <div className="text-sm text-neutral-500">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className="px-3 py-1 bg-neutral-100 text-neutral-700 text-xs font-bold rounded-full uppercase">
                    {u.role}{String(u.role).toUpperCase() === "STAFF" && <span className="ml-2 normal-case text-neutral-500">· {u.rbac_role?.name || "No dynamic role"}</span>}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  {String(u.role).toUpperCase() === "STAFF" && <button onClick={() => void openRoleAssignment(u)} className="mr-2 rounded-lg border border-violet-200 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-50">{u.rbac_role ? "Change role" : "Assign role"}</button>}
                  <button onClick={() => router.push(`/admin/users/${u.ulid}`)} className="p-2 text-neutral-400 hover:text-[#6A0FAD] transition-colors inline-block mr-2">
                    <Eye className="w-5 h-5" />
                  </button>
                  <button onClick={() => router.push(`/admin/users/${u.ulid}?edit=true`)} className="p-2 text-neutral-400 hover:text-[#6A0FAD] transition-colors inline-block">
                    <Edit className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-neutral-100 bg-white flex justify-between items-center">
          <div className="text-sm text-neutral-500 font-medium">
            Showing {data.users.length} of {data.total} users
          </div>
          <div className="flex gap-2">
            <button 
              disabled={page === 1} 
              onClick={() => setPage(page - 1)}
              className="px-4 py-2 border border-neutral-200 rounded-lg text-sm font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button 
              disabled={page * limit >= data.total} 
              onClick={() => setPage(page + 1)}
              className="px-4 py-2 border border-neutral-200 rounded-lg text-sm font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
      {roleModalUser && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !roleSaving) setRoleModalUser(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="staff-role-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between"><div><h2 id="staff-role-title" className="text-lg font-bold text-neutral-900">Staff role assignment</h2><p className="mt-1 text-sm text-neutral-500">{roleModalUser.full_name || roleModalUser.username}</p><p className="mt-1 text-xs font-medium text-violet-700">Current role: {roleModalUser.rbac_role?.name || "No dynamic role"}</p></div><button type="button" disabled={roleSaving} onClick={() => setRoleModalUser(null)} className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100" aria-label="Close"><X className="h-5 w-5" /></button></div>
            {roleError && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{roleError}</div>}
            {roleLoading ? <div className="py-8 text-center"><BowlLoader className="mx-auto h-8 w-8 text-[#6A0FAD]" /><p className="mt-2 text-sm text-neutral-500">Loading roles…</p></div> : <>
              <p className="mb-3 rounded-lg bg-violet-50 p-3 text-xs text-violet-800">Choose a role to assign or change this staff member’s access. Choose “No dynamic role” to remove the current assignment.</p>
              <label className="block text-sm font-semibold text-neutral-700">Dynamic role<select className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm" value={roleChoice} onChange={(event) => setRoleChoice(event.target.value)}><option value="__none__">No dynamic role (remove assignment)</option>{availableRoles.map((role) => <option key={role.ulid} value={role.ulid}>{role.name}</option>)}</select></label>
              {availableRoles.length === 0 && <p className="mt-2 text-xs text-neutral-500">No active roles are available. Create a role in Roles &amp; Permissions first.</p>}
              <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setRoleModalUser(null)} className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700">Cancel</button><ProbaeButton type="button" disabled={roleSaving} onClick={() => void saveStaffRole()}>{roleSaving ? "Saving…" : "Save assignment"}</ProbaeButton></div>
            </>}
          </section>
        </div>
      )}
        </div>
      </div>
    </div>
  </div></div>
);
}
