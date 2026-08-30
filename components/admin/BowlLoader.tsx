import React from "react";

export function BowlLoader({ className = "w-8 h-8 text-[#7c3aed]" }: { className?: string }) {
  // Strip out animate-spin if it was accidentally passed in from a Loader2 replacement
  const cleanClassName = className.replace("animate-spin", "");

  return (
    <div className={`flex flex-col items-center justify-center ${cleanClassName}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-full h-full"
      >
        {/* Steam 1 (Twisted Sine Wave) */}
        <path 
          d="M7 10 Q 5.5 8 7 6 T 7 2" 
          className="animate-[pulse_1.5s_ease-in-out_infinite] origin-bottom" 
          style={{ animationDelay: "0ms" }} 
        />
        {/* Steam 2 (Twisted Sine Wave - Taller) */}
        <path 
          d="M12 10 Q 10 7.5 12 5 T 12 0" 
          className="animate-[pulse_1.5s_ease-in-out_infinite] origin-bottom" 
          style={{ animationDelay: "300ms" }} 
        />
        {/* Steam 3 (Twisted Sine Wave) */}
        <path 
          d="M17 10 Q 18.5 8 17 6 T 17 2" 
          className="animate-[pulse_1.5s_ease-in-out_infinite] origin-bottom" 
          style={{ animationDelay: "600ms" }} 
        />
        {/* Bowl Base */}
        <path d="M22 12a10 10 0 0 1-20 0h20z" />
      </svg>
    </div>
  );
}
