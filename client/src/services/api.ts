class ApiService {
  private authToken: string | null = null;
  public interceptors: any;
  private responseInterceptors: Array<{id: number, fulfilled: any, rejected: any}> = [];
  private nextInterceptorId = 0;

  constructor() {
    // Setup proper interceptors system
    this.interceptors = {
      response: {
        use: (fulfilled: any, rejected: any) => {
          const id = this.nextInterceptorId++;
          this.responseInterceptors.push({ id, fulfilled, rejected });
          return { eject: () => this.eject(id) };
        },
        eject: (interceptor: any) => {
          if (interceptor && typeof interceptor.eject === 'function') {
            interceptor.eject();
          }
        }
      }
    };
  }

  private eject(id: number) {
    this.responseInterceptors = this.responseInterceptors.filter(i => i.id !== id);
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  async request(method: string, url: string, data?: any): Promise<any> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    // Add authorization header for customer routes and logout endpoints
    if (this.authToken && url.startsWith("/api/") && !url.startsWith("/api/admin/")) {
      // Include auth header for all customer routes and logout/logout-everywhere endpoints
      if (!url.startsWith("/api/auth/") || url.includes("/logout")) {
        headers.Authorization = `Bearer ${this.authToken}`;
        console.log("Adding auth header to:", url, "with token:", this.authToken?.substring(0, 20) + "...");
      }
    }

    const config: RequestInit = {
      method,
      headers,
      credentials: "include" // Important for admin session cookies
    };

    if (data && (method === "POST" || method === "PUT" || method === "PATCH")) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);
      let result: any;

      if (!response.ok) {
        let errorData: any = {};

        try {
          errorData = await response.json();
        } catch (parseError) {
          console.warn("Failed to parse error response:", parseError);
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }

        // Don't log expected 401 errors during initialization
        const isExpected401 = response.status === 401 && (
          url === "/api/auth/refresh" || url === "/api/admin/me"
        );
        
        if (!isExpected401) {
          console.error("API Error:", {
            url,
            method,
            status: response.status,
            statusText: response.statusText,
            errorData
          });
        }

        const error = new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        (error as any).response = {
          status: response.status,
          statusText: response.statusText,
          data: errorData
        };
        (error as any).code = errorData.code;
        (error as any).config = { url, method, headers, data };

        // Run through error interceptors
        for (const interceptor of this.responseInterceptors) {
          if (interceptor.rejected) {
            try {
              result = await interceptor.rejected(error);
              break; // If interceptor handles it, break
            } catch (interceptorError) {
              // If interceptor fails, continue to next or throw original
              if (interceptorError === error) {
                continue; // Interceptor re-threw same error, try next
              }
              throw interceptorError; // Interceptor threw different error
            }
          }
        }

        if (!result) throw error; // No interceptor handled it
        return result;
      }

      // Handle empty responses (204 No Content)
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        result = null;
      } else {
        try {
          result = await response.json();
        } catch (parseError) {
          // If JSON parsing fails but response was successful, return null
          console.warn("Failed to parse JSON response, returning null:", parseError);
          result = null;
        }
      }

      // Run through success interceptors
      for (const interceptor of this.responseInterceptors) {
        if (interceptor.fulfilled) {
          result = await interceptor.fulfilled(result);
        }
      }

      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Network error occurred");
    }
  }

  async get(url: string): Promise<any> {
    return this.request("GET", url);
  }

  async post(url: string, data?: any): Promise<any> {
    return this.request("POST", url, data);
  }

  async put(url: string, data?: any): Promise<any> {
    return this.request("PUT", url, data);
  }

  async patch(url: string, data?: any): Promise<any> {
    return this.request("PATCH", url, data);
  }

  async delete(url: string): Promise<any> {
    return this.request("DELETE", url);
  }
}

export const api = new ApiService();