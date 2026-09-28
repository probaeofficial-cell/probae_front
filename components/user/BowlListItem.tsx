"use client";

import React from "react";
import Image from "next/image";
import { Plus } from "lucide-react";

interface BowlListItemProps {
  bowl: any;
  onClick: () => void;
}

export default function BowlListItem({ bowl, onClick }: BowlListItemProps) {
  return (
    <div 
      onClick={onClick}
      className="flex items-center gap-4 py-4 border-b border-gray-100/60 last:border-0 cursor-pointer hover:bg-gray-50/50 transition-colors px-2 rounded-xl group"
    >
      {/* Thumbnail */}
      <div className="relative w-20 h-20 shrink-0">
        <div className="absolute inset-0 bg-gray-900 rounded-full overflow-hidden shadow-sm">
          <Image 
            src={bowl.imageId?.url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400&auto=format&fit=crop"} 
            alt={bowl.name}
            fill
            className="object-cover opacity-90 group-hover:scale-105 transition-transform"
          />
        </div>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-gray-900 text-[15px] truncate mb-1">
          {bowl.name}
        </h4>
        <div className="flex items-baseline gap-1 mb-2">
          <span className="font-medium text-gray-600 text-sm font-mono">{bowl.baseCalories}</span>
          <span className="text-gray-400 text-xs font-mono">kcal</span>
        </div>
        
        {/* Tiny Macro Pills */}
        <div className="flex gap-2">
          <div className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-mono font-medium text-gray-500">
            C: {Math.round(bowl.macros?.carbs || 0)}g
          </div>
          <div className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-mono font-medium text-gray-500">
            P: {Math.round(bowl.macros?.protein || 0)}g
          </div>
          <div className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-mono font-medium text-gray-500">
            F: {Math.round(bowl.macros?.fat || 0)}g
          </div>
        </div>
      </div>

      {/* Price & Add */}
      <div className="flex flex-col items-end justify-between shrink-0 h-full py-1">
        <span className="font-bold text-[#8B5CF6] text-base">₹{bowl.basePrice.toFixed(2)}
        </span>
        <button className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-[#8B5CF6] hover:bg-[#8B5CF6] hover:text-white transition-colors mt-auto">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
