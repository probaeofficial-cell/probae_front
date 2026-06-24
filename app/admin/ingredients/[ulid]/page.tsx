"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, Plus, X, UploadCloud, Trash2, Pencil } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { endpoints } from "@/lib/apiService";
import { IngredientUpdateInput, IngredientCreateInput, RawMaterial } from "@/lib/types";
import { AddIngredientRawMaterialModal } from "@/components/admin/AddIngredientRawMaterialModal";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { getMediaUrl } from "@/lib/utils";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";

export default function IngredientFormPage() {
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

  // Selected Raw Materials
  const [selectedRawMaterials, setSelectedRawMaterials] = useState<Array<{
    material: RawMaterial;
    weight: number;
    calculatedCalories: number;
    calculatedPrice: number;
    calculatedProtein: number;
    calculatedCarbs: number;
    calculatedFat: number;
    calculatedFiber: number;
  }>>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRawMaterialIndex, setEditingRawMaterialIndex] = useState<number | null>(null);

  // Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateMaterialName, setDuplicateMaterialName] = useState("");

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

  // Load Ingredient Data if Edit
  useEffect(() => {
    async function loadIngredient() {
      if (!isEditMode) return;
      try {
        const ingredient = await endpoints.ingredients.getIngredient(ulid);
        setName(ingredient.name);
        setCode(ingredient.code || "");
        setDescription(ingredient.description || "");
        setBgImageFilename(ingredient.background_image_filename || null);
        setMainImageFilename(ingredient.image_filename || null);

        // Fetch all raw materials to resolve details
        let allItems: RawMaterial[] = [];
        let currentPage = 1;
        while (true) {
          const res = await endpoints.rawMaterials.getRawMaterials(currentPage, 100);
          allItems = [...allItems, ...res.items];
          if (res.items.length < 100) break;
          currentPage++;
        }
        const resolvedRawMaterials = await Promise.all(
          ingredient.raw_materials.map(async (rm: any) => {
            const material = allItems.find((m: RawMaterial) => m.id === rm.raw_material_id);
            if (!material) return null;

            const weight = rm.weight_g_or_ml;
            const fraction = weight / 100.0;
            let baseUnitWeight = 1.0;
            if (material.unit === "kg" || material.unit === "l") {
              baseUnitWeight = 1000.0;
            }
            const calculatedPrice = (Number(material.price) / baseUnitWeight) * weight;

            return {
              material,
              weight,
              calculatedCalories: Number(material.calories || 0) * fraction,
              calculatedPrice: calculatedPrice,
              calculatedProtein: Number(material.protein || 0) * fraction,
              calculatedCarbs: Number(material.carbs || 0) * fraction,
              calculatedFat: Number(material.fat || 0) * fraction,
              calculatedFiber: Number(material.fiber || 0) * fraction,
            };
          })
        );

        setSelectedRawMaterials(resolvedRawMaterials.filter((x): x is NonNullable<typeof x> => x !== null));
      } catch (err: any) {
        setError("Failed to load ingredient");
      } finally {
        setIsLoading(false);
      }
    }
    
    if (user && isEditMode) {
      loadIngredient();
    }
  }, [user, ulid, isEditMode]);

  // Image Handlers
  const handleBgImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBgImageFile(file);
      const url = URL.createObjectURL(file);
      setBgImagePreview(url);
    }
  };

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMainImageFile(file);
      const url = URL.createObjectURL(file);
      setMainImagePreview(url);
    }
  };

  const handleAddRawMaterial = (material: RawMaterial, weight: number, editIndex?: number | null) => {
    const isDuplicate = selectedRawMaterials.some(
      (item, index) => item.material.id === material.id && index !== editIndex
    );

    if (isDuplicate) {
      setDuplicateMaterialName(material.name);
      setIsDuplicateModalOpen(true);
      return;
    }

    const fraction = weight / 100.0;
    let baseUnitWeight = 1.0;
    if (material.unit === "kg" || material.unit === "l") {
      baseUnitWeight = 1000.0;
    }
    const calculatedPrice = (Number(material.price) / baseUnitWeight) * weight;

    const newItem = {
      material,
      weight,
      calculatedCalories: Number(material.calories || 0) * fraction,
      calculatedPrice: calculatedPrice,
      calculatedProtein: Number(material.protein || 0) * fraction,
      calculatedCarbs: Number(material.carbs || 0) * fraction,
      calculatedFat: Number(material.fat || 0) * fraction,
      calculatedFiber: Number(material.fiber || 0) * fraction,
    };

    if (editIndex !== undefined && editIndex !== null) {
      setSelectedRawMaterials((prev) => {
        const updated = [...prev];
        updated[editIndex] = newItem;
        return updated;
      });
    } else {
      setSelectedRawMaterials((prev) => [...prev, newItem]);
    }
  };

  const handleRemoveRawMaterial = (index: number) => {
    setItemToDelete(index);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete !== null) {
      setSelectedRawMaterials((prev) => prev.filter((_, i) => i !== itemToDelete));
      setItemToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

  const handleEditRawMaterial = (index: number) => {
    setEditingRawMaterialIndex(index);
    setIsModalOpen(true);
  };

  const handleUpdateWeight = (index: number, newWeight: number) => {
    if (!newWeight || newWeight <= 0) {
      newWeight = 0;
    }
    
    setSelectedRawMaterials((prev) => {
      const updated = [...prev];
      const item = updated[index];
      const fraction = newWeight / 100.0;
      let baseUnitWeight = 1.0;
      if (item.material.unit === "kg" || item.material.unit === "l") {
        baseUnitWeight = 1000.0;
      }
      const calculatedPrice = (Number(item.material.price) / baseUnitWeight) * newWeight;

      updated[index] = {
        ...item,
        weight: newWeight,
        calculatedCalories: Number(item.material.calories || 0) * fraction,
        calculatedPrice: calculatedPrice,
        calculatedProtein: Number(item.material.protein || 0) * fraction,
        calculatedCarbs: Number(item.material.carbs || 0) * fraction,
        calculatedFat: Number(item.material.fat || 0) * fraction,
        calculatedFiber: Number(item.material.fiber || 0) * fraction,
      };
      return updated;
    });
  };

  const handleClearAll = () => {
    setSelectedRawMaterials([]);
  };

  const uploadImages = async () => {
    let finalBgFilename = bgImageFilename;
    let finalMainFilename = mainImageFilename;

    if (bgImageFile) {
      const uploadRes = await endpoints.documents.upload(bgImageFile);
      finalBgFilename = uploadRes.filename;
    }

    if (mainImageFile) {
      const uploadRes = await endpoints.documents.upload(mainImageFile);
      finalMainFilename = uploadRes.filename;
    }

    return { finalBgFilename, finalMainFilename };
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const { finalBgFilename, finalMainFilename } = await uploadImages();

      const basePayload = {
        name,
        code: code || undefined,
        description: description || undefined,
        background_image_filename: finalBgFilename || undefined,
        image_filename: finalMainFilename || undefined,
        raw_materials: selectedRawMaterials.map(rm => ({
          raw_material_id: rm.material.id,
          weight_g_or_ml: rm.weight
        }))
      };

      if (isEditMode) {
        await endpoints.ingredients.updateIngredient(ulid, basePayload);
      } else {
        await endpoints.ingredients.createIngredient(basePayload as IngredientCreateInput);
      }
      
      router.push("/admin/ingredients");
    } catch (err: any) {
      console.error("Failed to save ingredient", err);
      setError(err.message || "Failed to save ingredient");
    } finally {
      setIsSaving(false);
    }
  };

  // Derived Totals
  const totalWeight = selectedRawMaterials.reduce((acc, curr) => acc + curr.weight, 0);
  const totalCal = selectedRawMaterials.reduce((acc, curr) => acc + curr.calculatedCalories, 0);
  const totalPrice = selectedRawMaterials.reduce((acc, curr) => acc + curr.calculatedPrice, 0);
  const totalProtein = selectedRawMaterials.reduce((acc, curr) => acc + curr.calculatedProtein, 0);
  const totalCarbs = selectedRawMaterials.reduce((acc, curr) => acc + curr.calculatedCarbs, 0);
  const totalFat = selectedRawMaterials.reduce((acc, curr) => acc + curr.calculatedFat, 0);
  const totalFiber = selectedRawMaterials.reduce((acc, curr) => acc + curr.calculatedFiber, 0);

  // Collect all unique micros from selected raw materials
  const allMicros = new Set<string>();
  selectedRawMaterials.forEach(rm => {
    if (rm.material.micros) {
      rm.material.micros.forEach(micro => allMicros.add(micro));
    }
  });
  const microsString = Array.from(allMicros).join(", ");

  // Resolve Image URLs for rendering
  const currentBgImageUrl = bgImagePreview || getMediaUrl(systemSettings.R2_BASE_URL, bgImageFilename);
  const currentMainImageUrl = mainImagePreview || getMediaUrl(systemSettings.R2_BASE_URL, mainImageFilename);

  if (authLoading || !user) return null;

  return (
    <div className="flex flex-col flex-1 h-screen bg-[#E6E6E6] overflow-hidden p-4 sm:p-8">
      <Header />
      <div className="w-full max-w-5xl mx-auto flex flex-col px-4 sm:px-0">
        <Breadcrumbs segments={["Ingredients", isEditMode ? "Edit" : "Create"]} />
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => router.push("/admin/ingredients")} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-bold text-neutral-800 m-0">{isEditMode ? "Edit Ingredient" : "Create Ingredient"}</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin flex flex-col items-center">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
            <span className="text-neutral-500 font-medium">Loading ingredient...</span>
          </div>
        ) : (
          <div className="w-full max-w-5xl flex flex-col pb-20">
            {error && (
              <div className="mb-6 p-4 bg-red-100 border border-red-200 rounded-xl text-red-700 font-semibold shadow-sm text-center">
                {error}
              </div>
            )}

            {/* Section 1: Basic Info & Image Uploads */}
            <div className="bg-white rounded-[32px] shadow-sm border border-neutral-100 p-8 mb-8 flex flex-col lg:flex-row gap-8">
              {/* Left: Two dashed boxes for images */}
              <div className="flex flex-col gap-4 w-full lg:w-[280px]">
                {/* Main Image Upload */}
                <div 
                  onClick={() => mainImageInputRef.current?.click()}
                  className="w-full h-[180px] border-2 border-dashed border-neutral-800 rounded-[24px] flex flex-col items-center justify-center cursor-pointer relative group overflow-hidden"
                >
                  {currentMainImageUrl ? (
                    <img src={currentMainImageUrl} alt="Main" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
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
                  {currentBgImageUrl ? (
                    <img src={currentBgImageUrl} alt="Background" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
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

              {/* Right: Inputs */}
              <div className="flex-1 flex flex-col gap-5">
                <div>
                  <label className="text-sm font-semibold text-neutral-800 mb-2 block">Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Orange"
                    className="w-full h-[52px] bg-neutral-100 rounded-[16px] px-4 outline-none text-neutral-800 font-medium placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-200"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-neutral-800 mb-2 block">Code</label>
                  <input 
                    type="text" 
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. SSC"
                    className="w-full h-[52px] bg-neutral-100 rounded-[16px] px-4 outline-none text-neutral-800 font-medium placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-200"
                  />
                </div>

                <div className="flex-1">
                  <label className="text-sm font-semibold text-neutral-800 mb-2 block">Description</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full h-[180px] bg-neutral-100 rounded-[24px] p-4 outline-none resize-none text-neutral-800 font-medium focus:ring-2 focus:ring-neutral-200"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Raw Materials Table */}
            <div className="bg-white rounded-[32px] shadow-sm border border-neutral-100 overflow-hidden mb-8">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-[#6A0FAD] text-white text-sm">
                      <th className="px-6 py-4 font-semibold w-16 text-center border-r border-white/20">#</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wider border-r border-white/20">RAW MATERIAL</th>
                      <th className="px-6 py-4 font-semibold uppercase tracking-wider text-center border-r border-white/20">WEIGHT (g)</th>
                      <th className="px-6 py-4 font-semibold text-center border-r border-white/20">Cal</th>
                      <th className="px-6 py-4 font-semibold text-center border-r border-white/20">Price</th>
                      <th className="px-4 py-4 font-semibold text-center border-r border-white/20">P</th>
                      <th className="px-4 py-4 font-semibold text-center border-r border-white/20">C</th>
                      <th className="px-4 py-4 font-semibold text-center border-r border-white/20">F</th>
                      <th className="px-4 py-4 font-semibold text-center border-r border-white/20">Fa</th>
                      <th className="px-4 py-4 font-semibold text-center uppercase tracking-wider">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {selectedRawMaterials.map((item, index) => (
                      <tr key={index} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-6 py-4 text-center text-neutral-500 font-medium border-r border-neutral-100">
                          {String(index + 1).padStart(2, '0')}
                        </td>
                        <td className="px-6 py-4 text-neutral-800 border-r border-neutral-100">
                          {item.material.name}
                        </td>
                        <td className="px-6 py-4 text-center border-r border-neutral-100">
                          <div className="flex items-center justify-center bg-neutral-100 rounded-lg px-2 py-1.5 w-24 mx-auto focus-within:ring-2 focus-within:ring-[#6A0FAD]/20 transition-all">
                            <input
                              type="number"
                              value={item.weight || ""}
                              onChange={(e) => handleUpdateWeight(index, parseFloat(e.target.value))}
                              className="w-full text-center bg-transparent font-bold text-neutral-800 outline-none"
                            />
                            <span className="text-xs font-semibold text-neutral-500 ml-1">g</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-neutral-500 font-medium border-r border-neutral-100">
                          {Math.round(item.calculatedCalories)}kcal
                        </td>
                        <td className="px-6 py-4 text-center text-neutral-500 font-medium border-r border-neutral-100">
                          ₹{Math.round(item.calculatedPrice)}
                        </td>
                        <td className="px-4 py-4 text-center text-neutral-400 font-medium border-r border-neutral-100">
                          {Math.round(item.calculatedProtein)}g
                        </td>
                        <td className="px-4 py-4 text-center text-neutral-400 font-medium border-r border-neutral-100">
                          {Math.round(item.calculatedCarbs)}g
                        </td>
                        <td className="px-4 py-4 text-center text-neutral-400 font-medium border-r border-neutral-100">
                          {Math.round(item.calculatedFiber)}g
                        </td>
                        <td className="px-4 py-4 text-center text-neutral-400 font-medium border-r border-neutral-100">
                          {Math.round(item.calculatedFat)}g
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => handleEditRawMaterial(index)}
                              className="w-8 h-8 bg-neutral-100 hover:bg-neutral-200 rounded-full flex items-center justify-center text-neutral-600 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleRemoveRawMaterial(index)}
                              className="w-8 h-8 bg-neutral-100 hover:bg-neutral-200 rounded-full flex items-center justify-center text-[#6A0FAD] transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {selectedRawMaterials.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-6 py-12 text-center text-neutral-400 font-medium">
                          No raw materials added yet. Click "+ Add Raw" to build this ingredient.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-white border-t border-neutral-100">
                <button 
                  onClick={() => {
                    setEditingRawMaterialIndex(null);
                    setIsModalOpen(true);
                  }}
                  className="flex items-center gap-2 text-neutral-800 font-semibold hover:text-black transition-colors px-4 py-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Raw
                </button>
                {selectedRawMaterials.length > 0 && (
                  <button 
                    onClick={handleClearAll}
                    className="flex items-center gap-2 text-neutral-800 font-semibold hover:text-black transition-colors px-4 py-2"
                  >
                    <X className="w-5 h-5" />
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Section 3: Calculated Totals & Macros */}
            <div className="bg-white rounded-[32px] shadow-sm border border-neutral-100 p-8 mb-8 flex flex-col lg:flex-row gap-8 justify-between items-start">
              
              {/* Left: Calorie, Micros, Price, Weight */}
              <div className="flex flex-col gap-4 w-full lg:w-[450px]">
                <div>
                  <label className="text-sm font-semibold text-neutral-800 mb-2 block pl-1">Calorie</label>
                  <div className="h-[52px] bg-neutral-100 rounded-[16px] px-6 flex items-center text-neutral-500 font-medium text-lg border border-neutral-200">
                    {Math.round(totalCal)} Kcal
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-neutral-800 mb-2 block pl-1">Micros</label>
                  <div className="h-[52px] bg-neutral-100 rounded-[16px] px-6 flex items-center text-neutral-500 font-medium truncate border border-neutral-200">
                    {microsString || "None"}
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-semibold text-neutral-800 mb-2 block pl-1">Price</label>
                    <div className="h-[52px] bg-[#4CAF50] rounded-[16px] px-6 flex items-center text-white font-medium text-lg">
                      ₹{Math.round(totalPrice)}
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-semibold text-neutral-800 mb-2 block pl-1">Weight</label>
                    <div className="h-[52px] bg-[#4CAF50] rounded-[16px] px-6 flex items-center text-white font-medium text-lg">
                      {Math.round(totalWeight)}g
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Macro Cards (Grid of 2x2) */}
              <div className="grid grid-cols-2 gap-4 sm:gap-6 mt-6 lg:mt-0 flex-shrink-0">
                <div className="w-[100px] flex flex-col rounded-[16px] overflow-hidden border border-neutral-300">
                  <div className="bg-[#111111] text-white flex items-center justify-center py-5 text-xl font-semibold">
                    {Math.round(totalProtein)}g
                  </div>
                  <div className="bg-white text-black flex items-center justify-center py-2 text-sm font-semibold">
                    Protein
                  </div>
                </div>
                <div className="w-[100px] flex flex-col rounded-[16px] overflow-hidden border border-neutral-300">
                  <div className="bg-[#111111] text-white flex items-center justify-center py-5 text-xl font-semibold">
                    {Math.round(totalCarbs)}g
                  </div>
                  <div className="bg-white text-black flex items-center justify-center py-2 text-sm font-semibold">
                    Carb
                  </div>
                </div>
                <div className="w-[100px] flex flex-col rounded-[16px] overflow-hidden border border-neutral-300">
                  <div className="bg-[#111111] text-white flex items-center justify-center py-5 text-xl font-semibold">
                    {Math.round(totalFiber)}g
                  </div>
                  <div className="bg-white text-black flex items-center justify-center py-2 text-sm font-semibold">
                    Fiber
                  </div>
                </div>
                <div className="w-[100px] flex flex-col rounded-[16px] overflow-hidden border border-neutral-300">
                  <div className="bg-[#111111] text-white flex items-center justify-center py-5 text-xl font-semibold">
                    {Math.round(totalFat)}g
                  </div>
                  <div className="bg-white text-black flex items-center justify-center py-2 text-sm font-semibold">
                    Fat
                  </div>
                </div>
              </div>

            </div>

            {/* Section 4: Actions */}
            <div className="flex items-center justify-center gap-6 pb-10">
              <button
                onClick={() => router.push("/admin/ingredients")}
                className="px-10 py-3.5 bg-white text-neutral-500 font-bold rounded-[20px] transition-colors shadow-sm text-lg w-[160px] border border-neutral-200 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <div className="w-[160px]">
                <ProbaeButton
                  onClick={handleSave}
                  disabled={isSaving}
                  className="py-3.5 text-lg rounded-[20px]"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  Save
                </ProbaeButton>
              </div>
            </div>

          </div>
        )}
      </div>

      <AddIngredientRawMaterialModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRawMaterialIndex(null);
        }}
        onAdd={handleAddRawMaterial}
        initialMaterial={editingRawMaterialIndex !== null ? selectedRawMaterials[editingRawMaterialIndex].material : null}
        initialWeight={editingRawMaterialIndex !== null ? selectedRawMaterials[editingRawMaterialIndex].weight : null}
        editIndex={editingRawMaterialIndex}
      />
      {/* Duplicate Warning Modal */}
      <ConfirmationModal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        title="Already Added"
        message={`${duplicateMaterialName} has already been added to this ingredient. Please choose a different material or edit the existing one.`}
        type="warning"
        confirmText="OK"
        onConfirm={() => setIsDuplicateModalOpen(false)}
        cancelText="Close"
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        title="Remove Raw Material"
        message="Are you sure you want to remove this raw material from the ingredient? This will update the total calories, macros, and price."
        type="delete"
        confirmText="Remove"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
