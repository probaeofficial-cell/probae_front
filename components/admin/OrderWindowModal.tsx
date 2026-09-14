"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { endpoints } from "@/lib/apiService";

export interface OrderWindowModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OrderWindowModal({ isOpen, onClose }: OrderWindowModalProps) {
  const [openTime, setOpenTime] = useState("06:00");
  const [closeTime, setCloseTime] = useState("21:00");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    setIsFetching(true);
    try {
      const settings: any = await endpoints.settings.getSystemSettings();
      if (settings.ORDER_WINDOW_START) setOpenTime(settings.ORDER_WINDOW_START);
      if (settings.ORDER_WINDOW_END) setCloseTime(settings.ORDER_WINDOW_END);
    } catch (error) {
      console.error("Failed to fetch settings", error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await endpoints.settings.updateSystemSettings({
        ORDER_WINDOW_START: openTime,
        ORDER_WINDOW_END: closeTime,
      });
      onClose();
    } catch (error) {
      console.error("Failed to update settings", error);
      alert("Failed to save configuration.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-neutral-900">Order Window</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6 space-y-6">
          {isFetching ? (
            <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-[#6A0FAD]" /></div>
          ) : (
            <>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Open Time</label>
                  <input 
                    type="time" 
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                    className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD] transition-all"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Close Time</label>
                  <input 
                    type="time" 
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                    className="w-full bg-[#f8f5fb] border border-neutral-200 rounded-xl px-4 py-3 text-neutral-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0FAD]/20 focus:border-[#6A0FAD] transition-all"
                  />
                </div>
              </div>
              
              <p className="text-xs text-neutral-400 italic">
                Orders placed outside this window move to the next day's slot
              </p>
            </>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-6 bg-[#faf5ff] flex items-center justify-center gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-3 rounded-full border border-neutral-300 bg-white font-bold text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isLoading || isFetching}
            className="px-6 py-3 rounded-full bg-[#4B0082] text-white font-bold hover:bg-[#3a0066] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
