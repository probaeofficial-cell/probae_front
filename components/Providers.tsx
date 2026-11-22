"use client";

import { AuthProvider } from "@/lib/AuthContext";
import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { createAppQueryClient } from "@/lib/queryClient";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createAppQueryClient);
  return <QueryClientProvider client={queryClient}><AuthProvider>{children}</AuthProvider></QueryClientProvider>;
}
