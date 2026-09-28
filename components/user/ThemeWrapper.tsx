"use client";

import { useEffect } from "react";

export default function ThemeWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.classList.add("landing-page");
    document.body.style.setProperty("--background", "#ffffff");
    document.body.style.setProperty("--foreground", "#222222");
    document.body.style.background = "#ffffff";
    document.body.style.color = "#222222";
    
    return () => {
      document.body.classList.remove("landing-page");
      document.body.style.removeProperty("--background");
      document.body.style.removeProperty("--foreground");
      document.body.style.background = "";
      document.body.style.color = "";
    };
  }, []);

  return <>{children}</>;
}
