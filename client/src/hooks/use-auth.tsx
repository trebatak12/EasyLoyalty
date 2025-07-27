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
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Get tokens from localStorage
  const getTokens = () => {
    return {
      accessToken: localStorage.getItem("accessToken"),
      refreshToken: localStorage.getItem("refreshToken")
    };
  };

  // Set tokens in localStorage and api headers
  const setTokens = (accessToken: string, refreshToken: string) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    api.setAuthToken(accessToken);
  };

  // Clear tokens
  const clearTokens = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    api.setAuthToken(null);
    setUser(null);
  };

  // Initialize auth state on app start
  useEffect(() => {
    const initAuth = async () => {
      const { accessToken, refreshToken } = getTokens();
      
      if (accessToken && refreshToken) {
        try {
          api.setAuthToken(accessToken);
          const userData = await api.get("/api/me");
          setUser(userData);
        } catch (error) {
          // Try to refresh token
          try {
            await refreshAuth();
          } catch (refreshError) {
            clearTokens();
          }
        }
      }
      
      setIsInitialized(true);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post("/api/auth/login", { email, password });
      const { user: userData, accessToken, refreshToken } = response;
      
      setTokens(accessToken, refreshToken);
      setUser(userData);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, name: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post("/api/auth/signup", { email, name, password });
      const { user: userData, accessToken, refreshToken } = response;
      
      setTokens(accessToken, refreshToken);
      setUser(userData);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAuth = async () => {
    const { refreshToken } = getTokens();
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const response = await api.post("/api/auth/refresh", { refreshToken });
      const { accessToken, refreshToken: newRefreshToken } = response;
      
      setTokens(accessToken, newRefreshToken);
      
      // Get updated user data
      const userData = await api.get("/api/me");
      setUser(userData);
    } catch (error) {
      clearTokens();
      throw error;
    }
  };

  const googleAuth = async (idToken: string) => {
    setIsLoading(true);
    try {
      const response = await api.post("/api/auth/google", { idToken });
      const { user: userData, accessToken, refreshToken } = response;
      
      setTokens(accessToken, refreshToken);
      setUser(userData);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    const { refreshToken } = getTokens();
    
    if (refreshToken) {
      try {
        await api.post("/api/auth/logout", { refreshToken });
      } catch (error) {
        // Ignore logout errors
      }
    }
    
    clearTokens();
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user && isInitialized,
    isLoading,
    login,
    signup,
    googleAuth,
    logout,
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
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
