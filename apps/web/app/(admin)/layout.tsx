'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { LogOut, ShieldCheck } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { clearAuth } = useAuthStore();

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
            { label: 'Dashboard', href: '/admin/dashboard' },
            { label: 'Users', href: '/admin/users' },
            { label: 'Certificates', href: '/admin/certificates' },
          ].map(({ label, href }) => (
            <a
              key={href}
              href={href}
              className="py-3 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-[#E1C44D] transition-colors"
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

      <main className="p-6">{children}</main>
    </div>
  );
}
