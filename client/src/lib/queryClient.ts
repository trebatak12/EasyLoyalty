import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { api } from "@/services/api";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Get auth headers with JWT token
function getAuthHeaders(): Record<string, string> {
  const accessToken = localStorage.getItem("accessToken");
  const headers: Record<string, string> = {};

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers = {
    ...getAuthHeaders(),
    ...(data ? { "Content-Type": "application/json" } : {}),
  };

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      headers: getAuthHeaders(),
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const url = queryKey[0] as string
        console.log("🔍 TanStack Query fetching:", url)
        try {
          const response = await api.get(url)
          console.log("✅ TanStack Query success:", url)
          return response
        } catch (error: any) {
          console.error("❌ TanStack Query failed:", url, "status:", error?.response?.status)
          throw error
        }
      },
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
    mutations: {
      retry: false,
      mutationFn: async () => {
          const response = await fetch("/api/admin/logout", { 
            method: "POST",
            credentials: "include"
          });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          return response;
        },
    },
  },
});