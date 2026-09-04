"use client";
import { BowlLoader } from "@/components/admin/BowlLoader";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Loader2, 
  Wheat,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { endpoints } from "@/lib/apiService";
import { getMediaUrl } from "@/lib/utils";
import { RawMaterial, MacrosUpdatePayload } from "@/lib/types";

interface PageProps {
  params: {
    id: string;
  };
}

export default function EditMacrosPage({ params }: PageProps) {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  // Resolve dynamic parameters asynchronously (Next.js 15+)
  const [materialUlid, setMaterialUlid] = useState<string | null>(null);

  useEffect(() => {
    async function resolveParams() {
      const resolved = await (params as any);
      setMaterialUlid(resolved.id);
    }
    resolveParams();
  }, [params]);

  // ─── State Variables ───────────────────────────────────────────────────────
  const [material, setMaterial] = useState<RawMaterial | null>(null);
  const [systemSettings, setSystemSettings] = useState({ R2_BASE_URL: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formState, setFormState] = useState({
    calories: "" as any,
    protein: "" as any,
    carbs: "" as any,
    fiber: "" as any,
    fat: "" as any,
    microsString: "",
  });

  // Notifications State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // ─── Side Effects ──────────────────────────────────────────────────────────
  // Auth validation
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/admin/login");
    }
  }, [user, authLoading, router]);

  // Load system settings and the raw material by ID
  useEffect(() => {
    async function loadData() {
      if (!user || !materialUlid) return;
      setIsLoading(true);
      try {
        // Load settings
        const settings = await endpoints.settings.getSystemSettings();
        if (settings && settings.R2_BASE_URL !== undefined) {
          setSystemSettings({ R2_BASE_URL: settings.R2_BASE_URL });
        }

        // Fetch target raw material
        const materialData = await endpoints.rawMaterials.getRawMaterial(materialUlid);
        setMaterial(materialData);
        setFormState({
          calories: materialData.calories !== undefined && materialData.calories !== null ? materialData.calories : "",
          protein: materialData.protein !== undefined && materialData.protein !== null ? materialData.protein : "",
          carbs: materialData.carbs !== undefined && materialData.carbs !== null ? materialData.carbs : "",
          fiber: materialData.fiber !== undefined && materialData.fiber !== null ? materialData.fiber : "",
          fat: materialData.fat !== undefined && materialData.fat !== null ? materialData.fat : "",
          microsString: materialData.micros ? materialData.micros.join(", ") : "",
        });
      } catch (error: any) {
        console.error("Error loading raw material data:", error);
        showToast(error.message || "Failed to load raw material details", "error");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [user, materialUlid]);

  // ─── Toast Helper ─────────────────────────────────────────────────────────
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // ─── Save Action ───────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!material) return;

    setIsSaving(true);
    const formattedMicros = formState.microsString
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    const payload: MacrosUpdatePayload = {
      calories: formState.calories !== "" ? Number(formState.calories) : 0,
      protein: formState.protein !== "" ? Number(formState.protein) : 0,
      carbs: formState.carbs !== "" ? Number(formState.carbs) : 0,
      fiber: formState.fiber !== "" ? Number(formState.fiber) : 0,
      fat: formState.fat !== "" ? Number(formState.fat) : 0,
      micros: formattedMicros,
    };

    try {
      await endpoints.rawMaterials.updateMacros(material.ulid, payload);
      showToast(`Nutritional macros for ${material.name} updated successfully`, "success");
      // Redirect back to listing view
      router.push("/admin/raw-materials/calorie-management");
    } catch (error: any) {
      console.error("Error updating macros:", error);
      showToast(error.detail || error.message || "Failed to update macros", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading || materialUlid === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fafafa]">
        <div className="animate-pulse text-neutral-500 font-medium">Loading details...</div>
      </div>
    );
  }

  if (!user || !material) return null;

  const backgroundUrl = getMediaUrl(systemSettings.R2_BASE_URL, material.background_image_filename);

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6] relative overflow-hidden text-neutral-800">

      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl transition-all border animate-fade-in ${
          toast.type === "success" 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
            : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Main Page Layout */}
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-transparent overflow-hidden z-10 relative">
        
        {/* Header Bar */}
        <Header />

        {/* Uniform Breadcrumbs */}
        <Breadcrumbs segments={["Raw Material", "Calorie Mgt", "Edit Macros"]} />

        {/* Scrollable Content container */}
        <div className="flex-1 overflow-y-auto pr-1 pb-6 scrollbar-thin">
          {/* Title */}
          <div className="flex items-center gap-4 mb-8 pl-1">
            <button 
              onClick={() => router.push("/admin/raw-materials/calorie-management")} 
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-extrabold text-neutral-800 select-none m-0">Edit Macros</h1>
          </div>

          {/* Flex layout columns (directly on grey background) */}
          <div className="w-full max-w-5xl mx-auto flex flex-col lg:flex-row gap-12 items-start mt-4 pb-12">
          
          {/* Left Column: Vertical Oval Image */}
          <div className="w-full lg:w-[42%] flex items-center justify-center shrink-0">
            <div className="w-72 h-[480px] rounded-full overflow-hidden bg-white border border-black/30 relative flex items-center justify-center shrink-0">
              {backgroundUrl ? (
                <img
                  src={backgroundUrl}
                  alt={material.name}
                  className="w-full h-full object-cover animate-fade-in"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-neutral-300">
                  <Wheat className="w-16 h-16 text-neutral-300 mb-2" />
                  <span className="text-xs font-semibold text-neutral-400">No Image Available</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Form Fields */}
          <form onSubmit={handleSave} className="flex-1 w-full flex flex-col gap-6">
            
            {/* Name selection (Disabled in Edit Mode) */}
            <div>
              <label className="block text-sm font-semibold text-neutral-800 mb-1.5">
                Name
              </label>
              <input
                type="text"
                value={material.name}
                disabled
                className="w-full bg-white border border-neutral-100 rounded-2xl px-5 py-4 text-[15px] font-bold text-neutral-800 focus:outline-none shadow-sm cursor-not-allowed"
              />
            </div>

            {/* Code, Price, Unit (Read Only / Styled Badges) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-800 mb-1.5">
                  Code
                </label>
                <div className="w-full py-4 bg-white border border-neutral-100 rounded-2xl text-[15px] font-bold text-neutral-500 text-center shadow-sm select-none">
                  {`A${material.id}`}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-neutral-800 mb-1.5">
                  Price
                </label>
                <div className="w-full py-4 bg-white border border-neutral-100 rounded-2xl text-[15px] font-bold text-neutral-500 text-center shadow-sm select-none">
                  {`₹${(material.standard_price ?? material.price)}`}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-800 mb-1.5">
                  Unit
                </label>
                <div className="w-full py-4 bg-[var(--color-pro-purple)] border border-transparent rounded-2xl text-[15px] font-extrabold text-white text-center shadow-sm select-none">
                  {material.unit.toUpperCase()}
                </div>
              </div>
            </div>

            {/* White container card for calorie inputs */}
            <div className="bg-white rounded-[24px] p-6 sm:p-8 border border-neutral-100/50 shadow-sm flex flex-col gap-5">
              {/* Calorie */}
              <div>
                <label className="block text-sm font-semibold text-neutral-800 mb-1.5">
                  Calorie
                </label>
                <input
                  type="text"
                  placeholder="125 Kcal"
                  value={formState.calories === "" ? "" : `${formState.calories} Kcal`}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^0-9.]/g, "");
                    setFormState(prev => ({ ...prev, calories: cleaned }));
                  }}
                  className="w-full bg-[#f3f4f6] border border-transparent focus:border-neutral-200 focus:bg-white rounded-xl px-5 py-4 text-[14px] text-neutral-800 focus:outline-none transition-all placeholder:text-neutral-400 font-semibold shadow-sm"
                />
              </div>

              {/* Protein & Carb */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-800 mb-1.5">
                    Protein
                  </label>
                  <input
                    type="text"
                    placeholder="25g"
                    value={formState.protein === "" ? "" : `${formState.protein}g`}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9.]/g, "");
                      setFormState(prev => ({ ...prev, protein: cleaned }));
                    }}
                    className="w-full bg-[#f3f4f6] border border-transparent focus:border-neutral-200 focus:bg-white rounded-xl px-5 py-4 text-[14px] text-neutral-800 focus:outline-none transition-all placeholder:text-neutral-400 font-semibold shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-800 mb-1.5">
                    Carb
                  </label>
                  <input
                    type="text"
                    placeholder="25g"
                    value={formState.carbs === "" ? "" : `${formState.carbs}g`}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9.]/g, "");
                      setFormState(prev => ({ ...prev, carbs: cleaned }));
                    }}
                    className="w-full bg-[#f3f4f6] border border-transparent focus:border-neutral-200 focus:bg-white rounded-xl px-5 py-4 text-[14px] text-neutral-800 focus:outline-none transition-all placeholder:text-neutral-400 font-semibold shadow-sm"
                  />
                </div>
              </div>

              {/* Fiber & Fat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-800 mb-1.5">
                    Fiber
                  </label>
                  <input
                    type="text"
                    placeholder="25g"
                    value={formState.fiber === "" ? "" : `${formState.fiber}g`}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9.]/g, "");
                      setFormState(prev => ({ ...prev, fiber: cleaned }));
                    }}
                    className="w-full bg-[#f3f4f6] border border-transparent focus:border-neutral-200 focus:bg-white rounded-xl px-5 py-4 text-[14px] text-neutral-800 focus:outline-none transition-all placeholder:text-neutral-400 font-semibold shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-800 mb-1.5">
                    Fat
                  </label>
                  <input
                    type="text"
                    placeholder="25g"
                    value={formState.fat === "" ? "" : `${formState.fat}g`}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9.]/g, "");
                      setFormState(prev => ({ ...prev, fat: cleaned }));
                    }}
                    className="w-full bg-[#f3f4f6] border border-transparent focus:border-neutral-200 focus:bg-white rounded-xl px-5 py-4 text-[14px] text-neutral-800 focus:outline-none transition-all placeholder:text-neutral-400 font-semibold shadow-sm"
                  />
                </div>
              </div>

              {/* Micros */}
              <div>
                <label className="block text-sm font-semibold text-neutral-800 mb-1.5">
                  Micros
                </label>
                <input
                  type="text"
                  placeholder="Vitamin B12,Iron"
                  value={formState.microsString}
                  onChange={(e) => setFormState(prev => ({ ...prev, microsString: e.target.value }))}
                  className="w-full bg-[#f3f4f6] border border-transparent focus:border-neutral-200 focus:bg-white rounded-xl px-5 py-4 text-[14px] text-neutral-800 focus:outline-none transition-all placeholder:text-neutral-400 font-semibold shadow-sm"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 mt-6">
              <button
                type="button"
                onClick={() => router.push("/admin/raw-materials/calorie-management")}
                className="w-36 py-3.5 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-500 font-semibold rounded-[20px] shadow-sm cursor-pointer transition-colors text-center text-[15px]"
              >
                Cancel
              </button>
              
              <div className="w-36">
                <ProbaeButton 
                  type="submit" 
                  disabled={isSaving}
                  className="py-3.5 rounded-[20px] text-[15px]"
                >
                  {isSaving && <BowlLoader className="w-4 h-4 animate-spin text-white mr-1.5" />}
                  Save
                </ProbaeButton>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
  );
}
