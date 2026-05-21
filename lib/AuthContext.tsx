"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { endpoints, setMemoryAccessToken, getAccessToken } from "./apiService";

export interface User {
  id: string | number;
  email: string;
  role: string;
  two_factor_enabled: boolean;
  full_name?: string | null;
  profile_picture?: {
    id: number;
    filename: string;
    file_url?: string;
  } | null;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  setAccessToken: (token: string | null, rememberMe?: boolean) => void;
  fetchMe: (token?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();

  // Update token
  const setAccessToken = (token: string | null, rememberMe?: boolean) => {
    setMemoryAccessToken(token, rememberMe);
    setAccessTokenState(token);
  };

  const fetchMe = async (overrideToken?: string) => {
    const token = overrideToken || accessToken;
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await endpoints.users.getMe();
      setUser(data);
    } catch (err) {
      console.error("Failed to fetch /me", err);
      setUser(null);
      setMemoryAccessToken(null);
      setAccessTokenState(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await endpoints.auth.logout();
    setAccessTokenState(null);
    setMemoryAccessToken(null);
    setUser(null);
  };

  // Perform client-side token initialization once on mount
  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      setAccessTokenState(token);
    }
    setIsInitialized(true);
  }, []);

  // Fetch /me whenever accessToken changes, after initialization is complete
  useEffect(() => {
    if (!isInitialized) return;

    if (accessToken) {
      fetchMe(accessToken);
    } else {
      setUser(null);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, isInitialized]);

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, setAccessToken, fetchMe, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
