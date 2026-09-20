import { useState, useEffect } from "react";
import { X, Loader2, RefreshCw } from "lucide-react";
import { api, endpoints } from "@/lib/apiService";

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

  useEffect(() => {
    endpoints.planTiers.list({ limit: 1000 }).then((res: any) => {
      setPlans(res.data || []);
      if (res.data && res.data.length > 0) {
        // Try to default to the same plan they had
        const same = res.data.find((p: any) => p.ulid === customer.selected_plan_id);
        if (same) {
          setSelectedPlanUlid(same.ulid);
        } else {
          setSelectedPlanUlid(res.data[0].ulid);
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
      await api.post(`/customers/${customer.ulid}/renew`, { plan_ulid: selectedPlanUlid });
      onSuccess();
    } catch (err) {
      console.error(err);
      alert("Failed to renew plan");
    } finally {
      setRenewing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-neutral-900">Renew Subscription</h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <label className="block text-sm font-bold text-neutral-700 mb-2">Select Plan to Renew</label>
          <select 
            className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD] transition-all"
            value={selectedPlanUlid}
            onChange={(e) => setSelectedPlanUlid(e.target.value)}
          >
            {plans.map(p => (
              <option key={p.ulid} value={p.ulid}>{p.name}</option>
            ))}
          </select>
          
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
          
          <div className="mt-6 bg-blue-50 text-blue-800 p-4 rounded-xl text-sm border border-blue-100 flex items-start gap-3">
            <RefreshCw className="w-5 h-5 flex-shrink-0" />
            <p>Renewing will immediately close out any active or expired subscription and deduct the Total Charge from the customer's wallet balance.</p>
          </div>
        </div>
        
        <div className="p-6 border-t border-neutral-100 flex gap-3 sticky bottom-0 bg-white">
          <button onClick={onClose} className="flex-1 py-3 px-4 bg-white border border-neutral-200 text-neutral-700 font-bold rounded-xl hover:bg-neutral-50 transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleRenew} 
            disabled={renewing || !preview}
            className="flex-1 py-3 px-4 bg-[#6A0FAD] text-white font-bold rounded-xl hover:bg-[#5b0c96] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {renewing ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {renewing ? "Processing..." : "Confirm Renewal"}
          </button>
        </div>
      </div>
    </div>
  );
}
