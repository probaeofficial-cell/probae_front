"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Loader2, 
  Wheat,
  Trash2,
  Pencil,
  ChevronDown
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { endpoints } from "@/lib/apiService";
import { getMediaUrl } from "@/lib/utils";
import { RawMaterial } from "@/lib/types";
import { ProbaeSearch } from "@/components/admin/ProbaeSearch";
import { StockAdjustmentModal } from "@/components/admin/raw-materials/StockAdjustmentModal";
import { StockLogModal } from "@/components/admin/raw-materials/StockLogModal";

export default function StockManagementPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // ─── State Variables ───────────────────────────────────────────────────────
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [totalMaterials, setTotalMaterials] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [systemSettings, setSystemSettings] = useState({ R2_BASE_URL: "" });
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // ─── Debounce Search ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset page on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // ─── Fetch Data ────────────────────────────────────────────────────────────
  const fetchMaterials = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await endpoints.rawMaterials.getRawMaterials(page, pageSize, debouncedSearch);
      setMaterials(data.items || []);
      setTotalMaterials(data.total || 0);
    } catch (error) {
      console.error("Failed to fetch raw materials", error);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, debouncedSearch]);

  const fetchSystemSettings = async () => {
    try {
      const data = await endpoints.settings.getSystemSettings();
      if (data && data.R2_BASE_URL !== undefined) {
        setSystemSettings({ R2_BASE_URL: data.R2_BASE_URL });
      }
    } catch (error) {
      console.error("Failed to fetch system settings:", error);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/admin/login");
      return;
    }
    if (user) {
      fetchSystemSettings();
      fetchMaterials();
    }
  }, [user, authLoading, router, fetchMaterials]);

  // ─── Actions ───────────────────────────────────────────────────────────────
  const handleOpenAdjustment = (material: RawMaterial, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMaterial(material);
    setIsAdjustmentModalOpen(true);
  };

  const handleOpenLog = (material: RawMaterial, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMaterial(material);
    setIsLogModalOpen(true);
  };

  const handleStockUpdateSuccess = (updatedMaterial: RawMaterial) => {
    setMaterials(prev => prev.map(m => m.id === updatedMaterial.id ? updatedMaterial : m));
  };

  const getGradientForImage = (id: number) => {
    const gradients = [
      "from-orange-50 to-amber-100/50",
      "from-rose-50 to-pink-100/50",
      "from-blue-50 to-indigo-100/50",
      "from-emerald-50 to-teal-100/50",
      "from-purple-50 to-fuchsia-100/50",
    ];
    return gradients[id % gradients.length];
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <Loader2 className="w-8 h-8 text-[#6b21a8] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#fafafa]">
      {/* Main Page Layout */}
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        {/* Header Bar */}
        <Header />

        {/* Breadcrumbs */}
        <Breadcrumbs segments={["Raw Material", "Stock Mgt"]} />

        {/* ─── Grid Listing view ─── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-2xl pt-2 pb-6 px-6 sm:pt-2 sm:pb-8 sm:px-8">
          {/* Sub Header */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-between items-center shrink-0">
            <ProbaeSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search for your order"
            />
          </div>

          {/* Grid Content Area */}
          <div className="flex-1 overflow-y-auto pr-2 pb-6 scrollbar-thin">
            {isLoading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-[#6b21a8] animate-spin" />
                <span className="text-neutral-500 text-sm font-medium">Loading materials...</span>
              </div>
            ) : materials.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center bg-white border border-neutral-100 rounded-3xl p-8 text-center max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-400 mb-4">
                  <Wheat className="w-8 h-8" />
                </div>
                <h3 className="text-neutral-800 font-bold text-lg">No raw materials found</h3>
                <p className="text-neutral-500 text-sm mt-2 max-w-sm">
                  Get started by adding raw materials in the Cost Management section.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {materials.map((material) => {
                  const mediaUrl = getMediaUrl(systemSettings?.R2_BASE_URL, material.image_filename);
                  const isRunningLow = material.current_stock <= material.stock_threshold;

                  return (
                    <div
                      key={material.id}
                      onClick={(e) => handleOpenAdjustment(material, e)}
                      className={`bg-white rounded-[100px] p-6 flex flex-col items-center justify-between text-center cursor-pointer transition-all hover:translate-y-[-4px] aspect-[10/16] min-h-[360px] w-full max-w-[210px] mx-auto relative group ${
                        isRunningLow 
                          ? 'border-2 border-red-500 shadow-[0_4px_20px_rgba(239,68,68,0.15)] hover:shadow-[0_8px_30px_rgba(239,68,68,0.25)]' 
                          : 'border border-neutral-100/50 shadow-sm hover:shadow-md'
                      }`}
                    >
                      {/* Top Capsule overlap circular image */}
                      <div className={`w-32 h-32 rounded-full overflow-hidden flex items-center justify-center border-4 border-white shadow-[0_4px_10px_rgba(0,0,0,0.06)] relative bg-gradient-to-br ${getGradientForImage(material.id)} shrink-0`}>
                        {mediaUrl ? (
                          <img
                            src={mediaUrl}
                            alt={material.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <Wheat className="w-10 h-10 text-neutral-600/70" />
                        )}
                      </div>

                      {/* Content Section */}
                      <div className="flex-1 flex flex-col items-center mt-3 w-full">
                        <h4 className="text-sm font-bold text-neutral-900 leading-tight mb-2">
                          {material.name}
                        </h4>
                        
                        {/* Status Pill */}
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide mb-3 ${isRunningLow ? "bg-red-500 text-white" : "bg-neutral-100 text-neutral-500"}`}>
                          {isRunningLow ? "Running Low" : "In Stock"}
                        </div>

                        {/* Current Stock */}
                        <div className="text-[10px] font-bold text-green-600/70 uppercase tracking-wider mb-1">
                          Current Stock
                        </div>
                        <div className="bg-green-100 w-full py-2 rounded-2xl flex items-center justify-center mb-2">
                          <span className="text-xl font-black text-green-700">
                            {Number(material.current_stock)}{material.unit}
                          </span>
                        </div>

                        <div className="text-[10px] text-neutral-400 font-medium mt-auto">
                          Last updated: {new Date(material.updated_at).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div 
                        className="flex items-center gap-1 mt-3 pt-3 border-t border-neutral-100/80 w-3/4 justify-center text-neutral-500 hover:text-[#6b21a8] transition-colors"
                        onClick={(e) => handleOpenLog(material, e)}
                      >
                        <span className="text-xs font-bold">View Log</span>
                        <ChevronDown className="w-3 h-3" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedMaterial && (
        <>
          <StockAdjustmentModal 
            isOpen={isAdjustmentModalOpen}
            onClose={() => setIsAdjustmentModalOpen(false)}
            material={selectedMaterial}
            onSuccess={handleStockUpdateSuccess}
            systemSettings={systemSettings}
          />
          <StockLogModal 
            isOpen={isLogModalOpen}
            onClose={() => setIsLogModalOpen(false)}
            material={selectedMaterial}
          />
        </>
      )}
    </div>
  );
}
