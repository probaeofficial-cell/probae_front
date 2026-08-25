"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, GripVertical, Trash2, Search, Info, Check, ArrowLeft, Salad as BowlIcon } from "lucide-react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { endpoints } from "@/lib/apiService";
import { useRouter, useParams } from "next/navigation";

interface Bowl {
  _id: string; // The ULID is returned as _id from our backend
  name: string;
  baseCalories: number;
  basePrice: number;
  imageId?: {
    url: string;
  };
}

const availableCombos = ["Breakfast Only", "Lunch Only", "Dinner Only", "Breakfast + Lunch", "Lunch + Dinner", "Breakfast + Dinner", "Breakfast + Lunch + Dinner"];

const getTypeName = (t: string) => t === 'B' ? 'Breakfast' : t === 'L' ? 'Lunch' : 'Dinner';
const getUiDaysCount = (duration: string, days: number) => days;

export default function PlanBuilderPage() {
  const router = useRouter();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };


  const params = useParams();
  const ulid = params.ulid as string;
  const isEditing = ulid !== "new";
  
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedItem, setDraggedItem] = useState<{type: string, index: number} | null>(null);

  const handleDragStart = (e: React.DragEvent, type: string, index: number) => {
    setDraggedItem({ type, index });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, targetType: string, targetIndex: number) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.type !== targetType || draggedItem.index === targetIndex) return;
    
    const next = [...selections[targetType]];
    const [removed] = next.splice(draggedItem.index, 1);
    next.splice(targetIndex, 0, removed);
    
    setSelections({ ...selections, [targetType]: next });
    setDraggedItem(null);
  };


  // Form state
  const [newTier, setNewTier] = useState({
    name: "",
    category: "Core",
    duration: "weekly",
    days: 5,
    mealType: "B",
    discountPrice: 0,
    discountPercentage: 0,
  });
  const [selections, setSelections] = useState<Record<string, Bowl[]>>({ "B": [] });

  // Catalog state
  const [bowls, setBowls] = useState<Bowl[]>([]);
  const [bowlsPage, setBowlsPage] = useState(1);
  const [bowlsTotalPages, setBowlsTotalPages] = useState(1);
  const [isFetchingBowls, setIsFetchingBowls] = useState(false);
  const [bowlsSearchQuery, setBowlsSearchQuery] = useState("");
  const [debouncedBowlsSearch, setDebouncedBowlsSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedBowlsSearch(bowlsSearchQuery);
      setBowlsPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [bowlsSearchQuery]);

  useEffect(() => {
    if (isEditing) {
      endpoints.planTiers.get(ulid).then(data => {
        if (data.success) {
          const tier = data.tier;
          setNewTier({
            name: tier.name,
            category: tier.category,
            duration: tier.duration.toLowerCase(),
            days: tier.days,
            mealType: tier.mealType,
            discountPrice: tier.discountPrice || 0,
            discountPercentage: tier.totalPrice && tier.discountPrice ? Math.round(((tier.totalPrice - tier.discountPrice) / tier.totalPrice) * 100) : 0,
          });
          
          const newSelections: Record<string, Bowl[]> = {};
          (tier.selections || []).forEach((sel: any) => {
            // Un-expand bowls to match UI limit (extract base week)
            newSelections[sel.type] = sel.bowls.slice(0, tier.days);
          });
          setSelections(newSelections);
        }
      }).finally(() => setIsLoading(false));
    }
  }, [isEditing, ulid]);

  const fetchBowls = useCallback(async (page: number, currentMealType: string) => {
    setIsFetchingBowls(true);
    try {
      const mt = currentMealType || "";
      let types: string[] = [];
      if (mt.includes('Breakfast') || mt.includes('B')) types.push('B');
      if (mt.includes('Lunch') || mt.includes('L')) types.push('L');
      if (mt.includes('Dinner') || mt.includes('D')) types.push('D');
      
      const queryParams: any = {
        page: page,
        limit: 10,
        status: true
      };
      if (types.length > 0) {
        // Not all bowl APIs support mealTypes filter exactly like this.
        // If it doesn't, we just fetch all and ignore type filter for now
      }
      if (debouncedBowlsSearch) {
        queryParams.search = debouncedBowlsSearch;
      }
      
      const res = await endpoints.bowls.getBowls(page, 10, debouncedBowlsSearch || undefined);
      if (res && res.items) {
        const mapped = res.items.map((b: any) => ({
          _id: b.ulid,
          name: b.name,
          basePrice: b.total_cost || b.raw_cost || 0,
          baseCalories: 0,
          imageId: { url: b.image_filename ? `https://pub-your-bucket.r2.dev/${b.image_filename}` : "" }
        }));
        setBowls(mapped);
        setBowlsTotalPages(res.pages || Math.ceil(res.total / 10) || 1);
      }
    } catch (error) {
      console.error("Failed to fetch bowls:", error);
    } finally {
      setIsFetchingBowls(false);
    }
  }, [debouncedBowlsSearch]);

  useEffect(() => {
    fetchBowls(bowlsPage, newTier.mealType);
  }, [bowlsPage, newTier.mealType, fetchBowls]);

  const handleMealTypeChange = (typeStr: string) => {
    setNewTier(prev => ({ ...prev, mealType: typeStr }));
    let types: string[] = [];
    if (typeStr.includes('Breakfast') || typeStr.includes('B')) types.push('B');
    if (typeStr.includes('Lunch') || typeStr.includes('L')) types.push('L');
    if (typeStr.includes('Dinner') || typeStr.includes('D')) types.push('D');
    
    setSelections(prev => {
      const next: Record<string, Bowl[]> = {};
      types.forEach(t => { next[t] = prev[t] || []; });
      return next;
    });
  };

  const handleDaysChange = (days: number) => {
    setNewTier(prev => ({ ...prev, days }));
    setSelections(prev => {
      const next: Record<string, Bowl[]> = {};
      const uiLimit = getUiDaysCount(newTier.duration, days);
      Object.keys(prev).forEach(type => {
        const currentBowls = prev[type] || [];
        if (uiLimit < currentBowls.length) {
          next[type] = currentBowls.slice(0, uiLimit);
        } else if (uiLimit > currentBowls.length && currentBowls.length > 0) {
          const extendedBowls = [...currentBowls];
          while (extendedBowls.length < uiLimit) {
            const itemsToAdd = uiLimit - extendedBowls.length;
            const sliceToCopy = currentBowls.slice(0, Math.min(7, itemsToAdd));
            extendedBowls.push(...sliceToCopy);
          }
          next[type] = extendedBowls;
        } else {
          next[type] = currentBowls;
        }
      });
      return next;
    });
  };

  const expandBowls = (bucket: Bowl[], duration: string, daysPerWeek: number) => {
    if (duration === 'weekly') return bucket;
    const baseWeek = bucket.slice(0, daysPerWeek);
    const extra = baseWeek.slice(0, 2); 
    const expanded = [];
    for (let i = 0; i < 4; i++) expanded.push(...baseWeek);
    expanded.push(...extra);
    return expanded;
  };

  const calculateTotal = () => {
    let sum = 0;
    Object.values(selections).forEach(bucket => {
      const expanded = expandBowls(bucket, newTier.duration, newTier.days);
      expanded.forEach(bowl => { sum += bowl.basePrice || 0; });
    });
    return Number(sum.toFixed(2));
  };
  const totalPrice = calculateTotal();

  const handleSubmit = async () => {
    const uiLimit = getUiDaysCount(newTier.duration, newTier.days);
    for (const [type, bucket] of Object.entries(selections)) {
      if (bucket.length !== uiLimit) {
        showToast(`Please select exactly ${uiLimit} bowls for ${getTypeName(type)}`, "error");
        return;
      }
    }

    setIsSaving(true);
    try {
      const payloadSelections = Object.entries(selections).map(([type, bucketBowls]) => ({
        type,
        bowls: expandBowls(bucketBowls, newTier.duration, newTier.days).map(b => b._id)
      }));

      const calculatedDiscountPrice = totalPrice - (totalPrice * (newTier.discountPercentage || 0) / 100);
      const payload = {
        name: newTier.name,
        category: newTier.category,
        duration: newTier.duration,
        days: newTier.days,
        mealType: newTier.mealType,
        discountPrice: calculatedDiscountPrice,
        totalPrice,
        selections: payloadSelections
      };

      if (isEditing) {
        await endpoints.planTiers.update(ulid, payload);
        showToast("Plan Tier updated", "success");
      } else {
        await endpoints.planTiers.create(payload);
        showToast("Plan Tier created", "success");
      }
      router.push("/admin/plans");
    } catch (error) {
      console.error(error);
      showToast("An error occurred", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-10 text-center">Loading builder...</div>;
  }

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        <Header />
        <Breadcrumbs segments={["Admin", "Plan Tiers", "Builder"]} />
        <div className="mt-4 flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{isEditing ? "Edit Plan Tier" : "Create Plan Tier"}</h1>
          <p className="text-sm text-neutral-500">Design an exact meal prep schedule.</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white pt-4">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="col-span-1 sm:col-span-2 lg:col-span-4">
            <label className="block text-sm font-semibold text-neutral-700 mb-2">Tier Name</label>
            <input required type="text" value={newTier.name} onChange={e => setNewTier({...newTier, name: e.target.value})} className="w-full px-4 py-3 bg-[#f8f5fb] border-none rounded-xl focus:ring-2 focus:ring-[#6b21a8]/20 outline-none text-neutral-900 font-medium" placeholder="E.g. Ultimate Core 5-Day" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-2">Category</label>
            <select value={newTier.category} onChange={e => setNewTier({...newTier, category: e.target.value})} className="w-full px-4 py-3 bg-[#f8f5fb] border-none rounded-xl focus:ring-2 focus:ring-[#6b21a8]/20 outline-none text-neutral-900 font-medium">
              <option value="Core">Core</option>
              <option value="Pro">Pro</option>
              <option value="Performance">Performance</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-2">Duration</label>
            <select value={newTier.duration} onChange={e => {
                const dur = e.target.value;
                setNewTier({...newTier, duration: dur});
                handleDaysChange(newTier.days);
              }} className="w-full px-4 py-3 bg-[#f8f5fb] border-none rounded-xl focus:ring-2 focus:ring-[#6b21a8]/20 outline-none text-neutral-900 font-medium">
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-2">Days per Week</label>
            <select value={newTier.days} onChange={e => handleDaysChange(Number(e.target.value))} className="w-full px-4 py-3 bg-[#f8f5fb] border-none rounded-xl focus:ring-2 focus:ring-[#6b21a8]/20 outline-none text-neutral-900 font-medium">
              <option value={5}>5 Days</option>
              <option value={6}>6 Days</option>
              <option value={7}>7 Days</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-2">Total Days</label>
            <div className="w-full px-4 py-3 bg-[#f8f5fb] border border-neutral-200 rounded-xl text-neutral-500 font-medium cursor-not-allowed">
              {newTier.duration === 'weekly' ? newTier.days : (newTier.days * 4 + 2)} Days
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-2">Discount (%)</label>
            <input type="number" step="1" min="0" max="100" value={newTier.discountPercentage || ""} onChange={e => setNewTier({...newTier, discountPercentage: Number(e.target.value)})} className="w-full px-4 py-3 bg-[#f8f5fb] border-none rounded-xl focus:ring-2 focus:ring-[#6b21a8]/20 outline-none text-neutral-900 font-medium" placeholder="e.g. 15" />
          </div>
        </div>

        <div className="mb-8">
          <label className="block text-sm font-semibold text-neutral-700 mb-3">Meal Type Config</label>
          <div className="flex flex-wrap gap-2">
            {availableCombos.map(combo => {
              const isSelected = newTier.mealType === combo;
              return (
                <button
                  key={combo}
                  onClick={() => handleMealTypeChange(combo)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    isSelected ? "bg-[#6b21a8] text-white shadow-md shadow-[#6b21a8]/20" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {combo}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start border-t border-neutral-100 pt-8">
          {/* Selections Column */}
          <div className="flex-1 w-full space-y-6">
            <div className="flex items-center justify-between bg-[#f8f5fb] p-6 rounded-2xl border border-neutral-100">
              <div>
                <p className="text-xs font-bold text-neutral-500 uppercase">Calculated Total</p>
                <p className="text-3xl font-black text-neutral-900">₹{totalPrice.toFixed(2)}</p>
              </div>
              {(newTier.discountPercentage || 0) > 0 && (
                <div className="text-right">
                  <p className="text-xs font-bold text-emerald-600 uppercase">Final Price ({newTier.discountPercentage}% off)</p>
                  <p className="text-3xl font-black text-emerald-600">₹{(totalPrice - (totalPrice * (newTier.discountPercentage || 0) / 100)).toFixed(2)}</p>
                </div>
              )}
            </div>

            {Object.entries(selections).map(([type, bucketBowls]) => {
              const uiLimit = getUiDaysCount(newTier.duration, newTier.days);
              return (
                <div key={type} className="border border-neutral-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                  <div className="bg-neutral-50 border-b border-neutral-200 px-6 py-4 flex justify-between items-center">
                    <h3 className="font-bold text-neutral-900 text-lg">{getTypeName(type)} Schedule</h3>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${bucketBowls.length === uiLimit ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                      {bucketBowls.length} / {uiLimit} Selected
                    </span>
                  </div>
                  
                  <div className="p-6 space-y-3">
                    {bucketBowls.map((item, idx) => (
                      <div 
                        key={`${item._id}-${idx}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, type, idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, type, idx)}
                        className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-white border border-neutral-200 rounded-xl shadow-sm cursor-grab active:cursor-grabbing transition-transform ${draggedItem?.type === type && draggedItem.index === idx ? "opacity-50" : ""}`}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="text-neutral-400 cursor-grab active:cursor-grabbing px-1">
                            <GripVertical className="w-5 h-5" />
                          </div>
                          <div className="w-12 text-center shrink-0">
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Day</span>
                            <span className="font-bold text-neutral-900">{idx + 1}</span>
                          </div>
                          <div className="w-12 h-12 rounded-lg bg-neutral-100 overflow-hidden shrink-0">
                            {item.imageId?.url && <img src={item.imageId.url} alt={item.name} className="w-full h-full object-cover" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-neutral-900 truncate">{item.name}</p>
                            <p className="text-xs font-medium text-neutral-500">₹{item.basePrice?.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                          {idx >= 7 && (
                            <span className="px-2 py-0.5 bg-[#6b21a8]/10 text-[#6b21a8] rounded text-[10px] font-bold uppercase tracking-wider">
                              Extra Day
                            </span>
                          )}

                          <button 
                            type="button" 
                            onClick={() => {
                              const next = [...bucketBowls];
                              next.splice(idx, 1);
                              setSelections({...selections, [type]: next});
                            }}
                            className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {newTier.duration === 'monthly' && bucketBowls.slice(0, 2).map((item, idx) => (
                      <div key={`auto-${idx}`} className="flex items-center gap-4 p-4 bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm opacity-70">
                        <div className="w-12 text-center shrink-0">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Day</span>
                          <span className="font-bold text-neutral-600">{newTier.days + idx + 1}</span>
                        </div>
                        <div className="w-12 h-12 rounded-lg bg-neutral-200 overflow-hidden shrink-0 grayscale">
                          {item.imageId?.url && <img src={item.imageId.url} alt={item.name} className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-neutral-600 truncate">{item.name}</p>
                        </div>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase tracking-wider">
                          Auto Repeated
                        </span>
                      </div>
                    ))}

                    {bucketBowls.length < uiLimit && (
                      <div className="p-6 border-2 border-dashed border-neutral-200 rounded-xl flex items-center justify-center text-sm font-bold text-neutral-400 bg-neutral-50">
                        Add {uiLimit - bucketBowls.length} more bowl{uiLimit - bucketBowls.length > 1 ? 's' : ''} from catalog
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Catalog Column */}
          <div className="w-full lg:w-[400px] shrink-0 border border-neutral-200 rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col h-[700px] sticky top-8">
            <div className="p-4 border-b border-neutral-100 bg-neutral-50 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-neutral-900">Bowl Catalog</h3>
            </div>
            <div className="p-4 border-b border-neutral-100 shrink-0">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search bowls..."
                  value={bowlsSearchQuery}
                  onChange={(e) => setBowlsSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#6b21a8]/20 focus:border-[#6b21a8] transition-all text-sm font-medium"
                />
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isFetchingBowls ? (
                <div className="text-center text-neutral-400 py-10">Loading catalog...</div>
              ) : bowls.map((bowl) => (
                <div key={bowl._id} className="p-4 border border-neutral-100 rounded-xl hover:border-neutral-200 hover:shadow-sm transition-all flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-neutral-100 overflow-hidden shrink-0">
                      {bowl.imageId?.url && <img src={bowl.imageId.url} alt={bowl.name} className="w-full h-full object-cover" />}
                    </div>
                    <div>
                      <p className="font-bold text-neutral-900 text-sm">{bowl.name}</p>
                      <p className="text-xs font-medium text-[#6b21a8]">₹{bowl.basePrice?.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(selections).map(type => {
                      const isAdded = selections[type]?.some(b => b._id === bowl._id);
                      if (isAdded) {
                        return (
                          <div key={type} className="flex-1 bg-emerald-50 text-emerald-700 py-1.5 rounded text-[10px] font-bold uppercase flex items-center justify-center gap-1">
                            <Check className="w-3 h-3" /> {getTypeName(type)}
                          </div>
                        );
                      }
                      return (
                        <button
                          key={type}
                          onClick={() => {
                            const uiLimit = getUiDaysCount(newTier.duration, newTier.days);
                            if (selections[type].length >= uiLimit) {
                              showToast(`Maximum ${uiLimit} bowls allowed for ${getTypeName(type)}`, "error");
                              return;
                            }
                            setSelections({...selections, [type]: [...selections[type], bowl]});
                          }}
                          className="flex-1 bg-neutral-100 hover:bg-[#6b21a8] hover:text-white text-neutral-600 py-1.5 rounded text-[10px] font-bold uppercase transition-colors"
                        >
                          + {getTypeName(type)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex justify-between items-center shrink-0">
              <button 
                onClick={() => setBowlsPage(p => Math.max(1, p - 1))}
                disabled={bowlsPage === 1}
                className="w-8 h-8 rounded-full bg-white border border-neutral-200 flex items-center justify-center disabled:opacity-50"
              ><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-xs font-bold text-neutral-500">Page {bowlsPage} of {bowlsTotalPages}</span>
              <button 
                onClick={() => setBowlsPage(p => Math.min(bowlsTotalPages, p + 1))}
                disabled={bowlsPage === bowlsTotalPages}
                className="w-8 h-8 rounded-full bg-white border border-neutral-200 flex items-center justify-center disabled:opacity-50"
              ><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-neutral-100 flex justify-end gap-4">
          <button 
            type="button" 
            onClick={() => router.push("/admin/plans")} 
            className="px-8 py-3.5 rounded-[20px] font-bold text-base text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-all duration-200"
          >
            Cancel
          </button>
          <ProbaeButton onClick={handleSubmit} disabled={isSaving} className="!w-auto px-10">
            {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Create Plan Tier"}
          </ProbaeButton>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-white text-sm font-bold shadow-xl z-[100] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 ${
          toast.type === "success" ? "bg-emerald-600" : "bg-red-500"
        }`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
      </div>
    </div>
  );
}