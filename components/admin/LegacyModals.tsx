"use client";
import { BowlLoader } from "@/components/admin/BowlLoader";
import { useState, useEffect, useRef } from "react";
import { X, AlertCircle } from "lucide-react";
import { endpoints } from "@/lib/apiService";
import AsyncPlanTierSelect from "./AsyncPlanTierSelect";
import AsyncBowlSelect from "./AsyncBowlSelect";
import AsyncMealCategorySelect from "./AsyncMealCategorySelect";

export function LegacySubscriptionModal({
  customerUlid,
  onClose,
  onSuccess
}: {
  customerUlid: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  const bowlRef = useRef<any>(null);
  const lastFetchedCalsRef = useRef<string | null>(null);
  
  useEffect(() => {
    endpoints.customers.get(customerUlid).then(res => {
      const data = (res as any).data || res;
      setCustomer(data);
      // Removed auto-check of deduct_from_subscription
    });
  }, [customerUlid]);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    plan_tier_ulid: "",
    start_date: "",
    end_date: "",
    total_price_paid: 0
  });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await endpoints.customers.legacySubscription(customerUlid, formData);
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      setError(err?.detail || err?.message || "Failed to log legacy subscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-neutral-900">Log Past Subscription</h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>
        
        {success ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-xl font-bold text-neutral-900">Subscription Added</h3>
            <p className="text-neutral-500 text-sm text-center">The legacy subscription was logged successfully.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-sm flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1">Plan Tier</label>
              <AsyncPlanTierSelect
                value={formData.plan_tier_ulid}
                onChange={(val) => setFormData({...formData, plan_tier_ulid: val})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1">Start Date</label>
              <input 
                type="date" required
                className="w-full px-4 py-2 bg-neutral-50 text-neutral-900 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#6A0FAD]"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1">End Date</label>
              <input 
                type="date" required
                className="w-full px-4 py-2 bg-neutral-50 text-neutral-900 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#6A0FAD]"
                value={formData.end_date}
                onChange={(e) => setFormData({...formData, end_date: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1">Total Paid (₹)</label>
              <input 
                type="number" min="0" step="0.01" required
                className="w-full px-4 py-2 bg-neutral-50 text-neutral-900 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#6A0FAD]"
                value={formData.total_price_paid}
                onChange={(e) => setFormData({...formData, total_price_paid: parseFloat(e.target.value) || 0})}
              />
            </div>
            
            <div className="pt-4 flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-3 px-4 bg-neutral-100 text-neutral-700 font-bold rounded-xl hover:bg-neutral-200">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="flex-1 py-3 px-4 bg-[#6A0FAD] text-white font-bold rounded-xl hover:bg-[#5b0c96] flex justify-center items-center">
                {loading ? <BowlLoader className="w-5 h-5"  /> : "Log Subscription"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export function LegacyOrderModal({
  customerUlid,
  editData,
  onClose,
  onSuccess
}: {
  customerUlid: string;
  editData?: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  const bowlRef = useRef<any>(null);
  const lastFetchedCalsRef = useRef<string | null>(null);
  
  useEffect(() => {
    endpoints.customers.get(customerUlid).then(res => {
      const data = (res as any).data || res;
      setCustomer(data);
      // Removed auto-check of deduct_from_subscription
    });
  }, [customerUlid]);
  const [formData, setFormData] = useState({
    target_date: editData?.date || "",
    meal_slot: editData?.meal_slot?.toLowerCase() || "breakfast",
    bowl_ulid: editData?.bowl_ulid || "", // Pre-select the exact bowl
    is_custom: !!editData,
    custom_calories: editData?.calories ? String(editData.calories) : "",
    custom_price: "",
    custom_protein: editData?.macros?.protein ? String(editData.macros.protein) : "",
    custom_carbs: editData?.macros?.carbs ? String(editData.macros.carbs) : "",
    custom_fat: editData?.macros?.fat ? String(editData.macros.fat) : "",
    custom_fiber: editData?.macros?.fiber ? String(editData.macros.fiber) : "",
    deduct_from_subscription: false
  });
  const [isPatching, setIsPatching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recalculateMacros = async (bowlUlid: string, targetCals?: number) => {
    if (!bowlUlid || !customerUlid) return;
    setIsPatching(true);
    try {
      const data = await endpoints.orders.preview({
        customer_ulid: customerUlid,
        bowl_ulid: bowlUlid,
        meal_slot: formData.meal_slot,
        scaling_strategy: "PROFILE_SCALED",
        target_calories: targetCals,
      }) as any;

      if (data?.success && data?.preview) {
        const newCalsStr = data.preview.total_calories ? String(Math.round(data.preview.total_calories)) : formData.custom_calories;
        lastFetchedCalsRef.current = newCalsStr;
        setFormData(prev => ({
          ...prev,
          bowl_ulid: bowlUlid,
          custom_calories: newCalsStr,
          custom_protein: data.preview.total_protein ? data.preview.total_protein.toFixed(1) : prev.custom_protein,
          custom_carbs: data.preview.total_carbs ? data.preview.total_carbs.toFixed(1) : prev.custom_carbs,
          custom_fat: data.preview.total_fat ? data.preview.total_fat.toFixed(1) : prev.custom_fat,
          custom_fiber: data.preview.total_fiber ? data.preview.total_fiber.toFixed(1) : prev.custom_fiber,
          custom_price: data.preview.final_price ? data.preview.final_price.toFixed(2) : prev.custom_price,
        }));
      }
    } catch (e) {
      console.error("Failed to recalculate", e);
    } finally {
      setIsPatching(false);
    }
  };

  const handleBowlSelect = (bowl: any) => {
    bowlRef.current = bowl;
    if (!bowl?.ulid) return;
    
    // Determine initial target cals
    let initialCals: number | undefined = undefined;
    if (formData.is_custom && customer?.calorie_profile?.mealCalories) {
      const slotKey = Object.keys(customer.calorie_profile.mealCalories).find(k => k.toLowerCase() === formData.meal_slot.toLowerCase());
      if (slotKey && customer.calorie_profile.mealCalories[slotKey]) {
        initialCals = parseFloat(customer.calorie_profile.mealCalories[slotKey]);
      }
    }
    recalculateMacros(bowl.ulid, initialCals);
  };

  const handleCalorieChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData(prev => ({...prev, custom_calories: val}));
  };

  // Debounce effect for calorie typing
  useEffect(() => {
    if (!formData.bowl_ulid || !formData.custom_calories) return;
    if (formData.custom_calories === lastFetchedCalsRef.current) return;
    
    const cals = parseFloat(formData.custom_calories);
    if (isNaN(cals) || cals <= 0) return;
    
    const timer = setTimeout(() => {
      recalculateMacros(formData.bowl_ulid, cals);
    }, 800);
    return () => clearTimeout(timer);
  }, [formData.custom_calories, formData.bowl_ulid]);

  useEffect(() => {
    if (bowlRef.current && formData.is_custom) {
      handleBowlSelect(bowlRef.current);
    } else if (bowlRef.current && !formData.is_custom) {
       // Revert to original
       handleBowlSelect(bowlRef.current);
    }
  }, [formData.is_custom, formData.meal_slot]);



  

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const payload: any = { ...formData };
    if (payload.custom_calories) payload.custom_calories = parseFloat(payload.custom_calories);
    else delete payload.custom_calories;
    
    if (payload.custom_price) payload.custom_price = parseFloat(payload.custom_price);
    else delete payload.custom_price;
    
    if (payload.custom_protein) payload.custom_protein = parseFloat(payload.custom_protein);
    else delete payload.custom_protein;
    
    if (payload.custom_carbs) payload.custom_carbs = parseFloat(payload.custom_carbs);
    else delete payload.custom_carbs;
    
    if (payload.custom_fat) payload.custom_fat = parseFloat(payload.custom_fat);
    else delete payload.custom_fat;
    
    if (payload.custom_fiber) payload.custom_fiber = parseFloat(payload.custom_fiber);
    else delete payload.custom_fiber;
    
    try {
      if (editData && editData.order_ulid) {
        await endpoints.customers.updateLegacyOrder(customerUlid, editData.order_ulid, payload);
      } else {
        await endpoints.customers.legacyOrder(customerUlid, payload);
      }
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      setError(err?.detail || err?.message || "Failed to log legacy meal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-neutral-900">{editData ? "Edit Past Meal" : "Log Past Meal"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>
        
        {success ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-xl font-bold text-neutral-900">Meal Added</h3>
            <p className="text-neutral-500 text-sm text-center">The past meal was logged successfully.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-sm flex items-start gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span className="flex-1">{error}</span>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1">Target Date</label>
              <input 
                type="date" required
                className="w-full px-4 py-2 bg-neutral-50 text-neutral-900 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#6A0FAD]"
                value={formData.target_date}
                onChange={(e) => setFormData({...formData, target_date: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1">Meal Slot</label>
              <select 
                required
                className="w-full px-4 py-2 bg-neutral-50 text-neutral-900 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#6A0FAD]"
                value={formData.meal_slot}
                onChange={(e) => setFormData({...formData, meal_slot: e.target.value})}
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1">Order Type</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="order_type" checked={!formData.is_custom} onChange={() => setFormData({...formData, is_custom: false})} className="accent-[#6A0FAD]" />
                  <span className="text-sm font-medium text-neutral-900">Standard</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="order_type" checked={formData.is_custom} onChange={() => setFormData({...formData, is_custom: true})} className="accent-[#6A0FAD]" />
                  <span className="text-sm font-medium text-neutral-900">Custom (Scaled)</span>
                </label>
              </div>
            </div>


            {customer && customer.active_subscription_id && customer.remaining_bowl_count > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 accent-emerald-600" 
                    checked={formData.deduct_from_subscription}
                    onChange={(e) => setFormData({...formData, deduct_from_subscription: e.target.checked})}
                  />
                  <div>
                    <span className="block font-bold text-neutral-900 text-sm">Deduct from Active Subscription</span>
                    <span className="block text-xs text-neutral-600 mt-1">
                      Uses 1 remaining bowl instead of charging the wallet. (Current: {customer.remaining_bowl_count})
                    </span>
                  </div>
                </label>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1">Bowl</label>
              <AsyncBowlSelect
                value={formData.bowl_ulid}
                onChange={(val) => setFormData({...formData, bowl_ulid: val})}
                onSelectBowl={handleBowlSelect}
                mealCategoryId={undefined}
                selectedBowl={editData && editData.bowl_ulid === formData.bowl_ulid ? { ulid: editData.bowl_ulid, name: editData.bowl_name } : undefined}
              />
            </div>
            <div className="relative">
              {isPatching && (
                <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-xl">
                  <BowlLoader className="w-8 h-8 text-[#6A0FAD]" />
                  <span className="text-xs font-bold text-[#6A0FAD] mt-2">Patching macros...</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1">Override Calories</label>
                <input 
                  type="number" step="0.1" min="0"
                  className="w-full px-4 py-2 bg-neutral-50 text-neutral-900 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#6A0FAD]"
                  value={formData.custom_calories}
                  onChange={handleCalorieChange}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1">Override Price</label>
                <input 
                  type="number" step="0.01" min="0"
                  className="w-full px-4 py-2 bg-neutral-50 text-neutral-900 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#6A0FAD]"
                  value={formData.custom_price}
                  onChange={(e) => setFormData({...formData, custom_price: e.target.value})}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1">Override Protein (g)</label>
                <input 
                  type="number" step="0.1" min="0"
                  className="w-full px-4 py-2 bg-neutral-50 text-neutral-900 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#6A0FAD]"
                  value={formData.custom_protein}
                  onChange={(e) => setFormData({...formData, custom_protein: e.target.value})}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1">Override Carbs (g)</label>
                <input 
                  type="number" step="0.1" min="0"
                  className="w-full px-4 py-2 bg-neutral-50 text-neutral-900 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#6A0FAD]"
                  value={formData.custom_carbs}
                  onChange={(e) => setFormData({...formData, custom_carbs: e.target.value})}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1">Override Fat (g)</label>
                <input 
                  type="number" step="0.1" min="0"
                  className="w-full px-4 py-2 bg-neutral-50 text-neutral-900 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#6A0FAD]"
                  value={formData.custom_fat}
                  onChange={(e) => setFormData({...formData, custom_fat: e.target.value})}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-1">Override Fiber (g)</label>
                <input 
                  type="number" step="0.1" min="0"
                  className="w-full px-4 py-2 bg-neutral-50 text-neutral-900 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#6A0FAD]"
                  value={formData.custom_fiber}
                  onChange={(e) => setFormData({...formData, custom_fiber: e.target.value})}
                  placeholder="Optional"
                />
              </div>
            </div>
            </div>
            
            <div className="pt-4 flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-3 px-4 bg-neutral-100 text-neutral-700 font-bold rounded-xl hover:bg-neutral-200">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="flex-1 py-3 px-4 bg-[#6A0FAD] text-white font-bold rounded-xl hover:bg-[#5b0c96] flex justify-center items-center">
                {loading ? <BowlLoader className="w-5 h-5"  /> : (editData ? "Save Changes" : "Log Past Meal")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
