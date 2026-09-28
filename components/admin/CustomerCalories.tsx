import { useState, useEffect } from "react";
import { endpoints } from "@/lib/apiService";
import { BowlLoader } from "./BowlLoader";
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { LegacyOrderModal } from "./LegacyModals";
import { ConfirmationModal } from "@/components/ConfirmationModal";

export function CustomerCalories({ customerUlid, onRefresh }: { customerUlid: string, onRefresh?: () => void }) {
  const [stats, setStats] = useState({ total: 0, today: 0, this_week: 0, this_month: 0 });
  const [log, setLog] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterDate, setFilterDate] = useState("");
  const [showLegacyOrderModal, setShowLegacyOrderModal] = useState(false);
  const [editLogEntry, setEditLogEntry] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const ITEMS_PER_PAGE = 5;

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterDate]);


  const handleDeleteLegacy = (orderUlid: string) => {
    setOrderToDelete(orderUlid);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteLegacy = async () => {
    if (!orderToDelete) return;
    setIsDeleting(true);
    try {
      await endpoints.customers.deleteLegacyOrder(customerUlid, orderToDelete);
      await fetchCalories();
      if (onRefresh) onRefresh();
      setIsDeleteModalOpen(false);
      setOrderToDelete(null);
    } catch (e: any) {
      alert("Failed to delete legacy order: " + (e?.detail || e?.message || "Unknown error"));
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchCalories = async () => {
    setIsLoading(true);
    try {
      const res: any = await endpoints.customers.getCalories(customerUlid, filterDate, currentPage, ITEMS_PER_PAGE);
      if (res.success) {
        setStats(res.stats);
        setLog(res.log);
        setTotalItems(res.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCalories();
  }, [customerUlid, filterDate, currentPage]);

  if (isLoading && log.length === 0) {
    return (

      <div className="flex flex-col items-center justify-center p-12 gap-4">
        <BowlLoader className="w-8 h-8 text-[#6A0FAD]" />
        <span className="text-neutral-500 font-medium">Loading calories...</span>
      </div>
    );
  }


  const totalPages = Math.ceil(log.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedLog = log.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <>
      {showLegacyOrderModal && (
        <LegacyOrderModal 
          customerUlid={customerUlid}
          editData={editLogEntry}
          onClose={() => {
            setShowLegacyOrderModal(false);
            setEditLogEntry(null);
          }}
          onSuccess={() => {
            setShowLegacyOrderModal(false);
            setEditLogEntry(null);
            fetchCalories();
            if (onRefresh) onRefresh();
          }}
        />
      )}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setOrderToDelete(null);
        }}
        onConfirm={confirmDeleteLegacy}
        title="Delete Legacy Order"
        message="Are you sure you want to delete this legacy order? This will refund any wallet deductions or restore subscription bowls."
        type="delete"
        confirmText="Delete"
        isLoading={isDeleting}
      />
      
      <div className="animate-in fade-in zoom-in-95 duration-300">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-3xl border border-neutral-200 shadow-sm flex flex-col justify-center">
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Total Calories</p>
            <p className="text-2xl font-black text-neutral-900">{Math.round(stats.total).toLocaleString()} <span className="text-sm text-neutral-400 font-medium">kcal</span></p>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-neutral-200 shadow-sm flex flex-col justify-center">
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Today</p>
            <p className="text-2xl font-black text-[#6A0FAD]">{Math.round(stats.today).toLocaleString()} <span className="text-sm font-medium">kcal</span></p>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-neutral-200 shadow-sm flex flex-col justify-center">
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">This Week</p>
            <p className="text-2xl font-black text-neutral-900">{Math.round(stats.this_week).toLocaleString()} <span className="text-sm text-neutral-400 font-medium">kcal</span></p>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-neutral-200 shadow-sm flex flex-col justify-center">
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">This Month</p>
            <p className="text-2xl font-black text-neutral-900">{Math.round(stats.this_month).toLocaleString()} <span className="text-sm text-neutral-400 font-medium">kcal</span></p>
          </div>
        </div>

        {/* Filter and Log */}
        <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
            <h3 className="font-bold text-neutral-900 text-lg">Calorie Log</h3>
            <div className="flex gap-4">
              <button 
                onClick={() => { setEditLogEntry(null); setShowLegacyOrderModal(true); }}
                className="px-4 py-2 bg-[#6A0FAD] text-white text-sm font-bold rounded-xl hover:bg-[#5b0c96] transition-colors"
              >
                Log Past Meal
              </button>
              <input
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="bg-white border border-neutral-200 rounded-xl px-4 py-2 text-sm font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD]"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-neutral-50/50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Meal</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Slot</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Calories</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">Macros (P/C/F)</th>
                  <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {log.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-neutral-400 font-medium text-sm">
                      {isLoading ? "Fetching logs..." : "No calorie logs found."}
                    </td>
                  </tr>
                ) : (
                  paginatedLog.map((entry: any, idx: number) => (
                    <tr key={idx} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-neutral-900">{entry.date}</td>
                      <td className="px-6 py-4 text-sm font-medium text-neutral-900">{entry.bowl_name}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-[#6A0FAD]/10 text-[#6A0FAD] text-xs font-bold rounded-full">
                          {entry.meal_slot}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-black text-[#6A0FAD]">{Math.round(entry.calories || 0)} kcal</td>
                      <td className="px-6 py-4 text-xs font-bold text-neutral-500">
                        <span className="text-red-500">{Math.round(entry.macros.protein || 0)}g</span> / <span className="text-blue-500">{Math.round(entry.macros.carbs || 0)}g</span> / <span className="text-yellow-500">{Math.round(entry.macros.fat || 0)}g</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {entry.is_legacy && entry.order_ulid && (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditLogEntry(entry);
                                setShowLegacyOrderModal(true);
                              }}
                              className="text-[#6A0FAD] hover:bg-[#6A0FAD]/10 p-2 rounded-xl transition-colors"
                              title="Edit Legacy Order"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteLegacy(entry.order_ulid)}
                              className="text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition-colors"
                              title="Delete Legacy Order"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-between bg-white">
              <span className="text-sm text-neutral-500 font-medium">
                Showing {totalItems === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, totalItems)} of {totalItems} entries
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl border border-neutral-200 text-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-sm font-bold flex items-center justify-center transition-colors ${
                        currentPage === page 
                          ? "bg-[#6A0FAD] text-white" 
                          : "text-neutral-600 hover:bg-neutral-100"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl border border-neutral-200 text-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
