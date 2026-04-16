import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import {
  authenticateAdmin,
  getCurrentAdmin,
  isAdminAuthenticated,
  logoutAdmin,
  refreshAuthentication,
  type AuthResponse,
  type LoginCredentials,
  type User,
} from "@/services/authService";

interface AdminAuthContextType {
  admin: User | null;
  isAuthenticated: boolean;
  login: (creds: LoginCredentials) => Promise<AuthResponse>;
  logout: () => void;
  refresh: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  // Hydrate synchronously from localStorage to avoid login-dialog flash on mount.
  const [admin, setAdmin] = useState<User | null>(() =>
    isAdminAuthenticated() ? getCurrentAdmin() : null
  );

  const login = useCallback(async (creds: LoginCredentials): Promise<AuthResponse> => {
    const result = await authenticateAdmin(creds);
    if (result.success && result.user) {
      setAdmin(result.user);
    }
    return result;
  }, []);

  const logout = useCallback(() => {
    logoutAdmin();
    setAdmin(null);
  }, []);

  const refresh = useCallback(() => {
    refreshAuthentication();
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{ admin, isAuthenticated: admin !== null, login, logout, refresh }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return ctx;
}
