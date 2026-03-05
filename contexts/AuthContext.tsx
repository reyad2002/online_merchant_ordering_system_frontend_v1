"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import * as authApi from "@/lib/api/auth";
import { getToken, setToken, removeToken } from "@/lib/tokenCookie";
import type { User } from "@/lib/types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const refetchUser = useCallback(async () => {
    const token = typeof window !== "undefined" ? getToken() : undefined;
    if (!token) {
      setState({ user: null, isLoading: false, isAuthenticated: false });
      return;
    }
    try {
      const user = await authApi.getMe();
      setState({ user, isLoading: false, isAuthenticated: true });
    } catch {
      removeToken();
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    refetchUser();
  }, [refetchUser]);

  const login = useCallback(
    async (name: string, password: string) => {
      const res = await authApi.login(name, password);
      setToken(res.access_token);
      const userWithNames = {
        ...res.user,
        merchant_name: res.merchant_name,
        branch_name: res.branch_name,
      };
      setState({
        user: userWithNames,
        isLoading: false,
        isAuthenticated: true,
      });
      // انتظر تحديث الـ state قبل الانتقال عشان الـ dashboard يلاقي الـ user
      queueMicrotask(() => router.push("/dashboard"));
    },
    [router]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      removeToken();
      setState({ user: null, isLoading: false, isAuthenticated: false });
      router.push("/dashboard/login");
    }
  }, [router]);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    refetchUser,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
