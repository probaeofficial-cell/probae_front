"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { Copy, Plus, MessageCircle, Save, ArrowLeft } from "lucide-react";
import { endpoints } from "@/lib/apiService";

export default function CreateTemplatePage() {
  const router = useRouter();
  // We need useSearchParams to optionally pre-fill the form
  // However, in Next.js 13+ useSearchParams needs to be imported from next/navigation
  // Let's do it right inside the component
    const searchParams = useSearchParams();
  
  const initialType = searchParams.get('type') || "ORDER_DELIVERED";
  const initialChannel = searchParams.get('channel') || "WHATSAPP";

  const [formData, setFormData] = useState({
    name: "",
    template_type: initialType,
    channel: initialChannel,
    content: "Hi {{customer_name}},\n\nYour {{meal_slot}} bowl ({{bowl_name}}) is delivered!\n\nMacros: {{calories}} kcal\nToday's Total: {{total_calories_today}} kcal",
    is_active: true
  });
  
  const [variableMap, setVariableMap] = useState<Record<string, {var: string, desc: string}[]>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [allTemplates, setAllTemplates] = useState<any[]>([]);
  const [existingUlid, setExistingUlid] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [varData, tplData] = await Promise.all([
        endpoints.messageTemplates.variables(),
        endpoints.messageTemplates.list()
      ]);
      setVariableMap(varData as any);
      setAllTemplates(tplData as any);
    } catch (e) {
      console.error("Failed to fetch data", e);
    }
  };

  useEffect(() => {
    const existing = allTemplates.find(t => t.template_type === formData.template_type && t.channel === formData.channel);
    if (existing) {
      setExistingUlid(existing.ulid);
      setFormData(prev => ({
        ...prev,
        name: existing.name,
        content: existing.content,
        is_active: existing.is_active
      }));
    } else {
      setExistingUlid(null);
      setFormData(prev => ({
        ...prev,
        name: "",
        content: "",
      }));
    }
  }, [formData.template_type, formData.channel, allTemplates]);

  const copyVar = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getPreview = () => {
    let preview = formData.content;
    const dummyData: Record<string, string> = {
      "customer_name": "Adil Anwar",
      "meal_slot": "Lunch",
      "bowl_name": "Spicy Chicken Bowl",
      "datetime": "12:45 PM",
      "order_number": "ORD-7892",
      "delivery_time": "12:45 PM",
      "order_price": "₹350.00",
      "calories": "650",
      "protein": "45",
      "carbs": "50",
      "fat": "22",
      "fiber": "12",
      "total_calories_today": "1150",
      "total_calories_week": "8450",
      "total_calories_month": "24000",
      "expiration_date": "2026-10-01",
    };

    for (const [key, val] of Object.entries(dummyData)) {
      preview = preview.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
    }
    return preview;
  };

  const handleSave = async () => {
    if (!formData.name || !formData.content) return alert("Fill required fields");
    setIsSaving(true);
    try {
      if (existingUlid) {
        await endpoints.messageTemplates.update(existingUlid, formData);
      } else {
        await endpoints.messageTemplates.create(formData);
      }
      router.push("/admin/message-templates");
    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.detail || "Error saving template (Ensure only one active template exists per Type+Channel)");
    } finally {
      setIsSaving(false);
    }
  };

  const currentVars = variableMap[formData.template_type] || [];

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        <Header />
        <Breadcrumbs segments={["Admin", "Messaging", "Create Template"]} />
        
        <div className="mt-4 flex-1 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.push("/admin/message-templates")}
                className="p-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-xl transition-colors shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Template Builder</h1>
                <p className="text-neutral-500 font-medium mt-1">Design dynamic outbound messages</p>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-[#6A0FAD] text-white font-bold rounded-xl flex items-center gap-2 hover:bg-[#5A0A9D] transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {existingUlid ? "Update Template" : "Save Template"}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200">
                <div className="mb-4">
                  <label className="block text-sm font-bold text-neutral-700 mb-1">Template Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Daily WhatsApp Notice"
                    className="w-full px-4 py-2.5 bg-white text-neutral-900 border border-neutral-300 rounded-xl outline-none focus:ring-2 focus:ring-[#6A0FAD]"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-1">Template Type</label>
                    <select
                      value={formData.template_type}
                      onChange={e => setFormData({...formData, template_type: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white text-neutral-900 border border-neutral-300 rounded-xl outline-none focus:ring-2 focus:ring-[#6A0FAD]"
                    >
                      {Object.keys(variableMap).map(type => (
                        <option key={type} value={type}>{type.replace("_", " ")}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-1">Channel</label>
                    <select
                      value={formData.channel}
                      onChange={e => setFormData({...formData, channel: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white text-neutral-900 border border-neutral-300 rounded-xl outline-none focus:ring-2 focus:ring-[#6A0FAD]"
                    >
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="EMAIL">Email</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1">Message Content</label>
                  <textarea
                    rows={8}
                    value={formData.content}
                    onChange={e => setFormData({...formData, content: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white text-neutral-900 border border-neutral-300 rounded-xl outline-none focus:ring-2 focus:ring-[#6A0FAD] resize-y"
                  ></textarea>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-bold text-neutral-800 mb-3">Available Variables</h3>
                <div className="flex flex-wrap gap-2">
                  {currentVars.map((v: any) => (
                    <button
                      key={v.var}
                      onClick={() => copyVar(v.var)}
                      title={v.desc}
                      className="px-3 py-1.5 bg-[#f3eefe] text-[#6A0FAD] border border-[#e1d5f9] rounded-lg text-sm font-mono font-bold flex items-center gap-2 hover:bg-[#e8ddfb] transition-colors"
                    >
                      {v.var}
                      <Copy className="w-3 h-3 opacity-50" />
                    </button>
                  ))}
                  {currentVars.length === 0 && (
                    <span className="text-sm text-neutral-500">Loading variables...</span>
                  )}
                </div>
                <p className="text-xs text-neutral-500 mt-2">Click to copy variables and paste them into your content.</p>
              </div>
            </div>

            <div className="bg-[#f0f2f5] p-6 rounded-2xl border border-neutral-200">
              <h3 className="text-sm font-bold text-neutral-500 mb-4 uppercase tracking-wider flex items-center gap-2">
                <MessageCircle className="w-4 h-4" /> Live Preview
              </h3>
              <div className="bg-white p-4 rounded-xl shadow-sm text-sm text-neutral-800 whitespace-pre-wrap max-w-sm ml-auto mr-4 rounded-tr-none border border-neutral-200 relative">
                <div className="absolute top-0 right-[-8px] w-0 h-0 border-[8px] border-transparent border-l-white border-t-white"></div>
                {getPreview()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
