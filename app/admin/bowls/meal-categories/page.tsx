"use client";
import { BowlLoader } from "@/components/admin/BowlLoader";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  Pencil,
  Trash2,
  Plus,
  UploadCloud,
  X
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Header } from "@/components/admin/Header";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { endpoints } from "@/lib/apiService";
import { MealCategory } from "@/lib/types";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { getMediaUrl } from "@/lib/utils";
import { ProbaeSearch } from "@/components/admin/ProbaeSearch";

export default function MealCategoriesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [categories, setCategories] = useState<MealCategory[]>([]);
  const [totalCategories, setTotalCategories] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [systemSettings, setSystemSettings] = useState<any>({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<MealCategory | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    color_code: "#00BCD4",
    time_from: "",
    time_to: "",
    is_active: true
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImage, setExistingImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MealCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/admin/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 800);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchCategories = useCallback(async () => {
    if (!user) return;
        if (page === 1) {
      setIsLoading(true);
    } else {
      setIsFetchingNextPage(true);
      await new Promise(r => setTimeout(r, 2000));
    }
    try {
      const [data, settingsRes] = await Promise.all([
        endpoints.mealCategories.getMealCategories(page, pageSize, debouncedSearch),
        endpoints.settings.getSystemSettings().catch(() => ({}))
      ]);
      setCategories(prev => {
        const newItems = data.items || [];
        if (page === 1) return newItems;
        const existingIds = new Set(prev.map((item: any) => item.id || item.ulid));
        const uniqueNewItems = newItems.filter((item: any) => !existingIds.has(item.id || item.ulid));
        return [...prev, ...uniqueNewItems];
      });
      setTotalCategories(data.total || 0);
      if (settingsRes && (settingsRes as any).R2_BASE_URL) {
        setSystemSettings({ R2_BASE_URL: (settingsRes as any).R2_BASE_URL });
      }
    } catch (error: any) {
      console.error("Failed to fetch meal slots:", error);
    } finally {
      setIsLoading(false);
      setIsFetchingNextPage(false);
    }
  }, [user, page, pageSize, debouncedSearch]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const totalPages = Math.ceil(totalCategories / pageSize) || 1;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom = Math.abs(e.currentTarget.scrollHeight - e.currentTarget.scrollTop - e.currentTarget.clientHeight) < 2;
    if (bottom && !isLoading && !isFetchingNextPage && page < totalPages) {
      setPage(prev => prev + 1);
    }
  };

  const handleOpenCreateModal = () => {
    setIsEditMode(false);
    setCurrentCategory(null);
    setFormData({ name: "", slug: "", color_code: "#00BCD4", time_from: "", time_to: "", is_active: true });
    setImageFile(null);
    setImagePreview(null);
    setExistingImage(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (category: MealCategory, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsEditMode(true);
    setCurrentCategory(category);
    const formatTime = (t: string | undefined | null) => t ? t.substring(0, 5) : "";
    setFormData({
      name: category.name,
      slug: category.slug,
      color_code: category.color_code || "#00BCD4",
      time_from: formatTime(category.time_from),
      time_to: formatTime(category.time_to),
      is_active: category.is_active
    });
    setExistingImage(category.image_filename || null);
    setImageFile(null);
    setImagePreview(null);
    setIsModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData(prev => ({
      ...prev,
      name,
      slug: !isEditMode ? generateSlug(name) : prev.slug
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let finalImageFilename = existingImage;
      if (imageFile) {
        const uploadRes = await endpoints.documents.upload(imageFile);
        finalImageFilename = uploadRes.filename;
      }

      const payload = {
        ...formData,
        image_filename: finalImageFilename || undefined,
        time_from: formData.time_from || null,
        time_to: formData.time_to || null,
      };

      if (isEditMode && currentCategory) {
        await endpoints.mealCategories.updateMealCategory(currentCategory.ulid, payload);
      } else {
        await endpoints.mealCategories.createMealCategory(payload as any);
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (error: any) {
      alert("Failed to save: " + (error.detail || error.message));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (category: MealCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToDelete(category);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await endpoints.mealCategories.deleteMealCategory(itemToDelete.ulid);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      fetchCategories();
    } catch (error: any) {
      alert("Delete failed: " + (error.detail || error.message));
    } finally {
      setIsDeleting(false);
    }
  };

  if (authLoading) return <div className="min-h-screen bg-[#F8F9FA]" />;

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full flex flex-col bg-[#E6E6E6] overflow-hidden">
        <Header />
        
        <div className="text-[13px] text-neutral-500 font-medium select-none pl-1 mb-4">
          <span>Meal Slots</span>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden p-1 sm:p-2">
          <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-center shrink-0">
            <ProbaeSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search for your category"
             isLoading={isLoading} />
            <ProbaeButton onClick={handleOpenCreateModal} className="w-full sm:w-auto px-8 shrink-0">
              Add Meal Slot
            </ProbaeButton>
          </div>

          {!isLoading && totalCategories > 0 && (
            <div className="text-xs text-neutral-400 font-medium px-2 mb-3 mt-[-12px]">
              Showing {categories.length} of {totalCategories}
            </div>
          )}
          <div className="flex-1 overflow-y-auto pr-2 pb-6 scrollbar-thin" onScroll={handleScroll}>
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <BowlLoader className="w-8 h-8 text-[#7c3aed] animate-spin" />
              <span className="text-neutral-500 text-sm font-medium">Loading...</span>
            </div>
          ) : categories.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center bg-white rounded-3xl border border-neutral-100 p-8 text-center max-w-lg mx-auto shadow-sm">
              <h3 className="text-neutral-800 font-bold text-lg">No meal slots found</h3>
              <p className="text-neutral-500 text-sm mt-2 max-w-sm">
                Click 'Add Meal Slot' to create one.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-10">
              {categories.map((item) => (
                <div
                  key={item.id}
                  className="w-[200px] h-[300px] rounded-[100px] flex flex-col items-center pt-5 pb-6 px-4 shadow-lg relative group transition-transform hover:-translate-y-2 shrink-0"
                  style={{ backgroundColor: item.color_code || "#8B5CF6" }}
                >
                  {/* Delete Button (Hover) */}
                  <button
                    onClick={(e) => handleDelete(item, e)}
                    className="absolute top-2 right-6 w-7 h-7 bg-black/20 hover:bg-black/40 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  
                  {/* Image */}
                  <div className="w-[160px] h-[160px] rounded-full bg-white/20 flex items-center justify-center overflow-hidden mb-4 shrink-0">
                    <img 
                      src={item.image_filename ? getMediaUrl(systemSettings.R2_BASE_URL, item.image_filename) || "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80" : "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80"} 
                      alt={item.name} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  
                  {/* Name */}
                  <h3 className="text-white font-medium text-[22px] tracking-wide mb-auto text-center truncate w-full px-2">{item.name}</h3>
                  
                  {/* Divider */}
                  <div className="w-24 h-[1px] bg-white/30 mb-4 shrink-0"></div>
                  
                  {/* Edit Button */}
                  <button 
                    onClick={(e) => handleOpenEditModal(item, e)}
                    className="w-9 h-9 rounded-full bg-black flex items-center justify-center hover:scale-110 transition-transform shrink-0"
                  >
                    <Pencil className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] w-full max-w-lg p-8 shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-neutral-400 hover:text-neutral-600">
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold text-neutral-800 mb-6">{isEditMode ? "Edit Meal Slot" : "Add Meal Slot"}</h2>
            
            <form onSubmit={handleSave} className="space-y-5">
              <div className="flex items-center gap-6">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-full bg-neutral-100 flex items-center justify-center cursor-pointer border-2 border-dashed border-neutral-300 overflow-hidden relative group shrink-0"
                >
                  <img 
                    src={(imagePreview || (existingImage ? getMediaUrl(systemSettings.R2_BASE_URL, existingImage) : "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80")) as string} 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-[10px] text-white font-bold uppercase tracking-wider">Change</span>
                  </div>
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
                </div>
                
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-neutral-600 uppercase mb-1 block">Name</label>
                    <input required type="text" value={formData.name} onChange={handleNameChange} className="text-neutral-900 w-full h-[48px] bg-neutral-50 border border-neutral-200 rounded-[14px] px-4 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-neutral-600 uppercase mb-1 block">Color Code (Hex)</label>
                    <div className="flex gap-2">
                      <input type="color" value={formData.color_code} onChange={(e) => setFormData({...formData, color_code: e.target.value})} className="h-[48px] w-[48px] rounded-[14px] cursor-pointer bg-neutral-50 border border-neutral-200 p-1" />
                      <input type="text" value={formData.color_code} onChange={(e) => setFormData({...formData, color_code: e.target.value})} className="text-neutral-900 flex-1 h-[48px] bg-neutral-50 border border-neutral-200 rounded-[14px] px-4 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium font-mono" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-600 uppercase mb-1 block">Time From (Optional)</label>
                  <input type="time" value={formData.time_from} onChange={(e) => setFormData({...formData, time_from: e.target.value})} className="text-neutral-900 w-full h-[48px] bg-neutral-50 border border-neutral-200 rounded-[14px] px-4 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-600 uppercase mb-1 block">Time To (Optional)</label>
                  <input type="time" value={formData.time_to} onChange={(e) => setFormData({...formData, time_to: e.target.value})} className="text-neutral-900 w-full h-[48px] bg-neutral-50 border border-neutral-200 rounded-[14px] px-4 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium" />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-neutral-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-colors">Cancel</button>
                <button type="submit" disabled={isSaving} className="px-5 py-2.5 rounded-xl font-bold text-white bg-black hover:bg-neutral-800 disabled:opacity-50 transition-colors">
                  {isSaving ? "Saving..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Meal Slot"
        message={`Are you sure you want to delete ${itemToDelete?.name}?`}
        confirmText="Delete"
        type="delete"
        isLoading={isDeleting}
      />
    </div>
  );
}
