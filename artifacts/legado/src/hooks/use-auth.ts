import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const COOKIE_NAME = "auth_token";

export type WarehouseRole = "supervisor" | "operator" | "quality" | "admin" | "readonly";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: WarehouseRole;
  status: string;
  createdAt: string;
}

function readTokenFromCookie(): string | null {
  const match = document.cookie.match(new RegExp("(?:^|; )" + COOKIE_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]!) : null;
}

export function getAuthToken(): string | null {
  return readTokenFromCookie();
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useAuth() {
  const queryClient = useQueryClient();
  // Token state only changes on login/logout — not on every auth check.
  // Separate from loading state so consumers don't re-render on every poll.
  const [token, setToken] = useState<string | null>(readTokenFromCookie());

  const { data: user, isLoading, error } = useQuery<AuthUser | null, Error>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const currentToken = getAuthToken();
      if (!currentToken) return null;

      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${currentToken}` }
      });

      if (!res.ok) {
        if (res.status === 401) {
          setToken(null);
        }
        return null;
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const login = async (email: string, password: string): Promise<AuthUser> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Error al iniciar sesión");
    }

    const result = await res.json();
    setToken(result.token);
    queryClient.setQueryData(["/api/auth/me"], result.user);
    return result.user;
  };

  const logout = () => {
    setToken(null);
    queryClient.setQueryData(["/api/auth/me"], null);
    queryClient.clear();
    // Tell the server to revoke the token and clear the cookie.
    void fetch("/api/auth/logout", { method: "POST" });
  };

  return {
    user,
    isLoading: isLoading && !!token,
    isAuthenticated: !!user,
    login,
    logout,
  };
}

export const ROLE_LABELS: Record<WarehouseRole, string> = {
  supervisor: "Supervisor",
  operator: "Operario",
  quality: "Calidad",
  admin: "Administrador",
  readonly: "Solo Lectura",
};

export const ROLE_COLORS: Record<WarehouseRole, string> = {
  supervisor: "bg-blue-100 text-blue-800",
  operator: "bg-green-100 text-green-800",
  quality: "bg-purple-100 text-purple-800",
  admin: "bg-red-100 text-red-800",
  readonly: "bg-gray-100 text-gray-700",
};
