'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardHeader } from '@/components/layout/DashboardHeader';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, _hydrated, setAuth, clearAuth } = useAuthStore();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!_hydrated) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    // Proactive token refresh on mount to ensure a fresh access token
    api.post('/auth/refresh')
      .then((res) => {
        const newToken = res.data?.data?.accessToken;
        if (newToken) {
          setAuth(user, newToken);
        }
        setReady(true);
      })
      .catch(() => {
        clearAuth();
        router.replace('/login');
      });
  }, [_hydrated, user, router, setAuth, clearAuth]);

  if (!_hydrated || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-[#E1C44D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
