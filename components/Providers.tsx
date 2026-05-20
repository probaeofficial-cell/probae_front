"use client";

import { AuthProvider } from "@/lib/AuthContext";
import React from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
