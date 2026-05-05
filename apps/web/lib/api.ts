import axios from 'axios';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  withCredentials: true,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach access token from localStorage if present
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return config;
});

// Singleton refresh promise to prevent race conditions
let refreshPromise: Promise<string> | null = null;

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = axios.post(
            `${API_URL}/api/v1/auth/refresh`,
            {},
            { withCredentials: true }
          )
            .then(res => {
              const newToken = res.data?.data?.accessToken as string;
              localStorage.setItem('accessToken', newToken);
              return newToken;
            })
            .catch(err => {
              localStorage.removeItem('accessToken');
              window.location.href = '/login';
              throw err;
            })
            .finally(() => { refreshPromise = null; });
        }
        const newToken = await refreshPromise;
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        // refresh failed, already redirected
      }
    }
    return Promise.reject(error);
  }
);
