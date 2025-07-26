class ApiService {
  private authToken: string | null = null;

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  private async request(method: string, url: string, data?: any): Promise<any> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    // Add authorization header for customer routes
    if (this.authToken && url.startsWith("/api/") && !url.startsWith("/api/admin/")) {
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
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
        return null;
      }

      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        return await response.json();
      }
      
      return await response.text();
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
