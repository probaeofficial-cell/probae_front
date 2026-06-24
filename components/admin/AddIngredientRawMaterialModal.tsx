import React, { useState, useEffect } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { RawMaterial } from "@/lib/types";
import { endpoints } from "@/lib/apiService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (rawMaterial: RawMaterial, weight: number, editIndex?: number | null) => void;
  initialMaterial?: RawMaterial | null;
  initialWeight?: number | null;
  editIndex?: number | null;
}

export function AddIngredientRawMaterialModal({ isOpen, onClose, onAdd, initialMaterial = null, initialWeight = null, editIndex = null }: Props) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);
  const [weightStr, setWeightStr] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    if (isOpen) {
      if (initialMaterial && !selectedMaterial) setSelectedMaterial(initialMaterial);
      if (initialWeight && !weightStr) setWeightStr(initialWeight.toString());
      fetchMaterials();
    } else {
      setSelectedMaterial(null);
      setWeightStr("");
      setSearch("");
    }
  }, [isOpen, debouncedSearch]);

  const fetchMaterials = async () => {
    setIsLoading(true);
    try {
      const data = await endpoints.rawMaterials.getRawMaterials(1, 50, debouncedSearch);
      setMaterials(data.items || []);
    } catch (error) {
      console.error("Failed to fetch raw materials", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    const w = parseFloat(weightStr);
    if (selectedMaterial && w && w > 0) {
      onAdd(selectedMaterial, w, editIndex);
      setSelectedMaterial(null);
      setWeightStr("");
      setSearch("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-100">
          <h2 className="text-xl font-bold text-neutral-800">Add Raw Material</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search raw materials..."
              className="w-full h-12 pl-12 pr-4 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition-all"
            />
          </div>

          {/* List */}
          <div className="h-64 overflow-y-auto border border-neutral-100 rounded-2xl">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="w-6 h-6 text-[#7c3aed] animate-spin" />
              </div>
            ) : materials.length === 0 ? (
              <div className="flex h-full items-center justify-center text-neutral-500">
                No raw materials found.
              </div>
            ) : (
              <div className="flex flex-col">
                {materials.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMaterial(m)}
                    className={`p-4 border-b border-neutral-50 cursor-pointer transition-colors flex items-center justify-between ${
                      selectedMaterial?.id === m.id ? "bg-[#7c3aed]/5" : "hover:bg-neutral-50"
                    }`}
                  >
                    <div>
                      <h4 className={`font-semibold ${selectedMaterial?.id === m.id ? "text-[#7c3aed]" : "text-neutral-800"}`}>
                        {m.name}
                      </h4>
                      <p className="text-sm text-neutral-500">{m.unit}</p>
                    </div>
                    {selectedMaterial?.id === m.id && (
                      <div className="w-4 h-4 rounded-full bg-[#7c3aed]" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weight Input */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-semibold text-neutral-700 mb-1 block">Weight (g or ml)</label>
              <input
                type="number"
                value={weightStr}
                onChange={(e) => setWeightStr(e.target.value)}
                placeholder="e.g. 50"
                className="w-full h-12 px-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition-all"
              />
            </div>
            <button
              disabled={!selectedMaterial || !parseFloat(weightStr) || parseFloat(weightStr) <= 0}
              onClick={handleAdd}
              className="mt-6 h-12 px-8 bg-[#212121] text-white font-bold rounded-full disabled:opacity-50 hover:bg-black transition-colors"
            >
              {editIndex !== null ? "Update" : "Add"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
