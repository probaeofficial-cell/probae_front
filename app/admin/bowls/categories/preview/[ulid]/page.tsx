"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, Utensils } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { endpoints } from "@/lib/apiService";
import { getMediaUrl } from "@/lib/utils";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { Bowl } from "@/lib/types";

export default function BowlCategoryPreviewPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const ulid = params.ulid as string;

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [bowls, setBowls] = useState<Bowl[]>([]);
  
  const [bgImageFilename, setBgImageFilename] = useState<string | null>(null);
  const [mainImageFilename, setMainImageFilename] = useState<string | null>(null);

  const [systemSettings, setSystemSettings] = useState({ R2_BASE_URL: "" });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/admin/login");
    }
  }, [user, authLoading, router]);

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
    if (user) fetchSystemSettings();
  }, [user]);

  useEffect(() => {
    async function loadCategory() {
      try {
        setError("");
        const category = await endpoints.bowlCategories.getBowlCategory(ulid);
        setName(category.name);
        setCode(category.code || "");
        setDescription(category.description || "");
        setBgImageFilename(category.background_image_filename || null);
        setMainImageFilename(category.image_filename || null);
        setBowls(category.bowls || []);
      } catch (err: any) {
        console.error("Failed to load category", err);
        setError("Failed to load bowl category details.");
      } finally {
        setIsLoading(false);
      }
    }

    if (!user) return;

    if (ulid && ulid !== "add") {
      loadCategory();
    } else {
      setIsLoading(false);
      setError("Invalid category ID.");
    }
  }, [ulid, user]);

  const currentBgImageUrl = getMediaUrl(systemSettings.R2_BASE_URL, bgImageFilename);
  const currentMainImageUrl = getMediaUrl(systemSettings.R2_BASE_URL, mainImageFilename);

  if (authLoading || !user) return null;

  return (
    <div className="flex flex-col flex-1 h-screen bg-[#E6E6E6] overflow-hidden p-4 sm:p-8">
      <Header />
      <div className="flex-1 overflow-auto scrollbar-thin w-full pb-12">
        <div className="w-full max-w-5xl mx-auto flex flex-col px-4 sm:px-0 mt-6 mb-6">
          <Breadcrumbs segments={["Bowl Categories", "Preview Category"]} />
          <div className="flex items-center gap-4 mt-4">
            <button 
              onClick={() => router.push("/admin/bowls/categories")} 
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-[32px] font-bold text-neutral-800 m-0">
              {name || "Loading..."}
            </h1>
          </div>
        </div>

        <div className="w-full max-w-5xl mx-auto px-4 sm:px-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
            <span className="text-neutral-500 font-medium">Loading category...</span>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-100 border border-red-200 rounded-xl text-red-700 font-semibold shadow-sm text-center">
            {error}
          </div>
        ) : (
          <div className="w-full flex flex-col relative rounded-[40px] overflow-hidden shadow-lg h-fit min-h-[700px]">
            {/* Background Layer */}
            <div className="absolute inset-0 bg-[#E6E6E6]">
              {currentBgImageUrl && (
                <div 
                  className="w-full h-full bg-cover bg-center opacity-80"
                  style={{ backgroundImage: `url(${currentBgImageUrl})` }}
                />
              )}
              {/* Optional overlay to adjust contrast */}
              <div className="absolute inset-0 bg-black/10"></div>
            </div>

            {/* Content Layer (Over Background) */}
            <div className="relative z-10 w-full flex flex-col h-full mt-10">

              {/* Glassmorphic Details Card */}
              <div className="mx-6 sm:mx-12 bg-white/40 backdrop-blur-2xl border border-white/50 rounded-[40px] p-6 lg:p-10 mb-8 flex flex-col lg:flex-row gap-8 lg:gap-10 shadow-[0_8px_32px_rgba(0,0,0,0.1)] items-center lg:items-stretch">
                {/* Left: Capsule Main Image */}
                <div className="w-[280px] sm:w-[320px] h-[320px] sm:h-[360px] border-2 border-white/70 rounded-[140px] sm:rounded-[160px] flex flex-col items-center justify-center overflow-hidden bg-white/20 shrink-0 shadow-inner relative">
                  {currentMainImageUrl ? (
                    <img src={currentMainImageUrl} alt="Main" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Utensils className="w-10 h-10 mb-2 text-white drop-shadow-md" />
                      <span className="font-semibold text-sm text-white drop-shadow-md text-center whitespace-pre-line">
                        No Image
                      </span>
                    </>
                  )}
                </div>

                {/* Right: Form Grid (Read Only) */}
                <div className="flex-1 flex flex-col gap-5 justify-start w-full">
                  {/* Row 1: Name */}
                  <div>
                    <label className="text-sm font-bold text-neutral-900 mb-1.5 block drop-shadow-sm">Name</label>
                    <input 
                      type="text" 
                      value={name}
                      readOnly
                      className="w-full h-[56px] bg-white rounded-xl px-4 outline-none text-neutral-800 font-medium shadow-sm cursor-default"
                    />
                  </div>

                  {/* Row 2: Code */}
                  <div>
                    <label className="text-sm font-bold text-neutral-900 mb-1.5 block drop-shadow-sm">Code</label>
                    <input 
                      type="text" 
                      value={code || "N/A"}
                      readOnly
                      className="w-full h-[56px] bg-white rounded-xl px-4 outline-none text-neutral-800 font-medium shadow-sm cursor-default"
                    />
                  </div>

                  {/* Row 3: Description */}
                  <div className="flex-1">
                    <label className="text-sm font-bold text-neutral-900 mb-1.5 block drop-shadow-sm">Description</label>
                    <textarea 
                      value={description || "No description provided."}
                      readOnly
                      className="w-full h-full min-h-[100px] bg-white rounded-xl p-4 outline-none resize-none text-neutral-800 font-medium shadow-sm cursor-default"
                    />
                  </div>
                </div>
              </div>

              {/* Table of Bowls below Glass Container */}
              <div className="mx-6 sm:mx-12 rounded-[24px] overflow-hidden backdrop-blur-xl bg-white/95 border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.1)] mb-8">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#6b0f9e] text-white text-[13px]">
                        <th className="px-6 py-4 font-semibold text-center border-r border-white/20 w-16">#</th>
                        <th className="px-6 py-4 font-semibold uppercase tracking-wider border-r border-white/20">BOWL CODE</th>
                        <th className="px-6 py-4 font-semibold uppercase tracking-wider border-r border-white/20">BOWL NAME</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 text-neutral-800 font-medium">
                      {bowls.map((item, index) => (
                        <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="px-6 py-4 text-center border-r border-neutral-200">
                            {String(index + 1).padStart(2, '0')}
                          </td>
                          <td className="px-6 py-4 border-r border-neutral-200 font-semibold text-neutral-600 font-mono text-sm">
                            {item.code || `B-${item.id}`}
                          </td>
                          <td className="px-6 py-4 border-r border-neutral-200 font-semibold text-neutral-900">
                            {item.name}
                          </td>
                        </tr>
                      ))}
                      {bowls.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-10 text-center text-neutral-500 font-medium">
                            No bowls in this category.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
