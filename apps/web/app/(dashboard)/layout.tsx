'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardHeader } from '@/components/layout/DashboardHeader';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, _hydrated } = useAuthStore();
  const router = useRouter();
  const isAuthenticated = user !== null;

  useEffect(() => {
    if (_hydrated && !isAuthenticated) router.replace('/login');
  }, [isAuthenticated, _hydrated, router]);

  if (!_hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-[#E1C44D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

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
