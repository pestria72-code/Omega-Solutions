import * as React from "react";
import type { AuthenticatedUser } from "@/lib/api-types";
import { getAccessToken, setTokens, clearTokens } from "@/lib/api-client";
import { getCurrentUser, login, exchangeNeonToken } from "@/lib/auth-api";
import { signInWithNeon } from "@/lib/neon-auth-api";

interface AuthContextValue {
  user: AuthenticatedUser | null;
  loading: boolean;
  error: string | null;
  loginEmail: (email: string, password: string) => Promise<void>;
  registerUser: (email: string, password: string, fullName: string, phone?: string, companyName?: string) => Promise<void>;
  finishNeonRegistration: (token: string, fullName: string, phone?: string, companyName?: string) => Promise<void>;
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

  const applyOmegaSession = React.useCallback(async (result: Awaited<ReturnType<typeof login>>) => {
    setTokens(result.accessToken, result.refreshToken);
    try {
      const current = await getCurrentUser(result.accessToken);
      setUser(current);
    } catch (err) {
      clearTokens();
      setUser(null);
      throw err;
    }
  }, []);

  const loginEmail = React.useCallback(async (email: string, password: string) => {
    setError(null);
    let neonError: unknown;
    if (import.meta.env.VITE_NEON_AUTH_URL) {
      try {
        const token = await signInWithNeon(email, password);
        const result = await exchangeNeonToken(token, email, undefined, undefined);
        await applyOmegaSession(result);
        return;
      } catch (err) {
        neonError = err;
      }
    }
    // Keep existing Omega accounts usable while the Neon cutover is validated.
    try {
      const result = await login(email, password);
      await applyOmegaSession(result);
    } catch (legacyError) {
      if (neonError instanceof Error) throw neonError;
      throw legacyError;
    }
  }, [applyOmegaSession]);

  const registerUser = React.useCallback(async (email: string, password: string, fullName: string, phone?: string, companyName?: string) => {
    setError(null);
    // New accounts must verify their email with Neon before Omega creates company membership.
    const { registerWithNeon } = await import("@/lib/neon-auth-api");
    await registerWithNeon({ email, password, fullName });
    void phone;
    void companyName;
  }, []);

  const finishNeonRegistration = React.useCallback(async (token: string, fullName: string, phone?: string, companyName?: string) => {
    setError(null);
    const result = await exchangeNeonToken(token, fullName, phone, companyName);
    await applyOmegaSession(result);
  }, [applyOmegaSession]);

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
    finishNeonRegistration,
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
