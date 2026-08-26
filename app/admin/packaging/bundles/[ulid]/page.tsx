"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { 
  Loader2, 
  ChevronLeft,
  Package,
  Plus,
  Trash2,
  Box,
  AlertTriangle,
  ArrowLeft
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Header } from "@/components/admin/Header";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import { endpoints } from "@/lib/apiService";
import { PackagingComponent, PackagingItemLink, PackagingItemLinkInput } from "@/lib/types";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import AsyncComponentSelect from "@/components/admin/AsyncComponentSelect";

export default function PackagingBundleFormPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  
  const isEdit = params.ulid !== "add";
  const bundleUlid = params.ulid as string;

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [components, setComponents] = useState<{ component_ulid: string; quantity: number; component?: any | null }[]>([]);
  
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/admin/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsPageLoading(true);
        if (isEdit) {
          const bundleData = await endpoints.packaging.getBundle(bundleUlid);
          setName(bundleData.name);
          setCode(bundleData.code || "");
          setComponents(bundleData.components.map((c: any) => ({ component_ulid: c.component.ulid, quantity: c.quantity, component: c.component })));
        }
      } catch (err: any) {
        setError(err.message || "Failed to load data");
      } finally {
        setIsPageLoading(false);
      }
    };
    if (user) {
      fetchData();
    }
  }, [user, isEdit, bundleUlid]);

  const addComponent = () => {
    setComponents([...components, { component_ulid: "", quantity: 1 }]);
  };

  const removeComponent = (index: number) => {
    const newComponents = [...components];
    newComponents.splice(index, 1);
    setComponents(newComponents);
  };

  const handleComponentChange = (index: number, field: "component_ulid" | "quantity", value: any, comp?: any) => {
    const newComponents = [...components];
    if (field === 'component_ulid') { 
      newComponents[index].component_ulid = value; 
    } else { 
      newComponents[index].quantity = value; 
    }
    if (comp !== undefined) newComponents[index].component = comp;
    setComponents(newComponents);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Packaging set name is required");
      return;
    }
    if (components.length === 0) {
      setError("Please add at least one component");
      return;
    }
    if (components.some(c => !c.component_ulid || c.quantity <= 0)) {
      setError("Please select a valid component and quantity > 0 for all items");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        name,
        code: code || null,
        components: components.map(c => ({
          component_ulid: c.component_ulid,
          quantity: c.quantity
        }))
      };
      if (isEdit) {
        await endpoints.packaging.updateBundle(bundleUlid, payload);
      } else {
        await endpoints.packaging.createBundle(payload);
      }
      router.push("/admin/packaging/bundles");
    } catch (err: any) {
      setError(err.message || "Failed to save packaging set");
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate projected total cost based on current selections
  const projectedTotal = components.reduce((sum, item) => sum + ((item.component?.cost || 0) * item.quantity), 0);

  if (authLoading || isPageLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fafafa]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#7c3aed] animate-spin" />
          <span className="text-neutral-500 font-medium">Loading packaging set builder...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-col flex-1 h-screen bg-[#E6E6E6] overflow-hidden p-4 sm:p-8">
      <Header />

      <div className="w-full max-w-4xl mx-auto flex flex-col px-4 sm:px-0">
        <Breadcrumbs segments={["Packaging Sets", isEdit ? "Edit" : "Create"]} />
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => router.push("/admin/packaging/bundles")} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-bold text-neutral-800 m-0">
            {isEdit ? "Edit Packaging Set" : "Create Packaging Set"}
          </h1>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto scrollbar-thin px-4 sm:px-0 max-w-4xl mx-auto w-full pb-20">

        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-neutral-100 flex flex-col gap-8 flex-1 mb-8">
          <div className="flex items-center gap-4 border-b border-neutral-100 pb-6">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600">
              <Package className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-800">
                {isEdit ? "Edit Packaging Set" : "Create Packaging Set"}
              </h1>
              <p className="text-sm text-neutral-500 font-medium mt-1">Combine components to build a packaging set for bowls.</p>
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-neutral-700 ml-1">Packaging Set Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard Large Packaging Set"
              className="w-full h-12 bg-neutral-50 border border-neutral-200 rounded-xl px-4 text-sm font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition-all"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-neutral-700 ml-1">Packaging Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. PKG-100"
              className="w-full h-12 bg-neutral-50 border border-neutral-200 rounded-xl px-4 text-sm font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition-all"
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-neutral-700 ml-1">Components included</label>
              <button 
                onClick={addComponent}
                className="flex items-center gap-2 text-sm font-bold text-[#7c3aed] bg-purple-50 hover:bg-purple-100 px-4 py-2 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Component
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {components.map((item, index) => {
                const compCost = item.component?.cost || 0;
                return (
                  <div key={index} className="flex flex-col sm:flex-row items-center gap-3 bg-neutral-50 p-3 rounded-2xl border border-neutral-200">
                    <div className="flex-1 w-full">
                      <AsyncComponentSelect
                        value={item.component_ulid}
                        onChange={(ulid, comp) => handleComponentChange(index, "component_ulid", ulid, comp)}
                        selectedComponent={item.component}
                      />
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-xl px-3 h-12 shrink-0">
                        <span className="text-sm font-semibold text-neutral-400 select-none">Qty</span>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleComponentChange(index, "quantity", parseInt(e.target.value) || 0)}
                          className="w-16 text-center text-sm font-bold text-neutral-800 focus:outline-none"
                        />
                      </div>
                      <div className="w-20 text-right text-sm font-bold text-neutral-600 shrink-0">
                        ₹{(compCost * item.quantity).toFixed(2)}
                      </div>
                      <button 
                        onClick={() => removeComponent(index)}
                        className="w-12 h-12 flex items-center justify-center text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {components.length === 0 && (
                <div className="text-center py-8 bg-neutral-50 rounded-2xl border border-neutral-200 border-dashed flex flex-col items-center">
                  <Box className="w-8 h-8 text-neutral-400 mb-2" />
                  <span className="text-sm font-medium text-neutral-500">No components added yet.</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-6 border-t border-neutral-100 flex justify-between items-center">
              <span className="text-lg font-bold text-neutral-800">Projected Total Cost</span>
              <span className="text-2xl font-black text-[#7c3aed]">₹{projectedTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end mb-8">
          <ProbaeButton onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto px-12 h-14 text-lg">
            {isSaving ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Saving...</> : "Save Packaging Set"}
          </ProbaeButton>
        </div>
      </div>
    </div>
  );
}
