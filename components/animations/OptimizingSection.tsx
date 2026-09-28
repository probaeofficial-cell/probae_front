"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";

export default function OptimizingSection() {
  const containerRef = useRef<HTMLElement>(null);
  
  // Track scroll progress relative to the viewport
  const { scrollYProgress } = useScroll({
    target: containerRef,
    // Animation finishes exactly when the bottom of this section hits the bottom of the screen
    offset: ["start end", "end end"]
  });

  // Scale and fade in the main text
  const scale = useTransform(scrollYProgress, [0, 1], [0.8, 1]);
  const opacity = useTransform(scrollYProgress, [0, 1], [0.5, 1]);
  
  // Fade in the copyright text at the very end of the scroll
  const copyrightOpacity = useTransform(scrollYProgress, [0.8, 1], [0, 0.4]);
  const copyrightY = useTransform(scrollYProgress, [0.8, 1], [20, 0]);

  return (
    <footer 
      ref={containerRef} 
      className="relative w-full flex flex-col items-center justify-center py-32 md:py-48 px-4 overflow-hidden bg-[#222222] min-h-[60vh] z-10"
    >
      <motion.div 
        style={{ scale, opacity }}
        className="flex flex-col items-center justify-center text-center origin-bottom w-full"
      >
        <h1 className="font-extrabold text-[clamp(2.5rem,8vw,10rem)] leading-[0.9] tracking-tighter text-center w-full uppercase font-headline text-[#F5F5F5]">
          STOP DIETING.
        </h1>
        <h1 className="font-extrabold text-[clamp(2.5rem,8vw,10rem)] leading-[0.9] tracking-tighter text-center w-full uppercase font-headline text-[#6a0fad] mb-12">
          START OPTIMIZING.
        </h1>
        
        <Link href="/onboarding" className="bg-[#4CAF50] text-[#222222] px-8 py-4 md:px-10 md:py-5 rounded-full font-black text-lg md:text-xl flex items-center gap-2 hover:scale-105 transition-transform duration-300 shadow-xl">
          Explore The Menu
        </Link>
      </motion.div>

      <motion.div 
        style={{ opacity: copyrightOpacity, y: copyrightY }}
        className="absolute bottom-8 left-0 right-0 text-center pointer-events-none"
      >
        <p className="text-xs uppercase tracking-widest font-bold text-[#F5F5F5]">
          © 2026 Probae Initiative Inc. // Access Restricted.
        </p>
      </motion.div>
    </footer>
  );
}
