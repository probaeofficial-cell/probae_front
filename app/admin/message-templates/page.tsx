"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { Plus, MessageSquare, Trash2, Edit2 } from "lucide-react";
import { endpoints } from "@/lib/apiService";

export default function MessageTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const data: any = await endpoints.messageTemplates.list();
      setTemplates(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (ulid: string) => {
    if (!confirm("Delete template?")) return;
    try {
      await endpoints.messageTemplates.delete(ulid);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        <Header />
        <Breadcrumbs segments={["Admin", "Messaging", "Templates"]} />
        
        <div className="mt-4 flex-1 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Message Templates</h1>
              <p className="text-neutral-500 font-medium mt-1">Manage automated WhatsApp and Email messaging formats</p>
            </div>
            <button
              onClick={() => router.push("/admin/message-templates/create")}
              className="px-6 py-2.5 bg-[#6A0FAD] text-white font-bold rounded-xl flex items-center gap-2 hover:bg-[#5A0A9D] transition-colors"
            >
              <Plus className="w-4 h-4" /> New Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map(t => (
              <div key={t.ulid} className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <MessageSquare className={`w-5 h-5 ${t.channel === 'WHATSAPP' ? 'text-[#25D366]' : 'text-[#007BFF]'}`} />
                    <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${t.channel === 'WHATSAPP' ? 'bg-[#25D366]/10 text-[#25D366] border-[#25D366]/20' : 'bg-[#007BFF]/10 text-[#007BFF] border-[#007BFF]/20'}`}>
                      {t.channel}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 bg-neutral-100 text-neutral-700 rounded-lg border border-neutral-200 shadow-sm">
                      {t.template_type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => router.push(`/admin/message-templates/create?type=${t.template_type}&channel=${t.channel}`)} 
                      className="p-1.5 text-neutral-400 hover:text-[#6A0FAD] hover:bg-[#6A0FAD]/10 rounded-lg transition-colors"
                      title="Edit Template"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(t.ulid)} 
                      className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="font-black text-xl text-neutral-900 mb-2 tracking-tight">{t.name}</h3>
                <div className="text-sm text-neutral-600 line-clamp-4 mb-4 flex-1 font-mono bg-white p-4 rounded-xl border border-neutral-200 shadow-inner whitespace-pre-wrap">
                  {t.content}
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-400 mt-auto pt-4 border-t border-neutral-200">
                  <span className={`w-2 h-2 rounded-full ${t.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  {t.is_active ? 'Active' : 'Inactive'}
                </div>
              </div>
            ))}
            {templates.length === 0 && (
              <div className="col-span-full p-12 text-center border-2 border-dashed border-neutral-200 rounded-3xl">
                <MessageSquare className="w-8 h-8 text-neutral-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-neutral-500">No Templates Found</h3>
                <p className="text-neutral-400 text-sm mb-4">Create your first outbound messaging template to get started.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
