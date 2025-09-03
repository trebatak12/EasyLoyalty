import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { httpClient } from "@/lib/http";

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
  
  // FIX: Prevent refresh race conditions with useRef (survives re-renders)
  const isRefreshingRef = useRef(false);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);

  // Set access token in memory and API headers
  const setTokens = (newAccessToken: string) => {
    console.log("🔧 setTokens called with:", newAccessToken?.substring(0, 20) + "...");
    setAccessToken(newAccessToken);
    httpClient.setAuthToken(newAccessToken);
    console.log("✅ Tokens set - state updated, httpClient.authToken:", !!httpClient.authToken);
  };

  // Clear tokens (refresh token cleared via cookie)
  const clearTokens = () => {
    setAccessToken(null);
    httpClient.setAuthToken(null);
    setUser(null);
  };

  // Define refreshAuth function with single-flight mechanism
  const refreshAuth = async (): Promise<void> => {
    console.log('🔄 refreshAuth called, isRefreshing:', isRefreshingRef.current);
    
    // If refresh is already in progress, wait for it
    if (isRefreshingRef.current && refreshPromiseRef.current) {
      console.log('⏳ Waiting for ongoing refresh...');
      return refreshPromiseRef.current;
    }

    // Start new refresh
    isRefreshingRef.current = true;
    console.log('🔄 Starting new token refresh...');
    
    const refreshPromise = (async () => {
      try {
        // 🔒 Refresh token sent automatically via HTTP-only cookie
        const response = await httpClient.post("/api/auth/refresh", {});
        const { accessToken } = response;
        console.log('✅ Refresh response received, has accessToken:', !!accessToken);
        
        console.log('🔧 Setting new tokens via setTokens...');
        setTokens(accessToken);
        console.log('✅ Tokens set, accessToken state:', !!accessToken, 'httpClient.authToken:', !!httpClient.authToken);
        
        // Get updated user data
        const userData = await httpClient.get("/api/me");
        setUser(userData);
        console.log('✅ User data updated');
      } catch (error) {
        console.log('❌ Refresh failed:', error);
        clearTokens();
        throw error;
      } finally {
        isRefreshingRef.current = false;
        refreshPromiseRef.current = null;
        console.log('🏁 Refresh completed, isRefreshing=false');
      }
    })();
    
    refreshPromiseRef.current = refreshPromise;
    return refreshPromise;
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

  // 🔒 Auto-refresh interceptor setup (CUSTOMER ONLY) - WITH DEBUG LOGGING
  useEffect(() => {
    // Install new auth interceptors
    console.log('🔧 Setting up CUSTOMER interceptor...');
    
    const interceptorHandle = httpClient.installAuthInterceptors(
      () => accessToken,
      () => {
        console.log('🚪 Logout triggered by interceptor')
        clearTokens()
      }
    )

    console.log('✅ Customer interceptor set up')
    
    return () => {
      console.log('🗑️ Cleaning up CUSTOMER interceptor')
      interceptorHandle.eject()
    }
  }, [accessToken]);

  const login = async (email: string, password: string) => {
    if (loginInProgress) {
      return; // Prevent double submissions
    }
    
    setLoginInProgress(true);
    setIsLoading(true);
    
    try {
      const response = await httpClient.post("/api/auth/login", { email, password });
      const { user: userData, accessToken } = response;
      // 🔒 Refresh token automatically set as HTTP-only cookie
      
      console.log("Login successful, setting tokens and user:", { accessToken: accessToken?.substring(0, 20) + "...", userData });
      setTokens(accessToken);
      setUser(userData);
      
      // Ensure token is properly set in HTTP client before proceeding
      console.log("Verifying token is set in HTTP client:", !!httpClient.authToken);
      await new Promise(resolve => setTimeout(resolve, 150));
      
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
      const response = await httpClient.post("/api/auth/signup", { email, name, password });
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
      const response = await httpClient.post("/api/auth/google", { idToken });
      const { user: userData, accessToken } = response;
      
      setTokens(accessToken);
      setUser(userData);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // FIX: Always call logout API (even without access token) to clear refresh cookie
  const logout = async () => {
    try {
      // 🔒 Server will handle refresh token cookie clearing
      // Call logout API even if access token is missing to ensure refresh cookie is cleared
      await httpClient.post("/api/auth/logout");
    } catch (error) {
      // Ignore logout errors - clear local state anyway
      console.warn("Logout API call failed:", error);
    }
    
    clearTokens();
  };

  const logoutEverywhere = async () => {
    try {
      await httpClient.post("/api/auth/logout-everywhere");
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