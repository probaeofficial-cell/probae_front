"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Filter, 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  UploadCloud, 
  Loader2, 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight,
  Wheat,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { endpoints } from "@/lib/apiService";
import { getMediaUrl } from "@/lib/utils";
import { RawMaterial, UnitType } from "@/lib/types";

export default function CostManagementPage() {
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
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");

  // Form State (Task 1 & 3)
  const [formState, setFormState] = useState({
    name: "",
    price: "" as number | "",
    unit: "kg" as UnitType,
    description: "",
    image_filename: null as string | null,
    background_image_filename: null as string | null,
    calories: "" as number | "",
    protein: "" as number | "",
    carbs: "" as number | "",
    fiber: "" as number | "",
    fat: "" as number | "",
    microsString: "",
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBackgroundUrl, setPreviewBackgroundUrl] = useState<string | null>(null);
  const [isUploadingPrimary, setIsUploadingPrimary] = useState(false);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Image Upload State
  const [dragActivePrimary, setDragActivePrimary] = useState(false);
  const [dragActiveBackground, setDragActiveBackground] = useState(false);
  const fileInputPrimaryRef = useRef<HTMLInputElement>(null);
  const fileInputBackgroundRef = useRef<HTMLInputElement>(null);

  // Detail View State
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

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

  // Drag and drop event handlers are defined separately below for Primary and Background zones.

  // Define local apiService (Task 2 & 4)
  const apiService = {
    uploadDocument: endpoints.documents.upload,
  };
  const updateRawMaterial = endpoints.rawMaterials.updateRawMaterial;
  const createRawMaterial = endpoints.rawMaterials.createRawMaterial;

  // The Upload Handler Logic (Task 2)
  const handleImageDrop = async (file: File, type: "primary" | "background") => {
    if (!file.type.startsWith("image/")) {
      showToast("Please select a valid image file", "error");
      return;
    }
    
    const objUrl = URL.createObjectURL(file);
    if (type === "primary") {
      setPreviewUrl(objUrl);
      setIsUploadingPrimary(true);
    } else {
      setPreviewBackgroundUrl(objUrl);
      setIsUploadingBackground(true);
    }

    try {
      const response = await apiService.uploadDocument(file);
      // CRITICAL: Extract only the filename from the response
      const newFilename = response.filename;
      
      setFormState((prev) => ({
        ...prev,
        [type === "primary" ? "image_filename" : "background_image_filename"]: newFilename,
      }));
      showToast(`${type === "primary" ? "Primary image" : "Background image"} uploaded successfully`, "success");
    } catch (error: any) {
      console.error("Error uploading file:", error);
      showToast(error.message || "Failed to upload image", "error");
      if (type === "primary") {
        setPreviewUrl(null);
      } else {
        setPreviewBackgroundUrl(null);
      }
    } finally {
      if (type === "primary") {
        setIsUploadingPrimary(false);
      } else {
        setIsUploadingBackground(false);
      }
    }
  };

  const handleDropPrimary = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActivePrimary(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleImageDrop(e.dataTransfer.files[0], "primary");
    }
  };

  const handleFileChangePrimary = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleImageDrop(e.target.files[0], "primary");
    }
  };

  const handleDragPrimary = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActivePrimary(true);
    } else if (e.type === "dragleave") {
      setDragActivePrimary(false);
    }
  };

  const handleDropBackground = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveBackground(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleImageDrop(e.dataTransfer.files[0], "background");
    }
  };

  const handleFileChangeBackground = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleImageDrop(e.target.files[0], "background");
    }
  };

  const handleDragBackground = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActiveBackground(true);
    } else if (e.type === "dragleave") {
      setDragActiveBackground(false);
    }
  };

  // Modal Initialization (Task 3)
  const openAddModal = () => {
    setModalMode("add");
    setEditingId(null);
    setFormState({
      name: "",
      price: "",
      unit: "kg",
      description: "",
      image_filename: null,
      background_image_filename: null,
      calories: "",
      protein: "",
      carbs: "",
      fiber: "",
      fat: "",
      microsString: "",
    });
    setPreviewUrl(null);
    setPreviewBackgroundUrl(null);
    setIsModalOpen(true);
  };

  const openEditModal = (material: RawMaterial, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering detail view
    setModalMode("edit");
    setEditingId(material.id);
    setFormState({
      name: material.name,
      price: material.price,
      unit: material.unit,
      description: material.description || "",
      image_filename: material.image_filename || null,
      background_image_filename: material.background_image_filename || null,
      calories: material.calories !== undefined && material.calories !== null ? material.calories : "",
      protein: material.protein !== undefined && material.protein !== null ? material.protein : "",
      carbs: material.carbs !== undefined && material.carbs !== null ? material.carbs : "",
      fiber: material.fiber !== undefined && material.fiber !== null ? material.fiber : "",
      fat: material.fat !== undefined && material.fat !== null ? material.fat : "",
      microsString: material.micros?.join(", ") || "",
    });
    setPreviewUrl(getMediaUrl(systemSettings?.R2_BASE_URL, material.image_filename));
    setPreviewBackgroundUrl(getMediaUrl(systemSettings?.R2_BASE_URL, material.background_image_filename));
    setIsModalOpen(true);
  };

  // Form Submission (Task 4)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploadingPrimary || isUploadingBackground) return; // Ensure isUploading is false (prevent saving mid-upload)
    
    if (!formState.name.trim()) {
      showToast("Please enter a name", "error");
      return;
    }
    if (formState.price === "" || Number(formState.price) <= 0) {
      showToast("Please enter a valid price greater than 0", "error");
      return;
    }

    setIsSaving(true);
    
    // CRITICAL DATA FORMATTING (Task 3)
    const formattedMicros = formState.microsString.split(',').map(s => s.trim()).filter(Boolean);

    const payload = {
      name: formState.name.trim(),
      price: Number(formState.price),
      unit: formState.unit,
      description: formState.description.trim() || null,
      image_filename: formState.image_filename,
      background_image_filename: formState.background_image_filename,
      calories: formState.calories !== "" ? Number(formState.calories) : 0,
      protein: formState.protein !== "" ? Number(formState.protein) : 0,
      carbs: formState.carbs !== "" ? Number(formState.carbs) : 0,
      fiber: formState.fiber !== "" ? Number(formState.fiber) : 0,
      fat: formState.fat !== "" ? Number(formState.fat) : 0,
      micros: formattedMicros,
    };

    try {
      if (editingId) {
        await updateRawMaterial(editingId, payload);
        showToast(`${payload.name} updated successfully`, "success");
      } else {
        await createRawMaterial(payload);
        showToast(`${payload.name} created successfully`, "success");
      }
      setIsModalOpen(false);
      fetchMaterials();
    } catch (error: any) {
      console.error("Error saving raw material:", error);
      showToast(error.detail || error.message || "Failed to save raw material", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Handler
  const handleDeleteMaterial = async (materialId: number, name: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering detail view
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await endpoints.rawMaterials.deleteRawMaterial(materialId);
        showToast(`${name} deleted successfully`, "success");
        // Adjust page if deleting last item on current page
        if (materials.length === 1 && page > 1) {
          setPage(page - 1);
        } else {
          fetchMaterials();
        }
      } catch (error: any) {
        console.error("Error deleting raw material:", error);
        showToast(error.message || "Failed to delete raw material", "error");
      }
    }
  };

  // Detail View toggle
  const openDetailView = (material: RawMaterial) => {
    setSelectedMaterial(material);
    setIsDetailOpen(true);
  };

  const closeDetailView = () => {
    setSelectedMaterial(null);
    setIsDetailOpen(false);
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
        <Breadcrumbs segments={isDetailOpen ? ["Raw Material", "Cost Mgt", "Preview"] : ["Raw Material", "Cost Mgt"]} />

        {!isDetailOpen ? (
          /* ─── Grid Listing view ─── */
          <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-2xl p-6 sm:p-8">
            {/* Sub Header / Filters and Buttons Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-between items-center shrink-0">
              {/* Search inputs */}
              <div 
                className="flex-1 w-full max-w-[800px] flex items-center bg-white rounded-[24px] px-3.5 py-2.5 shadow-sm transition-all"
                style={{
                  border: "1px solid transparent",
                  backgroundImage: "linear-gradient(white, white), linear-gradient(135deg, #e11d48 0%, #6b21a8 100%)",
                  backgroundOrigin: "border-box",
                  backgroundClip: "padding-box, border-box"
                }}
              >
                {/* Gradient Search circle */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#e11d48] to-[#6b21a8] flex items-center justify-center text-white shrink-0 shadow-sm mr-3">
                  <Search className="w-4.5 h-4.5 text-white" />
                </div>
                <input
                  type="text"
                  placeholder="Search for your order"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none"
                />
                <div className="flex items-center gap-3 shrink-0 pr-1 select-none">
                  <span className="text-xs text-neutral-400 font-bold tracking-wider">A to Z</span>
                  <div className="h-5 w-[1px] bg-neutral-200" />
                  <Filter className="w-4 h-4 text-neutral-400 hover:text-[#6b21a8] cursor-pointer transition-colors" />
                </div>
              </div>

              {/* Actions */}
              <button
                onClick={openAddModal}
                className="w-full sm:w-auto bg-[#6b21a8] hover:bg-[#581c87] text-white px-8 py-3.5 rounded-[24px] text-sm font-semibold transition-all hover:scale-[1.01] active:scale-95 shadow-sm cursor-pointer shrink-0"
              >
                Add Raw Material
              </button>
            </div>

            {/* Grid Content Area */}
            <div className="flex-1 overflow-y-auto pr-2 pb-6 scrollbar-thin">
              {isLoading ? (
                <div className="h-64 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-[#6b21a8] animate-spin" />
                  <span className="text-neutral-500 text-sm font-medium">Loading materials...</span>
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
                      : "Get started by adding raw materials for cost management."}
                  </p>
                  {!debouncedSearch && (
                    <button
                      onClick={openAddModal}
                      className="mt-6 bg-[#6b21a8] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#581c87] transition-colors"
                    >
                      Add Your First Item
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {materials.map((material) => {
                    const mediaUrl = getMediaUrl(systemSettings?.R2_BASE_URL, material.image_filename);
                    return (
                      <div
                        key={material.id}
                        onClick={() => openDetailView(material)}
                        className="bg-white rounded-[100px] p-6 shadow-sm border border-neutral-100/50 flex flex-col items-center justify-between text-center cursor-pointer transition-all hover:translate-y-[-4px] hover:shadow-md aspect-[10/16] min-h-[310px] w-full max-w-[210px] mx-auto relative group"
                      >
                        {/* Top Capsule overlap circular image */}
                        <div className={`w-32 h-32 rounded-full overflow-hidden flex items-center justify-center border-4 border-white shadow-[0_4px_10px_rgba(0,0,0,0.06)] relative bg-gradient-to-br ${getGradientForImage(material.id)} shrink-0`}>
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
                            <Wheat className="w-10 h-10 text-neutral-600/70" />
                          )}
                        </div>

                        {/* Content Section */}
                        <div className="flex-1 flex flex-col items-center mt-3">
                          <h4 className="text-sm font-bold text-neutral-900 group-hover:text-[#6b21a8] transition-colors leading-tight">
                            {material.name}
                          </h4>
                          <p className="text-[11px] text-neutral-400 font-semibold mt-1">
                            ₹{material.price} / {formatUnit(material.unit)}
                          </p>
                        </div>

                        {/* Divider */}
                        <div className="w-3/4 h-[1px] bg-neutral-100/80 my-3" />

                        {/* Action buttons */}
                        <div className="flex gap-2.5 shrink-0 pb-1">
                          <button
                            type="button"
                            onClick={(e) => openEditModal(material, e)}
                            className="w-7 h-7 rounded-full bg-black text-white hover:bg-neutral-800 flex items-center justify-center shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-all shrink-0"
                            title="Edit Material"
                          >
                            <Pencil className="w-3 h-3 text-white" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteMaterial(material.id, material.name, e)}
                            className="w-7 h-7 rounded-full bg-black text-white hover:bg-neutral-800 flex items-center justify-center shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-all shrink-0"
                            title="Delete Material"
                          >
                            <Trash2 className="w-3 h-3 text-white" />
                          </button>
                        </div>
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
                  className="w-10 h-10 rounded-full border border-neutral-200 bg-white flex items-center justify-center text-neutral-600 hover:border-[#6b21a8] hover:text-[#6b21a8] disabled:opacity-50 disabled:hover:text-neutral-600 disabled:hover:border-neutral-200 transition-colors shadow-sm cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wide">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={handleNextPage}
                  className="w-10 h-10 rounded-full border border-neutral-200 bg-white flex items-center justify-center text-neutral-600 hover:border-[#6b21a8] hover:text-[#6b21a8] disabled:opacity-50 disabled:hover:text-neutral-600 disabled:hover:border-neutral-200 transition-colors shadow-sm cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ─── Detail/Preview View (Screenshot 1) ─── */
          <div className="flex-1 w-full rounded-2xl overflow-hidden relative flex flex-col justify-center items-center p-6">
            
            {/* Background Image: sharp, clear, full screen background (Task 4) */}
            {selectedMaterial?.background_image_filename && (
              <img 
                src={getMediaUrl(systemSettings.R2_BASE_URL, selectedMaterial.background_image_filename) || undefined} 
                className="absolute inset-0 w-full h-full object-cover z-0" 
                alt="Background"
              />
            )}

            {/* Absolute overlay over the background to dim it slightly without blurring */}
            {selectedMaterial?.background_image_filename && (
              <div className="absolute inset-0 z-0 bg-black/10" />
            )}

            {/* Back Button and Item Name floating above background on top-left */}
            <div className="absolute top-6 left-6 flex items-center gap-3 z-20">
              <button 
                onClick={closeDetailView}
                className="w-12 h-12 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-800 hover:text-black shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="px-6 py-3 rounded-full bg-white border border-neutral-200 text-sm font-semibold text-neutral-800 shadow-sm flex items-center justify-center select-none">
                {selectedMaterial?.name}
              </div>
            </div>

            {/* Floating White Card Layout */}
            <div className="bg-white rounded-[50px] max-w-4xl w-full p-8 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-neutral-100/50 flex flex-col md:flex-row gap-8 items-center z-10 relative animate-cell-fade-in my-auto max-h-[90%] overflow-y-auto scrollbar-thin">
              
              {/* Left Side: Circular Oval Shape Image Crop */}
              <div className="w-full md:w-1/2 flex items-center justify-center">
                <div className="w-64 h-[320px] rounded-[140px] overflow-hidden bg-[#f3f4f6] flex items-center justify-center border-4 border-white shadow-md relative shrink-0">
                  {selectedMaterial?.image_filename ? (
                    <img
                      src={getMediaUrl(systemSettings?.R2_BASE_URL, selectedMaterial.image_filename) || ""}
                      alt={selectedMaterial?.name}
                      className="w-3/4 h-3/4 object-contain"
                    />
                  ) : (
                    <Wheat className="w-16 h-16 text-neutral-600/70" />
                  )}
                </div>
              </div>

              {/* Right Side: Read-Only Form Fields */}
              <div className="w-full md:w-1/2 flex flex-col gap-4">
                {/* Name field */}
                <div>
                  <label className="block text-[13px] font-semibold text-neutral-500 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={selectedMaterial?.name || ""}
                    readOnly
                    className="w-full bg-[#f3f4f6] border border-transparent rounded-xl px-4 py-2.5 text-sm text-neutral-800 font-medium cursor-default focus:outline-none"
                  />
                </div>

                {/* Price + Unit field */}
                <div>
                  <label className="block text-[13px] font-semibold text-neutral-500 mb-1">
                    Price
                  </label>
                  <div className="flex items-center gap-3">
                    {/* Price read-only input */}
                    <div className="relative max-w-[150px]">
                      <input
                        type="text"
                        value={selectedMaterial ? `₹${selectedMaterial.price}` : ""}
                        readOnly
                        className="w-full py-2.5 bg-[#f3f4f6] border border-transparent rounded-xl text-sm font-semibold text-neutral-800 text-center cursor-default focus:outline-none"
                      />
                    </div>

                    <span className="text-xl font-bold text-neutral-800 mx-1">/</span>

                    {/* Unit toggle style buttons (read-only) */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={`py-2.5 px-6 rounded-xl text-xs font-bold transition-all border ${
                          selectedMaterial?.unit === "kg" 
                            ? "bg-[#6b21a8] text-white border-transparent shadow-sm" 
                            : "bg-white text-[#6b21a8] border-[#6b21a8]"
                        }`}
                      >
                        KG
                      </button>
                      <button
                        type="button"
                        className={`py-2.5 px-6 rounded-xl text-xs font-bold transition-all border ${
                          selectedMaterial?.unit === "l" 
                            ? "bg-[#6b21a8] text-white border-transparent shadow-sm" 
                            : "bg-white text-[#6b21a8] border-[#6b21a8]"
                        }`}
                      >
                        L
                      </button>
                    </div>
                  </div>
                </div>

                {/* Description field */}
                <div>
                  <label className="block text-[13px] font-semibold text-neutral-500 mb-1">
                    Description
                  </label>
                  <textarea
                    value={selectedMaterial?.description || ""}
                    readOnly
                    rows={2}
                    className="w-full bg-[#f3f4f6] border border-transparent rounded-xl px-4 py-2.5 text-sm text-neutral-600 cursor-default resize-none focus:outline-none"
                  />
                </div>

                {/* Calories + Macronutrients (Read-only) */}
                {selectedMaterial?.calories !== undefined && selectedMaterial?.calories !== null && (
                  <div>
                    <label className="block text-[13px] font-semibold text-neutral-500 mb-1">
                      Nutritional Value
                    </label>
                    <div className="grid grid-cols-5 gap-2 text-center">
                      <div className="bg-[#f3f4f6] rounded-xl p-1.5">
                        <span className="block text-[9px] font-semibold text-neutral-400">Calories</span>
                        <span className="text-xs font-bold text-neutral-700">{selectedMaterial.calories}</span>
                      </div>
                      <div className="bg-[#f3f4f6] rounded-xl p-1.5">
                        <span className="block text-[9px] font-semibold text-neutral-400">Protein</span>
                        <span className="text-xs font-bold text-neutral-700">{selectedMaterial.protein}g</span>
                      </div>
                      <div className="bg-[#f3f4f6] rounded-xl p-1.5">
                        <span className="block text-[9px] font-semibold text-neutral-400">Carbs</span>
                        <span className="text-xs font-bold text-neutral-700">{selectedMaterial.carbs}g</span>
                      </div>
                      <div className="bg-[#f3f4f6] rounded-xl p-1.5">
                        <span className="block text-[9px] font-semibold text-neutral-400">Fat</span>
                        <span className="text-xs font-bold text-neutral-700">{selectedMaterial.fat}g</span>
                      </div>
                      <div className="bg-[#f3f4f6] rounded-xl p-1.5">
                        <span className="block text-[9px] font-semibold text-neutral-400">Fiber</span>
                        <span className="text-xs font-bold text-neutral-700">{selectedMaterial.fiber}g</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Micronutrients (Read-only) */}
                {selectedMaterial?.micros && selectedMaterial.micros.length > 0 && (
                  <div>
                    <label className="block text-[13px] font-semibold text-neutral-500 mb-1">
                      Micronutrients
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedMaterial.micros.map((micro, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-[#f3f4f6] text-neutral-600 rounded-full text-xs font-semibold">
                          {micro}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
      )}
    </div>

    {/* ─── Add/Edit Modal (Screenshot 3) ─────────────────────────── */}
    {isModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
        <div 
          className="bg-white rounded-[40px] max-w-lg w-full p-8 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-neutral-100 flex flex-col gap-6 relative max-h-[90vh] overflow-y-auto scrollbar-thin"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Title */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-extrabold text-neutral-800">
              {modalMode === "add" ? "Add Raw Material" : "Edit Raw Material"}
            </h2>
            <button 
              onClick={() => setIsModalOpen(false)}
              className="text-neutral-400 hover:text-neutral-800 transition-colors p-1 hover:bg-neutral-50 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Two Drag & Drop Image Upload Zones (Task 2) */}
          <div className="grid grid-cols-2 gap-4">
            {/* Primary Thumbnail Zone */}
            <div className="flex flex-col gap-2">
              <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wide">
                Primary Thumbnail
              </label>
              <div 
                onDragEnter={handleDragPrimary}
                onDragOver={handleDragPrimary}
                onDragLeave={handleDragPrimary}
                onDrop={handleDropPrimary}
                onClick={() => fileInputPrimaryRef.current?.click()}
                className={`border-2 border-dashed rounded-[24px] p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all relative overflow-hidden group min-h-[140px] ${
                  dragActivePrimary 
                    ? "border-[#6b21a8] bg-[#6b21a8]/5" 
                    : "border-neutral-300 bg-neutral-50/50 hover:bg-neutral-50 hover:border-purple-400"
                }`}
              >
                {/* Hidden File Input */}
                <input
                  ref={fileInputPrimaryRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChangePrimary}
                />

                {isUploadingPrimary ? (
                  <div className="flex flex-col items-center gap-1.5 text-center">
                    <Loader2 className="w-6 h-6 text-[#6b21a8] animate-spin" />
                    <span className="text-[10px] text-neutral-500 font-semibold">Uploading...</span>
                  </div>
                ) : previewUrl ? (
                  /* Uploaded Image Preview */
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-neutral-100">
                    <img
                      src={previewUrl}
                      alt="Thumbnail Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity text-[10px] font-bold gap-1.5">
                      <UploadCloud className="w-3.5 h-3.5" /> Replace
                    </div>
                  </div>
                ) : (
                  /* Empty upload instructions state */
                  <div className="flex flex-col items-center text-center">
                    <div className="w-8 h-8 rounded-full bg-[#fafafa] shadow-inner flex items-center justify-center text-neutral-800 mb-1.5 border border-neutral-100">
                      <svg className="w-4 h-4 text-neutral-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold text-neutral-800">Primary Image</span>
                    <span className="text-[9px] text-neutral-400 font-medium">Drag or Click</span>
                  </div>
                )}
              </div>
            </div>

            {/* Detail Background Zone */}
            <div className="flex flex-col gap-2">
              <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wide">
                Detail Background
              </label>
              <div 
                onDragEnter={handleDragBackground}
                onDragOver={handleDragBackground}
                onDragLeave={handleDragBackground}
                onDrop={handleDropBackground}
                onClick={() => fileInputBackgroundRef.current?.click()}
                className={`border-2 border-dashed rounded-[24px] p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all relative overflow-hidden group min-h-[140px] ${
                  dragActiveBackground 
                    ? "border-[#6b21a8] bg-[#6b21a8]/5" 
                    : "border-neutral-300 bg-neutral-50/50 hover:bg-neutral-50 hover:border-purple-400"
                }`}
              >
                {/* Hidden File Input */}
                <input
                  ref={fileInputBackgroundRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChangeBackground}
                />

                {isUploadingBackground ? (
                  <div className="flex flex-col items-center gap-1.5 text-center">
                    <Loader2 className="w-6 h-6 text-[#6b21a8] animate-spin" />
                    <span className="text-[10px] text-neutral-500 font-semibold">Uploading...</span>
                  </div>
                ) : previewBackgroundUrl ? (
                  /* Uploaded Image Preview */
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-neutral-100">
                    <img
                      src={previewBackgroundUrl}
                      alt="Background Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity text-[10px] font-bold gap-1.5">
                      <UploadCloud className="w-3.5 h-3.5" /> Replace
                    </div>
                  </div>
                ) : (
                  /* Empty upload instructions state */
                  <div className="flex flex-col items-center text-center">
                    <div className="w-8 h-8 rounded-full bg-[#fafafa] shadow-inner flex items-center justify-center text-neutral-800 mb-1.5 border border-neutral-100">
                      <svg className="w-4 h-4 text-neutral-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold text-neutral-800">Background Image</span>
                    <span className="text-[9px] text-neutral-400 font-medium">Drag or Click</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide">
                Name
              </label>
              <input
                type="text"
                placeholder="e.g. Avocado"
                value={formState.name}
                onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                required
                className="w-full bg-neutral-100/70 border border-transparent focus:border-neutral-200 focus:bg-white rounded-2xl px-4 py-3.5 text-sm text-neutral-800 focus:outline-none transition-all placeholder:text-neutral-400"
              />
            </div>

            {/* Price & Unit Toggle */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide">
                Price
              </label>
              <div className="flex items-center gap-3">
                {/* Price Numeric input */}
                <div className="relative max-w-[150px] flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 font-semibold text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="any"
                    placeholder="155"
                    value={formState.price}
                    onChange={(e) => setFormState(prev => ({ ...prev, price: e.target.value === "" ? "" : Number(e.target.value) }))}
                    required
                    className="w-full pl-8 pr-4 py-3.5 bg-neutral-100/70 border border-transparent focus:border-neutral-200 focus:bg-white rounded-2xl text-sm text-center text-neutral-800 focus:outline-none transition-all placeholder:text-neutral-400 font-semibold"
                  />
                </div>

                <span className="text-xl font-bold text-neutral-300">/</span>

                {/* Unit toggle buttons */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormState(prev => ({ ...prev, unit: "kg" }))}
                    className={`py-3.5 px-6 rounded-2xl text-xs font-bold border-2 transition-all cursor-pointer ${
                      formState.unit === "kg" 
                        ? "bg-[#6b21a8] text-white border-transparent shadow-sm" 
                        : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    KG
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormState(prev => ({ ...prev, unit: "l" }))}
                    className={`py-3.5 px-6 rounded-2xl text-xs font-bold border-2 transition-all cursor-pointer ${
                      formState.unit === "l" 
                        ? "bg-[#6b21a8] text-white border-transparent shadow-sm" 
                        : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    L
                  </button>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide">
                Description
              </label>
              <textarea
                placeholder="Provide short details about the material..."
                value={formState.description}
                onChange={(e) => setFormState(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full bg-neutral-100/70 border border-transparent focus:border-neutral-200 focus:bg-white rounded-2xl px-4 py-3.5 text-sm text-neutral-800 focus:outline-none transition-all placeholder:text-neutral-400 resize-none"
              />
            </div>

            {/* Nutritional Info Section (Task 3) */}
            <div className="border-t border-neutral-100 pt-4">
              <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-3">
                Nutritional & Calorie Info
              </h3>
              
              <div className="grid grid-cols-5 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1 uppercase text-center">
                    Cals
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formState.calories}
                    onChange={(e) => setFormState(prev => ({ ...prev, calories: e.target.value === "" ? "" : Number(e.target.value) }))}
                    className="w-full bg-neutral-100/70 border border-transparent focus:border-neutral-200 focus:bg-white rounded-xl px-2 py-2 text-xs text-center text-neutral-800 focus:outline-none transition-all placeholder:text-neutral-400 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1 uppercase text-center">
                    Prot (g)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={formState.protein}
                    onChange={(e) => setFormState(prev => ({ ...prev, protein: e.target.value === "" ? "" : Number(e.target.value) }))}
                    className="w-full bg-neutral-100/70 border border-transparent focus:border-neutral-200 focus:bg-white rounded-xl px-2 py-2 text-xs text-center text-neutral-800 focus:outline-none transition-all placeholder:text-neutral-400 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1 uppercase text-center">
                    Carbs (g)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={formState.carbs}
                    onChange={(e) => setFormState(prev => ({ ...prev, carbs: e.target.value === "" ? "" : Number(e.target.value) }))}
                    className="w-full bg-neutral-100/70 border border-transparent focus:border-neutral-200 focus:bg-white rounded-xl px-2 py-2 text-xs text-center text-neutral-800 focus:outline-none transition-all placeholder:text-neutral-400 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1 uppercase text-center">
                    Fat (g)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={formState.fat}
                    onChange={(e) => setFormState(prev => ({ ...prev, fat: e.target.value === "" ? "" : Number(e.target.value) }))}
                    className="w-full bg-neutral-100/70 border border-transparent focus:border-neutral-200 focus:bg-white rounded-xl px-2 py-2 text-xs text-center text-neutral-800 focus:outline-none transition-all placeholder:text-neutral-400 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1 uppercase text-center">
                    Fiber (g)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0"
                    value={formState.fiber}
                    onChange={(e) => setFormState(prev => ({ ...prev, fiber: e.target.value === "" ? "" : Number(e.target.value) }))}
                    className="w-full bg-neutral-100/70 border border-transparent focus:border-neutral-200 focus:bg-white rounded-xl px-2 py-2 text-xs text-center text-neutral-800 focus:outline-none transition-all placeholder:text-neutral-400 font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Micronutrients (Task 3) */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide">
                Micronutrients (comma separated)
              </label>
              <input
                type="text"
                placeholder="Vitamin B12, Iron, Zinc"
                value={formState.microsString}
                onChange={(e) => setFormState(prev => ({ ...prev, microsString: e.target.value }))}
                className="w-full bg-neutral-100/70 border border-transparent focus:border-neutral-200 focus:bg-white rounded-2xl px-4 py-3.5 text-sm text-neutral-800 focus:outline-none transition-all placeholder:text-neutral-400"
              />
            </div>

            {/* Footer buttons */}
            <div className="flex gap-4 justify-start mt-6">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="bg-[#6b21a8] hover:bg-[#581c87] text-white py-3.5 px-8 rounded-2xl text-sm font-semibold transition-all hover:scale-[1.02] shadow-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploadingPrimary || isUploadingBackground || isSaving}
                className={`bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold py-3.5 px-8 rounded-2xl text-sm transition-all hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-2 ${
                  (isUploadingPrimary || isUploadingBackground || isSaving) ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
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

