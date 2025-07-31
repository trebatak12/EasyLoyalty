class ApiService {
  private authToken: string | null = null;
  public interceptors: any;

  constructor() {
    // Setup axios interceptors for auto-refresh
    this.interceptors = {
      response: {
        use: (fulfilled: any, rejected: any) => {
          // This will be implemented by the auth provider
          return { eject: () => {} };
        },
        eject: (id: any) => {}
      }
    };
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  private async request(method: string, url: string, data?: any): Promise<any> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    // Add authorization header for customer routes (but not auth routes)
    if (this.authToken && url.startsWith("/api/") && !url.startsWith("/api/admin/") && !url.startsWith("/api/auth/")) {
      headers.Authorization = `Bearer ${this.authToken}`;
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

      if (!response.ok) {
        let errorData: any = {};

        try {
          errorData = await response.json();
        } catch (parseError) {
          console.warn("Failed to parse error response:", parseError);
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }

        console.error("API Error:", {
          url,
          method,
          status: response.status,
          statusText: response.statusText,
          errorData
        });

        const error = new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        (error as any).response = {
          status: response.status,
          statusText: response.statusText,
          data: errorData
        };
        (error as any).code = errorData.code;

        throw error;
      }

      return await response.json();
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