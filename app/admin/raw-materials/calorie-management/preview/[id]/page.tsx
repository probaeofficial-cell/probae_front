"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Wheat } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { endpoints } from "@/lib/apiService";
import { getMediaUrl } from "@/lib/utils";
import { RawMaterial } from "@/lib/types";

interface PageProps {
  params: {
    id: string;
  };
}

export default function MacrosPreviewPage({ params }: PageProps) {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [material, setMaterial] = useState<RawMaterial | null>(null);
  const [systemSettings, setSystemSettings] = useState({ R2_BASE_URL: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [materialUlid, setMaterialUlid] = useState<string | null>(null);

  // Resolve params asynchronously (consistent with Next.js 15+)
  useEffect(() => {
    async function resolveParams() {
      const resolved = await (params as any);
      setMaterialUlid(resolved.id);
    }
    resolveParams();
  }, [params]);

  // Load raw material details and settings
  useEffect(() => {
    async function loadData() {
      if (!user || !materialUlid) return;
      setIsLoading(true);
      try {
        const settings = await endpoints.settings.getSystemSettings();
        if (settings && settings.R2_BASE_URL !== undefined) {
          setSystemSettings({ R2_BASE_URL: settings.R2_BASE_URL });
        }

        const data = await endpoints.rawMaterials.getRawMaterial(materialUlid);
        setMaterial(data);
      } catch (error) {
        console.error("Error loading raw material for preview:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [user, materialUlid]);

  // Auth check redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/admin/login");
    }
  }, [user, authLoading, router]);

  if (authLoading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fafafa]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#6b21a8] animate-spin" />
          <span className="text-neutral-500 font-medium">Loading preview...</span>
        </div>
      </div>
    );
  }

  if (!user || !material) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#E6E6E6]">
        <div className="text-center">
          <p className="text-neutral-600 font-bold mb-4">Raw material not found</p>
          <button
            onClick={() => router.push("/admin/raw-materials/calorie-management")}
            className="px-6 py-2 bg-[var(--color-pro-purple)] text-white rounded-full font-bold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const primaryImageUrl = getMediaUrl(systemSettings.R2_BASE_URL, material.image_filename);
  const backgroundUrl = getMediaUrl(systemSettings.R2_BASE_URL, material.background_image_filename);

  // Styling helpers
  const defaultBg = "linear-gradient(135deg, #1e1b4b 0%, #311042 100%)";

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6] relative overflow-hidden text-neutral-800">
      {/* Main Page Layout */}
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-transparent overflow-hidden z-10 relative">
        {/* Header Bar */}
        <Header />

        {/* Uniform Breadcrumbs */}
        <Breadcrumbs segments={["Raw Material", "Calorie Mgt", "Macros Preview"]} />

        {/* Main Content Area */}
        <div className="flex-1 relative rounded-[32px] overflow-hidden shadow-lg mt-4 flex items-center justify-center p-4">
          {/* Background Image with Fallback and Tint Overlay */}
          <div className="absolute inset-0 z-0">
            {backgroundUrl ? (
              <img
                src={backgroundUrl}
                alt="background"
                className="w-full h-full object-cover"
              />
            ) : (
              <div 
                className="w-full h-full"
                style={{ background: defaultBg }}
              />
            )}
            {/* Faint Dark Overlay to ensure readability and contrast */}
            <div className="absolute inset-0 bg-black/25" />
          </div>

          {/* Header controls (Top Left Back Button & Badge) */}
          <div className="absolute top-6 left-6 z-20 flex items-center gap-3">
            <button
              onClick={() => router.push("/admin/raw-materials/calorie-management")}
              className="w-12 h-12 rounded-xl bg-black/15 hover:bg-black/25 text-neutral-800 flex items-center justify-center transition-all cursor-pointer backdrop-blur-[2px]"
            >
              <ArrowLeft className="w-5 h-5 text-neutral-800" />
            </button>
            <div className="px-4 h-12 bg-black/15 rounded-xl text-[15px] font-medium text-neutral-800 flex items-center justify-center select-none backdrop-blur-[2px]">
              Macros Preview
            </div>
          </div>

          {/* Centered White Card */}
          <div className="relative bg-white rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-12 max-w-2xl w-full pl-56 pr-12 flex flex-col justify-center min-h-[300px] z-10 select-none mx-auto">
            
            {/* Overlapping Primary Image on the Left */}
            <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-64 h-[380px] z-20 flex items-center justify-center pointer-events-none">
              {primaryImageUrl ? (
                <img
                  src={primaryImageUrl}
                  alt={material.name}
                  className="w-full h-full object-contain filter drop-shadow-[0_15px_25px_rgba(0,0,0,0.2)] animate-fade-in"
                />
              ) : (
                <div className="w-40 h-40 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 border border-neutral-200">
                  <Wheat className="w-16 h-16" />
                </div>
              )}
            </div>

            {/* Card Content Column */}
            <div className="w-full flex flex-col gap-4">
              
              {/* ID badge with outline border and filled circular tag */}
              <div className="border border-[#6A0FAD] rounded-full flex items-center h-7 w-64 overflow-hidden bg-white/10 select-none">
                <div className="bg-[#6A0FAD] text-white text-[13px] font-extrabold px-6 h-full flex items-center justify-center rounded-full min-w-[70px]">
                  A{material.id}
                </div>
              </div>

              {/* Title and Calorie Badge */}
              <div className="flex items-center gap-4 mt-2">
                <h1 className="text-4xl font-extrabold text-neutral-800 tracking-tight leading-none font-poppins">
                  {material.name}
                </h1>
                <div className="bg-[#21BA45] text-white px-3 py-1 rounded-[8px] text-[13px] font-bold shadow-sm select-none">
                  {material.calories || 0} Kcal
                </div>
              </div>

              {/* 4 Macros list */}
              <div className="flex flex-col gap-1 mt-3">
                <div className="flex justify-start gap-6">
                  <div className="flex flex-col items-center">
                    <span className="text-[14px] text-neutral-800 font-medium mb-1.5 font-poppins">Protein</span>
                    <div className="bg-[#6A0FAD] text-white text-base font-bold w-[60px] h-[54px] rounded-[16px] flex items-center justify-center shadow-sm">
                      {material.protein || 0}g
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <span className="text-[14px] text-neutral-800 font-medium mb-1.5 font-poppins">Carb</span>
                    <div className="bg-[#6A0FAD] text-white text-base font-bold w-[60px] h-[54px] rounded-[16px] flex items-center justify-center shadow-sm">
                      {material.carbs || 0}g
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="text-[14px] text-neutral-800 font-medium mb-1.5 font-poppins">Fiber</span>
                    <div className="bg-[#6A0FAD] text-white text-base font-bold w-[60px] h-[54px] rounded-[16px] flex items-center justify-center shadow-sm">
                      {material.fiber || 0}g
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="text-[14px] text-neutral-800 font-medium mb-1.5 font-poppins">Fat</span>
                    <div className="bg-[#6A0FAD] text-white text-base font-bold w-[60px] h-[54px] rounded-[16px] flex items-center justify-center shadow-sm">
                      {material.fat || 0}g
                    </div>
                  </div>
                </div>
              </div>

              {/* Micros display */}
              <div className="w-full text-left mt-3 select-none font-poppins">
                <span className="text-[14px] font-bold text-neutral-800 block mb-0.5">Micros</span>
                <p className="text-[13px] text-neutral-400 font-medium">
                  {material.micros && material.micros.length > 0 
                    ? material.micros.join(", ") 
                    : "None"}
                </p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
