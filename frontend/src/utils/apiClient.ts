import axios from 'axios';
import { tokenManager } from './tokenManager';
import { API_BASE_URL } from '../app/api';
import { toast } from 'sonner';

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
});

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
};

axiosClient.interceptors.request.use(
  async (config) => {
    const token = await tokenManager.getAccessToken();
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token: string) => {
            originalRequest.headers['x-auth-token'] = token;
            resolve(axiosClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await tokenManager.getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const refreshRes = await axios.post(`${API_BASE_URL}/api/auth/refresh`, { refreshToken });
        const { token, refreshToken: newRefreshToken } = refreshRes.data;

        await tokenManager.setTokens(token, newRefreshToken);
        isRefreshing = false;
        onRefreshed(token);

        originalRequest.headers['x-auth-token'] = token;
        return await axiosClient(originalRequest);
      } catch (refreshErr) {
        isRefreshing = false;
        refreshSubscribers = [];
        
        await tokenManager.clearTokens();
        toast.error('Session expired. Please log in again.');
        
        // Emit a custom event so the App/Router can handle redirection
        window.dispatchEvent(new Event('auth-expired'));
        
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Enhanced fetch wrapper maintaining backwards compatibility.
 */
export const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
  try {
    const isAbsolute = url.startsWith('http');
    const finalUrl = isAbsolute ? url : `${API_BASE_URL}${url}`;
    
    let parsedData = options.body;
    if (typeof options.body === 'string') {
      try { parsedData = JSON.parse(options.body); } catch (e) {}
    }

    let plainHeaders: Record<string, string> = {};
    if (options.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          plainHeaders[key] = value;
        });
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([key, value]) => {
          plainHeaders[key] = value;
        });
      } else {
        plainHeaders = { ...(options.headers as Record<string, string>) };
      }
    }

    const response = await axiosClient({
      url: finalUrl,
      method: options.method || 'GET',
      headers: plainHeaders,
      data: parsedData,
    });

    return new Response(JSON.stringify(response.data), {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers as any),
    });
  } catch (error: any) {
    if (error.response) {
      return new Response(JSON.stringify(error.response.data), {
        status: error.response.status,
        statusText: error.response.statusText,
        headers: new Headers(error.response.headers as any),
      });
    }
    // Also implement basic generic network retry for 502/NetworkError (like original fetchWithRetry)
    if (error.message === 'Network Error') {
      await new Promise(res => setTimeout(res, 1500));
      // Basic 1-time retry
      try {
        let retryHeaders: Record<string, string> = {};
        if (options.headers) {
          if (options.headers instanceof Headers) {
            options.headers.forEach((value, key) => { retryHeaders[key] = value; });
          } else if (Array.isArray(options.headers)) {
            options.headers.forEach(([key, value]) => { retryHeaders[key] = value; });
          } else {
            retryHeaders = { ...(options.headers as Record<string, string>) };
          }
        }
        
        const retryRes = await axiosClient({
          url: url.startsWith('http') ? url : `${API_BASE_URL}${url}`,
          method: options.method || 'GET',
          headers: retryHeaders,
          data: typeof options.body === 'string' ? JSON.parse(options.body) : options.body,
        });
        return new Response(JSON.stringify(retryRes.data), {
          status: retryRes.status,
          statusText: retryRes.statusText,
          headers: new Headers(retryRes.headers as any),
        });
      } catch (retryErr: any) {
        if (retryErr.response) {
           return new Response(JSON.stringify(retryErr.response.data), {
             status: retryErr.response.status,
             statusText: retryErr.response.statusText,
             headers: new Headers(retryErr.response.headers as any),
           });
        }
      }
    }
    throw error;
  }
};
