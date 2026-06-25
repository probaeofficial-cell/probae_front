"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, Utensils } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { endpoints } from "@/lib/apiService";
import { RawMaterial } from "@/lib/types";
import { getMediaUrl } from "@/lib/utils";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";

export default function IngredientPreviewPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const ulid = params.ulid as string;

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  
  const [bgImageFilename, setBgImageFilename] = useState<string | null>(null);
  const [mainImageFilename, setMainImageFilename] = useState<string | null>(null);

  const [systemSettings, setSystemSettings] = useState({ R2_BASE_URL: "" });

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
    async function loadIngredient() {
      try {
        setError(""); // Clear any previous errors
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
        console.error("Failed to load ingredient", err);
        setError("Failed to load ingredient details.");
      } finally {
        setIsLoading(false);
      }
    }

    if (!user) return;

    if (ulid && ulid !== "add") {
      loadIngredient();
    } else {
      setIsLoading(false);
      setError("Invalid ingredient ID.");
    }
  }, [ulid, user]);

  const totalWeight = selectedRawMaterials.reduce((acc, curr) => acc + curr.weight, 0);
  const totalCal = selectedRawMaterials.reduce((acc, curr) => acc + curr.calculatedCalories, 0);
  const totalPrice = selectedRawMaterials.reduce((acc, curr) => acc + curr.calculatedPrice, 0);
  const totalProtein = selectedRawMaterials.reduce((acc, curr) => acc + curr.calculatedProtein, 0);
  const totalCarbs = selectedRawMaterials.reduce((acc, curr) => acc + curr.calculatedCarbs, 0);
  const totalFat = selectedRawMaterials.reduce((acc, curr) => acc + curr.calculatedFat, 0);
  const totalFiber = selectedRawMaterials.reduce((acc, curr) => acc + curr.calculatedFiber, 0);

  const allMicros = new Set<string>();
  selectedRawMaterials.forEach(rm => {
    if (rm.material.micros) {
      rm.material.micros.forEach(micro => allMicros.add(micro));
    }
  });
  const microsString = Array.from(allMicros).join(", ");

  const currentBgImageUrl = getMediaUrl(systemSettings.R2_BASE_URL, bgImageFilename);
  const currentMainImageUrl = getMediaUrl(systemSettings.R2_BASE_URL, mainImageFilename);

  if (authLoading || !user) return null;

  return (
    <div className="flex flex-col flex-1 h-screen bg-[#E6E6E6] overflow-hidden p-4 sm:p-8">
      <Header />
      <div className="flex-1 overflow-y-auto scrollbar-thin w-full pb-12">
        <div className="w-full max-w-5xl mx-auto flex flex-col px-4 sm:px-0 mt-6 mb-6">
          <Breadcrumbs segments={["Ingredients", "Preview Ingredient"]} />
          <div className="flex items-center gap-4 mt-4">
            <button 
              onClick={() => router.push("/admin/ingredients")} 
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
            <span className="text-neutral-500 font-medium">Loading ingredient...</span>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-100 border border-red-200 rounded-xl text-red-700 font-semibold shadow-sm text-center">
            {error}
          </div>
        ) : (
          <div className="w-full flex flex-col relative rounded-[40px] overflow-hidden shadow-lg h-fit min-h-[900px]">
            {/* Background Layer */}
            <div className="absolute inset-0">
              <div 
                className="w-full h-full bg-cover bg-center"
                style={{ backgroundImage: `url(${currentBgImageUrl})` }}
              />
              {/* Optional overlay to adjust contrast */}
              <div className="absolute inset-0 bg-black/5"></div>
            </div>

            {/* Content Layer (Over Background) */}
            <div className="relative z-10 w-full flex flex-col h-full mt-10">

              {/* Glassmorphic Details Card */}
              <div className="mx-6 sm:mx-12 bg-white/30 backdrop-blur-2xl border border-white/50 rounded-[40px] p-6 lg:p-10 mb-8 flex flex-col lg:flex-row gap-8 lg:gap-10 shadow-[0_8px_32px_rgba(0,0,0,0.1)] items-center lg:items-stretch">
                {/* Left: Capsule Main Image */}
                <div className="w-[280px] sm:w-[320px] h-[400px] sm:h-[460px] border-2 border-white/70 rounded-[140px] sm:rounded-[160px] flex flex-col items-center justify-center overflow-hidden bg-white/20 shrink-0 shadow-inner relative">
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

                  {/* Row 2: Code & Weight */}
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-sm font-bold text-neutral-900 mb-1.5 block drop-shadow-sm">Code</label>
                      <input 
                        type="text" 
                        value={code}
                        readOnly
                        className="w-full h-[56px] bg-white rounded-xl px-4 outline-none text-neutral-800 font-medium shadow-sm cursor-default"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-sm font-bold text-neutral-900 mb-1.5 block drop-shadow-sm">Weight</label>
                      <input 
                        type="text" 
                        value={Math.round(totalWeight) + "g"}
                        readOnly
                        className="w-full h-[56px] bg-white rounded-xl px-4 outline-none text-neutral-800 font-medium cursor-default shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Row 3: Description */}
                  <div>
                    <label className="text-sm font-bold text-neutral-900 mb-1.5 block drop-shadow-sm">Description</label>
                    <textarea 
                      value={description}
                      readOnly
                      className="w-full h-[100px] bg-white rounded-xl p-4 outline-none resize-none text-neutral-800 font-medium shadow-sm cursor-default"
                    />
                  </div>

                  {/* Row 4: Macros & Derived */}
                  <div className="flex flex-col lg:flex-row gap-6 mt-2 w-full">
                    {/* Left block of the bottom row */}
                    <div className="flex-1 flex flex-col gap-4">
                      <div>
                        <label className="text-sm font-bold text-neutral-900 mb-1.5 block drop-shadow-sm">Calorie</label>
                        <input 
                          type="text" 
                          value={`${Math.round(totalCal)} Kcal`}
                          readOnly
                          className="w-full h-[48px] bg-white/90 rounded-xl px-4 outline-none text-neutral-600 font-medium cursor-default shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-neutral-900 mb-1.5 block drop-shadow-sm">Micros</label>
                        <input 
                          type="text" 
                          value={microsString || ""}
                          readOnly
                          className="w-full h-[48px] bg-white/90 rounded-xl px-4 outline-none text-neutral-600 font-medium cursor-default shadow-sm truncate"
                        />
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="text-sm font-bold text-neutral-900 mb-1.5 block drop-shadow-sm">Price</label>
                          <div className="h-[48px] bg-[#3ca961] rounded-xl px-4 flex items-center text-white font-bold text-lg shadow-sm">
                            ₹{Math.round(totalPrice)}
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="text-sm font-bold text-neutral-900 mb-1.5 block drop-shadow-sm">Weight</label>
                          <div className="h-[48px] bg-[#3ca961] rounded-xl px-4 flex items-center text-white font-bold text-lg shadow-sm">
                            {Math.round(totalWeight)}g
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right block: 2x2 Macros Grid */}
                    <div className="w-[180px] grid grid-cols-2 gap-3 pt-2 lg:pt-6 shrink-0 mx-auto lg:mx-0">
                      <div className="flex flex-col rounded-[16px] overflow-hidden border border-black/80 shadow-md h-[76px]">
                        <div className="bg-[#181818] flex-1 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">{Math.round(totalProtein)}g</span>
                        </div>
                        <div className="bg-transparent h-[26px] flex items-center justify-center border-t border-black/80">
                          <span className="text-black text-[10px] font-bold tracking-wider">Protein</span>
                        </div>
                      </div>
                      <div className="flex flex-col rounded-[16px] overflow-hidden border border-black/80 shadow-md h-[76px]">
                        <div className="bg-[#181818] flex-1 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">{Math.round(totalCarbs)}g</span>
                        </div>
                        <div className="bg-transparent h-[26px] flex items-center justify-center border-t border-black/80">
                          <span className="text-black text-[10px] font-bold tracking-wider">Carb</span>
                        </div>
                      </div>
                      <div className="flex flex-col rounded-[16px] overflow-hidden border border-black/80 shadow-md h-[76px]">
                        <div className="bg-[#181818] flex-1 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">{Math.round(totalFiber)}g</span>
                        </div>
                        <div className="bg-transparent h-[26px] flex items-center justify-center border-t border-black/80">
                          <span className="text-black text-[10px] font-bold tracking-wider">Fiber</span>
                        </div>
                      </div>
                      <div className="flex flex-col rounded-[16px] overflow-hidden border border-black/80 shadow-md h-[76px]">
                        <div className="bg-[#181818] flex-1 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">{Math.round(totalFat)}g</span>
                        </div>
                        <div className="bg-transparent h-[26px] flex items-center justify-center border-t border-black/80">
                          <span className="text-black text-[10px] font-bold tracking-wider">Fat</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Raw Materials Table below Glass Container */}
              <div className="mx-6 sm:mx-12 rounded-[24px] overflow-hidden backdrop-blur-xl bg-white/95 border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.1)] mb-8">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-[#6b0f9e] text-white text-[13px]">
                        <th className="px-4 py-3.5 font-semibold text-center border-r border-white/20 w-12">#</th>
                        <th className="px-6 py-3.5 font-semibold uppercase tracking-wider border-r border-white/20">RAW MATERIAL</th>
                        <th className="px-4 py-3.5 font-semibold uppercase tracking-wider text-center border-r border-white/20">WEIGHT (g)</th>
                        <th className="px-4 py-3.5 font-semibold text-center border-r border-white/20">Cal</th>
                        <th className="px-4 py-3.5 font-semibold text-center border-r border-white/20">Price</th>
                        <th className="px-3 py-3.5 font-semibold text-center border-r border-white/20">P</th>
                        <th className="px-3 py-3.5 font-semibold text-center border-r border-white/20">C</th>
                        <th className="px-3 py-3.5 font-semibold text-center border-r border-white/20">F</th>
                        <th className="px-3 py-3.5 font-semibold text-center">Fa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 text-neutral-800 font-medium">
                      {selectedRawMaterials.map((item, index) => (
                        <tr key={index} className="hover:bg-neutral-50 transition-colors">
                          <td className="px-4 py-3.5 text-center border-r border-neutral-200">
                            {String(index + 1).padStart(2, '0')}
                          </td>
                          <td className="px-6 py-3.5 border-r border-neutral-200 font-semibold text-neutral-900">
                            {item.material.name}
                          </td>
                          <td className="px-4 py-3.5 text-center border-r border-neutral-200 text-neutral-700">
                            {item.weight}g
                          </td>
                          <td className="px-4 py-3.5 text-center border-r border-neutral-200 text-neutral-700 text-sm">
                            {Math.round(item.calculatedCalories)}kcal
                          </td>
                          <td className="px-4 py-3.5 text-center border-r border-neutral-200 text-neutral-700 text-sm">
                            ₹{Math.round(item.calculatedPrice)}
                          </td>
                          <td className="px-3 py-3.5 text-center border-r border-neutral-200 text-neutral-600 text-sm">
                            {Math.round(item.calculatedProtein)}g
                          </td>
                          <td className="px-3 py-3.5 text-center border-r border-neutral-200 text-neutral-600 text-sm">
                            {Math.round(item.calculatedCarbs)}g
                          </td>
                          <td className="px-3 py-3.5 text-center border-r border-neutral-200 text-neutral-600 text-sm">
                            {Math.round(item.calculatedFiber)}g
                          </td>
                          <td className="px-3 py-3.5 text-center text-neutral-600 text-sm">
                            {Math.round(item.calculatedFat)}g
                          </td>
                        </tr>
                      ))}
                      {selectedRawMaterials.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-6 py-10 text-center text-neutral-500 font-medium">
                            No raw materials.
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
