"use client";
import { BowlLoader } from "@/components/admin/BowlLoader";

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
  CheckCircle2,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { endpoints } from "@/lib/apiService";
import { getMediaUrl } from "@/lib/utils";
import { RawMaterial, UnitType, RawMaterialCategory } from "@/lib/types";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { ProbaeSearch } from "@/components/admin/ProbaeSearch";
import { SelectCategoryModal } from "@/components/admin/SelectCategoryModal";
import { SelectVendorModal } from "@/components/admin/SelectVendorModal";

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
  const [isTyping, setIsTyping] = useState(false);
  const [sort, setSort] = useState("A to Z");
  const [systemSettings, setSystemSettings] = useState({ R2_BASE_URL: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<{ ulid: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State (Task 1 & 3)
  const [formState, setFormState] = useState({
    name: "",
    price: "" as number | "",
    standard_price: "" as number | "",
    actual_price: "" as number | "",
    yield_grams: "" as number | "",
    yield_percentage: "" as number | "",
    unit: "kg" as UnitType,
    description: "",
    image_filename: null as string | null,
    background_image_filename: null as string | null,
    category_ulid: null as string | null,
    category_name: null as string | null,
    vendor_ulid: null as string | null,
    vendor_name: null as string | null,
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBackgroundUrl, setPreviewBackgroundUrl] = useState<string | null>(null);
  const [isUploadingPrimary, setIsUploadingPrimary] = useState(false);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingUlid, setEditingUlid] = useState<string | null>(null);

  // Image Upload State
  const [dragActivePrimary, setDragActivePrimary] = useState(false);
  const [dragActiveBackground, setDragActiveBackground] = useState(false);
  const fileInputPrimaryRef = useRef<HTMLInputElement>(null);
  const fileInputBackgroundRef = useRef<HTMLInputElement>(null);

  // Detail View State
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [costLogs, setCostLogs] = useState<import("@/lib/types").CostLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [costLogPage, setCostLogPage] = useState(1);
  const [totalCostLogs, setTotalCostLogs] = useState(0);
  const costLogPageSize = 10;

  // Notifications State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Categories State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);

  // ─── Side Effects ──────────────────────────────────────────────────────────

  // Load system settings
  useEffect(() => {
    async function loadSettings() {
      if (!user) return;
      try {
        const settings = await endpoints.settings.getSystemSettings();
        if (settings && settings.R2_BASE_URL !== undefined) {
          setSystemSettings({ R2_BASE_URL: settings.R2_BASE_URL });
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    }
    loadSettings();
  }, [user]);


  // Auth validation
  useEffect(() => {
    setIsTyping(true);
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
      setIsTyping(false);
    }, 1000);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Auto-calculate Yield Percentage and Actual Price
  useEffect(() => {
    if (formState.standard_price !== "" && formState.yield_grams !== "") {
      const sp = Number(formState.standard_price);
      const yg = Number(formState.yield_grams);
      // For kg/l base weight is 1000g/ml, for g/ml base weight is 1
      const baseUnitWeight = formState.unit === "g" || formState.unit === "ml" ? 1 : 1000;
      
      if (sp >= 0 && yg >= 0) {
        const yieldRatio = yg / baseUnitWeight;
        const yieldPerc = yieldRatio * 100;
        const actualP = yieldRatio > 0 ? sp / yieldRatio : 0;
        
        setFormState(prev => {
          if (prev.yield_percentage === Number(yieldPerc.toFixed(2)) && prev.actual_price === Number(actualP.toFixed(2))) return prev;
          return {
            ...prev,
            yield_percentage: Number(yieldPerc.toFixed(2)),
            actual_price: Number(actualP.toFixed(2))
          };
        });
      }
    } else {
      // Clear calculated fields if inputs are empty
      setFormState(prev => {
        if (prev.yield_percentage === "" && prev.actual_price === "") return prev;
        return {
          ...prev,
          yield_percentage: "",
          actual_price: ""
        };
      });
    }
  }, [formState.standard_price, formState.yield_grams, formState.unit]);


  const handleSortClick = () => {
    const nextSort = sort === "A to Z" ? "Z to A" : sort === "Z to A" ? "Newest" : sort === "Newest" ? "Oldest" : "A to Z";
    setSort(nextSort);
    setPage(1);
  };

  // Load Raw Materials
  const fetchMaterials = useCallback(async () => {
    if (!user) return;
        if (page === 1) {
      setIsLoading(true);
    } else {
      setIsFetchingNextPage(true);
      await new Promise(r => setTimeout(r, 2000));
    }
    try {
      const data = await endpoints.rawMaterials.getRawMaterials(page, pageSize, debouncedSearch, false, sort);
      setMaterials(prev => {
        const newItems = data.items || [];
        if (page === 1) return newItems;
        const existingIds = new Set(prev.map((item: any) => item.id || item.ulid));
        const uniqueNewItems = newItems.filter((item: any) => !existingIds.has(item.id || item.ulid));
        return [...prev, ...uniqueNewItems];
      });
      setTotalMaterials(data.total || 0);
    } catch (error: any) {
      console.error("Error loading raw materials:", error);
      showToast(error.message || "Failed to load raw materials", "error");
    } finally {
      setIsLoading(false);
      setIsFetchingNextPage(false);
    }
  }, [user, page, pageSize, debouncedSearch, sort]);

  useEffect(() => {
    if (user) {
      fetchMaterials();
    }
  }, [fetchMaterials, user]);

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

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom = Math.abs(e.currentTarget.scrollHeight - e.currentTarget.scrollTop - e.currentTarget.clientHeight) < 2;
    if (bottom && !isLoading && !isFetchingNextPage && page < totalPages) {
      setPage(prev => prev + 1);
    }
  };
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
    setEditingUlid(null);
    setFormState({
      name: "",
      price: "",
      standard_price: "",
      actual_price: "",
      yield_grams: "",
      yield_percentage: "",
      unit: "kg",
      description: "",
      image_filename: null,
      background_image_filename: null,
      category_ulid: null,
      category_name: null,
      vendor_ulid: null,
      vendor_name: null,
    });
    setPreviewUrl(null);
    setPreviewBackgroundUrl(null);
    setIsModalOpen(true);
  };

  const openEditModal = (material: RawMaterial, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering detail view
    setModalMode("edit");
    setEditingUlid(material.ulid);
    setFormState({
      name: material.name,
      price: material.price,
      standard_price: material.standard_price ?? material.price,
      actual_price: material.actual_price ?? "",
      yield_grams: material.yield_grams ?? "",
      yield_percentage: material.yield_percentage ?? "",
      unit: material.unit,
      description: material.description || "",
      image_filename: material.image_filename || null,
      background_image_filename: material.background_image_filename || null,
      category_ulid: material.category?.ulid || null,
      category_name: material.category?.name || null,
      vendor_ulid: material.vendor?.ulid || null,
      vendor_name: material.vendor?.name || null,
    });
    setPreviewUrl(material.image_filename ? getMediaUrl(systemSettings.R2_BASE_URL, material.image_filename) : null);
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
    // Note: We check formState.standard_price now.
    if (formState.standard_price === "" || Number(formState.standard_price) < 0) {
      showToast("Please enter a valid standard price (can be 0)", "error");
      return;
    }

    setIsSaving(true);
    
    const payload = {
      name: formState.name,
      price: Number(formState.standard_price), // Legacy
      standard_price: Number(formState.standard_price),
      actual_price: formState.actual_price !== "" ? Number(formState.actual_price) : null,
      yield_grams: formState.yield_grams !== "" ? Number(formState.yield_grams) : null,
      yield_percentage: formState.yield_percentage !== "" ? Number(formState.yield_percentage) : null,
      unit: formState.unit,
      description: formState.description || null,
      image_filename: formState.image_filename,
      background_image_filename: formState.background_image_filename,
      category_ulid: formState.category_ulid || null,
      vendor_ulid: formState.vendor_ulid || null,
    };

    try {
      if (editingUlid) {
        await updateRawMaterial(editingUlid, payload);
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
  const handleDeleteMaterial = (materialUlid: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering detail view
    setMaterialToDelete({ ulid: materialUlid, name });
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteMaterial = async () => {
    if (!materialToDelete) return;
    setIsDeleting(true);
    try {
      await endpoints.rawMaterials.deleteRawMaterial(materialToDelete.ulid);
      showToast(`${materialToDelete.name} deleted successfully`, "success");
      // Adjust page if deleting last item on current page
      if (materials.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        fetchMaterials();
      }
    } catch (error: any) {
      console.error("Error deleting raw material:", error);
      showToast(error.message || "Failed to delete raw material", "error");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setMaterialToDelete(null);
    }
  };

  // Detail View toggle
  const fetchCostLogs = useCallback(async (ulid: string, page: number) => {
    setIsLoadingLogs(true);
    try {
      const paginatedLogs = await endpoints.rawMaterials.getCostLogs(ulid, page, costLogPageSize);
      setCostLogs(paginatedLogs.items || []);
      setTotalCostLogs(paginatedLogs.total || 0);
    } catch (error) {
      console.error("Failed to fetch cost logs:", error);
      setCostLogs([]);
      setTotalCostLogs(0);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [costLogPageSize]);

  // Detail View toggle
  const openDetailView = async (material: RawMaterial) => {
    setSelectedMaterial(material);
    setIsDetailOpen(true);
    setCostLogPage(1);
    await fetchCostLogs(material.ulid, 1);
  };

  useEffect(() => {
    if (isDetailOpen && selectedMaterial) {
      fetchCostLogs(selectedMaterial.ulid, costLogPage);
    }
  }, [costLogPage, isDetailOpen, selectedMaterial, fetchCostLogs]);

  const closeDetailView = () => {
    setSelectedMaterial(null);
    setIsDetailOpen(false);
    setCostLogs([]);
    setTotalCostLogs(0);
    setCostLogPage(1);
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
          <div className="flex gap-2">
            {toast.type === "success" ? <CheckCircle2 className="h-5 w-5 text-[var(--color-bae-green)]" /> : <AlertTriangle className="h-5 w-5 text-red-500" />}
            <span className="font-medium text-[var(--color-lab-white)]">{toast.message}</span>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteMaterial}
        title="Delete Raw Material"
        message={
          materialToDelete ? (
            <>
              Are you sure you want to delete <span className="font-semibold text-white">{materialToDelete.name}</span>? This action cannot be undone and will permanently remove it from your inventory.
            </>
          ) : (
            "Are you sure you want to delete this raw material?"
          )
        }
        type="delete"
        confirmText={isDeleting ? "Deleting..." : "Delete"}
        isLoading={isDeleting}
      />

      {/* Main Page Layout */}
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        {/* Header Bar */}
        <Header />

        {/* Reusable Breadcrumbs Component */}
        <Breadcrumbs segments={isDetailOpen ? ["Raw Material", "Cost Mgt", "Preview"] : ["Raw Material", "Cost Mgt"]} />

        {!isDetailOpen ? (
          /* ─── Grid Listing view ─── */
          <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-2xl pt-2 pb-6 px-6 sm:pt-2 sm:pb-8 sm:px-8">
            {/* Sub Header / Filters and Buttons Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-between items-center shrink-0">
              {/* Search inputs */}
              {/* Search Input using ProbaeSearch Component */}
              <ProbaeSearch
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search for your order"
               isLoading={isTyping || isLoading}  sortByText={sort} onSortClick={handleSortClick} />

              {/* Actions */}
              <ProbaeButton
                onClick={openAddModal}
                className="w-full sm:w-auto px-8 shrink-0"
              >
                Add Raw Material
              </ProbaeButton>
            </div>

            {/* Grid Content Area */}
            {!isLoading && totalMaterials > 0 && (
            <div className="text-xs text-neutral-400 font-medium px-2 mb-3 mt-[-12px]">
              Showing {materials.length} of {totalMaterials}
            </div>
          )}
          <div className="flex-1 overflow-auto pr-2 pb-6 scrollbar-thin" onScroll={handleScroll}>
              {isLoading || isTyping ? (
                <div className="h-64 flex flex-col items-center justify-center gap-3">
                  <BowlLoader className="w-8 h-8 text-[#6b21a8]" />
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
                    <div className="mt-6 w-[200px]">
                      <ProbaeButton
                        onClick={openAddModal}
                      >
                        Add Your First Item
                      </ProbaeButton>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-6">
                  {materials.map((material) => {
                    const mediaUrl = getMediaUrl(systemSettings?.R2_BASE_URL, material.image_filename);
                    return (
                      <div
                        key={material.id}
                        onClick={() => openDetailView(material)}
                        className="bg-white rounded-3xl overflow-hidden shadow-sm border border-neutral-100 flex flex-col cursor-pointer transition-all hover:translate-y-[-4px] hover:shadow-md w-full relative group"
                      >
                        {/* Top Image */}
                        <div className="h-32 w-full bg-neutral-100 relative overflow-hidden shrink-0">
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
                            <div className="w-full h-full flex items-center justify-center">
                              <Wheat className="w-10 h-10 text-neutral-400" />
                            </div>
                          )}
                        </div>

                        {/* Content padding */}
                        <div className="p-5 flex flex-col flex-1">
                          
                          {/* Name and Category Row */}
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="text-[17px] font-bold text-neutral-900 leading-tight pr-2">
                              {material.name}
                            </h4>
                            {material.category?.name && (
                              <span className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-500 text-[10px] font-semibold tracking-wide shrink-0 whitespace-nowrap">
                                {material.category.name}
                              </span>
                            )}
                          </div>

                          {/* Price and Variance Row */}
                          <div className="flex justify-between items-center mb-4">
                            <p className="text-base font-bold text-neutral-900 flex items-end">
                              ₹{material.standard_price || material.price} <span className="text-xs font-semibold text-neutral-400 ml-1 pb-[1px]">/ {formatUnit(material.unit)}</span>
                            </p>

                            {/* Variance calculation */}
                            {(() => {
                              const currentStandard = material.standard_price || material.price || 0;
                              const prevPrice = material.previous_price || currentStandard;
                              
                              if (currentStandard > 0 && prevPrice > 0) {
                                const variance = ((currentStandard - prevPrice) / prevPrice) * 100;
                                if (Math.abs(variance) >= 0.01) {
                                  return variance > 0 ? (
                                    <span className="text-[11px] font-bold text-red-600 flex items-center gap-0.5 tracking-wide">
                                      <ArrowUp className="w-3 h-3" strokeWidth={3} /> {variance.toFixed(1)}%
                                    </span>
                                  ) : (
                                    <span className="text-[11px] font-bold text-green-600 flex items-center gap-0.5 tracking-wide">
                                      <ArrowDown className="w-3 h-3" strokeWidth={3} /> {Math.abs(variance).toFixed(1)}%
                                    </span>
                                  );
                                }
                              }
                              return null;
                            })()}
                          </div>

                          {/* Effective Cost & Yield Box */}
                          <div className="rounded-xl border border-[#6b21a8]/10 bg-[#fdfafF] flex overflow-hidden mb-5">
                            <div className="flex-1 p-3 border-r border-[#6b21a8]/10 flex flex-col justify-center">
                              <span className="text-[10px] font-semibold text-[#6b21a8]/60 mb-1 tracking-wide">Effective Cost</span>
                              <div className="text-sm font-bold text-[#6b21a8]">
                                {material.actual_price !== null && material.actual_price !== undefined ? `₹${Number(material.actual_price).toFixed(2)}` : "--"} <span className="text-[10px] font-semibold text-[#6b21a8]/80">/ {formatUnit(material.unit)}</span>
                              </div>
                            </div>
                            <div className="flex-1 p-3 flex flex-col justify-center">
                              <span className="text-[10px] font-semibold text-neutral-400 mb-1 tracking-wide">Yield</span>
                              <div className="text-sm font-bold text-neutral-800">
                                {material.yield_percentage !== null && material.yield_percentage !== undefined ? `${material.yield_percentage}%` : "--%"}
                              </div>
                            </div>
                          </div>
                          
                          {/* Divider */}
                          <div className="w-full h-[1px] bg-neutral-100 mb-4" />

                          {/* Metadata Rows */}
                          <div className="flex flex-col gap-2.5 mt-auto">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-neutral-400 font-medium">Previous:</span>
                              <span className="text-neutral-600 font-semibold">{material.previous_price ? `₹${material.previous_price}/${formatUnit(material.unit)}` : "-"}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-neutral-400 font-medium">Vendor:</span>
                              <span className="text-neutral-600 font-semibold truncate max-w-[120px] text-right">{material.vendor?.name || "-"}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-neutral-400 font-medium">Updated:</span>
                              <span className="text-neutral-600 font-semibold">{new Date(material.updated_at).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Action buttons (hover overlay) */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => openEditModal(material, e)}
                            className="w-8 h-8 rounded-full bg-white text-neutral-700 hover:text-black hover:bg-neutral-50 flex items-center justify-center shadow-md cursor-pointer transition-all shrink-0"
                            title="Edit Material"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteMaterial(material.ulid, material.name, e)}
                            className="w-8 h-8 rounded-full bg-white text-red-500 hover:text-red-600 hover:bg-red-50 flex items-center justify-center shadow-md cursor-pointer transition-all shrink-0"
                            title="Delete Material"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {isFetchingNextPage && (
                <div className="py-6 flex justify-center items-center w-full">
                  <BowlLoader className="w-6 h-6 text-[#6b21a8]" />
                  <span className="ml-2 text-sm text-neutral-500 font-medium">Loading more...</span>
                </div>
              )}
              {!isLoading && !isFetchingNextPage && page >= totalPages && totalPages > 0 && (
                <div className="py-8 flex flex-col justify-center items-center w-full animate-in fade-in zoom-in duration-500">
                  <div className="w-10 h-10 rounded-full bg-green-50 text-green-500 flex items-center justify-center mb-3 shadow-sm ring-4 ring-green-50/50">
                    <svg className="w-6 h-6 animate-[bounce_2s_ease-in-out_infinite]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-neutral-400 font-bold">You're all caught up!</span>
                </div>
              )}
          </div>

            {/* Pagination Controls */}
            
          </div>
        ) : (
          /* ─── Detail/Preview View ─── */
          <div className="flex-1 w-full rounded-2xl overflow-auto relative flex flex-col p-6 scrollbar-thin bg-[#fafafa]">
            
            {/* Background Image Header Banner */}
            <div className="relative w-full h-[280px] rounded-3xl overflow-hidden shadow-sm mb-6 shrink-0 border border-neutral-100">
              {selectedMaterial?.background_image_filename ? (
                <img 
                  src={getMediaUrl(systemSettings.R2_BASE_URL, selectedMaterial.background_image_filename) || undefined} 
                  className="absolute inset-0 w-full h-full object-cover" 
                  alt="Background"
                />
              ) : (
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-purple-100 to-indigo-100" />
              )}
              {/* Dark overlay for contrast */}
              <div className="absolute inset-0 bg-black/30" />

              {/* Back Button */}
              <button 
                onClick={closeDetailView}
                className="absolute top-6 left-6 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              {/* Title Area overlaid on banner */}
              <div className="absolute bottom-6 left-8 flex items-end gap-6">
                <div className="w-28 h-28 rounded-2xl overflow-hidden border-4 border-white shadow-lg bg-white shrink-0">
                  {selectedMaterial?.image_filename ? (
                    <img
                      src={getMediaUrl(systemSettings?.R2_BASE_URL, selectedMaterial.image_filename) || ""}
                      alt={selectedMaterial?.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-neutral-100">
                      <Wheat className="w-10 h-10 text-neutral-400" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col pb-2">
                  <div className="flex items-center gap-3 mb-2">
                    {selectedMaterial?.category?.name && (
                      <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-semibold tracking-wide border border-white/30">
                        {selectedMaterial.category.name}
                      </span>
                    )}
                    {selectedMaterial?.vendor?.name && (
                      <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-semibold tracking-wide border border-white/30">
                        Vendor: {selectedMaterial.vendor.name}
                      </span>
                    )}
                  </div>
                  <h2 className="text-4xl font-extrabold text-white drop-shadow-md">
                    {selectedMaterial?.name}
                  </h2>
                  {selectedMaterial?.description && (
                    <p className="text-white/80 mt-1 max-w-2xl text-sm drop-shadow-sm line-clamp-2">
                      {selectedMaterial.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Dashboard Content */}
            <div className="w-full max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
              
              {/* Left Column: Cost Breakdown & Meta */}
              <div className="lg:col-span-1 flex flex-col gap-6">
                
                {/* Cost Card */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-100">
                  <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-5">Cost Breakdown</h3>
                  
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <span className="text-xs font-semibold text-neutral-400 block mb-1">Standard Price</span>
                      <p className="text-3xl font-black text-neutral-900 flex items-end">
                        ₹{selectedMaterial?.standard_price || selectedMaterial?.price || 0} <span className="text-base font-semibold text-neutral-400 ml-1 pb-1">/ {selectedMaterial ? formatUnit(selectedMaterial.unit) : ""}</span>
                      </p>
                    </div>

                    {/* Variance */}
                    {(() => {
                      const currentStandard = selectedMaterial?.standard_price || selectedMaterial?.price || 0;
                      const prevPrice = selectedMaterial?.previous_price || currentStandard;
                      
                      if (currentStandard > 0 && prevPrice > 0) {
                        const variance = ((currentStandard - prevPrice) / prevPrice) * 100;
                        if (Math.abs(variance) >= 0.01) {
                          return variance > 0 ? (
                            <div className="flex flex-col items-end">
                              <span className="text-xs font-semibold text-neutral-400 block mb-1">Variance</span>
                              <span className="text-base font-bold text-red-600 flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg">
                                <ArrowUp className="w-4 h-4" strokeWidth={3} /> {variance.toFixed(1)}%
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-end">
                              <span className="text-xs font-semibold text-neutral-400 block mb-1">Variance</span>
                              <span className="text-base font-bold text-green-600 flex items-center gap-1 bg-green-50 px-2 py-1 rounded-lg">
                                <ArrowDown className="w-4 h-4" strokeWidth={3} /> {Math.abs(variance).toFixed(1)}%
                              </span>
                            </div>
                          );
                        }
                      }
                      return null;
                    })()}
                  </div>

                  <div className="rounded-2xl border border-[#6b21a8]/15 bg-[#faf5ff] flex flex-col overflow-hidden mb-6">
                    <div className="p-4 border-b border-[#6b21a8]/10 flex justify-between items-center bg-[#fdfafF]">
                      <span className="text-xs font-bold text-[#6b21a8]/70 uppercase tracking-wide">Effective Cost</span>
                      <div className="text-xl font-black text-[#6b21a8]">
                        {selectedMaterial?.actual_price !== null && selectedMaterial?.actual_price !== undefined ? `₹${Number(selectedMaterial.actual_price).toFixed(2)}` : "--"} <span className="text-xs font-bold text-[#6b21a8]/60">/ {selectedMaterial ? formatUnit(selectedMaterial.unit) : ""}</span>
                      </div>
                    </div>
                    <div className="flex divide-x divide-[#6b21a8]/10 bg-white">
                      <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Yield %</span>
                        <div className="text-base font-bold text-neutral-800">
                          {selectedMaterial?.yield_percentage !== null && selectedMaterial?.yield_percentage !== undefined ? `${selectedMaterial.yield_percentage}%` : "--%"}
                        </div>
                      </div>
                      <div className="flex-1 p-4 flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Yield Wt.</span>
                        <div className="text-base font-bold text-neutral-800">
                          {selectedMaterial?.yield_grams !== null && selectedMaterial?.yield_grams !== undefined ? `${selectedMaterial.yield_grams}${selectedMaterial.unit === 'l' || selectedMaterial.unit === 'ml' ? 'ml' : 'g'}` : "--"}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center text-sm py-2 border-b border-neutral-50">
                      <span className="text-neutral-500 font-medium">Previous Price</span>
                      <span className="text-neutral-900 font-bold">{selectedMaterial?.previous_price ? `₹${selectedMaterial.previous_price}/${formatUnit(selectedMaterial.unit)}` : "-"}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm py-2 border-b border-neutral-50">
                      <span className="text-neutral-500 font-medium">Last Updated</span>
                      <span className="text-neutral-900 font-bold">{selectedMaterial?.updated_at ? new Date(selectedMaterial.updated_at).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}</span>
                    </div>
                  </div>
                </div>

                {/* Stock Information */}
                {(selectedMaterial?.current_stock !== undefined || selectedMaterial?.stock_threshold !== undefined) && (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-100">
                    <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4">Stock Info</h3>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-neutral-500 mb-1">Current Stock</span>
                        <span className={`text-xl font-bold ${
                          (selectedMaterial.current_stock ?? 0) <= (selectedMaterial.stock_threshold ?? 0) 
                            ? "text-red-500" 
                            : "text-neutral-800"
                        }`}>
                          {selectedMaterial.current_stock ?? 0} {formatUnit(selectedMaterial.unit)}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-semibold text-neutral-500 mb-1">Threshold</span>
                        <span className="text-xl font-bold text-neutral-800">
                          {selectedMaterial.stock_threshold ?? 0} {formatUnit(selectedMaterial.unit)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Nutrition & Logs */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                
                {/* Nutrition Grid */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-100">
                  <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-5">Nutritional Information <span className="text-xs font-medium normal-case ml-2 text-neutral-400">(per 100g/ml)</span></h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-orange-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-orange-100">
                      <span className="text-xs font-bold text-orange-400 uppercase tracking-wide mb-1">Calories</span>
                      <span className="text-lg font-black text-orange-600">{selectedMaterial?.calories ?? "-"} <span className="text-xs font-bold text-orange-400">kcal</span></span>
                    </div>
                    <div className="bg-blue-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-blue-100">
                      <span className="text-xs font-bold text-blue-400 uppercase tracking-wide mb-1">Protein</span>
                      <span className="text-lg font-black text-blue-600">{selectedMaterial?.protein ?? "-"} <span className="text-xs font-bold text-blue-400">g</span></span>
                    </div>
                    <div className="bg-yellow-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-yellow-100">
                      <span className="text-xs font-bold text-yellow-500 uppercase tracking-wide mb-1">Carbs</span>
                      <span className="text-lg font-black text-yellow-600">{selectedMaterial?.carbs ?? "-"} <span className="text-xs font-bold text-yellow-500">g</span></span>
                    </div>
                    <div className="bg-rose-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-rose-100">
                      <span className="text-xs font-bold text-rose-400 uppercase tracking-wide mb-1">Fat</span>
                      <span className="text-lg font-black text-rose-600">{selectedMaterial?.fat ?? "-"} <span className="text-xs font-bold text-rose-400">g</span></span>
                    </div>
                    <div className="bg-emerald-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-emerald-100">
                      <span className="text-xs font-bold text-emerald-500 uppercase tracking-wide mb-1">Fiber</span>
                      <span className="text-lg font-black text-emerald-600">{selectedMaterial?.fiber ?? "-"} <span className="text-xs font-bold text-emerald-500">g</span></span>
                    </div>
                  </div>
                </div>

                {/* Cost Logs Table */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-neutral-100 flex-1 flex flex-col">
                  <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-5">Cost History Logs</h3>
                  
                  {isLoadingLogs ? (
                    <div className="flex-1 flex justify-center items-center py-12">
                      <BowlLoader className="w-8 h-8 text-[#6b21a8]" />
                    </div>
                  ) : costLogs.length === 0 ? (
                    <div className="flex-1 flex flex-col justify-center items-center py-12 text-center border-2 border-dashed border-neutral-100 rounded-2xl bg-neutral-50/50">
                      <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
                        <Search className="w-5 h-5 text-neutral-400" />
                      </div>
                      <h4 className="text-sm font-bold text-neutral-600">No cost changes recorded yet</h4>
                      <p className="text-xs text-neutral-400 mt-1 max-w-[250px]">When the price or yield of this item is updated, the history will appear here.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-neutral-100">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-neutral-50/80 border-b border-neutral-100">
                            <th className="py-3.5 px-5 text-[11px] font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap">Date</th>
                            <th className="py-3.5 px-5 text-[11px] font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap">Old Price</th>
                            <th className="py-3.5 px-5 text-[11px] font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap">New Price</th>
                            <th className="py-3.5 px-5 text-[11px] font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap">Old Yield</th>
                            <th className="py-3.5 px-5 text-[11px] font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap">New Yield</th>
                            <th className="py-3.5 px-5 text-[11px] font-bold text-neutral-500 uppercase tracking-wider whitespace-nowrap">Updated By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-50">
                          {costLogs.map((log) => (
                            <tr key={log.ulid} className="hover:bg-neutral-50/30 transition-colors">
                              <td className="py-3.5 px-5 text-xs font-semibold text-neutral-600 whitespace-nowrap">
                                {new Date(log.created_at).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="py-3.5 px-5 text-xs font-medium text-neutral-400 line-through whitespace-nowrap">
                                {log.previous_standard_price ? `₹${log.previous_standard_price}` : "-"}
                              </td>
                              <td className="py-3.5 px-5 text-xs font-bold text-neutral-800 whitespace-nowrap">
                                {log.new_standard_price ? `₹${log.new_standard_price}` : "-"}
                              </td>
                              <td className="py-3.5 px-5 text-xs font-medium text-neutral-400 line-through whitespace-nowrap">
                                {log.previous_yield_grams ? `${log.previous_yield_grams}g` : "-"}
                              </td>
                              <td className="py-3.5 px-5 text-xs font-bold text-neutral-800 whitespace-nowrap">
                                {log.new_yield_grams ? `${log.new_yield_grams}g` : "-"}
                              </td>
                              <td className="py-3.5 px-5 text-xs font-medium text-neutral-600 whitespace-nowrap flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[9px] font-bold">
                                  {(log.created_by?.full_name || log.created_by?.email || "S")[0].toUpperCase()}
                                </div>
                                {log.created_by?.full_name || log.created_by?.email || "System"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Pagination Controls */}
                  {totalCostLogs > costLogPageSize && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-neutral-100">
                      <span className="text-xs text-neutral-500">
                        Showing {((costLogPage - 1) * costLogPageSize) + 1} to {Math.min(costLogPage * costLogPageSize, totalCostLogs)} of {totalCostLogs} entries
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCostLogPage((prev) => Math.max(prev - 1, 1))}
                          disabled={costLogPage === 1}
                          className="px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCostLogPage((prev) => Math.min(prev + 1, Math.ceil(totalCostLogs / costLogPageSize)))}
                          disabled={costLogPage >= Math.ceil(totalCostLogs / costLogPageSize)}
                          className="px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
      )}
    </div>

    {/* ─── Add/Edit Modal (Screenshot 3) ─────────────────────────── */}
    {isModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
        <div 
          className="bg-white rounded-[40px] max-w-lg w-full p-8 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-neutral-100 flex flex-col gap-6 relative max-h-[90vh] overflow-auto scrollbar-thin"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <BowlLoader className="w-6 h-6 text-[#6b21a8]" />
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
                    <BowlLoader className="w-6 h-6 text-[#6b21a8]" />
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

            {/* Category Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide">
                Category
              </label>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(true)}
                className="w-full bg-neutral-100/70 border border-transparent hover:border-neutral-200 hover:bg-white rounded-2xl px-4 py-3.5 text-sm text-neutral-800 text-left transition-all flex items-center justify-between group"
              >
                {formState.category_name ? (
                  <span className="font-semibold">{formState.category_name}</span>
                ) : (
                  <span className="text-neutral-400 font-medium">Select a category</span>
                )}
                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center border border-neutral-200 shadow-sm group-hover:border-neutral-300 transition-colors">
                  <Search className="w-3 h-3 text-neutral-500" />
                </div>
              </button>
            </div>

            {/* Vendor Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide">
                Vendor
              </label>
              <button
                type="button"
                onClick={() => setIsVendorModalOpen(true)}
                className="w-full bg-neutral-100/70 border border-transparent hover:border-neutral-200 hover:bg-white rounded-2xl px-4 py-3.5 text-sm text-neutral-800 text-left transition-all flex items-center justify-between group"
              >
                {formState.vendor_name ? (
                  <span className="font-semibold">{formState.vendor_name}</span>
                ) : (
                  <span className="text-neutral-400 font-medium">Select a vendor</span>
                )}
                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center border border-neutral-200 shadow-sm group-hover:border-neutral-300 transition-colors">
                  <Search className="w-3 h-3 text-neutral-500" />
                </div>
              </button>
            </div>

            {/* Price & Unit Toggle */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide">
                Standard Price
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
                    value={formState.standard_price}
                    onChange={(e) => setFormState(prev => ({ ...prev, standard_price: e.target.value === "" ? "" : Number(e.target.value) }))}
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

            {/* Yield Configuration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide">
                  Yield ({formState.unit === 'l' ? 'ml' : 'g'}) / {formState.unit.toUpperCase()}
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder={formState.unit === "g" || formState.unit === "ml" ? "1" : "1000"}
                  value={formState.yield_grams}
                  onChange={(e) => setFormState(prev => ({ ...prev, yield_grams: e.target.value === "" ? "" : Number(e.target.value) }))}
                  className="w-full bg-neutral-100/70 border border-transparent focus:border-neutral-200 focus:bg-white rounded-2xl px-4 py-3.5 text-sm text-neutral-800 focus:outline-none transition-all placeholder:text-neutral-400 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wide">
                  Yield % (Auto)
                </label>
                <div className="w-full bg-neutral-100 border border-transparent rounded-2xl px-4 py-3.5 text-sm text-neutral-500 font-semibold h-[48px] flex items-center">
                  {formState.yield_percentage !== "" && formState.yield_percentage !== null ? `${formState.yield_percentage}%` : "--%"}
                </div>
              </div>
            </div>

            {/* Effective Cost */}
            <div>
              <label className="block text-xs font-semibold text-[#6b21a8] mb-1.5 uppercase tracking-wide">
                Actual Price / Effective Cost
              </label>
              <div className="w-full bg-[#fdfafF] border border-[#6b21a8]/20 rounded-2xl px-4 py-3.5 text-sm text-[#6b21a8] font-bold h-[48px] flex items-center">
                {formState.actual_price !== "" && formState.actual_price !== null ? `₹${formState.actual_price} / ${formState.unit.toUpperCase()}` : `₹-- / ${formState.unit.toUpperCase()}`}
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

            {/* Calories and Micronutrients are managed in Calorie MGT */}

            {/* Footer buttons */}
            <div className="flex gap-4 justify-start mt-6">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-600 hover:text-black py-3.5 px-8 rounded-2xl text-sm font-bold transition-all shadow-sm cursor-pointer"
              >
                Cancel
              </button>
              <div className="w-[140px]">
                <ProbaeButton
                  type="submit"
                  disabled={isUploadingPrimary || isUploadingBackground || isSaving}
                >
                  {isSaving && <BowlLoader className="w-4 h-4" />}
                  Save
                </ProbaeButton>
              </div>
            </div>
          </form>
        </div>
      </div>
    )}

    <SelectCategoryModal
      isOpen={isCategoryModalOpen}
      onClose={() => setIsCategoryModalOpen(false)}
      selectedCategoryUlid={formState.category_ulid}
      onSelect={(cat) => {
        setFormState(prev => ({
          ...prev,
          category_ulid: cat?.ulid || null,
          category_name: cat?.name || null,
        }));
      }}
    />

    <SelectVendorModal
      isOpen={isVendorModalOpen}
      onClose={() => setIsVendorModalOpen(false)}
      selectedVendorUlid={formState.vendor_ulid}
      onSelect={(v) => {
        setFormState(prev => ({
          ...prev,
          vendor_ulid: v?.ulid || null,
          vendor_name: v?.name || null,
        }));
      }}
    />
  </div>
  );
}

