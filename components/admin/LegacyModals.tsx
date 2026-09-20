import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
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
  const [formData, setFormData] = useState({
    plan_tier_ulid: "",
    start_date: "",
    end_date: "",
    total_price_paid: 0
  });

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      await endpoints.customers.legacySubscription(customerUlid, formData);
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      alert("Failed to log legacy subscription: " + (err?.detail || err?.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden flex flex-col">
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
              <label className="block text-sm font-bold text-neutral-700 mb-1">Total Paid (AED)</label>
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
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Log Subscription"}
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
  onClose,
  onSuccess
}: {
  customerUlid: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    target_date: "",
    meal_slot: "breakfast",
    bowl_ulid: "",
    is_custom: false
  });
  const [mealCategoryId, setMealCategoryId] = useState<number>(0);

  

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      await endpoints.customers.legacyOrder(customerUlid, formData);
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      alert("Failed to log legacy meal: " + (err?.detail || err?.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-neutral-900">Log Past Meal</h2>
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
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1">Meal Category Filter (Optional)</label>
              <AsyncMealCategorySelect
                value={mealCategoryId}
                onChange={(val) => setMealCategoryId(val)}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1">Bowl</label>
              <AsyncBowlSelect
                value={formData.bowl_ulid}
                onChange={(val) => setFormData({...formData, bowl_ulid: val})}
                mealCategoryId={mealCategoryId !== 0 ? mealCategoryId : undefined}
              />
            </div>
            
            <div className="pt-4 flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-3 px-4 bg-neutral-100 text-neutral-700 font-bold rounded-xl hover:bg-neutral-200">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="flex-1 py-3 px-4 bg-[#6A0FAD] text-white font-bold rounded-xl hover:bg-[#5b0c96] flex justify-center items-center">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Log Past Meal"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
