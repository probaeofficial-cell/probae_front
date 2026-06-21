import React from "react";
import { Search, Filter } from "lucide-react";

interface ProbaeSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onFilterClick?: () => void;
  sortByText?: string;
  onSortClick?: () => void;
}

export function ProbaeSearch({
  value,
  onChange,
  placeholder = "Search for your order",
  onFilterClick,
  sortByText = "A to Z",
  onSortClick,
}: ProbaeSearchProps) {
  return (
    <div
      className="flex-1 w-full max-w-[800px] flex items-center bg-white rounded-[24px] px-3.5 py-2.5 shadow-sm transition-all"
      style={{
        border: "1px solid transparent",
        backgroundImage: "linear-gradient(white, white), linear-gradient(135deg, #EA580C 0%, #7C3AED 100%)",
        backgroundOrigin: "border-box",
        backgroundClip: "padding-box, border-box"
      }}
    >
      {/* Gradient Search circle */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#EA580C] to-[#7C3AED] flex items-center justify-center text-white shrink-0 shadow-sm mr-3">
        <Search className="w-4 h-4 text-white" />
      </div>
      {/* Vertical line separator after search circle */}
      <div className="h-5 w-[1px] bg-neutral-200 mr-3 shrink-0" />
      
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none font-medium"
      />
      
      <div className="flex items-center gap-3 shrink-0 pr-1 select-none">
        {/* Vertical line separator before Sort By text */}
        <div className="h-5 w-[1px] bg-neutral-200" />
        <span 
          onClick={onSortClick}
          className="text-xs text-neutral-400 font-bold tracking-wider cursor-pointer hover:text-[#7C3AED] transition-colors"
        >
          {sortByText}
        </span>
        
        {/* Vertical line separator before filter icon */}
        <div className="h-5 w-[1px] bg-neutral-200" />
        <Filter 
          onClick={onFilterClick}
          className="w-4 h-4 text-neutral-400 hover:text-[#7C3AED] cursor-pointer transition-colors" 
        />
      </div>
    </div>
  );
}
