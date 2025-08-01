import React, { createContext, useContext, useState, useEffect, useRef } from "react";
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
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Setup automatic token refresh
  const setupTokenRefresh = (token: string) => {
    // Clear existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    // Decode token to get expiration
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiresAt = payload.exp * 1000;
      const now = Date.now();
      const timeUntilRefresh = expiresAt - now - 60000; // Refresh 1 minute before expiry

      if (timeUntilRefresh > 0) {
        refreshTimeoutRef.current = setTimeout(async () => {
          try {
            console.log("Auto-refreshing admin token");
            const response = await api.post("/api/admin/refresh");
            setAccessToken(response.accessToken);
            setupTokenRefresh(response.accessToken);
          } catch (error) {
            console.error("Auto-refresh failed:", error);
            // Clear state on refresh failure
            setAdmin(null);
            setAccessToken(null);
          }
        }, timeUntilRefresh);
      }
    } catch (error) {
      console.error("Failed to decode token for refresh setup:", error);
    }
  };

  // Initialize admin auth state on app start - ONLY for admin routes
  useEffect(() => {
    const initAdminAuth = async () => {
      // Only initialize admin auth on admin routes to prevent unnecessary API calls
      if (!window.location.pathname.startsWith('/admin')) {
        setIsInitialized(true);
        return;
      }
      
      try {
        // Try to refresh token first (if cookie exists)
        const refreshResponse = await api.post("/api/admin/refresh");
        if (refreshResponse?.accessToken) {
          setAccessToken(refreshResponse.accessToken);
          setupTokenRefresh(refreshResponse.accessToken);

          // Get admin data (token is now set globally via setAuthToken)
          const adminData = await api.get("/api/admin/me");
          if (adminData) {
            setAdmin(adminData);
          }
        }
      } catch (error) {
        // No valid refresh token or session - this is expected on first load
        console.log("No valid admin session found, user needs to login");
        setAdmin(null);
        setAccessToken(null);
      } finally {
        setIsInitialized(true);
      }
    };

    initAdminAuth();

    // Cleanup timeout on unmount
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Update API instance when token changes - use setAuthToken method
  useEffect(() => {
    if (accessToken) {
      console.log("Setting admin auth token:", accessToken.substring(0, 20) + "...");
      api.setAuthToken(accessToken);
    } else {
      api.setAuthToken(null);
    }
  }, [accessToken]);

  const login = async (email: string, password: string) => {
    if (isLoading) {
      return; // Prevent double submissions
    }

    setIsLoading(true);
    try {
      console.log("Admin login API call starting");
      const response = await api.post("/api/admin/login", { email, password });
      const { accessToken: newAccessToken, admin: adminData } = response;

      console.log("Admin login successful, setting admin data:", adminData);
      setAccessToken(newAccessToken);
      setAdmin(adminData);
      setupTokenRefresh(newAccessToken);
      
      // Ensure token is set immediately in API service
      api.setAuthToken(newAccessToken);
      console.log("Admin token set in API service:", newAccessToken.substring(0, 20) + "...");
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
    console.log("Admin logout initiated");
    
    // Clear refresh timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    
    // Always clear state first to prevent UI issues
    setAdmin(null);
    setAccessToken(null);
    
    try {
      // Try to call logout API - server will handle invalid sessions gracefully
      await api.post("/api/admin/logout");
      console.log("Admin logout API call successful");
    } catch (error) {
      // Don't log 401 errors as they're expected when already logged out
      if (error?.response?.status !== 401) {
        console.error("Logout error:", error);
      } else {
        console.log("Admin logout - session already expired (401), but state cleared successfully");
      }
    }
  };

  const value: AdminAuthContextType = {
    admin,
    isAuthenticated: !!admin && !!accessToken,
    isLoading: isLoading || !isInitialized,
    login,
    logout
  };

  // Always render children, even if not initialized yet
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