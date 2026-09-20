import { useState, useEffect } from "react";
import { X, Loader2, RefreshCw } from "lucide-react";
import { api, endpoints } from "@/lib/apiService";
import AsyncPlanTierSelect from "./AsyncPlanTierSelect";

export function RenewalModal({
  customer,
  onClose,
  onSuccess
}: {
  customer: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanUlid, setSelectedPlanUlid] = useState<string>("");
  const [preview, setPreview] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [renewing, setRenewing] = useState(false);
  
  const [isMigration, setIsMigration] = useState(false);
  const [migrationBowls, setMigrationBowls] = useState<number>(0);

  useEffect(() => {
    endpoints.planTiers.list({ limit: 1000 }).then((res: any) => {
      const items = res.tiers || res.data || [];
      setPlans(items);
      if (items.length > 0) {
        const same = items.find((p: any) => (p.ulid || p._id) === customer.selected_plan_id);
        if (same) {
          setSelectedPlanUlid(same.ulid || same._id);
        } else {
          setSelectedPlanUlid(items[0].ulid || items[0]._id);
        }
      }
    });
  }, [customer]);

  useEffect(() => {
    if (!selectedPlanUlid) return;
    
    const fetchPreview = async () => {
      setLoadingPreview(true);
      try {
        const res = await endpoints.customers.previewPlanPrice({
          plan_tier_ulid: selectedPlanUlid,
          goal: customer.goal || "MAINTENANCE",
          calorie_profile: { mealCalories: customer.calorie_profile?.mealCalories || {} }
        });
        if (res && (res as any).success) {
          setPreview(res);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingPreview(false);
      }
    };
    fetchPreview();
  }, [selectedPlanUlid, customer]);

  const handleRenew = async () => {
    setRenewing(true);
    try {
      if (isMigration) {
        await endpoints.customers.migrateActivePlan(customer.ulid, {
          plan_tier_ulid: selectedPlanUlid,
          remaining_bowl_count: migrationBowls
        });
      } else {
        await api.post(`/customers/${customer.ulid}/renew`, { plan_ulid: selectedPlanUlid });
      }
      onSuccess();
    } catch (err) {
      console.error(err);
      alert(isMigration ? "Failed to migrate plan" : "Failed to renew plan");
    } finally {
      setRenewing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-neutral-900">{isMigration ? "Migrate Active Plan" : "Renew Subscription"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-6 flex items-center gap-2 border border-orange-200 bg-orange-50 p-4 rounded-xl">
            <input 
              type="checkbox" 
              id="migrationToggle" 
              checked={isMigration}
              onChange={(e) => setIsMigration(e.target.checked)}
              className="w-4 h-4 accent-orange-600"
            />
            <label htmlFor="migrationToggle" className="text-sm font-bold text-orange-900 cursor-pointer">
              Advanced: Migrate Mid-Cycle Plan
            </label>
          </div>

          <label className="block text-sm font-bold text-neutral-700 mb-2">Select Plan to {isMigration ? "Migrate To" : "Renew"}</label>
          <AsyncPlanTierSelect
            value={selectedPlanUlid}
            onChange={(val) => setSelectedPlanUlid(val)}
          />
          
          {isMigration && (
            <div className="mt-6">
              <label className="block text-sm font-bold text-neutral-700 mb-2">Current Remaining Bowls</label>
              <input 
                type="number"
                min="0"
                value={migrationBowls}
                onChange={(e) => setMigrationBowls(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-neutral-50 text-neutral-900 border border-neutral-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD] transition-all"
              />
              <p className="text-xs text-neutral-500 mt-2">
                This will set the remaining bowls without charging the customer's wallet.
              </p>
            </div>
          )}

          {!isMigration && (
            <div className="mt-8">
              <h3 className="text-sm font-bold text-neutral-900 mb-4">Financial Summary</h3>
              
              {loadingPreview ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#6A0FAD]" />
                </div>
              ) : preview ? (
                <div className="bg-neutral-50 rounded-2xl p-5 border border-neutral-200 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-500">Base Cost (per bowl)</span>
                    <span className="font-bold">AED {parseFloat(preview.mean_cost).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-500">Total Bowls</span>
                    <span className="font-bold">{preview.total_bowls}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-500">Gross Total</span>
                    <span className="font-bold">AED {parseFloat(preview.base_total).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-green-600">
                    <span>Discount</span>
                    <span className="font-bold">-{preview.discount_percentage}%</span>
                  </div>
                  <div className="pt-3 mt-3 border-t border-neutral-200 flex justify-between items-center">
                    <span className="font-bold text-neutral-900">Total Charge</span>
                    <span className="text-xl font-black text-[#6A0FAD]">AED {parseFloat(preview.final_price).toFixed(2)}</span>
                  </div>
                </div>
              ) : null}
            </div>
          )}
          
          {!isMigration && (
            <div className="mt-6 bg-blue-50 text-blue-800 p-4 rounded-xl text-sm border border-blue-100 flex items-start gap-3">
              <RefreshCw className="w-5 h-5 flex-shrink-0" />
              <p>Renewing will immediately close out any active or expired subscription and deduct the Total Charge from the customer's wallet balance.</p>
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-neutral-100 flex gap-3 sticky bottom-0 bg-white">
          <button onClick={onClose} className="flex-1 py-3 px-4 bg-white border border-neutral-200 text-neutral-700 font-bold rounded-xl hover:bg-neutral-50 transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleRenew} 
            disabled={renewing || (!isMigration && !preview)}
            className="flex-1 py-3 px-4 bg-[#6A0FAD] text-white font-bold rounded-xl hover:bg-[#5b0c96] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {renewing ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {renewing ? "Processing..." : (isMigration ? "Confirm Migration" : "Confirm Renewal")}
          </button>
        </div>
      </div>
    </div>
  );
}
