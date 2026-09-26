"use client";
import { BowlLoader } from "@/components/admin/BowlLoader";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { api } from "@/lib/apiService";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";

export default function CreateUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    full_name: "",
    password: "",
    role: "customer",
    customer_id: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = { ...form };
      if (payload.customer_id) payload.customer_id = parseInt(payload.customer_id);
      else delete payload.customer_id;
      
      const res = await api.post<any>("/auth/admin", payload);
      router.push(`/admin/users/${res.ulid}`);
    } catch (e: any) {
      alert(e.detail || e.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]"><div className="p-4 sm:p-8 h-full flex flex-col bg-[#E6E6E6] overflow-hidden"><Header />
<Breadcrumbs segments={["ADMIN", "SYSTEM USERS", "CREATE"]} />
<div className="flex-1 overflow-y-auto pb-10 max-w-3xl mx-auto w-full">


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
                  <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Create New User</h1>
                </div>
              </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-2">Username</label>
              <input required type="text" value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} className="w-full h-[52px] bg-neutral-100 rounded-[16px] px-4 outline-none text-neutral-800 font-medium placeholder:text-neutral-400 focus:ring-2 focus:ring-[#6A0FAD]/20 disabled:opacity-50 border border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-2">Email</label>
              <input required type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full h-[52px] bg-neutral-100 rounded-[16px] px-4 outline-none text-neutral-800 font-medium placeholder:text-neutral-400 focus:ring-2 focus:ring-[#6A0FAD]/20 disabled:opacity-50 border border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-2">Full Name</label>
              <input type="text" value={form.full_name} onChange={(e) => setForm({...form, full_name: e.target.value})} className="w-full h-[52px] bg-neutral-100 rounded-[16px] px-4 outline-none text-neutral-800 font-medium placeholder:text-neutral-400 focus:ring-2 focus:ring-[#6A0FAD]/20 disabled:opacity-50 border border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-2">Password</label>
              <input required type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} className="w-full h-[52px] bg-neutral-100 rounded-[16px] px-4 outline-none text-neutral-800 font-medium placeholder:text-neutral-400 focus:ring-2 focus:ring-[#6A0FAD]/20 disabled:opacity-50 border border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-2">Role</label>
              <select value={form.role} onChange={(e) => setForm({...form, role: e.target.value})} className="w-full h-[52px] bg-neutral-100 rounded-[16px] px-4 outline-none text-neutral-800 font-medium placeholder:text-neutral-400 focus:ring-2 focus:ring-[#6A0FAD]/20 appearance-none disabled:opacity-50 border border-transparent">
                <option value="customer">Customer</option>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
                <option value="delivery">Delivery</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-2">Link Customer ID (Optional)</label>
              <input type="number" placeholder="Existing Customer ID" value={form.customer_id} onChange={(e) => setForm({...form, customer_id: e.target.value})} className="w-full h-[52px] bg-neutral-100 rounded-[16px] px-4 outline-none text-neutral-800 font-medium placeholder:text-neutral-400 focus:ring-2 focus:ring-[#6A0FAD]/20 disabled:opacity-50 border border-transparent" />
            </div>
          </div>
          
          <div className="pt-6 border-t border-neutral-100 flex justify-end">
            <button type="submit" disabled={loading} className="w-full sm:w-auto justify-center bg-[#6A0FAD] hover:bg-[#5b0c96] text-white h-[52px] px-8 rounded-[16px] font-bold flex items-center gap-2 transition-all shadow-sm">
              {loading ? <BowlLoader className="w-5 h-5"  /> : <Save className="w-5 h-5" />}
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  </div></div>
);
}
