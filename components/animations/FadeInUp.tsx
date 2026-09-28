"use client";

import React, { ReactNode } from "react";
import { motion } from "framer-motion";

interface FadeInUpProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  duration?: number;
  yOffset?: number;
  trigger?: "scroll" | "mount";
}

export default function FadeInUp({ 
  children, 
  delay = 0, 
  className = "", 
  duration = 0.8,
  yOffset = 40,
  trigger = "scroll"
}: FadeInUpProps) {
  const animationProps = trigger === "mount" 
    ? { animate: { opacity: 1, y: 0, filter: "blur(0px)" } }
    : { whileInView: { opacity: 1, y: 0, filter: "blur(0px)" }, viewport: { once: true, margin: "-50px" } };

  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset, filter: "blur(4px)" }}
      {...animationProps}
      transition={{ 
        duration: duration, 
        delay: delay, 
        ease: [0.16, 1, 0.3, 1] // Custom ease curve for "awwwards" feel
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
