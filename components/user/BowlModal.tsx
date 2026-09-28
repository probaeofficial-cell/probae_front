"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface BowlModalProps {
  bowl: any | null;
  onClose: () => void;
}

export default function BowlModal({ bowl, onClose }: BowlModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (bowl) {
      // Trigger slide up animation
      requestAnimationFrame(() => setIsVisible(true));
      document.body.style.overflow = "hidden";
    } else {
      setIsVisible(false);
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [bowl]);

  if (!bowl || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-6 pointer-events-none" style={{ zIndex: 60 }}>
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-gray-900/40 backdrop-blur-sm pointer-events-auto transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Modal Drawer */}
      <div 
        className={`relative w-full max-w-md bg-white rounded-t-[40px] sm:rounded-[40px] h-[90vh] sm:h-auto sm:max-h-[90vh] flex flex-col pointer-events-auto transition-transform duration-500 shadow-2xl ${isVisible ? 'translate-y-0' : 'translate-y-full sm:translate-y-12 sm:opacity-0'}`}
      >
        {/* Drag Handle */}
        <div className="w-full flex justify-center pt-4 pb-2 sm:hidden cursor-grab" onClick={onClose}>
          <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto hide-scrollbar px-8 pb-32">
          
          {/* Image */}
          <div className="relative w-64 h-64 mx-auto mt-4 mb-8">
            <div className="absolute inset-0 bg-gray-900 rounded-full overflow-hidden shadow-2xl shadow-gray-200/50">
              <Image 
                src={bowl.imageId?.url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop"} 
                alt={bowl.name}
                fill
                className="object-cover"
              />
            </div>
          </div>

          {/* Details */}
          <div className="text-center flex flex-col items-center">
            <div className="bg-gray-100 text-gray-600 text-[10px] font-bold tracking-widest px-4 py-1.5 rounded-full uppercase mb-4">
              {bowl.category} • {bowl.mealTypes?.[0] === 'B' ? 'BREAKFAST' : bowl.mealTypes?.[0] === 'L' ? 'LUNCH' : 'DINNER'}
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{bowl.name}</h2>
            
            <div className="flex items-baseline justify-center gap-1 mb-8 text-[#8B5CF6]">
              <span className="text-5xl font-light tracking-tight">{bowl.baseCalories}</span>
              <span className="font-mono text-sm font-medium">kcal</span>
            </div>

            {/* Macros Grid */}
            <div className="grid grid-cols-4 gap-3 w-full mb-10">
              <div className="flex flex-col items-center p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Protein</span>
                <span className="font-bold text-gray-900">{Math.round(bowl.macros?.protein || 0)}g</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Carbs</span>
                <span className="font-bold text-gray-900">{Math.round(bowl.macros?.carbs || 0)}g</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Fats</span>
                <span className="font-bold text-gray-900">{Math.round(bowl.macros?.fat || 0)}g</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Fiber</span>
                <span className="font-bold text-gray-900">{Math.round(bowl.macros?.fiber || 0)}g</span>
              </div>
            </div>

            {/* Ingredients */}
            {bowl.ingredients && bowl.ingredients.length > 0 && (
              <div className="w-full text-left mt-6">
                <h3 className="font-bold text-gray-900 mb-4">Core Ingredients</h3>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                  {bowl.ingredients.map((ingredient: string, idx: number) => (
                    <span key={idx} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700">
                      {ingredient}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Micronutrients */}
            {bowl.micros && bowl.micros.length > 0 && (
              <div className="w-full text-left mt-6">
                <h3 className="font-bold text-gray-900 mb-4">Micronutrients</h3>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                  {bowl.micros.map((micro: string, idx: number) => (
                    <span key={idx} className="px-3 py-1.5 bg-[#10B981]/10 border border-[#10B981]/20 rounded-lg text-sm font-medium text-[#15803D]">
                      {micro}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent pt-12">
          <button 
            onClick={() => router.push('/onboarding')}
            className="w-full bg-[#F97316] text-white font-bold py-4 rounded-2xl shadow-lg hover:-translate-y-0.5 transition-transform"
          >
            Order Now
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
