import axios, { AxiosInstance, AxiosError } from 'axios';

class ApiService {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: '',
      withCredentials: true, // Important for cookies
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  get interceptors() {
    return this.instance.interceptors;
  }

  setAuthToken(token: string | null) {
    if (token) {
      this.instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log("Setting auth token in axios:", token.substring(0, 20) + "...");
    } else {
      delete this.instance.defaults.headers.common['Authorization'];
      console.log("Clearing auth token from axios");
    }
  }

  get authToken() {
    const authHeader = this.instance.defaults.headers.common['Authorization'] as string;
    return authHeader ? authHeader.replace('Bearer ', '') : null;
  }

  async request(method: string, url: string, data?: any): Promise<any> {
    const config: any = {
      method: method.toLowerCase(),
      url,
    };

    if (data && ['post', 'put', 'patch'].includes(config.method)) {
      config.data = data;
    }

    console.log("Making axios request:", config.method.toUpperCase(), url, "with auth:", !!this.authToken);
    
    try {
      const response = await this.instance(config);
      return response.data;
    } catch (error) {
      console.log("Axios request failed for:", url, error);
      throw error;
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