"use client";
import { BowlLoader } from "@/components/admin/BowlLoader";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, UploadCloud, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { endpoints } from "@/lib/apiService";
import { BowlCategoryUpdateInput, BowlCategoryCreateInput } from "@/lib/types";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { getMediaUrl } from "@/lib/utils";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";

export default function BowlCategoryFormPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const ulid = params.ulid as string;
  const isEditMode = ulid !== "add";

  // Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  
  // Image states
  const [bgImageFile, setBgImageFile] = useState<File | null>(null);
  const [bgImagePreview, setBgImagePreview] = useState<string | null>(null);
  const [bgImageFilename, setBgImageFilename] = useState<string | null>(null);

  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const [mainImageFilename, setMainImageFilename] = useState<string | null>(null);

  const bgImageInputRef = useRef<HTMLInputElement>(null);
  const mainImageInputRef = useRef<HTMLInputElement>(null);

  // System Settings for resolving existing images
  const [systemSettings, setSystemSettings] = useState({ R2_BASE_URL: "" });

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [error, setError] = useState("");

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/admin/login");
    }
  }, [user, authLoading, router]);

  // Load system settings (for R2 URL)
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
    if (user) {
      fetchSystemSettings();
    }
  }, [user]);

  // Load Category Data if Edit
  useEffect(() => {
    async function loadCategory() {
      if (!isEditMode) return;
      try {
        const category = await endpoints.bowlCategories.getBowlCategory(ulid);
        setName(category.name);
        setCode(category.code || "");
        setDescription(category.description || "");
        setBgImageFilename(category.background_image_filename || null);
        setMainImageFilename(category.image_filename || null);
      } catch (err: any) {
        console.error(err);
        setError("Failed to load bowl category details.");
      } finally {
        setIsLoading(false);
      }
    }
    if (user && isEditMode) {
      loadCategory();
    }
  }, [ulid, isEditMode, user]);

  // ─── Document Upload Helpers (Direct R2) ───────────────────────────────────
  const uploadFileToR2 = async (file: File): Promise<string> => {
    const uploadRes = await endpoints.documents.upload(file);
    return uploadRes.filename;
  };

  // ─── Image Handlers ────────────────────────────────────────────────────────
  const handleBgImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBgImageFile(file);
      setBgImagePreview(URL.createObjectURL(file));
      setBgImageFilename(null);
    }
  };

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMainImageFile(file);
      setMainImagePreview(URL.createObjectURL(file));
      setMainImageFilename(null);
    }
  };

  const removeBgImage = () => {
    setBgImageFile(null);
    setBgImagePreview(null);
    setBgImageFilename(null);
    if (bgImageInputRef.current) bgImageInputRef.current.value = "";
  };

  const removeMainImage = () => {
    setMainImageFile(null);
    setMainImagePreview(null);
    setMainImageFilename(null);
    if (mainImageInputRef.current) mainImageInputRef.current.value = "";
  };

  // ─── Save Handler ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      let finalBgImage = bgImageFilename;
      let finalMainImage = mainImageFilename;

      if (bgImageFile) {
        finalBgImage = await uploadFileToR2(bgImageFile);
      }
      if (mainImageFile) {
        finalMainImage = await uploadFileToR2(mainImageFile);
      }

      if (isEditMode) {
        const payload: BowlCategoryUpdateInput = {
          name,
          code: code || undefined,
          description: description || undefined,
          background_image_filename: finalBgImage || undefined,
          image_filename: finalMainImage || undefined,
        };
        await endpoints.bowlCategories.updateBowlCategory(ulid, payload);
      } else {
        const payload: BowlCategoryCreateInput = {
          name,
          code: code || undefined,
          description: description || undefined,
          background_image_filename: finalBgImage || undefined,
          image_filename: finalMainImage || undefined,
        };
        await endpoints.bowlCategories.createBowlCategory(payload);
      }

      router.push("/admin/bowls/categories");
    } catch (err: any) {
      console.error(err);
      setError(err.detail || err.message || "Failed to save bowl category.");
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fafafa]">
        <div className="flex flex-col items-center gap-3">
          <BowlLoader className="w-8 h-8 text-neutral-400 animate-spin" />
          <div className="text-neutral-500 font-medium">Loading form...</div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-col flex-1 h-screen bg-[#fafafa] overflow-hidden">
      <div className="p-4 sm:p-8 h-full flex flex-col bg-[#E6E6E6] overflow-hidden">
        <Header />

        <Breadcrumbs 
          segments={["Bowl Categories", isEditMode ? "Edit Bowl Category" : "Add Bowl Category"]}
        />

        <div className="flex-1 overflow-y-auto scrollbar-thin mt-2 pb-8">
          <div className="max-w-4xl mx-auto w-full">
            <div className="bg-white rounded-[32px] p-6 sm:p-8 shadow-sm border border-neutral-100/50 mb-8">
              
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-neutral-100">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => router.back()}
                    className="w-10 h-10 bg-neutral-50 hover:bg-neutral-100 rounded-2xl flex items-center justify-center text-neutral-600 transition-colors border border-neutral-200/60 shadow-sm"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h1 className="text-2xl font-bold text-neutral-800">
                    {isEditMode ? "Edit Bowl Category" : "Add Bowl Category"}
                  </h1>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => router.push("/admin/bowls/categories")}
                    className="px-6 py-2.5 rounded-[16px] text-sm font-semibold text-neutral-600 bg-white border-2 border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-900 transition-all active:scale-95 flex items-center justify-center min-w-[100px]"
                  >
                    Cancel
                  </button>
                  <ProbaeButton onClick={handleSave} disabled={isSaving} className="px-8 font-semibold text-sm h-11">
                    {isSaving ? (
                      <span className="flex items-center gap-2">
                        <BowlLoader className="w-4 h-4 animate-spin" /> Saving...
                      </span>
                    ) : (
                      "Save"
                    )}
                  </ProbaeButton>
                </div>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-medium">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* ─── Images Section ─── */}
                <div className="flex-1 flex flex-col gap-6">
                  {/* Main Image Upload */}
                  <div 
                    onClick={() => mainImageInputRef.current?.click()}
                    className="w-full h-[180px] border-2 border-dashed border-neutral-800 rounded-[24px] flex flex-col items-center justify-center cursor-pointer relative group overflow-hidden"
                  >
                    {mainImagePreview || mainImageFilename ? (
                      <img src={(mainImagePreview || (mainImageFilename ? getMediaUrl(systemSettings.R2_BASE_URL, mainImageFilename) : undefined)) as string} alt="Main" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <>
                        <UploadCloud className="w-10 h-10 mb-2 text-black" />
                        <span className="font-semibold text-sm text-black text-center whitespace-pre-line">
                          {"Drag main image\nto Upload"}
                        </span>
                      </>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                      <span className="text-white font-bold tracking-wider text-sm">CHANGE MAIN</span>
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      ref={mainImageInputRef} 
                      onChange={handleMainImageChange}
                      className="hidden" 
                    />
                  </div>

                  {/* Background Image Upload */}
                  <div 
                    onClick={() => bgImageInputRef.current?.click()}
                    className="w-full h-[180px] border-2 border-dashed border-neutral-800 rounded-[24px] flex flex-col items-center justify-center cursor-pointer relative group overflow-hidden"
                  >
                    {bgImagePreview || bgImageFilename ? (
                      <img src={(bgImagePreview || (bgImageFilename ? getMediaUrl(systemSettings.R2_BASE_URL, bgImageFilename) : undefined)) as string} alt="Background" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <>
                        <UploadCloud className="w-10 h-10 mb-2 text-black" />
                        <span className="font-semibold text-sm text-black text-center whitespace-pre-line">
                          {"Drag background image\nto Upload"}
                        </span>
                      </>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                      <span className="text-white font-bold tracking-wider text-sm">CHANGE BG</span>
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      ref={bgImageInputRef} 
                      onChange={handleBgImageChange}
                      className="hidden" 
                    />
                  </div>
                </div>

                {/* ─── Details Section ─── */}
                <div className="flex-1 flex flex-col gap-5">
                  <div>
                    <label className="text-sm font-semibold text-neutral-800 mb-2 block">
                      Name
                    </label>
                    <input
                      type="text"
                      className="w-full h-[52px] bg-neutral-100 rounded-[16px] px-4 outline-none text-neutral-800 font-medium placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-200"
                      placeholder="e.g. Signature Bowls"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-neutral-800 mb-2 block">
                      Category Code
                    </label>
                    <input
                      type="text"
                      className="w-full h-[52px] bg-neutral-100 rounded-[16px] px-4 outline-none text-neutral-800 font-medium placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-200"
                      placeholder="e.g. BOWL-CAT-01"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-semibold text-neutral-800 mb-2 block">
                      Description
                    </label>
                    <textarea
                      className="w-full h-[180px] bg-neutral-100 rounded-[24px] p-4 outline-none resize-none text-neutral-800 font-medium focus:ring-2 focus:ring-neutral-200"
                      placeholder="Describe this category..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
