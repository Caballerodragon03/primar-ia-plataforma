import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';
import { maybeShortCircuit } from '@/lib/tutorialInterceptor';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  withCredentials: true,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token =
      useAuthStore.getState().accessToken ??
      localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    // Phase 14M v3 — Tutorial "modo prueba": si hay un flow activo,
    // intercepta mutaciones y GETs simulados antes de pegarle al
    // backend. Marcamos en la config para cortar en el response stage.
    // Phase 14M v3.7 — try/catch defensivo: si el store de tutoriales
    // todavía no se ha hidratado (TDZ en producción), el interceptor
    // simplemente deja pasar la petición al backend en vez de crashear.
    try {
      const mock = maybeShortCircuit(config);
      if (mock) {
        config.adapter = async () => ({
          data: mock.mockedData,
          status: 200,
          statusText: 'OK (tutorial-mode)',
          headers: {},
          config,
          request: null,
        });
      }
    } catch {
      // ignore — sin tutorial activo, pasa al backend.
    }
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;
let isRedirecting = false;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && !isRedirecting) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${API_URL}/api/v1/auth/refresh`, {}, { withCredentials: true })
            .then((res) => {
              const newToken = res.data?.data?.accessToken as string;
              localStorage.setItem('accessToken', newToken);
              const currentUser = useAuthStore.getState().user;
              if (currentUser) {
                useAuthStore.getState().setAuth(currentUser, newToken);
              }
              return newToken;
            })
            .catch((err) => {
              if (!isRedirecting) {
                isRedirecting = true;
                useAuthStore.getState().clearAuth();
                window.location.replace('/login');
              }
              throw err;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        const newToken = await refreshPromise;
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);
