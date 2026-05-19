'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { LogOut, ShieldCheck, ShieldAlert, AlertTriangle, Receipt, Bug, XCircle, Clock, Banknote } from 'lucide-react';
import { ReportBugButton } from '@/components/feedback/ReportBugButton';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { clearAuth, user, _hydrated } = useAuthStore();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const ready = _hydrated || timedOut;

  useEffect(() => {
    if (ready && (!user || user.role !== 'ADMIN')) router.replace('/login');
  }, [user, ready, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F8F6]">
        <div className="w-8 h-8 border-4 border-[#E1C44D] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') return null;

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    clearAuth();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#F8F8F6]">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E7EB] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#E1C44D]" />
          <span className="font-bold text-gray-900 text-sm">
            Primar<span className="text-[#E1C44D]">-IA</span>{' '}
            <span className="text-gray-500 font-medium">Admin Panel</span>
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </header>

      {/* Nav links */}
      <nav className="bg-white border-b border-[#E5E7EB] px-6">
        <div className="flex gap-6">
          {[
            { label: 'Panel', href: '/admin/dashboard', icon: null },
            { label: 'Usuarios', href: '/admin/users', icon: null },
            { label: 'Certificados', href: '/admin/certificates', icon: null },
            { label: 'Incidentes', href: '/admin/incidents', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
            { label: 'Riesgos', href: '/admin/risks', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
            { label: 'Cancelaciones', href: '/admin/cancellations', icon: <XCircle className="w-3.5 h-3.5" /> },
            { label: 'Refunds', href: '/admin/refunds', icon: <Banknote className="w-3.5 h-3.5" /> },
            { label: 'Facturas', href: '/admin/invoices', icon: <Receipt className="w-3.5 h-3.5" /> },
            { label: 'Incidencias técnicas', href: '/admin/bug-reports', icon: <Bug className="w-3.5 h-3.5" /> },
            { label: 'Cron status', href: '/admin/cron-status', icon: <Clock className="w-3.5 h-3.5" /> },
          ].map(({ label, href, icon }) => (
            <Link
              key={href}
              href={href}
              className="py-3 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-[#E1C44D] transition-colors flex items-center gap-1.5"
            >
              {icon}
              {label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="p-6">{children}</main>
      <ReportBugButton />
    </div>
  );
}
