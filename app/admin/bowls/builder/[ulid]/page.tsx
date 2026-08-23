"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { 
  Loader2, 
  ArrowLeft,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { endpoints } from "@/lib/apiService";
import { 
  Ingredient, 
  BowlCategory, 
  Packaging, 
  BowlSection,
  BowlIngredientInput,
  BowlType
} from "@/lib/types";

const SECTIONS: { id: BowlSection; label: string; headerColor: string; rowColor: string }[] = [
  { id: "PROTEIN", label: "Protein", headerColor: "bg-[#7020A3]", rowColor: "bg-[#7020A3]/30" }, 
  { id: "CARB", label: "Carb", headerColor: "bg-[#DE2B17]", rowColor: "bg-[#DE2B17]/30" }, 
  { id: "FIBER", label: "Fiber", headerColor: "bg-[#7CA102]", rowColor: "bg-[#7CA102]/30" }, 
  { id: "EXTRA_PROTEIN", label: "Extra Protein", headerColor: "bg-[#801336]", rowColor: "bg-[#801336]/30" }, 
  { id: "DRESSING", label: "Dressing", headerColor: "bg-[#20A3A3]", rowColor: "bg-[#20A3A3]/30" }, 
  { id: "BLENDS", label: "Blends", headerColor: "bg-[#E65C00]", rowColor: "bg-[#E65C00]/30" }, 
  { id: "ADD_ONS", label: "Add Ons", headerColor: "bg-[#3D56D6]", rowColor: "bg-[#3D56D6]/30" }, 
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
  const [bowlType, setBowlType] = useState<BowlType>("STANDARD");
  const [status, setStatus] = useState(true);
  const [fixedCost, setFixedCost] = useState("0");
  const [categoryId, setCategoryId] = useState<number>(0);
  const [packagingId, setPackagingId] = useState<number | null>(null);
  
  // UI Placeholder states (not saved to DB)
  const [code, setCode] = useState("SCEW-1");
  const [mealCategory, setMealCategory] = useState("Breakfast");
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
        const [ingRes, catRes, packRes] = await Promise.all([
          endpoints.ingredients.getIngredients(1, 200),
          endpoints.bowlCategories.getBowlCategories(1, 100),
          endpoints.packaging.getBundles(1, 100)
        ]);
        
        setAvailableIngredients(ingRes.items || []);
        setCategories(catRes.items || []);
        setPackagings(packRes.items || []);

        if (isEdit) {
          const bowl = await endpoints.bowls.getBowl(bowlUlid);
          setName(bowl.name);
          setDescription(bowl.description || "");
          setBowlType(bowl.bowl_type);
          setStatus(bowl.status);
          setFixedCost(String(bowl.fixed_cost));
          setCategoryId(bowl.category_id);
          setPackagingId(bowl.packaging_id || null);
          setBowlIngredients(bowl.ingredients.map(i => ({
            ingredient_id: i.ingredient_id,
            section_name: i.section_name,
            weight_g_or_ml: i.weight_g_or_ml
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
    const fixed = parseFloat(fixedCost) || 0;
    const finalTotalCost = rawCost + packagingCost + fixed;

    return { totalWeight, rawCost, finalTotalCost, totalCal, totalPro, totalCarb, totalFat, totalFib, packagingCost };
  }, [bowlIngredients, availableIngredients, packagingId, packagings, fixedCost]);

  const handleSave = async () => {
    if (!name.trim()) return setError("Name is required");
    if (!categoryId) return setError("Bowl Category is required");
    if (bowlIngredients.some(i => i.ingredient_id === 0 || i.weight_g_or_ml <= 0)) {
      return setError("All ingredients must be selected and have weight > 0");
    }

    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        name,
        description: description || undefined,
        bowl_type: bowlType,
        status,
        fixed_cost: parseFloat(fixedCost) || 0,
        category_id: categoryId,
        packaging_id: packagingId || null,
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
          <Loader2 className="w-8 h-8 text-[#7c3aed] animate-spin" />
          <span className="text-neutral-500 font-medium">Loading bowl builder...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-[#E6E6E6] font-sans">
      <div className="p-4 sm:p-8 flex flex-col w-full mx-auto max-w-5xl">
        <Header />
        <Breadcrumbs segments={["Bowls", isEdit ? "Edit Bowl" : "Add Bowl"]} />
        <div className="flex items-center gap-4 mb-8 mt-2">
          <button 
            onClick={() => router.push("/admin/bowls")}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-neutral-800 m-0">
            {isEdit ? "Edit Bowl" : "Add Bowl"}
          </h1>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 mb-6">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Top Section */}
        <div className="flex flex-col md:flex-row gap-8 mb-10">
          <div className="w-full md:w-64 h-64 shrink-0 rounded-[32px] overflow-hidden bg-white shadow-sm border border-neutral-100 relative">
             <img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80" alt="Bowl" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-neutral-800 ml-1">Name</label>
              <input type="text" placeholder="e.g. Green Guava" value={name} onChange={(e) => setName(e.target.value)} className="w-full h-10 bg-white rounded-xl px-4 text-sm font-medium focus:outline-none shadow-sm" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-neutral-800 ml-1">Code</label>
                <input type="text" value={code} onChange={(e) => setCode(e.target.value)} className="w-full h-10 bg-white rounded-xl px-4 text-sm font-medium focus:outline-none shadow-sm text-neutral-500" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-neutral-800 ml-1">Bowl Category</label>
                <div className="relative">
                  <select value={categoryId} onChange={(e) => setCategoryId(parseInt(e.target.value))} className="w-full h-10 bg-white rounded-xl px-4 text-sm font-medium focus:outline-none appearance-none shadow-sm">
                    <option value={0}>Select...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                     <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-neutral-800 ml-1">Status</label>
                <div className="w-full h-10 bg-white rounded-xl flex items-center px-4 justify-between shadow-sm cursor-pointer" onClick={() => setStatus(!status)}>
                   <div className={`w-11 h-6 rounded-full p-1 transition-colors relative ${status ? "bg-[#4CAF50]" : "bg-neutral-300"}`}>
                     <div className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${status ? "translate-x-5" : "translate-x-0"}`} />
                   </div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-neutral-800 ml-1">Packaging Bundle</label>
                <div className="relative">
                  <select value={packagingId || 0} onChange={(e) => setPackagingId(parseInt(e.target.value) || null)} className="w-full h-10 bg-white rounded-xl px-4 text-sm font-medium focus:outline-none appearance-none shadow-sm">
                    <option value={0}>No Packaging</option>
                    {packagings.map(p => <option key={p.id} value={p.id}>{p.code ? `[${p.code}] ` : ''}{p.name}</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                     <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-neutral-800 ml-1">Category</label>
                <div className="relative">
                  <select value={mealCategory} onChange={(e) => setMealCategory(e.target.value)} className="w-full h-10 bg-white rounded-xl px-4 text-sm font-medium focus:outline-none appearance-none shadow-sm text-neutral-500">
                     <option>Breakfast</option>
                     <option>Lunch</option>
                     <option>Dinner</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                     <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1 justify-end">
                <div className="w-full h-10 bg-white rounded-xl flex p-1 shadow-sm">
                  <button onClick={() => setBowlType("STANDARD")} className={`flex-1 rounded-lg text-xs font-bold transition-colors ${bowlType === "STANDARD" ? "bg-[#7020A3] text-white" : "text-neutral-500 hover:bg-neutral-50"}`}>Standard</button>
                  <button onClick={() => setBowlType("CUSTOM")} className={`flex-1 rounded-lg text-xs font-bold transition-colors ${bowlType === "CUSTOM" ? "bg-[#7020A3] text-white" : "text-neutral-500 hover:bg-neutral-50"}`}>Custom</button>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-neutral-800 ml-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full h-20 bg-white rounded-xl p-3 text-sm font-medium focus:outline-none shadow-sm resize-none" />
            </div>
          </div>
        </div>

        {/* Ingredient Tables */}
        <div className="flex flex-col gap-6 w-full">
          {SECTIONS.map(section => {
            const items = bowlIngredients.map((item, i) => ({ ...item, originalIndex: i })).filter(i => i.section_name === section.id);
            
            // Only show section if it's Custom, or if it's Standard and has items/is one of the default standard ones (Dressing, Blends, Add ons)
            const isStandardDefault = ["DRESSING", "BLENDS", "ADD_ONS"].includes(section.id);
            if (bowlType === "STANDARD" && !isStandardDefault && items.length === 0) return null;
            
            return (
              <div key={section.id} className="flex flex-col">
                <h3 className="text-lg font-medium text-neutral-800 mb-2">{section.label}</h3>
                <div className="flex flex-col rounded-xl overflow-hidden shadow-sm">
                  {/* Header Row */}
                  <div className={`flex items-center text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider h-10 ${section.headerColor}`}>
                    <div className="w-10 sm:w-12 text-center border-r border-white/30 h-full flex items-center justify-center">#</div>
                    <div className="flex-1 px-3 sm:px-4 border-r border-white/30 h-full flex items-center">RAW MATERIAL</div>
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
                       <div key={item.originalIndex} className={`flex items-center text-white text-[10px] sm:text-xs font-medium h-12 border-b border-white ${section.rowColor}`}>
                         <div className="w-10 sm:w-12 text-center border-r border-white h-full flex items-center justify-center bg-black/10">
                            {String(idx + 1).padStart(2, '0')}
                         </div>
                         <div className="flex-1 px-2 border-r border-white h-full flex items-center relative">
                            <select 
                              value={item.ingredient_id} 
                              onChange={(e) => handleChangeIngredient(item.originalIndex, "ingredient_id", parseInt(e.target.value))} 
                              className="w-full h-full bg-transparent outline-none text-neutral-800 appearance-none px-2"
                            >
                              <option value={0} className="text-black">Select...</option>
                              {availableIngredients.map(i => <option key={i.id} value={i.id} className="text-black">{i.name}</option>)}
                            </select>
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
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-neutral-800 ml-1">Protien</label>
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
            <div className="grid grid-cols-2 gap-6">
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
            <div className="flex justify-between items-center">
              <span className="text-white font-semibold ml-2">Raw Cost</span>
              <div className="bg-[#E6E6E6] h-10 rounded-xl px-4 flex items-center justify-center w-36 font-bold text-neutral-500">
                 {calculations.rawCost.toFixed(0)}g
                 {/* Design has '450g' for cost in mockup by accident, keeping it generic */}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white font-semibold ml-2">Fixed Cost</span>
              <input 
                type="number" 
                value={fixedCost} 
                onChange={(e) => setFixedCost(e.target.value)} 
                className="bg-[#E6E6E6] h-10 rounded-xl px-4 text-center w-36 font-bold text-neutral-500 focus:outline-none" 
              />
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-white font-semibold ml-2">Total Cost</span>
              <div className="bg-[#4CAF50] h-10 rounded-xl px-4 flex items-center justify-center w-36 font-bold text-white text-lg">{calculations.finalTotalCost.toFixed(0)}</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-6 pb-20">
          <button 
            onClick={() => router.push("/admin/bowls")} 
            className="w-28 h-10 bg-white text-neutral-800 font-bold text-sm rounded-lg hover:bg-neutral-50 transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            disabled={isSaving} 
            className="w-28 h-10 bg-[#7020A3] text-white font-bold text-sm rounded-lg hover:bg-[#5e1a8a] transition-colors shadow-sm flex items-center justify-center"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Save
          </button>
        </div>

      </div>
    </div>
  );
}
