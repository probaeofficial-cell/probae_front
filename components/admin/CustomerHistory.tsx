import { useState } from "react";
import { LegacySubscriptionModal } from "./LegacyModals";

export function CustomerHistory({ customerUlid, subscriptions = [], onRefresh }: { customerUlid: string, subscriptions?: any[], onRefresh?: () => void }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
      {showModal && (
        <LegacySubscriptionModal 
          customerUlid={customerUlid} 
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); if(onRefresh) onRefresh(); }}
        />
      )}
      
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-neutral-900">Subscription History</h2>
        <button 
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-[#6A0FAD] text-white text-sm font-bold rounded-xl hover:bg-[#5b0c96] transition-colors"
        >
          Log Past Subscription
        </button>
      </div>
      
      <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-neutral-50/50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Plan Name</th>
                <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Start Date</th>
                <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">End Date</th>
                <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Total Bowls</th>
                <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Total Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-neutral-400 font-medium text-sm">
                    No subscriptions found for this customer.
                  </td>
                </tr>
              ) : (
                subscriptions.map((sub, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-neutral-900">{sub.plan_name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                        sub.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                        sub.status === 'EXPIRED' ? 'bg-red-100 text-red-700' :
                        'bg-neutral-100 text-neutral-700'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-neutral-500">{sub.start_date || "N/A"}</td>
                    <td className="px-6 py-4 text-sm font-medium text-neutral-500">{sub.end_date || "N/A"}</td>
                    <td className="px-6 py-4 text-sm font-bold text-neutral-900">{sub.total_bowls_allocated}</td>
                    <td className="px-6 py-4 text-sm font-bold text-neutral-900">AED {Number(sub.total_price_paid).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
