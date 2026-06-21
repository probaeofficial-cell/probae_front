"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Loader2, 
  Wheat,
  AlertTriangle,
  CheckCircle2,
  Search,
  ChevronDown
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { endpoints } from "@/lib/apiService";
import { getMediaUrl } from "@/lib/utils";
import { RawMaterial, MacrosUpdatePayload } from "@/lib/types";

export default function AddMacrosPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // ─── State Variables ───────────────────────────────────────────────────────
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);
  const [systemSettings, setSystemSettings] = useState({ R2_BASE_URL: "" });
  const [isSaving, setIsSaving] = useState(false);

  // Dropdown States
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownMaterials, setDropdownMaterials] = useState<RawMaterial[]>([]);
  const [dropdownPage, setDropdownPage] = useState(1);
  const [dropdownSearch, setDropdownSearch] = useState("");
  const [hasMoreDropdown, setHasMoreDropdown] = useState(true);
  const [isDropdownLoading, setIsDropdownLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Form State
  const [formState, setFormState] = useState({
    calories: "" as number | "",
    protein: "" as number | "",
    carbs: "" as number | "",
    fiber: "" as number | "",
    fat: "" as number | "",
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

  // Load system settings
  useEffect(() => {
    async function loadSettings() {
      if (!user) return;
      try {
        const settings = await endpoints.settings.getSystemSettings();
        if (settings && settings.R2_BASE_URL !== undefined) {
          setSystemSettings({ R2_BASE_URL: settings.R2_BASE_URL });
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    }
    loadSettings();
  }, [user]);

  // Load Dropdown Materials (Incremental Page Loading)
  const fetchDropdownMaterials = async (pageToFetch: number, search: string, clearPrevious: boolean) => {
    if (isDropdownLoading) return;
    setIsDropdownLoading(true);
    try {
      const res = await endpoints.rawMaterials.getRawMaterials(pageToFetch, 20, search);
      const items = res.items || [];
      if (clearPrevious) {
        setDropdownMaterials(items);
      } else {
        setDropdownMaterials(prev => [...prev, ...items]);
      }
      setHasMoreDropdown(items.length === 20);
    } catch (error) {
      console.error("Error fetching raw materials for select:", error);
    } finally {
      setIsDropdownLoading(false);
    }
  };

  // Initial load of dropdown
  useEffect(() => {
    if (user) {
      fetchDropdownMaterials(1, "", true);
    }
  }, [user]);

  // Search filter effect for dropdown (debounced)
  useEffect(() => {
    if (!user) return;
    const delayDebounceFn = setTimeout(() => {
      setDropdownPage(1);
      fetchDropdownMaterials(1, dropdownSearch, true);
    }, 350);

    return () => clearTimeout(delayDebounceFn);
  }, [dropdownSearch, user]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── Toast Helper ─────────────────────────────────────────────────────────
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // ─── Dropdown Scroll / Paginate on Scroll ──────────────────────────────────
  const handleDropdownScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const threshold = target.scrollHeight - target.scrollTop <= target.clientHeight + 15;
    if (threshold && hasMoreDropdown && !isDropdownLoading) {
      const nextPage = dropdownPage + 1;
      setDropdownPage(nextPage);
      fetchDropdownMaterials(nextPage, dropdownSearch, false);
    }
  };

  // ─── Select Material Handler ───────────────────────────────────────────────
  const handleSelectMaterial = (material: RawMaterial) => {
    setSelectedMaterial(material);
    setFormState({
      calories: material.calories !== undefined && material.calories !== null ? material.calories : "",
      protein: material.protein !== undefined && material.protein !== null ? material.protein : "",
      carbs: material.carbs !== undefined && material.carbs !== null ? material.carbs : "",
      fiber: material.fiber !== undefined && material.fiber !== null ? material.fiber : "",
      fat: material.fat !== undefined && material.fat !== null ? material.fat : "",
      microsString: material.micros ? material.micros.join(", ") : "",
    });
    setIsDropdownOpen(false);
  };

  // ─── Save Action ───────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterial) {
      showToast("Please select a raw material first", "error");
      return;
    }

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
      await endpoints.rawMaterials.updateMacros(selectedMaterial.id, payload);
      showToast(`Nutritional macros for ${selectedMaterial.name} updated successfully`, "success");
      // Redirect back to listing view
      router.push("/admin/raw-materials/calorie-management");
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

  const backgroundUrl = selectedMaterial 
    ? getMediaUrl(systemSettings.R2_BASE_URL, selectedMaterial.background_image_filename) 
    : null;

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
        <Breadcrumbs segments={["Raw Material", "Calorie Mgt", "Add Macros"]} />

        {/* Scrollable Content container */}
        <div className="flex-1 overflow-y-auto pr-1 pb-6 scrollbar-thin">
          {/* Title */}
          <h1 className="text-xl font-extrabold text-neutral-800 pl-1 mb-8 select-none">Add Macros</h1>

          {/* Flex layout columns (directly on grey background) */}
          <div className="w-full max-w-5xl mx-auto flex flex-col lg:flex-row gap-12 items-start mt-4 pb-12">
          
          {/* Left Column: Vertical Oval Image */}
          <div className="w-full lg:w-[42%] flex items-center justify-center shrink-0">
            <div className="w-72 h-[480px] rounded-full overflow-hidden bg-white border border-black/30 relative flex items-center justify-center shrink-0">
              {backgroundUrl ? (
                <img
                  src={backgroundUrl}
                  alt={selectedMaterial?.name || "Selected image"}
                  className="w-full h-full object-cover animate-fade-in"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-neutral-300">
                  <Wheat className="w-16 h-16 text-neutral-300 mb-2" />
                  <span className="text-xs font-semibold text-neutral-400">No Image Selected</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Form Fields */}
          <form onSubmit={handleSave} className="flex-1 w-full flex flex-col gap-6">
            
            {/* Name selection (Custom Scroll Paginated Dropdown with Search) */}
            <div className="relative w-full" ref={dropdownRef}>
              <label className="block text-sm font-semibold text-neutral-800 mb-1.5">
                Name
              </label>
              
              {/* Select Trigger Box */}
              <div 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full bg-white border border-neutral-100 rounded-2xl px-5 py-4 text-[15px] font-bold text-neutral-800 focus:outline-none shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex justify-between items-center cursor-pointer select-none"
              >
                <span className={selectedMaterial ? "text-neutral-800" : "text-neutral-400 font-medium"}>
                  {selectedMaterial ? selectedMaterial.name : "Select a Raw Material"}
                </span>
                <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
              </div>

              {/* Dropdown Options Box */}
              {isDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-neutral-200 rounded-2xl shadow-xl z-50 p-3 flex flex-col gap-2 max-h-[220px] overflow-hidden animate-fade-in">
                  
                  {/* Search inside Select */}
                  <div className="flex items-center gap-2 border border-neutral-200 rounded-xl px-3 py-2 shrink-0">
                    <Search className="w-4 h-4 text-neutral-400" />
                    <input 
                      type="text"
                      placeholder="Search raw materials..."
                      value={dropdownSearch}
                      onChange={(e) => setDropdownSearch(e.target.value)}
                      className="w-full text-xs text-neutral-700 bg-transparent focus:outline-none"
                    />
                  </div>

                  {/* Scrollable list with scroll pagination logic */}
                  <div 
                    onScroll={handleDropdownScroll}
                    className="flex-1 overflow-y-auto scrollbar-thin space-y-1 pr-1"
                  >
                    {dropdownMaterials.map(m => (
                      <div 
                        key={m.id}
                        onClick={() => handleSelectMaterial(m)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                          selectedMaterial?.id === m.id 
                            ? "bg-[#7c3aed] text-white" 
                            : "text-neutral-700 hover:bg-neutral-100"
                        }`}
                      >
                        {m.name}
                      </div>
                    ))}

                    {/* Loading indicator inside select list */}
                    {isDropdownLoading && (
                      <div className="py-2 flex items-center justify-center gap-1.5 text-neutral-400 text-[10px]">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Loading more...</span>
                      </div>
                    )}

                    {!isDropdownLoading && dropdownMaterials.length === 0 && (
                      <div className="py-6 text-center text-xs text-neutral-400 font-medium">
                        No raw materials found.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Code, Price, Unit (Read Only / Styled Badges) */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-800 mb-1.5">
                  Code
                </label>
                <div className="w-full py-4 bg-white border border-neutral-100 rounded-2xl text-[15px] font-bold text-neutral-500 text-center shadow-sm select-none">
                  {selectedMaterial ? `A${selectedMaterial.id}` : "—"}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-neutral-800 mb-1.5">
                  Price
                </label>
                <div className="w-full py-4 bg-white border border-neutral-100 rounded-2xl text-[15px] font-bold text-neutral-500 text-center shadow-sm select-none">
                  {selectedMaterial ? `₹${selectedMaterial.price}` : "—"}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-800 mb-1.5">
                  Unit
                </label>
                <div className="w-full py-4 bg-[var(--color-pro-purple)] border border-transparent rounded-2xl text-[15px] font-extrabold text-white text-center shadow-sm select-none">
                  {selectedMaterial ? selectedMaterial.unit.toUpperCase() : "—"}
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
                    const cleaned = e.target.value.replace(/[^0-9]/g, "");
                    setFormState(prev => ({ ...prev, calories: cleaned === "" ? "" : Number(cleaned) }));
                  }}
                  className="w-full bg-[#f3f4f6] border border-transparent focus:border-neutral-200 focus:bg-white rounded-xl px-5 py-4 text-[14px] text-neutral-800 focus:outline-none transition-all placeholder:text-neutral-400 font-semibold shadow-sm"
                />
              </div>
 
              {/* Protien & Carb */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-800 mb-1.5">
                    Protien
                  </label>
                  <input
                    type="text"
                    placeholder="25g"
                    value={formState.protein === "" ? "" : `${formState.protein}g`}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9.]/g, "");
                      setFormState(prev => ({ ...prev, protein: cleaned === "" ? "" : Number(cleaned) }));
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
                      setFormState(prev => ({ ...prev, carbs: cleaned === "" ? "" : Number(cleaned) }));
                    }}
                    className="w-full bg-[#f3f4f6] border border-transparent focus:border-neutral-200 focus:bg-white rounded-xl px-5 py-4 text-[14px] text-neutral-800 focus:outline-none transition-all placeholder:text-neutral-400 font-semibold shadow-sm"
                  />
                </div>
              </div>
 
              {/* Fiber & Fat */}
              <div className="grid grid-cols-2 gap-4">
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
                      setFormState(prev => ({ ...prev, fiber: cleaned === "" ? "" : Number(cleaned) }));
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
                      setFormState(prev => ({ ...prev, fat: cleaned === "" ? "" : Number(cleaned) }));
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
                  disabled={isSaving || !selectedMaterial}
                  className="py-3.5 rounded-[20px] text-[15px]"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin text-white mr-1.5" />}
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
