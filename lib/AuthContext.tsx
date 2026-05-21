"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { endpoints, setMemoryAccessToken } from "./apiService";

export interface User {
  id: string | number;
  email: string;
  role: string;
  two_factor_enabled: boolean;
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
  setAccessToken: (token: string | null) => void;
  fetchMe: (token?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Update token (which is already set in memory by apiService)
  const setAccessToken = (token: string | null) => {
    setMemoryAccessToken(token);
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

  // Run fetchMe on initial load if we had a way to persist token.
  // But we store token purely in memory per rules, so on hard reload, 
  // they will lose the access_token and must rely on backend refresh token logic 
  // (which usually requires a silent refresh endpoint, but the prompt just says 
  // "The backend returns an access_token in the JSON body. You must store this in memory... 
  // Upon successful login or app reload, fetch this endpoint using the Bearer token.").
  // Wait, if it's stored in memory, app reload clears it. We'll need a way to refresh it.
  // Assuming there's a silent refresh endpoint or we just let them log out on hard reload for now, 
  // because the prompt doesn't specify a `/refresh` endpoint.
  useEffect(() => {
    // If we have a token (e.g. from a recent login), fetch /me
    if (accessToken) {
      fetchMe(accessToken);
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

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
