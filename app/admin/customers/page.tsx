"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, ChevronLeft, ChevronRight, Search, Eye } from "lucide-react";
import { Header } from "@/components/admin/Header";
import { ProbaeSearch } from "@/components/admin/ProbaeSearch";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { endpoints } from "@/lib/apiService";
import { getMediaUrl } from "@/lib/utils";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CustomersPage() {
  const router = useRouter();
  useEffect(() => {
    async function fetchSystemSettings() {
      try {
        const data = await endpoints.settings.getSystemSettings();
        if (data && data.R2_BASE_URL !== undefined) {
          setSystemSettings({ R2_BASE_URL: data.R2_BASE_URL });
        }
      } catch (err) {
        console.error("Failed to fetch settings", err);
      }
    }
    fetchSystemSettings();
  }, []);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [systemSettings, setSystemSettings] = useState({ R2_BASE_URL: "" });

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchCustomers = useCallback(async (pageNum: number) => {
    setIsLoading(true);
    try {
      const res = await endpoints.customers.list({ page: pageNum, limit: 10, search: debouncedSearch }) as any;
      const data = res;
      if (data.success) {
        setCustomers(data.customers);
        setTotalPages(Math.ceil(data.totalCount / data.limit) || 1);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchCustomers(page);
  }, [fetchCustomers, page]);

    return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        <Header />
        <Breadcrumbs segments={["Admin", "Customers"]} />
        <div className="mt-4 flex-1 flex flex-col min-h-0">
          {/* Header Controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 shrink-0">
            <ProbaeSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search customers..."
             isLoading={isLoading} />
            <Link href="/admin/customers/new">
              <ProbaeButton  className="!w-auto flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Customer
              </ProbaeButton>
            </Link>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-x-auto min-h-0 bg-white rounded-2xl border border-neutral-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 bg-[#F3F4F6]">
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap first:rounded-tl-2xl">Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap">Phone</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap">Goal</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap text-right last:rounded-tr-2xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">Loading...</td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">No customers found.</td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.ulid} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-neutral-900 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {c.image_filename ? (
                            <img src={getMediaUrl(systemSettings.R2_BASE_URL, c.image_filename) as string} alt={c.name} className="w-10 h-10 rounded-full object-cover border border-neutral-200" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-400 font-bold uppercase shrink-0">
                              {c.name.charAt(0)}
                            </div>
                          )}
                          <span>{c.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-neutral-600 whitespace-nowrap">{c.phone}</td>
                      <td className="px-6 py-4 text-neutral-600 whitespace-nowrap">{c.goal}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          c.status === "ONBOARDING" ? "bg-blue-100 text-blue-800" :
                          c.status === "PENDING_PLAN" ? "bg-yellow-100 text-yellow-800" :
                          c.status === "ACTIVE" ? "bg-green-100 text-green-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/customers/${c.ulid}`}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between shrink-0 mt-6">
            <span className="text-sm text-neutral-500 font-medium">Page {page} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-[#f8f5fb] text-neutral-600 hover:bg-[#f1edf7] disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || isLoading}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-[#f8f5fb] text-neutral-600 hover:bg-[#f1edf7] disabled:opacity-50 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}