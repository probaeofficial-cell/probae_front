"use client";
import { BowlLoader } from "@/components/admin/BowlLoader";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { 
  Loader2, 
  ArrowLeft,
  Trash2,
  UploadCloud,
  AlertTriangle
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { endpoints } from "@/lib/apiService";
import { getMediaUrl } from "@/lib/utils";
import { 
  Ingredient, 
  BowlCategory, 
  Packaging, 
  BowlSection,
  BowlIngredientInput,
  BowlType
} from "@/lib/types";
import AsyncPackagingSelect from "@/components/admin/AsyncPackagingSelect";
import AsyncIngredientSelect from "@/components/admin/AsyncIngredientSelect";
import AsyncBowlCategorySelect from "@/components/admin/AsyncBowlCategorySelect";
import AsyncMealCategorySelect from "@/components/admin/AsyncMealCategorySelect";

const SECTIONS: { id: BowlSection; label: string; headerColor: string; rowColor: string }[] = [
  { id: "Protein", label: "Protein", headerColor: "bg-[#7020A3]", rowColor: "bg-[#7020A3]/30" }, 
  { id: "Carb", label: "Carb", headerColor: "bg-[#DE2B17]", rowColor: "bg-[#DE2B17]/30" }, 
  { id: "Fiber", label: "Fiber", headerColor: "bg-[#7CA102]", rowColor: "bg-[#7CA102]/30" }, 
  { id: "Extra Protein", label: "Extra Protein", headerColor: "bg-[#801336]", rowColor: "bg-[#801336]/30" }, 
  { id: "Dressing", label: "Dressing", headerColor: "bg-[#20A3A3]", rowColor: "bg-[#20A3A3]/30" }, 
  { id: "Blends", label: "Blends", headerColor: "bg-[#E65C00]", rowColor: "bg-[#E65C00]/30" }, 
  { id: "Add Ons", label: "Add Ons", headerColor: "bg-[#3D56D6]", rowColor: "bg-[#3D56D6]/30" }, 
];

export default function BowlBuilderPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  
  const isEdit = params.ulid !== "add";
  const bowlUlid = params.ulid as string;

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bowlType, setBowlType] = useState<BowlType>("BLEND");
  const [status, setStatus] = useState(true);
  const [finalCost, setFinalCost] = useState("0");
  const [categoryId, setCategoryId] = useState<number>(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFilename, setImageFilename] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const [systemSettings, setSystemSettings] = useState({ R2_BASE_URL: "" });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setImageFilename(null);
    }
  };


  const [packagingId, setPackagingId] = useState<number | null>(null);
  
  // UI Placeholder states (not saved to DB)
  const [code, setCode] = useState("");
  const [mealCategoryId, setMealCategoryId] = useState<number | null>(null);
  const [initialMealCategory, setInitialMealCategory] = useState<any | null>(null);
  const [micros, setMicros] = useState("Vitamin B12, Iron");
  
  const [bowlIngredients, setBowlIngredients] = useState<BowlIngredientInput[]>([]);
  
  // Data State
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
  const [categories, setCategories] = useState<BowlCategory[]>([]);
  const [packagings, setPackagings] = useState<Packaging[]>([]);
  
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);



  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/admin/login");
    }
  }, [user, authLoading, router]);



  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsPageLoading(true);

        const [ingRes, catRes, packRes, settingsRes] = await Promise.all([
          endpoints.ingredients.getIngredients(1, 100),
          endpoints.bowlCategories.getBowlCategories(1, 100),
          endpoints.packaging.getBundles(1, 100),
          endpoints.settings.getSystemSettings()
        ]);
        
        if (settingsRes && (settingsRes as any).R2_BASE_URL) {
            setSystemSettings({ R2_BASE_URL: (settingsRes as any).R2_BASE_URL });
        }

        
        setAvailableIngredients(ingRes.items || []);
        setCategories(catRes.items || []);
        setPackagings(packRes.items || []);

        if (isEdit) {
          const bowl = await endpoints.bowls.getBowl(bowlUlid);
          setName(bowl.name);
          setCode(bowl.code || "");
          setDescription(bowl.description || "");
          setBowlType(bowl.bowl_type);
          setStatus(bowl.status);
          if ((bowl as any).image_filename) setImageFilename((bowl as any).image_filename);
          setFinalCost(String(bowl.total_cost));
          setCategoryId(bowl.category_id);
          setMealCategoryId(bowl.meal_category_id || null);
          if ((bowl as any).meal_category) {
            setInitialMealCategory((bowl as any).meal_category);
          }
          setPackagingId(bowl.packaging_id || null);
          setBowlIngredients(bowl.ingredients.map(i => ({
            ingredient_id: i.ingredient_id,
            section_name: i.section_name,
            weight_g_or_ml: i.weight_g_or_ml,
            _ingredient_name: (i as any).ingredient_name,
            _ingredient_ulid: (i as any).ingredient_ulid,
          })));
        }
      } catch (err: any) {
        setError(err.message || "Failed to load builder data");
      } finally {
        setIsPageLoading(false);
      }
    };
    if (user) {
      fetchData();
    }
  }, [user, isEdit, bowlUlid]);

  const handleAddIngredient = (section: BowlSection) => {
    setBowlIngredients([...bowlIngredients, { ingredient_id: 0, section_name: section, weight_g_or_ml: 10 }]);
  };

  const handleRemoveIngredient = (index: number) => {
    const newIngs = [...bowlIngredients];
    newIngs.splice(index, 1);
    setBowlIngredients(newIngs);
  };

  const handleChangeIngredient = (index: number, field: keyof BowlIngredientInput, value: any) => {
    const newIngs = [...bowlIngredients];
    newIngs[index] = { ...newIngs[index], [field]: value };
    setBowlIngredients(newIngs);
  };

  const calculations = useMemo(() => {
    let totalWeight = 0;
    let rawCost = 0;
    let totalCal = 0;
    let totalPro = 0;
    let totalCarb = 0;
    let totalFat = 0;
    let totalFib = 0;

    bowlIngredients.forEach(bi => {
      const ing = availableIngredients.find(i => i.id === bi.ingredient_id);
      if (ing && bi.weight_g_or_ml > 0 && ing.total_weight > 0) {
        const ratio = bi.weight_g_or_ml / ing.total_weight;
        totalWeight += bi.weight_g_or_ml;
        rawCost += (ing.total_price * ratio);
        totalCal += (ing.total_calories * ratio);
        totalPro += (ing.total_protein * ratio);
        totalCarb += (ing.total_carbs * ratio);
        totalFat += (ing.total_fat * ratio);
        totalFib += (ing.total_fiber * ratio);
      }
    });

    const packagingCost = packagings.find(p => p.id === packagingId)?.total_cost || 0;
    const productionCost = rawCost + packagingCost;
    
    let final = parseFloat(finalCost);
    if (isNaN(final)) {
      final = productionCost;
    }
    
    // Fixed cost = what remains after production cost is covered (margin/overhead)
    const fixedCost = Math.max(0, final - productionCost);

    return { totalWeight, rawCost, packagingCost, productionCost, fixedCost, finalCost: final, totalCal, totalPro, totalCarb, totalFat, totalFib };
  }, [bowlIngredients, availableIngredients, packagingId, packagings, finalCost]);

  const handleSave = async () => {
    if (!name.trim()) return setError("Name is required");
    if (!categoryId) return setError("Bowl Category is required");
    if (bowlIngredients.some(i => i.ingredient_id === 0 || i.weight_g_or_ml <= 0)) {
      return setError("All components must be selected and have weight > 0");
    }
    
    if (calculations.finalCost < calculations.productionCost) {
      return setError(`Final Cost (₹${calculations.finalCost.toFixed(2)}) cannot be less than the production cost (₹${calculations.productionCost.toFixed(2)})`);
    }

    setIsSaving(true);
    setError(null);
    try {
      
      let finalImageFilename = imageFilename;
      if (imageFile) {
         const uploadRes = await endpoints.documents.upload(imageFile);
         finalImageFilename = uploadRes.filename;
      }
      
      const payload = {
        name,
        code: code || null,
        description,
        bowl_type: bowlType,
        status,
        fixed_cost: calculations.fixedCost,
        category_id: categoryId,
        meal_category_id: mealCategoryId,
        packaging_id: packagingId,
        image_filename: finalImageFilename,
        ingredients: bowlIngredients
      };

      
      if (isEdit) {
        await endpoints.bowls.updateBowl(bowlUlid, payload);
      } else {
        await endpoints.bowls.createBowl(payload);
      }
      router.push("/admin/bowls");
    } catch (err: any) {
      setError(err.message || "Failed to save bowl");
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isPageLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fafafa]">
        <div className="flex flex-col items-center gap-3">
          <BowlLoader className="w-8 h-8 text-[#7c3aed] animate-spin" />
          <span className="text-neutral-500 font-medium">Loading bowl builder...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-col flex-1 h-full overflow-y-auto bg-[#E6E6E6] font-sans">
      <div className="p-4 sm:p-8 flex flex-col w-full">
        <Header />
        <Breadcrumbs segments={["Bowls", isEdit ? "Edit Bowl" : "Add Bowl"]} />
        <div className="flex items-center gap-4 mb-8 mt-2">
          <button
            onClick={() => router.push("/admin/bowls")}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-bold text-neutral-800 m-0">
            {isEdit ? "Edit Bowl" : "Add Bowl"}
          </h1>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 mb-6">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* ── Card 1: Details ─────────────────────────────────────────── */}
        <div className="bg-white rounded-[32px] shadow-sm border border-neutral-100 p-8 mb-6 flex flex-col lg:flex-row gap-8">
          {/* Image upload */}
          <div
            onClick={() => imageInputRef.current?.click()}
            className="w-full lg:w-[220px] h-[220px] shrink-0 border-2 border-dashed border-neutral-800 rounded-[24px] flex flex-col items-center justify-center cursor-pointer relative group overflow-hidden"
          >
            {imagePreview || imageFilename ? (
              <img
                src={(imagePreview || (imageFilename ? getMediaUrl(systemSettings.R2_BASE_URL, imageFilename) : undefined)) as string}
                alt="Bowl"
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <>
                <UploadCloud className="w-10 h-10 mb-2 text-black" />
                <span className="font-semibold text-sm text-black text-center whitespace-pre-line">
                  {"Drag bowl image\nto Upload"}
                </span>
              </>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
              <span className="text-white font-bold tracking-wider text-sm">CHANGE IMAGE</span>
            </div>
            <input type="file" accept="image/*" ref={imageInputRef} onChange={handleImageChange} className="hidden" />
          </div>

          {/* Fields */}
          <div className="flex-1 flex flex-col gap-5">
            {/* Name */}
            <div>
              <label className="text-sm font-semibold text-neutral-800 mb-2 block">Name</label>
              <input
                type="text"
                placeholder="e.g. Green Guava Bowl"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-[52px] bg-neutral-100 rounded-[16px] px-4 outline-none text-neutral-800 font-medium placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-200"
              />
            </div>

            {/* Row: Code, Bowl Category, Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-semibold text-neutral-800 mb-2 block">Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full h-[48px] bg-neutral-100 rounded-[14px] px-4 outline-none text-neutral-600 font-medium focus:ring-2 focus:ring-neutral-200"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-neutral-800 mb-2 block">Bowl Category</label>
                <div className="relative">
                  <AsyncBowlCategorySelect 
                    value={categoryId} 
                    onChange={(id) => setCategoryId(id)} 
                    selectedCategory={categories.find(c => c.id === categoryId)}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-neutral-800 mb-2 block">Status</label>
                <div
                  className="h-[48px] bg-neutral-100 rounded-[14px] flex items-center px-4 cursor-pointer"
                  onClick={() => setStatus(!status)}
                >
                  <div className={`w-11 h-6 rounded-full p-1 transition-colors relative ${status ? "bg-[#4CAF50]" : "bg-neutral-300"}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${status ? "translate-x-5" : "translate-x-0"}`} />
                  </div>
                  <span className="ml-3 text-sm font-medium text-neutral-600">{status ? "Active" : "Inactive"}</span>
                </div>
              </div>
            </div>

            {/* Row: Packaging, Meal Slot, Type */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-semibold text-neutral-800 mb-2 block">Packaging Set</label>
                <AsyncPackagingSelect 
                  value={packagingId} 
                  onChange={(id: number | null) => setPackagingId(id)} 
                  selectedPackaging={packagings.find(p => p.id === packagingId)}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-neutral-800 mb-2 block">Meal Slot</label>
                <div className="relative">
                  <AsyncMealCategorySelect 
                    value={mealCategoryId || 0}
                    onChange={(id) => setMealCategoryId(id)}
                    selectedCategory={initialMealCategory}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-neutral-800 mb-2 block">Bowl Type</label>
                <div className="h-[48px] bg-neutral-100 rounded-[14px] p-1 flex relative">
                  <div
                    className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-[#7020A3] rounded-[10px] shadow-sm transition-transform duration-300 ease-out ${bowlType === "BLOCK" ? "translate-x-full" : "translate-x-0"}`}
                  />
                  <div
                    onClick={() => setBowlType("BLEND")}
                    className={`flex-1 flex items-center justify-center rounded-[10px] text-sm font-semibold cursor-pointer z-10 transition-colors duration-300 ${bowlType === "BLEND" ? "text-white" : "text-neutral-500 hover:text-neutral-700"}`}
                  >
                    Blend
                  </div>
                  <div
                    onClick={() => setBowlType("BLOCK")}
                    className={`flex-1 flex items-center justify-center rounded-[10px] text-sm font-semibold cursor-pointer z-10 transition-colors duration-300 ${bowlType === "BLOCK" ? "text-white" : "text-neutral-500 hover:text-neutral-700"}`}
                  >
                    Block
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-semibold text-neutral-800 mb-2 block">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description…"
                rows={3}
                className="w-full bg-neutral-100 rounded-[16px] px-4 py-3 outline-none text-neutral-800 font-medium placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-200 resize-none"
              />
            </div>
          </div>
        </div>

        {/* ── Card 2: Ingredient Sections ───────────────────────────── */}
        <div className="bg-white rounded-[32px] shadow-sm border border-neutral-100 p-8 mb-6 flex flex-col gap-6 w-full">
          {SECTIONS.map(section => {
            const items = bowlIngredients.map((item, i) => ({ ...item, originalIndex: i })).filter(i => i.section_name === section.id);
            
            // Only show section if it's Custom, or if it's Standard and has items/is one of the default standard ones (Dressing, Blends, Add ons)
            const isStandardDefault = ["Dressing", "Blends", "Add Ons"].includes(section.id);
            if (bowlType === "BLEND" && !isStandardDefault && items.length === 0) return null;
            
            return (
              <div key={section.id} className="flex flex-col">
                <h3 className="text-base font-bold text-neutral-800 mb-3 flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${section.headerColor}`}></span>
                  {section.label}
                </h3>
                <div className="flex flex-col rounded-[16px] shadow-sm border border-neutral-100 relative bg-white">
                  {/* Header Row */}
                  <div className={`flex items-center text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider h-10 rounded-t-[16px] ${section.headerColor}`}>
                    <div className="w-10 sm:w-12 text-center border-r border-white/30 h-full flex items-center justify-center">#</div>
                    <div className="flex-1 px-3 sm:px-4 border-r border-white/30 h-full flex items-center">COMPONENT</div>
                    <div className="w-20 sm:w-24 text-center border-r border-white/30 h-full flex items-center justify-center">WEIGHT (g)</div>
                    <div className="w-16 sm:w-20 text-center border-r border-white/30 h-full flex items-center justify-center">Cal</div>
                    <div className="w-16 sm:w-20 text-center border-r border-white/30 h-full flex items-center justify-center">Price</div>
                    <div className="w-8 sm:w-10 text-center border-r border-white/30 h-full flex items-center justify-center">P</div>
                    <div className="w-8 sm:w-10 text-center border-r border-white/30 h-full flex items-center justify-center">C</div>
                    <div className="w-8 sm:w-10 text-center border-r border-white/30 h-full flex items-center justify-center">F</div>
                    <div className="w-8 sm:w-10 text-center border-r border-white/30 h-full flex items-center justify-center">Fa</div>
                    <div className="w-16 sm:w-20 text-center h-full flex items-center justify-center">REMOVE</div>
                  </div>
                  
                  {/* Items */}
                  {items.map((item, idx) => {
                     const ing = availableIngredients.find(i => i.id === item.ingredient_id);
                     const ratio = ing && item.weight_g_or_ml > 0 && ing.total_weight > 0 ? item.weight_g_or_ml / ing.total_weight : 0;
                     
                     return (
                       <div 
                         key={item.originalIndex} 
                         style={{ zIndex: items.length - idx + 10 }}
                         className={`flex items-center text-white text-[10px] sm:text-xs font-medium h-12 border-b border-white relative ${section.rowColor}`}
                       >
                         <div className="w-10 sm:w-12 text-center border-r border-white h-full flex items-center justify-center bg-black/10">
                            {String(idx + 1).padStart(2, '0')}
                         </div>
                         <div className="flex-1 border-r border-white h-full flex items-center relative overflow-visible">
                             <AsyncIngredientSelect
                               value={item.ingredient_id}
                               onChange={(id, ingObj) => {
                                 handleChangeIngredient(item.originalIndex, "ingredient_id", id);
                               }}
                               selectedIngredient={
                                 availableIngredients.find(i => i.id === item.ingredient_id) || 
                                 (item._ingredient_name ? { id: item.ingredient_id, name: item._ingredient_name, ulid: item._ingredient_ulid } as any : null)
                               }
                               compact
                             />
                         </div>
                         <div className="w-20 sm:w-24 border-r border-white h-full flex items-center justify-center px-1 text-neutral-800">
                            <input 
                              type="number" 
                              value={item.weight_g_or_ml} 
                              onChange={(e) => handleChangeIngredient(item.originalIndex, "weight_g_or_ml", parseFloat(e.target.value)||0)} 
                              className="w-full bg-transparent text-center outline-none" 
                            />
                            <span>g</span>
                         </div>
                         <div className="w-16 sm:w-20 text-center border-r border-white h-full flex items-center justify-center text-neutral-800">
                           {ing ? (ing.total_calories * ratio).toFixed(0) : "0"}kcal
                         </div>
                         <div className="w-16 sm:w-20 text-center border-r border-white h-full flex items-center justify-center text-neutral-800">
                           ₹{ing ? (ing.total_price * ratio).toFixed(0) : "0"}
                         </div>
                         <div className="w-8 sm:w-10 text-center border-r border-white h-full flex items-center justify-center text-neutral-800">
                           {ing ? (ing.total_protein * ratio).toFixed(0) : "0"}g
                         </div>
                         <div className="w-8 sm:w-10 text-center border-r border-white h-full flex items-center justify-center text-neutral-800">
                           {ing ? (ing.total_carbs * ratio).toFixed(0) : "0"}g
                         </div>
                         <div className="w-8 sm:w-10 text-center border-r border-white h-full flex items-center justify-center text-neutral-800">
                           {ing ? (ing.total_fiber * ratio).toFixed(0) : "0"}g
                         </div>
                         <div className="w-8 sm:w-10 text-center border-r border-white h-full flex items-center justify-center text-neutral-800">
                           {ing ? (ing.total_fat * ratio).toFixed(0) : "0"}g
                         </div>
                         <div className="w-16 sm:w-20 h-full flex items-center justify-center">
                           <div 
                             onClick={() => handleRemoveIngredient(item.originalIndex)} 
                             className="w-8 h-4 bg-white rounded-full flex items-center justify-center cursor-pointer shadow-sm hover:scale-105 transition-transform"
                           >
                              <div className="w-2 h-2 rounded-full bg-neutral-300 pointer-events-none flex items-center justify-center">
                                 {/* Just a dot to match mockup */}
                              </div>
                           </div>
                         </div>
                       </div>
                     );
                  })}
                </div>
                <button 
                  onClick={() => handleAddIngredient(section.id)} 
                  className={`mt-3 text-xs font-bold px-4 py-2 rounded-xl transition-colors text-white self-start shadow-sm ${section.headerColor} hover:opacity-90`}
                >
                  + Add Item
                </button>
              </div>
            );
          })}
        </div>

        {/* Nutritional Card */}
        <div className="flex justify-center mt-12 mb-8">
          <div className="bg-white rounded-[32px] p-6 sm:p-8 shadow-sm w-full max-w-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mb-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-neutral-800 ml-1">Protein</label>
                <div className="bg-[#f2f2f2] h-10 rounded-xl px-4 flex items-center text-sm font-semibold text-neutral-500">{calculations.totalPro.toFixed(0)}g</div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-neutral-800 ml-1">Carb</label>
                <div className="bg-[#f2f2f2] h-10 rounded-xl px-4 flex items-center text-sm font-semibold text-neutral-500">{calculations.totalCarb.toFixed(0)}g</div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-neutral-800 ml-1">Fiber</label>
                <div className="bg-[#f2f2f2] h-10 rounded-xl px-4 flex items-center text-sm font-semibold text-neutral-500">{calculations.totalFib.toFixed(0)}g</div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-neutral-800 ml-1">Fat</label>
                <div className="bg-[#f2f2f2] h-10 rounded-xl px-4 flex items-center text-sm font-semibold text-neutral-500">{calculations.totalFat.toFixed(0)}g</div>
              </div>
            </div>
            <div className="flex flex-col gap-1 mb-5">
              <label className="text-xs font-semibold text-neutral-800 ml-1">Micros</label>
              <div className="bg-[#f2f2f2] h-12 rounded-xl px-4 flex items-center text-xs font-semibold text-neutral-400">{micros}</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-neutral-800 ml-1">Calorie</label>
                <div className="bg-[#4CAF50] text-white h-10 rounded-xl px-4 flex items-center justify-center font-bold text-sm">{calculations.totalCal.toFixed(0)} Kcal</div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-neutral-800 ml-1">Weight</label>
                <div className="bg-[#7020A3] text-white h-10 rounded-xl px-4 flex items-center justify-center font-bold text-sm">{calculations.totalWeight.toFixed(0)}g</div>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Card */}
        <div className="flex justify-center mb-12">
          <div className="bg-[#1a1a1a] rounded-[32px] p-6 sm:p-8 shadow-sm w-full max-w-lg flex flex-col gap-4">
            {/* Raw Cost — auto from ingredients */}
            <div className="flex justify-between items-center">
              <span className="text-white font-semibold ml-2">Component Cost</span>
              <div className="bg-[#E6E6E6] h-10 rounded-xl px-4 flex items-center justify-center w-36 font-bold text-neutral-500">
                ₹{calculations.rawCost.toFixed(2)}
              </div>
            </div>
            {/* Packaging Cost — auto from selected packaging */}
            <div className="flex justify-between items-center">
              <span className="text-white font-semibold ml-2">Packaging Cost</span>
              <div className="bg-[#E6E6E6] h-10 rounded-xl px-4 flex items-center justify-center w-36 font-bold text-neutral-500">
                ₹{calculations.packagingCost.toFixed(2)}
              </div>
            </div>
            {/* Fixed Cost — auto-derived */}
            <div className="flex justify-between items-center">
              <span className="text-white font-semibold ml-2">Fixed Cost</span>
              <div className="bg-[#E6E6E6] h-10 rounded-xl px-4 flex items-center justify-center w-36 font-bold text-neutral-500">
                ₹{calculations.fixedCost.toFixed(2)}
              </div>
            </div>
            <div className="border-t border-white/10 pt-2" />
            {/* Final Cost — user enters the selling price */}
            <div className="flex justify-between items-center">
              <div className="ml-2">
                <span className="text-white font-semibold block">Final Cost</span>
                <span className="text-neutral-400 text-xs">Enter your selling price</span>
              </div>
              <input
                type="number"
                value={finalCost}
                placeholder={calculations.productionCost.toFixed(2)}
                onChange={(e) => setFinalCost(e.target.value)}
                className="bg-[#4CAF50] h-10 rounded-xl px-4 text-center w-36 font-bold text-white focus:outline-none placeholder:text-white/50"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 pb-20">
          <button
            onClick={() => router.push("/admin/bowls")}
            className="w-28 h-10 bg-white text-neutral-800 font-bold text-sm rounded-lg hover:bg-neutral-50 transition-colors shadow-sm border border-neutral-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="h-10 px-6 bg-[#6A0FAD] text-white font-bold text-sm rounded-lg hover:bg-white hover:text-[#6A0FAD] border border-[#6A0FAD] transition-all shadow-sm flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving ? <BowlLoader className="w-4 h-4 animate-spin" /> : null}
            {isEdit ? "Save Changes" : "Create Bowl"}
          </button>
        </div>

      </div>
    </div>
  );
}
