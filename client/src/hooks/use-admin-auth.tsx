import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "@/services/api";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize admin auth state on app start
  useEffect(() => {
    const initAdminAuth = async () => {
      try {
        // Try to get current admin session
        const adminData = await api.get("/api/admin/me");
        setAdmin(adminData);
      } catch (error) {
        // No valid session
        setAdmin(null);
      }

      setIsInitialized(true);
    };

    initAdminAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Admin login sets session cookie automatically
      await api.post("/api/admin/login", { email, password });

      // Get admin data after successful login
      const adminData = await api.get("/api/admin/me");
      setAdmin(adminData);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post("/api/admin/logout", {});
    } catch (error) {
      // Ignore logout errors
    }

    setAdmin(null);
  };

  const value: AdminAuthContextType = {
    admin,
    isAuthenticated: !!admin && isInitialized,
    isLoading,
    login,
    logout
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
}