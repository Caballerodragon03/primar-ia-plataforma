'use client';

import { useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

type AuthUser = {
  id: string;
  email: string;
  role: 'VENDEDOR' | 'COMPRADOR' | 'ADMIN';
  estado: string;
  nombre: string;
  apellidos: string;
};

type RefreshResponse = {
  success: boolean;
  data?: {
    accessToken?: string;
    refreshToken?: string;
    user?: AuthUser;
  };
};

export function AuthSessionBootstrap() {
  const {
    user,
    accessToken,
    refreshToken,
    _hydrated,
    _bootstrapped,
    setAuth,
    clearAuth,
    setRestoring,
    setBootstrapped,
  } = useAuthStore();

  useEffect(() => {
    if (!_hydrated || _bootstrapped) return;

    if (user && accessToken) {
      setBootstrapped(true);
      return;
    }

    let cancelled = false;

    async function restore() {
      setRestoring(true);
      try {
        const res = await axios.post<RefreshResponse>(
          `${API_URL}/api/v1/auth/refresh`,
          { refreshToken: refreshToken ?? localStorage.getItem('refreshToken') ?? undefined },
          { withCredentials: true, timeout: 15000 },
        );
        const token = res.data.data?.accessToken;
        const newRefreshToken = res.data.data?.refreshToken;
        const refreshedUser = res.data.data?.user;
        if (!cancelled && token && refreshedUser) {
          setAuth(refreshedUser, token, newRefreshToken);
          return;
        }
        if (!cancelled) clearAuth();
      } catch {
        if (!cancelled) clearAuth();
      } finally {
        if (!cancelled) {
          setRestoring(false);
          setBootstrapped(true);
        }
      }
    }

    void restore();

    return () => {
      cancelled = true;
    };
  }, [
    _bootstrapped,
    _hydrated,
    accessToken,
    clearAuth,
    refreshToken,
    setAuth,
    setBootstrapped,
    setRestoring,
    user,
  ]);

  return null;
}
