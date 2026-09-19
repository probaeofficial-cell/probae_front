"use client";

import { BowlLoader } from "@/components/admin/BowlLoader";
import { useState, useEffect } from "react";
import { Plus, Edit, CheckCircle, XCircle } from "lucide-react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { endpoints } from "@/lib/apiService";
import { ConfirmationModal } from "@/components/ConfirmationModal";

export default function ExpenseCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  
  const [formData, setFormData] = useState({ name: "", description: "", is_active: true });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const data = await endpoints.expenses.listCategories(false, page, 10) as any;
      setCategories(data.categories || []);
      setTotalPages(Math.ceil((data.total_count || 0) / 10) || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [page]);

  const handleOpenModal = (cat: any = null) => {
    if (cat) {
      setEditingCategory(cat);
      setFormData({ name: cat.name, description: cat.description || "", is_active: cat.is_active });
    } else {
      setEditingCategory(null);
      setFormData({ name: "", description: "", is_active: true });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) return setErrorMsg("Name is required");
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      if (editingCategory) {
        await endpoints.expenses.updateCategory(editingCategory.ulid, formData);
      } else {
        await endpoints.expenses.createCategory(formData);
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save category");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
      <Header />
      <div className="mt-4 flex-1 flex flex-col min-h-0">
        <Breadcrumbs segments={["Expenses", "Categories"]} />
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Expense Categories</h1>
          <ProbaeButton onClick={() => handleOpenModal()} className="!w-auto flex items-center gap-2">
            <Plus className="w-5 h-5" /> Add Category
          </ProbaeButton>
        </div>
        
        {isLoading ? (
          <div className="py-12 flex justify-center"><BowlLoader className="w-10 h-10 animate-spin text-[#6A0FAD]" /></div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-neutral-200 overflow-hidden flex flex-col flex-1 min-h-0">
            <div className="overflow-auto flex-1 scrollbar-thin">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/50">
                  <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase">Name</th>
                  <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase">Description</th>
                  <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase">Status</th>
                  <th className="py-4 px-6 text-xs font-bold text-neutral-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {categories.map((c) => (
                  <tr key={c.ulid} className="hover:bg-neutral-50/30 transition-colors">
                    <td className="py-4 px-6 font-bold text-neutral-900">{c.name}</td>
                    <td className="py-4 px-6 text-sm text-neutral-500">{c.description || "-"}</td>
                    <td className="py-4 px-6">
                      {c.is_active ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-black bg-green-50 text-green-700"><CheckCircle className="w-3.5 h-3.5" /> Active</span> : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-black bg-neutral-100 text-neutral-600"><XCircle className="w-3.5 h-3.5" /> Inactive</span>}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button onClick={() => handleOpenModal(c)} className="p-2 text-neutral-400 hover:text-[#6A0FAD] hover:bg-[#6A0FAD]/10 rounded-xl transition-colors"><Edit className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="py-4 px-6 border-t border-neutral-100 flex items-center justify-between">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-bold text-neutral-600 bg-neutral-100 rounded-lg disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm font-bold text-neutral-500">Page {page} of {totalPages}</span>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm font-bold text-neutral-600 bg-neutral-100 rounded-lg disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-black text-neutral-900 mb-4">{editingCategory ? "Edit Category" : "New Category"}</h2>
            {errorMsg && <div className="mb-4 text-red-500 text-sm">{errorMsg}</div>}
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Name</label>
                <input type="text" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Description</label>
                <textarea value={formData.description} onChange={e => setFormData(p => ({...p, description: e.target.value}))} className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]" />
              </div>
              <div className="flex items-center justify-between pt-2">
                <label className="text-sm font-bold text-neutral-700">Active Status</label>
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, is_active: !p.is_active }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/50 ${formData.is_active ? 'bg-[#6A0FAD]' : 'bg-neutral-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
            
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-bold text-neutral-500 hover:text-neutral-900 transition-colors">Cancel</button>
              <ProbaeButton onClick={handleSave} disabled={isSubmitting} className="!w-auto">{isSubmitting ? "Saving..." : "Save Category"}</ProbaeButton>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
