"use client";

import React from "react";
import Image from "next/image";

interface TopPickCardProps {
  bowl: any;
  onClick: () => void;
  index: number;
}

export default function TopPickCard({ bowl, onClick, index }: TopPickCardProps) {
  // Alternate top background colors based on index
  const bgColors = ["bg-[#F97316]", "bg-[#10B981]", "bg-[#8B5CF6]", "bg-[#EAB308]"];
  const bgColor = bgColors[index % bgColors.length];

  return (
    <div 
      onClick={onClick}
      className="w-[260px] min-w-[260px] bg-white rounded-[32px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] cursor-pointer snap-center relative border border-gray-100/50 hover:-translate-y-1 transition-transform"
    >
      {/* Top Color Shape */}
      <div className={`w-full h-32 ${bgColor}`}></div>
      
      {/* Bowl Image (overlapping) */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white">
        <Image 
          src={bowl.imageId?.url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400&auto=format&fit=crop"} 
          alt={bowl.name}
          fill
          className="object-cover"
        />
      </div>

      {/* Content */}
      <div className="pt-16 pb-6 px-6 flex flex-col items-center text-center">
        {/* Category Pill */}
        <div className="bg-gray-100 text-gray-600 text-[10px] font-bold tracking-widest px-3 py-1 rounded-full uppercase mb-3">
          {bowl.category} • {bowl.mealTypes?.[0] === 'B' ? 'BREAKFAST' : bowl.mealTypes?.[0] === 'L' ? 'LUNCH' : 'DINNER'}
        </div>

        {/* Title */}
        <h3 className="font-bold text-gray-900 text-[15px] leading-tight mb-4 min-h-[40px] flex items-center justify-center">
          {bowl.name}
        </h3>

        {/* Footer (Calories & Price) */}
        <div className="w-full flex justify-between items-end mt-auto">
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-gray-800 text-lg">{bowl.baseCalories}</span>
            <span className="text-gray-500 text-xs font-medium font-mono">kcal</span>
          </div>
          <div className="font-bold text-primary text-lg">₹{bowl.basePrice.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
