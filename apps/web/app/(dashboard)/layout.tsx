'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { ReportBugButton } from '@/components/feedback/ReportBugButton';
import { Logo } from '@/components/brand/Logo';
import { TutorialLauncher } from '@/components/tutorials/TutorialLauncher';
import { TutorialRunner } from '@/components/tutorials/TutorialRunner';
import { TutorialBanner } from '@/components/tutorials/TutorialBanner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, _hydrated } = useAuthStore();
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const ready = _hydrated || timedOut;

  useEffect(() => {
    if (ready && !user) router.replace('/login');
  }, [ready, user, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <Logo variant="small" width={100} className="animate-pulse" />
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-background flex-col">
      <TutorialBanner />
      <div className="flex flex-1 min-h-0">
      <div data-tutorial="sidebar">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <div data-tutorial="header">
          <DashboardHeader />
        </div>
        <main id="main-content" data-tutorial="main-content" className="flex-1 overflow-auto p-6 lg:p-8 animate-fade-in">
          {children}
        </main>
      </div>
      </div>
      <ReportBugButton />
      <TutorialLauncher />
      <TutorialRunner />
    </div>
  );
}
