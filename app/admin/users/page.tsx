"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit, Eye, User as UserIcon, Search, Shield, Settings, Users as UsersIcon } from "lucide-react";
import { api } from "@/lib/apiService";
import { Header } from "@/components/admin/Header";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { ProbaeSearch } from "@/components/admin/ProbaeSearch";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";

export default function UsersListPage() {
  const router = useRouter();
  const [data, setData] = useState<any>({ users: [], total_users: 0, total_admins: 0, total_staff: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(handler);
  }, [page, search]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const skip = (page - 1) * limit;
      let url = `/auth/admin?skip=${skip}&limit=${limit}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      
      const res = await api.get<any>(url);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]"><div className="p-4 sm:p-8 h-full flex flex-col bg-[#E6E6E6] overflow-hidden"><Header />
<Breadcrumbs segments={["ADMIN", "SYSTEM USERS"]} />
<div className="flex-1 overflow-y-auto space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-center shrink-0">
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
              <th className="py-4 px-6">Role</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="p-8 text-center text-neutral-500">Loading...</td></tr>
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
                    {u.role}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
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
        </div>
      </div>
    </div>
  </div></div>
);
}
