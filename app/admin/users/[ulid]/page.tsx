"use client";
import { BowlLoader } from "@/components/admin/BowlLoader";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { ArrowLeft, Save, Activity } from "lucide-react";
import { api } from "@/lib/apiService";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";

export default function UserPreviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();

  const ulid = params.ulid as string;
  const isEditing = searchParams.get("edit") === "true";
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [form, setForm] = useState({
    username: "",
    email: "",
    full_name: "",
    password: "",
    role: "customer",
    is_active: true
  });

  useEffect(() => {
    if (ulid) {
      fetchData();
    }
  }, [ulid]);

  const fetchData = async () => {
    if (!ulid) {
      console.error("ULID is missing from route");
      return;
    }

    try {
      console.log("ULID:", ulid, "fetching user data");

      const [uRes, logRes] = await Promise.all([
        api.get<any>(`/auth/admin/${ulid}`),
        api.get<any>(`/auth/admin/${ulid}/audit-logs`)
      ]);

      setUser(uRes);
      setLogs(logRes);

      setForm({
        username: uRes.username,
        email: uRes.email,
        full_name: uRes.full_name || "",
        password: "",
        role: uRes.role,
        is_active: uRes.is_active
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (!payload.password) delete payload.password;
      
      await api.patch<any>(`/auth/admin/${params.ulid}`, payload);
      alert("Updated successfully");
      router.push(`/admin/users/${params.ulid}`);
      fetchData();
    } catch (e: any) {
      alert(e.detail || e.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><BowlLoader className="h-8 w-8 text-[#6A0FAD]" /></div>;
  if (!user) return <div className="p-8 text-center">User not found</div>;

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]"><div className="p-4 sm:p-8 h-full flex flex-col bg-[#E6E6E6] overflow-hidden"><Header />
<Breadcrumbs segments={["ADMIN", "SYSTEM USERS", "PROFILE"]} />
<div className="flex-1 overflow-y-auto pb-10 max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
      

      <div className="col-span-2 space-y-6">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-neutral-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-6 border-b border-neutral-100 gap-4 sm:gap-0">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => router.push("/admin/users")}
                    className="w-10 h-10 bg-neutral-50 hover:bg-neutral-100 rounded-2xl flex items-center justify-center text-neutral-600 transition-colors border border-neutral-200/60 shadow-sm shrink-0"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
                    {isEditing ? "Edit User" : "User Profile"}
                  </h1>
                </div>
                {!isEditing && (
                  <button type="button" onClick={() => router.push(`?edit=true`)} className="w-full sm:w-auto px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl text-sm transition-colors">
                    Edit Mode
                  </button>
                )}
              </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2">Username</label>
                <input disabled={!isEditing} type="text" value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} className="w-full h-[52px] bg-neutral-100 rounded-[16px] px-4 outline-none text-neutral-800 font-medium placeholder:text-neutral-400 focus:ring-2 focus:ring-[#6A0FAD]/20 disabled:opacity-50 border border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2">Email</label>
                <input disabled={!isEditing} type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full h-[52px] bg-neutral-100 rounded-[16px] px-4 outline-none text-neutral-800 font-medium placeholder:text-neutral-400 focus:ring-2 focus:ring-[#6A0FAD]/20 disabled:opacity-50 border border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2">Full Name</label>
                <input disabled={!isEditing} type="text" value={form.full_name} onChange={(e) => setForm({...form, full_name: e.target.value})} className="w-full h-[52px] bg-neutral-100 rounded-[16px] px-4 outline-none text-neutral-800 font-medium placeholder:text-neutral-400 focus:ring-2 focus:ring-[#6A0FAD]/20 disabled:opacity-50 border border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2">Change Password</label>
                <input disabled={!isEditing} type="password" placeholder={isEditing ? "Leave blank to keep current" : "*****"} value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} className="w-full h-[52px] bg-neutral-100 rounded-[16px] px-4 outline-none text-neutral-800 font-medium placeholder:text-neutral-400 focus:ring-2 focus:ring-[#6A0FAD]/20 disabled:opacity-50 border border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2">Role</label>
                <select disabled={!isEditing} value={form.role} onChange={(e) => setForm({...form, role: e.target.value})} className="w-full h-[52px] bg-neutral-100 rounded-[16px] px-4 outline-none text-neutral-800 font-medium placeholder:text-neutral-400 focus:ring-2 focus:ring-[#6A0FAD]/20 appearance-none disabled:opacity-50 border border-transparent">
                  <option value="customer">Customer</option>
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                  <option value="delivery">Delivery</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2">Status</label>
                <select disabled={!isEditing} value={form.is_active ? "true" : "false"} onChange={(e) => setForm({...form, is_active: e.target.value === "true"})} className="w-full h-[52px] bg-neutral-100 rounded-[16px] px-4 outline-none text-neutral-800 font-medium placeholder:text-neutral-400 focus:ring-2 focus:ring-[#6A0FAD]/20 appearance-none disabled:opacity-50 border border-transparent">
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            
            {isEditing && (
              <div className="pt-6 border-t border-neutral-100 flex flex-col-reverse sm:flex-row justify-end gap-4">
                <button type="button" onClick={() => router.push(`/admin/users/${params.ulid}`)} className="w-full sm:w-auto h-[52px] px-6 text-neutral-500 hover:text-neutral-700 font-bold rounded-[16px] hover:bg-neutral-100 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="w-full sm:w-auto justify-center bg-[#6A0FAD] hover:bg-[#5b0c96] text-white h-[52px] px-8 rounded-[16px] font-bold flex items-center gap-2 transition-all shadow-sm">
                  {saving ? <BowlLoader className="w-5 h-5"  /> : <Save className="w-5 h-5" />}
                  Save Changes
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      <div className="col-span-1">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-100">
          <h2 className="text-lg font-black text-neutral-900 mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#6A0FAD]" /> API Audit Log
          </h2>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {logs.length === 0 ? (
              <div className="text-sm text-neutral-500 text-center py-4">No recent activity</div>
            ) : logs.map((log) => (
              <div key={log.id} className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    log.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                    log.method === 'POST' ? 'bg-green-100 text-green-700' :
                    log.method === 'PATCH' ? 'bg-yellow-100 text-yellow-700' :
                    log.method === 'DELETE' ? 'bg-red-100 text-red-700' :
                    'bg-neutral-200 text-neutral-700'
                  }`}>
                    {log.method}
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="text-xs font-mono text-neutral-700 truncate mb-1">
                  {log.endpoint}
                </div>
                {log.status_code !== 200 && (
                  <div className="text-[10px] text-red-600 font-bold">Status: {log.status_code}</div>
                )}
                {log.payload && (
                  <div className="mt-2 text-[10px] text-neutral-500 bg-white p-2 rounded border border-neutral-100 overflow-x-auto">
                    <pre>{JSON.stringify(log.payload, null, 2)}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div></div>
);
}
