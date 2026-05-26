"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Filter, 
  X, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  Wheat,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Plus
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { endpoints } from "@/lib/apiService";
import { getMediaUrl } from "@/lib/utils";
import { RawMaterial, UnitType, MacrosUpdatePayload } from "@/lib/types";

export default function CalorieManagementPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // ─── State Variables ───────────────────────────────────────────────────────
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [totalMaterials, setTotalMaterials] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10); // Standard grid size
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [systemSettings, setSystemSettings] = useState({ R2_BASE_URL: "" });
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);

  // Form State for editing macros
  const [formState, setFormState] = useState({
    calories: "" as number | "",
    protein: "" as number | "",
    carbs: "" as number | "",
    fiber: "" as number | "",
    fat: "" as number | "",
    micros: [] as string[],
  });
  
  // Micronutrient tag builder state
  const [newTagInput, setNewTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Notifications State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // ─── Side Effects ──────────────────────────────────────────────────────────
  // Auth validation
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/admin/login");
    }
  }, [user, authLoading, router]);

  // Load system settings
  useEffect(() => {
    async function fetchSystemSettings() {
      try {
        const data = await endpoints.settings.getSystemSettings();
        if (data && data.R2_BASE_URL !== undefined) {
          setSystemSettings({ R2_BASE_URL: data.R2_BASE_URL });
        }
      } catch (error) {
        console.error("Error fetching system settings:", error);
      }
    }
    if (user) {
      fetchSystemSettings();
    }
  }, [user]);

  // Search Debouncing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset page to 1 when search query changes
    }, 450);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load Raw Materials
  const fetchMaterials = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await endpoints.rawMaterials.getRawMaterials(page, pageSize, debouncedSearch);
      setMaterials(data.items || []);
      setTotalMaterials(data.total || 0);
    } catch (error: any) {
      console.error("Error loading raw materials:", error);
      showToast(error.message || "Failed to load raw materials", "error");
    } finally {
      setIsLoading(false);
    }
  }, [user, page, pageSize, debouncedSearch]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  // ─── Toast Helper ─────────────────────────────────────────────────────────
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // ─── Event Handlers ────────────────────────────────────────────────────────
  // Pagination
  const totalPages = Math.ceil(totalMaterials / pageSize);
  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };
  const handleNextPage = () => {
    if (page < totalPages) setPage(page + 1);
  };

  // Format unit display helper
  const formatUnit = (unit: string) => {
    if (unit === "kg") return "Kg";
    if (unit === "l") return "Ltr";
    return unit.toUpperCase();
  };

  // Color generator for circular image backgrounds
  const getGradientForImage = (id: number) => {
    const gradients = [
      "from-green-100 to-emerald-200",
      "from-sky-100 to-blue-200",
      "from-amber-100 to-orange-200",
      "from-lime-100 to-green-200",
      "from-rose-100 to-pink-200",
      "from-purple-100 to-indigo-200",
      "from-yellow-100 to-amber-200"
    ];
    return gradients[id % gradients.length];
  };

  // Modal handlers
  const openEditModal = (material: RawMaterial) => {
    setSelectedMaterial(material);
    setFormState({
      calories: material.calories !== undefined && material.calories !== null ? material.calories : "",
      protein: material.protein !== undefined && material.protein !== null ? material.protein : "",
      carbs: material.carbs !== undefined && material.carbs !== null ? material.carbs : "",
      fiber: material.fiber !== undefined && material.fiber !== null ? material.fiber : "",
      fat: material.fat !== undefined && material.fat !== null ? material.fat : "",
      micros: material.micros ? [...material.micros] : [],
    });
    setNewTagInput("");
    setIsModalOpen(true);
  };

  const handleAddMicroTag = () => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    
    // Prevent duplicates
    if (formState.micros.some(tag => tag.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`${trimmed} is already in the list`, "error");
      return;
    }

    setFormState(prev => ({
      ...prev,
      micros: [...prev.micros, trimmed]
    }));
    setNewTagInput("");
  };

  const handleKeyDownMicro = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddMicroTag();
    }
  };

  const handleRemoveMicroTag = (indexToRemove: number) => {
    setFormState(prev => ({
      ...prev,
      micros: prev.micros.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) return;

    setIsSaving(true);
    const payload: MacrosUpdatePayload = {
      calories: formState.calories !== "" ? Number(formState.calories) : 0,
      protein: formState.protein !== "" ? Number(formState.protein) : 0,
      carbs: formState.carbs !== "" ? Number(formState.carbs) : 0,
      fiber: formState.fiber !== "" ? Number(formState.fiber) : 0,
      fat: formState.fat !== "" ? Number(formState.fat) : 0,
      micros: formState.micros,
    };

    try {
      await endpoints.rawMaterials.updateMacros(selectedMaterial.id, payload);
      showToast(`Nutritional macros for ${selectedMaterial.name} updated successfully`, "success");
      setIsModalOpen(false);
      fetchMaterials();
    } catch (error: any) {
      console.error("Error updating macros:", error);
      showToast(error.detail || error.message || "Failed to update macros", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fafafa]">
        <div className="animate-pulse text-neutral-500 font-medium">Loading session...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-col flex-1 h-full bg-white">
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
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        {/* Header Bar */}
        <Header />

        {/* Reusable Breadcrumbs Component */}
        <Breadcrumbs segments={["Raw Material", "Calorie Mgt"]} />

        <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-2xl p-6 sm:p-8">
          {/* Sub Header / Search Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-between items-center shrink-0">
            {/* Search Input */}
            <div 
              className="flex-1 w-full flex items-center bg-white rounded-[24px] px-3.5 py-2.5 shadow-sm transition-all"
              style={{
                border: "1px solid transparent",
                backgroundImage: "linear-gradient(white, white), linear-gradient(135deg, #10b981 0%, #7c3aed 100%)",
                backgroundOrigin: "border-box",
                backgroundClip: "padding-box, border-box"
              }}
            >
              {/* Gradient Search circle */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#10b981] to-[#7c3aed] flex items-center justify-center text-white shrink-0 shadow-sm mr-3">
                <Search className="w-4.5 h-4.5 text-white" />
              </div>
              <input
                type="text"
                placeholder="Search raw materials to manage calories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none"
              />
              <div className="flex items-center gap-3 shrink-0 pr-1 select-none">
                <span className="text-xs text-neutral-400 font-bold tracking-wider">A to Z</span>
                <div className="h-5 w-[1px] bg-neutral-200" />
                <Filter className="w-4 h-4 text-neutral-400 hover:text-[#7c3aed] cursor-pointer transition-colors" />
              </div>
            </div>
          </div>

          {/* Grid Content Area */}
          <div className="flex-1 overflow-y-auto pr-2 pb-6 scrollbar-thin">
            {isLoading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-[#7c3aed] animate-spin" />
                <span className="text-neutral-500 text-sm font-medium">Loading raw materials...</span>
              </div>
            ) : materials.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center bg-white border border-neutral-100 rounded-3xl p-8 text-center max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-400 mb-4">
                  <Wheat className="w-8 h-8" />
                </div>
                <h3 className="text-neutral-800 font-bold text-lg">No raw materials found</h3>
                <p className="text-neutral-500 text-sm mt-2 max-w-sm">
                  {debouncedSearch 
                    ? `No results match your search "${debouncedSearch}". Try another query.` 
                    : "No raw materials are available. Please create raw materials in Cost Management first."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {materials.map((material) => {
                  const mediaUrl = getMediaUrl(systemSettings?.R2_BASE_URL, material.image_filename);
                  
                  return (
                    <div
                      key={material.id}
                      className="bg-white rounded-[40px] p-6 shadow-sm border border-neutral-100/70 flex flex-col items-center justify-between text-center transition-all hover:translate-y-[-4px] hover:shadow-md min-h-[420px] w-full max-w-[240px] mx-auto relative group"
                    >
                      {/* Top Capsule overlap circular image */}
                      <div className={`w-28 h-28 rounded-full overflow-hidden flex items-center justify-center border-4 border-white shadow-[0_4px_10px_rgba(0,0,0,0.06)] relative bg-gradient-to-br ${getGradientForImage(material.id)} shrink-0`}>
                        {mediaUrl ? (
                          <img
                            src={mediaUrl}
                            alt={material.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <Wheat className="w-8 h-8 text-neutral-600/70" />
                        )}
                      </div>

                      {/* Content Section */}
                      <div className="flex-1 w-full flex flex-col items-center mt-3 gap-2">
                        <h4 className="text-sm font-bold text-neutral-900 leading-tight">
                          {material.name}
                        </h4>
                        <p className="text-[11px] text-neutral-400 font-semibold">
                          ₹{material.price} / {formatUnit(material.unit)}
                        </p>
                        
                        {material.description && (
                          <p className="text-[10px] text-neutral-500 line-clamp-2 text-center px-1 font-medium">
                            {material.description}
                          </p>
                        )}

                        <div className="w-full h-[1px] bg-neutral-100 my-1" />

                        {/* Green Calorie Badge */}
                        <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-2.5 py-0.5 text-xs font-bold flex items-center gap-1 select-none shrink-0 shadow-sm">
                          <Activity className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{material.calories || 0} kcal</span>
                        </div>

                        {/* Purple Macro Badges */}
                        <div className="grid grid-cols-2 gap-1 w-full mt-1 shrink-0">
                          <div className="bg-purple-50 text-purple-700 border border-purple-100/55 rounded-lg py-0.5 px-1 text-[10px] font-bold">
                            P: {material.protein || 0}g
                          </div>
                          <div className="bg-purple-50 text-purple-700 border border-purple-100/55 rounded-lg py-0.5 px-1 text-[10px] font-bold">
                            C: {material.carbs || 0}g
                          </div>
                          <div className="bg-purple-50 text-purple-700 border border-purple-100/55 rounded-lg py-0.5 px-1 text-[10px] font-bold">
                            F: {material.fat || 0}g
                          </div>
                          <div className="bg-purple-50 text-purple-700 border border-purple-100/55 rounded-lg py-0.5 px-1 text-[10px] font-bold">
                            Fb: {material.fiber || 0}g
                          </div>
                        </div>

                        {/* Micronutrients tags section */}
                        {material.micros && material.micros.length > 0 && (
                          <div className="flex flex-wrap justify-center gap-1 mt-1 overflow-hidden max-h-[48px] w-full shrink-0">
                            {material.micros.slice(0, 4).map((micro, idx) => (
                              <span 
                                key={idx} 
                                className="px-2 py-0.5 bg-neutral-50 text-neutral-600 border border-neutral-100 rounded-full text-[9px] font-semibold whitespace-nowrap"
                              >
                                {micro}
                              </span>
                            ))}
                            {material.micros.length > 4 && (
                              <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-500 rounded-full text-[9px] font-bold select-none">
                                +{material.micros.length - 4}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Divider */}
                      <div className="w-3/4 h-[1px] bg-neutral-100 my-2" />

                      {/* Action Button */}
                      <button
                        type="button"
                        onClick={() => openEditModal(material)}
                        className="w-full bg-black text-white hover:bg-neutral-800 text-[11px] font-bold py-2.5 px-5 rounded-full transition-all hover:scale-[1.02] active:scale-95 shadow-sm cursor-pointer shrink-0"
                      >
                        Update Macros
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 py-4 shrink-0 border-t border-neutral-200 bg-white">
              <button
                disabled={page === 1}
                onClick={handlePrevPage}
                className="w-10 h-10 rounded-full border border-neutral-200 bg-white flex items-center justify-center text-neutral-600 hover:border-[#7c3aed] hover:text-[#7c3aed] disabled:opacity-50 disabled:hover:text-neutral-600 disabled:hover:border-neutral-200 transition-colors shadow-sm cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wide">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={handleNextPage}
                className="w-10 h-10 rounded-full border border-neutral-200 bg-white flex items-center justify-center text-neutral-600 hover:border-[#7c3aed] hover:text-[#7c3aed] disabled:opacity-50 disabled:hover:text-neutral-600 disabled:hover:border-neutral-200 transition-colors shadow-sm cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Update Calorie/Macros Modal (Screenshot 2 & 3) ───────────────── */}
      {isModalOpen && selectedMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-fade-in">
          <div 
            className="bg-white rounded-[40px] max-w-lg w-full p-8 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-neutral-100 flex flex-col gap-6 relative max-h-[90vh] overflow-y-auto scrollbar-thin"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Title */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-extrabold text-neutral-800">
                Update Macros
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-800 transition-colors p-1 hover:bg-neutral-50 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Read-Only Material Title card */}
            <div className="bg-neutral-50 border border-neutral-100 rounded-3xl p-4 flex items-center gap-4 shrink-0">
              <div className={`w-14 h-14 rounded-full overflow-hidden flex items-center justify-center bg-white border border-neutral-100 shrink-0`}>
                {getMediaUrl(systemSettings?.R2_BASE_URL, selectedMaterial.image_filename) ? (
                  <img
                    src={getMediaUrl(systemSettings?.R2_BASE_URL, selectedMaterial.image_filename) || ""}
                    alt={selectedMaterial.name}
                    className="w-4/5 h-4/5 object-contain"
                  />
                ) : (
                  <Wheat className="w-6 h-6 text-neutral-400" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-neutral-800 text-sm leading-snug">{selectedMaterial.name}</h3>
                <p className="text-xs text-neutral-400 font-semibold mt-0.5">
                  Cost: ₹{selectedMaterial.price} / {formatUnit(selectedMaterial.unit)}
                </p>
              </div>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSave} className="flex flex-col gap-5">
              
              {/* Calories & Protein */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase tracking-wide">
                    Calories (kcal)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 150"
                    value={formState.calories}
                    onChange={(e) => setFormState(prev => ({ ...prev, calories: e.target.value === "" ? "" : Number(e.target.value) }))}
                    className="w-full bg-neutral-100/70 border border-transparent focus:border-neutral-200 focus:bg-white rounded-2xl px-4 py-3 text-sm text-neutral-800 focus:outline-none transition-all placeholder:text-neutral-400 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase tracking-wide">
                    Protein (g)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 2.5"
                    value={formState.protein}
                    onChange={(e) => setFormState(prev => ({ ...prev, protein: e.target.value === "" ? "" : Number(e.target.value) }))}
                    className="w-full bg-neutral-100/70 border border-transparent focus:border-neutral-200 focus:bg-white rounded-2xl px-4 py-3 text-sm text-neutral-800 focus:outline-none transition-all placeholder:text-neutral-400 font-semibold"
                  />
                </div>
              </div>

              {/* Carbs & Fat */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase tracking-wide">
                    Carbs (g)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 12"
                    value={formState.carbs}
                    onChange={(e) => setFormState(prev => ({ ...prev, carbs: e.target.value === "" ? "" : Number(e.target.value) }))}
                    className="w-full bg-neutral-100/70 border border-transparent focus:border-neutral-200 focus:bg-white rounded-2xl px-3 py-3 text-sm text-neutral-800 focus:outline-none transition-all placeholder:text-neutral-400 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase tracking-wide">
                    Fat (g)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 15"
                    value={formState.fat}
                    onChange={(e) => setFormState(prev => ({ ...prev, fat: e.target.value === "" ? "" : Number(e.target.value) }))}
                    className="w-full bg-neutral-100/70 border border-transparent focus:border-neutral-200 focus:bg-white rounded-2xl px-3 py-3 text-sm text-neutral-800 focus:outline-none transition-all placeholder:text-neutral-400 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-600 mb-1.5 uppercase tracking-wide">
                    Fiber (g)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 7"
                    value={formState.fiber}
                    onChange={(e) => setFormState(prev => ({ ...prev, fiber: e.target.value === "" ? "" : Number(e.target.value) }))}
                    className="w-full bg-neutral-100/70 border border-transparent focus:border-neutral-200 focus:bg-white rounded-2xl px-3 py-3 text-sm text-neutral-800 focus:outline-none transition-all placeholder:text-neutral-400 font-semibold"
                  />
                </div>
              </div>

              {/* Micronutrients Section */}
              <div className="border-t border-neutral-100 pt-4 flex flex-col gap-2.5">
                <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wide">
                  Micronutrients
                </label>
                
                {/* Interactive Tag List Display */}
                {formState.micros.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 p-3 bg-neutral-50/50 border border-neutral-100 rounded-2xl max-h-[140px] overflow-y-auto scrollbar-thin">
                    {formState.micros.map((micro, idx) => (
                      <span 
                        key={idx} 
                        className="px-2.5 py-1 bg-white text-neutral-700 border border-neutral-200/80 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-sm animate-cell-fade-in"
                      >
                        {micro}
                        <button
                          type="button"
                          onClick={() => handleRemoveMicroTag(idx)}
                          className="w-3.5 h-3.5 rounded-full flex items-center justify-center hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 border border-dashed border-neutral-200 rounded-2xl text-center">
                    <span className="text-[11px] text-neutral-400 font-medium">No micronutrients added yet. Use the field below to add.</span>
                  </div>
                )}

                {/* Tag Input Field */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type and press Enter or Comma..."
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={handleKeyDownMicro}
                    className="flex-1 bg-neutral-100/70 border border-transparent focus:border-neutral-200 focus:bg-white rounded-2xl px-4 py-3 text-sm text-neutral-800 focus:outline-none transition-all placeholder:text-neutral-400 font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleAddMicroTag}
                    className="bg-black hover:bg-neutral-800 text-white rounded-2xl w-11 h-11 flex items-center justify-center transition-all hover:scale-102 active:scale-95 shadow-sm shrink-0 cursor-pointer"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Footer buttons */}
              <div className="flex gap-4 justify-start mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-black hover:bg-neutral-800 text-white py-3 px-8 rounded-2xl text-xs font-bold transition-all hover:scale-[1.02] shadow-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold py-3 px-8 rounded-2xl text-xs transition-all hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-2 ${
                    isSaving ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
