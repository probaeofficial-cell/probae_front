"use client";

import { useState, useEffect } from "react";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { Header } from "@/components/admin/Header";
import { Save, Search, GripVertical, Plus, Trash2, Calendar, Coffee, Utensils } from "lucide-react";
import { endpoints } from "@/lib/apiService";
import { ProbaeButton } from "@/components/ProbaeButton";
import { ConfirmationModal } from "@/components/ConfirmationModal";


export default function MenuBlueprintPage() {
  const [durationType, setDurationType] = useState("WEEKLY");
  const [mealSlot, setMealSlot] = useState("LUNCH");
  
  const [availableBowls, setAvailableBowls] = useState<any[]>([]);
  const [mealCategories, setMealCategories] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedBowls, setSelectedBowls] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [needsAutoFill, setNeedsAutoFill] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  
  // Modal states
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: "success" | "warning" | "error" | "info";
    title: string;
    message: string;
  }>({ isOpen: false, type: "info", title: "", message: "" });
  
  // If we have categories from DB, use them for the tabs, otherwise fallback
  const dynamicMealSlots = mealCategories.length > 0 
    ? mealCategories.map(c => c.slug || c.name)
    : ["B-FAST", "LUNCH", "DINNER", "SNACK"];

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (mealCategories.length > 0) {
      const activeCat = mealCategories.find(c => (c.slug || c.name) === mealSlot);
      fetchBowls(activeCat?.ulid);
    }
    fetchBlueprint();
  }, [durationType, mealSlot, mealCategories]);

  useEffect(() => {
    if (needsAutoFill && durationType === "MONTHLY" && availableBowls.length > 0 && selectedBowls.length === 0) {
      const newSelected = [];
      for (let i = 0; i < 31; i++) {
        const bowl = availableBowls[i % availableBowls.length];
        newSelected.push({ ulid: bowl.ulid, name: bowl.name, image_filename: bowl.image_filename });
      }
      setSelectedBowls(newSelected);
      setNeedsAutoFill(false);
    }
  }, [needsAutoFill, durationType, availableBowls, selectedBowls.length]);

  const fetchInitialData = async () => {
    try {
      const catRes: any = await endpoints.mealCategories.getMealCategories(1, 100);
      const categories = catRes.items || [];
      setMealCategories(categories);
      
      const activeCat = categories.find((c: any) => (c.slug || c.name) === mealSlot);
      fetchBowls(activeCat?.ulid);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBowls = async (categoryUlid?: string) => {
    try {
      const res: any = await endpoints.bowls.getBowls(1, 100, "", "", categoryUlid);
      setAvailableBowls(res.items || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBlueprint = async () => {
    setIsLoading(true);
    setNeedsAutoFill(false);
    try {
      const res: any = await endpoints.menuBlueprints.get(durationType, mealSlot);
      if (res.success && res.blueprints && res.blueprints.length > 0) {
        setSelectedBowls(res.blueprints.map((bp: any) => ({
          ulid: bp.bowl.ulid,
          name: bp.bowl.name,
          image_filename: bp.bowl.image_filename
        })));
      } else {
        setSelectedBowls([]);
        if (durationType === "MONTHLY") setNeedsAutoFill(true);
      }
    } catch (err) {
      console.error(err);
      setSelectedBowls([]);
      if (durationType === "MONTHLY") setNeedsAutoFill(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await endpoints.menuBlueprints.sync({
        duration_type: durationType,
        meal_slot: mealSlot,
        bowl_ulids: selectedBowls.map(b => b.ulid)
      });
      setModalState({
        isOpen: true,
        type: "success",
        title: "Success",
        message: "Menu Blueprint saved successfully!"
      });
    } catch (err) {
      console.error(err);
      setModalState({
        isOpen: true,
        type: "error",
        title: "Error",
        message: "Failed to save blueprint. Please try again."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredBowls = availableBowls.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  const maxDays = durationType === "WEEKLY" ? 7 : 31;

  // HTML5 Drag and Drop handlers
  const onDragStart = (e: any, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
    // Small delay to allow visual drag clone to render before adding opacity
    setTimeout(() => {
      e.target.style.opacity = "0.5";
    }, 0);
  };

  const onDragEnd = (e: any) => {
    e.target.style.opacity = "1";
    setDraggedIdx(null);
  };

  const onDragOver = (e: any, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = (e: any, targetIndex: number) => {
    e.preventDefault();
    if (draggedIdx === null) return;
    
    const newItems = [...selectedBowls];
    const item = newItems.splice(draggedIdx, 1)[0];
    newItems.splice(targetIndex, 0, item);
    setSelectedBowls(newItems);
    setDraggedIdx(null);
  };

  const removeBowl = (index: number) => {
    const newItems = [...selectedBowls];
    newItems.splice(index, 1);
    setSelectedBowls(newItems);
  };

  const addBowl = (bowl: any) => {
    if (selectedBowls.length >= maxDays) {
      setModalState({
        isOpen: true,
        type: "warning",
        title: "Limit Reached",
        message: `Cannot exceed ${maxDays} days for a ${durationType} rotation.`
      });
      return;
    }
    setSelectedBowls([...selectedBowls, { ulid: bowl.ulid, name: bowl.name, image_filename: bowl.image_filename }]);
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        <Header />
        
        <div className="mt-4 flex flex-col flex-1 min-h-0 overflow-y-auto lg:overflow-hidden pb-10 lg:pb-0">
          <Breadcrumbs segments={["Plans", "Menu Rotations"]} />
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 lg:mb-8 shrink-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">Menu Rotations</h1>
              <p className="text-sm font-medium text-neutral-500 mt-1">Configure the global master rotation template for plan assignments</p>
            </div>
            <ProbaeButton onClick={handleSave} disabled={isSaving} className="w-full sm:!w-auto flex items-center justify-center gap-2 h-[48px]">
              <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save Rotation"}
            </ProbaeButton>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 flex-1 min-h-0">
            {/* Left: Configuration & Drag Area */}
            <div className="flex-1 flex flex-col bg-neutral-50/50 border border-neutral-200 rounded-3xl p-4 sm:p-6 min-h-[500px] lg:min-h-0 shrink-0 lg:shrink">
              <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-6 shrink-0">
                <div className="flex-1 w-full sm:min-w-[200px]">
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Duration</label>
                  <div className="flex gap-2">
                    {["WEEKLY", "MONTHLY"].map(d => (
                      <button 
                        key={d}
                        onClick={() => setDurationType(d)}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors ${durationType === d ? 'bg-[#6A0FAD] text-white' : 'bg-white border border-neutral-200 text-neutral-600 hover:border-[#6A0FAD]/30'}`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Meal Slot</label>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {dynamicMealSlots.map(slot => (
                      <button 
                        key={slot}
                        onClick={() => setMealSlot(slot)}
                        className={`px-4 py-3 rounded-xl text-sm font-bold transition-colors whitespace-nowrap ${mealSlot === slot ? 'bg-[#6A0FAD] text-white' : 'bg-white border border-neutral-200 text-neutral-600 hover:border-[#6A0FAD]/30'}`}
                      >
                        {mealCategories.find(c => (c.slug || c.name) === slot)?.name || slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4 shrink-0">
                <h2 className="text-lg font-black text-neutral-800">Rotation Sequence</h2>
                <div className="text-sm font-bold text-neutral-500">
                  <span className={selectedBowls.length === maxDays ? "text-green-600" : "text-orange-500"}>
                    {selectedBowls.length}
                  </span>
                   / {maxDays} Days Configured
                </div>
              </div>

              {/* Drag and Drop Sequence List */}
              <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2 pr-2">
                {isLoading ? (
                  <div className="py-12 flex justify-center text-neutral-400 font-medium">Loading sequence...</div>
                ) : selectedBowls.length === 0 ? (
                  <div className="h-48 border-2 border-dashed border-neutral-300 rounded-2xl flex flex-col items-center justify-center text-neutral-400">
                    <Calendar className="w-8 h-8 mb-2 opacity-50" />
                    <p className="font-medium text-sm">No bowls configured for {mealSlot}.</p>
                    <p className="text-xs">Click + on a bowl from the library to add.</p>
                  </div>
                ) : (
                  selectedBowls.map((bowl, index) => (
                    <div 
                      key={`${bowl.ulid}-${index}`}
                      draggable
                      onDragStart={(e) => onDragStart(e, index)}
                      onDragEnd={onDragEnd}
                      onDragOver={(e) => onDragOver(e, index)}
                      onDrop={(e) => onDrop(e, index)}
                      className={`flex items-center p-4 bg-white border border-neutral-200 rounded-2xl shadow-sm group cursor-move transition-all
                        ${draggedIdx === index ? 'opacity-50 ring-2 ring-[#6A0FAD]' : 'hover:border-[#6A0FAD]/40'}`}
                    >
                      <div className="w-12 h-12 bg-neutral-100 rounded-xl flex items-center justify-center text-lg font-black text-[#6A0FAD] shrink-0 mr-4">
                        D{index + 1}
                      </div>
                      <GripVertical className="w-5 h-5 text-neutral-300 mr-3 shrink-0 group-hover:text-neutral-500 transition-colors" />
                      <div className="w-10 h-10 rounded-lg bg-neutral-100 overflow-hidden shrink-0 mr-4">
                        {bowl.image_filename ? (
                          <img src={`/uploads/${bowl.image_filename}`} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-400"><Coffee className="w-5 h-5"/></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-neutral-800 truncate">{bowl.name}</div>
                      </div>
                      <button 
                        onClick={() => removeBowl(index)}
                        className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0 ml-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
                
                {!isLoading && selectedBowls.length < maxDays && selectedBowls.length > 0 && (
                  <div className="p-4 border-2 border-dashed border-neutral-200 rounded-2xl text-center text-sm font-medium text-neutral-400">
                    Add {maxDays - selectedBowls.length} more bowls to complete the rotation
                  </div>
                )}
              </div>
            </div>

            {/* Right: Bowl Library */}
            <div className="w-full lg:w-[400px] flex flex-col bg-white border border-neutral-200 rounded-3xl min-h-[400px] lg:min-h-0 shrink-0 lg:shrink">
              <div className="p-4 sm:p-5 border-b border-neutral-100 bg-neutral-50/50 shrink-0 rounded-t-3xl">
                <h3 className="font-black text-neutral-800 mb-4 flex items-center gap-2"><Utensils className="w-4 h-4 text-[#6A0FAD]" /> Bowl Library</h3>
                <div className="relative">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Search bowls..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 bg-white border border-neutral-200 rounded-xl text-sm font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
                {filteredBowls.map(b => (
                  <div key={b.ulid} className="flex items-center justify-between p-3 rounded-2xl hover:bg-neutral-50 border border-transparent hover:border-neutral-100 transition-all group">
                    <div className="flex items-center min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-neutral-100 overflow-hidden shrink-0 mr-3">
                        {b.image_filename ? (
                          <img src={`/uploads/${b.image_filename}`} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-400"><Coffee className="w-4 h-4"/></div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-neutral-800 truncate">{b.name}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => addBowl(b)}
                      disabled={selectedBowls.length >= maxDays}
                      className="w-8 h-8 flex items-center justify-center rounded-xl bg-neutral-100 text-[#6A0FAD] hover:bg-[#6A0FAD] hover:text-white transition-colors disabled:opacity-50 disabled:hover:bg-neutral-100 disabled:hover:text-[#6A0FAD] shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {filteredBowls.length === 0 && (
                  <div className="py-8 text-center text-sm text-neutral-400 font-medium">No bowls found</div>
                )}
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => setModalState(prev => ({ ...prev, isOpen: false }))}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        confirmText="OK"
      />
    </div>
  );
}
