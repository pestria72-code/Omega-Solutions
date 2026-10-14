import * as React from "react";
import type { AuthenticatedUser } from "@/lib/api-types";
import { getAccessToken, setTokens, clearTokens } from "@/lib/api-client";
import { getCurrentUser, login, register } from "@/lib/auth-api";

interface AuthContextValue {
  user: AuthenticatedUser | null;
  loading: boolean;
  error: string | null;
  loginEmail: (email: string, password: string) => Promise<void>;
  registerUser: (email: string, password: string, fullName: string, companyName: string, phone?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    getCurrentUser(token)
      .then((u) => setUser(u))
      .catch(() => {
        clearTokens();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const loginEmail = React.useCallback(async (email: string, password: string) => {
    setError(null);
    const result = await login(email, password);
    setTokens(result.accessToken, result.refreshToken);
    const u = await getCurrentUser(result.accessToken);
    setUser(u);
  }, []);

  const registerUser = React.useCallback(async (email: string, password: string, fullName: string, companyName: string, phone?: string) => {
    setError(null);
    await register(email, password, fullName, companyName, phone);
  }, []);

  const logout = React.useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  const refreshUser = React.useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    const u = await getCurrentUser(token);
    setUser(u);
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    error,
    loginEmail,
    registerUser,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

