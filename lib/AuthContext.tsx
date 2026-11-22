"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ApiError, endpoints, setMemoryAccessToken, getAccessToken } from "./apiService";

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
  permissions: string[];
  permissionsLoaded: boolean;
  isAdmin: boolean;
  hasPermission: (permission: string) => boolean;
  refreshPermissions: () => Promise<void>;
  setAccessToken: (token: string | null, rememberMe?: boolean) => void;
  fetchMe: (token?: string) => Promise<User | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  // Update token
  const setAccessToken = (token: string | null, rememberMe?: boolean) => {
    setMemoryAccessToken(token, rememberMe);
    setAccessTokenState(token);
    if (!token) {
      setUser(null);
      setPermissions([]);
      setPermissionsLoaded(false);
      setIsAdmin(false);
    } else if (token !== accessToken) {
      setPermissions([]);
      setPermissionsLoaded(false);
      setIsAdmin(false);
      setIsLoading(true);
    }
  };

  const fetchMe = async (overrideToken?: string): Promise<User | null> => {
    const token = overrideToken || accessToken;
    if (!token) {
      setUser(null);
      setPermissions([]);
      setPermissionsLoaded(false);
      setIsAdmin(false);
      setIsLoading(false);
      return null;
    }

    try {
      const data = await endpoints.users.getMe();
      setUser(data);
      const effective = await endpoints.rbac.getMyEffectivePermissions();
      setPermissions(effective.permissions);
      setIsAdmin(effective.is_admin);
      setPermissionsLoaded(true);
      return data;
    } catch (err) {
      console.error("Failed to fetch /me", err);
      setUser(null);
      setMemoryAccessToken(null);
      setAccessTokenState(null);
      setPermissions([]);
      setPermissionsLoaded(false);
      setIsAdmin(false);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshPermissions = useCallback(async () => {
    if (!accessToken && !getAccessToken()) return;

    try {
      const effective = await endpoints.rbac.getMyEffectivePermissions();
      setPermissions(effective.permissions);
      setIsAdmin(effective.is_admin);
      setPermissionsLoaded(true);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setMemoryAccessToken(null);
        setAccessTokenState(null);
        setUser(null);
        setPermissions([]);
        setPermissionsLoaded(false);
        setIsAdmin(false);
      }
      console.error("Failed to refresh effective permissions", error);
    }
  }, [accessToken]);

  const userIsAdmin =
    isAdmin || user?.role?.toUpperCase() === "ADMIN";
  const hasPermission = useCallback(
    (permission: string) =>
      userIsAdmin ||
      (permissionsLoaded && permissions.includes(permission)),
    [permissions, permissionsLoaded, userIsAdmin],
  );

  const logout = async () => {
    try {
      await endpoints.auth.logout();
    } finally {
      setAccessToken(null);
    }
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
      setPermissions([]);
      setPermissionsLoaded(false);
      setIsAdmin(false);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, isInitialized]);

  // Re-read database permissions when a role changes in another session/tab.
  useEffect(() => {
    if (!accessToken || !user) return;
    const handleFocus = () => void refreshPermissions();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [accessToken, refreshPermissions, user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        permissions,
        permissionsLoaded,
        isAdmin: userIsAdmin,
        hasPermission,
        refreshPermissions,
        setAccessToken,
        fetchMe,
        logout,
      }}
    >
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
