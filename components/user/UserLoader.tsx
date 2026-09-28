"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const captions = [
  "Crafting premium bowls...",
  "Perfecting your macros...",
  "Sourcing fresh ingredients...",
  "Preparing your menu...",
  "Tossing fresh greens...",
  "Optimizing your fuel...",
  "Simmering something delicious..."
];

export default function UserLoader() {
  // Initialize with the first caption to avoid SSR hydration mismatches
  const [caption, setCaption] = useState(captions[0]);

  useEffect(() => {
    // Cycle to a new caption every 2 seconds while loading
    const intervalId = setInterval(() => {
      setCaption((prevCaption) => {
        const nextIndex = (captions.indexOf(prevCaption) + 1) % captions.length;
        return captions[nextIndex];
      });
    }, 2000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center relative z-50">
      <div className="flex flex-col items-center gap-6">
        
        {/* Bowl Animation container */}
        <div className="relative flex flex-col items-center">
          {/* Animated Steam lines (Green) */}
          <div className="flex space-x-3 mb-2">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-6 bg-[#10B981] rounded-full"
                animate={{ 
                  y: [0, -12, 0],
                  opacity: [0.3, 1, 0.3] 
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
          
          {/* Bowl Body (Purple Skeleton) */}
          <motion.div 
            className="w-32 h-16 bg-[#8B5CF6] rounded-b-full rounded-t-[8px] relative overflow-hidden shadow-lg shadow-purple-500/20"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Glossy shimmer sweep passing through the bowl */}
            <motion.div 
              className="absolute top-0 bottom-0 w-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
        </div>

        {/* The randomly selected caption */}
        <p className="text-black font-extrabold tracking-widest uppercase text-sm mt-6 animate-pulse">
          {caption}
        </p>
      </div>
    </div>
  );
}
