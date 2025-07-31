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
    if (isLoading) {
      return; // Prevent double submissions
    }
    
    setIsLoading(true);
    try {
      console.log("Admin login API call starting");
      const response = await api.post("/api/admin/login", { email, password });
      const { admin: adminData } = response;
      
      console.log("Admin login successful, setting admin data:", adminData);
      setAdmin(adminData);
    } catch (error: any) {
      console.error("Admin login failed:", {
        message: error?.message || "Unknown error",
        status: error?.response?.status || "No status",
        data: error?.response?.data || "No response data"
      });
      
      // Create a proper error message for the UI
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          "Chyba při přihlašování administrátora";
      
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await api.post("/api/admin/logout");
      setAdmin(null);
    } catch (error) {
      console.error("Logout error:", error);
      // Even if logout fails, clear the admin state
      setAdmin(null);
    } finally {
      setIsLoading(false);
    }
  };

  const value: AdminAuthContextType = {
    admin,
    isAuthenticated: !!admin,
    isLoading: isLoading || !isInitialized,
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
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}