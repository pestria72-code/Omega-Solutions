import type { AuthenticatedUser } from "./api-types";

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    userId: string;
    email: string;
    fullName: string;
    companyId: string | null;
    branchId: string | null;
    role: string;
  };
}

export interface RegisterResponse {
  userId: string;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api"}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Login failed" }));
    throw new Error(err.message || "Invalid credentials");
  }
  return res.json();
}

export async function register(email: string, password: string, fullName: string, phone?: string): Promise<RegisterResponse> {
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api"}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, fullName, phone }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Registration failed" }));
    throw new Error(err.message || "Registration failed");
  }
  return res.json();
}

export async function getCurrentUser(token: string): Promise<AuthenticatedUser> {
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api"}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch user profile");
  }
  return res.json();
}
