import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "@/services/api";

interface User {
  id: string;
  email: string;
  name: string;
  profileImageUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, name: string, password: string) => Promise<void>;
  googleAuth: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  logoutEverywhere: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loginInProgress, setLoginInProgress] = useState(false);
  
  // 🔒 SECURITY: Access token stored ONLY in memory (React state)
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Set access token in memory and API headers
  const setTokens = (newAccessToken: string) => {
    console.log("Setting new access token:", newAccessToken?.substring(0, 20) + "...");
    setAccessToken(newAccessToken);
    api.setAuthToken(newAccessToken);
    console.log("Token set in API service, current token:", api.authToken?.substring(0, 20) + "...");
  };

  // Clear tokens (refresh token cleared via cookie)
  const clearTokens = () => {
    setAccessToken(null);
    api.setAuthToken(null);
    setUser(null);
  };

  // Define refreshAuth function
  const refreshAuth = async () => {
    try {
      // 🔒 Refresh token sent automatically via HTTP-only cookie
      const response = await api.post("/api/auth/refresh", {});
      const { accessToken } = response;
      
      setTokens(accessToken);
      
      // Get updated user data
      const userData = await api.get("/api/me");
      setUser(userData);
    } catch (error) {
      clearTokens();
      throw error;
    }
  };

  // 🔒 Initialize auth state - try refresh first (secure)
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      
      try {
        // Try to refresh token from HTTP-only cookie
        await refreshAuth();
      } catch (refreshError) {
        // No valid refresh token - user needs to login
        clearTokens();
      }
      
      setIsInitialized(true);
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // 🔒 Auto-refresh interceptor setup (CUSTOMER ONLY)
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response: any) => response,
      async (error: any) => {
        const originalRequest = error.config;
        
        // Skip refresh attempts for auth endpoints and ALL admin endpoints
        if (originalRequest?.url?.includes('/api/auth/') || 
            originalRequest?.url?.includes('/api/admin/')) {
          return Promise.reject(error);
        }
        
        // Only handle customer 401 errors with customer refresh token
        if (error.response?.status === 401 && 
            !originalRequest?._retry && 
            accessToken && 
            originalRequest?.url?.startsWith('/api/me')) {
          originalRequest._retry = true;
          
          try {
            console.log("Customer token expired, refreshing...");
            await refreshAuth();
            console.log("Customer token refreshed, retrying request to:", originalRequest.url);
            
            // Retry original request with new token - API service will add auth header automatically
            return await api.request(originalRequest.method || 'GET', originalRequest.url || '', originalRequest.data);
          } catch (refreshError) {
            console.log("Customer refresh failed, clearing tokens");
            clearTokens();
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );

    return () => {
      if (interceptor && typeof interceptor.eject === 'function') {
        interceptor.eject();
      }
    };
  }, [accessToken]);

  const login = async (email: string, password: string) => {
    if (loginInProgress) {
      return; // Prevent double submissions
    }
    
    setLoginInProgress(true);
    setIsLoading(true);
    
    try {
      const response = await api.post("/api/auth/login", { email, password });
      const { user: userData, accessToken } = response;
      // 🔒 Refresh token automatically set as HTTP-only cookie
      
      console.log("Login successful, setting tokens and user:", { accessToken: accessToken?.substring(0, 20) + "...", userData });
      setTokens(accessToken);
      setUser(userData);
      
    } catch (error: any) {
      console.error("Login failed:", {
        message: error?.message || "Unknown error",
        status: error?.response?.status || "No status",
        data: error?.response?.data || "No response data",
        code: error?.code || "No error code",
        fullError: error
      });
      
      // Create a proper error message for the UI
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          "Chyba při přihlašování";
      
      // Re-throw with better error structure
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
      setLoginInProgress(false);
    }
  };

  const signup = async (email: string, name: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post("/api/auth/signup", { email, name, password });
      const { user: userData, accessToken } = response;
      // 🔒 Refresh token automatically set as HTTP-only cookie
      
      setTokens(accessToken);
      setUser(userData);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const googleAuth = async (idToken: string) => {
    setIsLoading(true);
    try {
      const response = await api.post("/api/auth/google", { idToken });
      const { user: userData, accessToken } = response;
      
      setTokens(accessToken);
      setUser(userData);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // 🔒 Server will handle refresh token cookie clearing
      // Make sure we have the token available for the logout call
      if (accessToken) {
        await api.post("/api/auth/logout");
      }
    } catch (error) {
      // Ignore logout errors - clear local state anyway
      console.warn("Logout API call failed:", error);
    }
    
    clearTokens();
  };

  const logoutEverywhere = async () => {
    try {
      await api.post("/api/auth/logout-everywhere");
      clearTokens();
    } catch (error) {
      console.error("Logout everywhere failed:", error);
      clearTokens();
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading: isLoading || !isInitialized || loginInProgress,
    login,
    signup,
    googleAuth,
    logout,
    logoutEverywhere,
    refreshAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}