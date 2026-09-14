"use client";
import { useState, useEffect } from "react";
import { Header } from "@/components/admin/Header";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { endpoints } from "@/lib/apiService";
import { Plus, MapPin, Loader2, Trash2, Edit2, X } from "lucide-react";
import { ProbaeButton } from "@/components/admin/ProbaeButton";
import dynamic from "next/dynamic";

const ZonePolygonMap = dynamic(() => import("@/components/admin/ZonePolygonMap"), {
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-neutral-100 rounded-xl animate-pulse flex items-center justify-center text-neutral-400 font-bold">Loading Map...</div>
});


export default function DeliveryZonesPage() {
  const [zones, setZones] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingZone, setEditingZone] = useState<any>(null);
  const [newZoneName, setNewZoneName] = useState("");
  const [newZonePolygon, setNewZonePolygon] = useState<[number, number][]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchZones();
  }, []);

  const handleEditClick = (zone: any) => {
    setIsCreating(false); setEditingZone(null);
    setEditingZone(zone);
    setNewZoneName(zone.name);
    setNewZonePolygon(zone.polygon_coordinates || []);
    setError("");
  };

  const fetchZones = async () => {
    setIsLoading(true);
    try {
      const data = await endpoints.logistics.getZones() as any;
      setZones(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    setError("");
    if (!newZoneName) {
      setError("Name is required");
      return;
    }
    
    if (newZonePolygon.length < 3) {
      setError("Please draw a polygon on the map (at least 3 points).");
      return;
    }

    setIsSaving(true);
    try {
      if (editingZone) {
        await endpoints.logistics.updateZone(editingZone.ulid, {
          name: newZoneName,
          polygon_coordinates: newZonePolygon,
        });
        setEditingZone(null);
      } else {
        await endpoints.logistics.createZone({
          name: newZoneName,
          polygon_coordinates: newZonePolygon,
          is_active: true
        });
        setIsCreating(false); setEditingZone(null);
      }
      setNewZoneName("");
      setNewZonePolygon([]);
      fetchZones();
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to save zone");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-[#E6E6E6]">
      <div className="p-4 sm:p-8 h-full rounded-tl-3xl shadow-[0_0_15px_rgba(0,0,0,0.05)] flex flex-col bg-white overflow-hidden">
        <Header />
        <Breadcrumbs segments={["Admin", "Delivery", "Zones"]} />
        
        <div className="mt-4 flex-1 flex flex-col min-h-0">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
            <div>
              <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Delivery Zones</h1>
              <p className="text-neutral-500 font-medium mt-1">Manage geographic zones and boundaries for routing.</p>
            </div>
            
            <ProbaeButton 
              onClick={() => { setIsCreating(true); setEditingZone(null); setNewZoneName(""); setNewZonePolygon([]); setError(""); }} 
            >
              <div className="flex items-center gap-2"><Plus className="w-5 h-5" /> Add New Zone</div>
            </ProbaeButton>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 pb-10 pr-2 custom-scrollbar">
            {isLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 text-neutral-400 animate-spin" /></div>
            ) : zones.length === 0 ? (
              <div className="text-center p-12 border-2 border-dashed border-neutral-200 rounded-2xl bg-neutral-50">
                <MapPin className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-neutral-900">No Zones Yet</h3>
                <p className="text-neutral-500 mt-1 max-w-sm mx-auto">Create a geographic delivery zone to map customer addresses.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {zones.map(zone => (
                  <div key={zone.ulid} className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-neutral-900 text-lg flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-[#6A0FAD]" />
                          {zone.name}
                        </h3>
                        <p className="text-xs text-neutral-500 font-medium mt-1 uppercase tracking-wider">
                          ID: {zone.ulid}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${zone.is_active ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600'}`}>
                        {zone.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between">
                      <p className="text-sm text-neutral-600 font-medium">
                        {zone.polygon_coordinates ? "Coordinates configured" : "No coordinates mapped"}
                      </p>
                      <button 
                        onClick={() => handleEditClick(zone)}
                        className="p-2 text-neutral-400 hover:text-[#6A0FAD] hover:bg-purple-50 rounded-lg transition-colors"
                        title="Edit Zone"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {(isCreating || editingZone) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-6">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-fade-in-up">
            <div className="flex items-center justify-between p-6 border-b border-neutral-100 shrink-0">
              <h2 className="text-xl font-bold text-neutral-800">{editingZone ? "Edit Delivery Zone" : "Create New Delivery Zone"}</h2>
              <button 
                onClick={() => {
                  setIsCreating(false);
                  setEditingZone(null);
                  setError("");
                }} 
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors"
              >
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-200">
                  {error}
                </div>
              )}
              
              <div className="grid grid-cols-1 gap-4 mb-4 items-start">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1">Zone Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={newZoneName}
                    onChange={e => setNewZoneName(e.target.value)}
                    placeholder="e.g. Kozhikode North"
                    className="w-full px-4 py-2 bg-white border border-neutral-200 rounded-xl outline-none focus:border-[#6A0FAD] focus:ring-1 focus:ring-[#6A0FAD] text-sm text-neutral-900"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-2">Draw Zone Area</label>
                  <ZonePolygonMap 
                    polygon={newZonePolygon} 
                    setPolygon={setNewZonePolygon} 
                    center={editingZone?.polygon_coordinates?.[0] || [11.2588, 75.7804]}
                  />
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-neutral-100 flex gap-3 justify-end shrink-0 bg-neutral-50">
              <button
                onClick={() => {
                  setIsCreating(false);
                  setEditingZone(null);
                  setError("");
                }}
                className="px-6 py-2 rounded-xl text-sm font-bold bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <ProbaeButton
                onClick={handleCreate}
                disabled={isSaving}
              >
                <div className="flex items-center gap-2">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isSaving ? "Saving..." : editingZone ? "Update Zone" : "Save Zone"}
                </div>
              </ProbaeButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
