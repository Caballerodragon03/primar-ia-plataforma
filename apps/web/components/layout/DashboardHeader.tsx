'use client';
import { User } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';

interface DashboardHeaderProps {
  breadcrumb?: string;
}

export function DashboardHeader({ breadcrumb }: DashboardHeaderProps) {
  const user = useAuthStore((s) => s.user);

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-sm text-secondary">Primar-IA</span>
        {breadcrumb && (
          <>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-medium text-gray-900">{breadcrumb}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Link
          href={user?.role === 'COMPRADOR' ? '/buyer/profile' : '/seller/profile'}
          className="w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
          title={user?.email}
        >
          <User className="w-4 h-4 text-gray-900" />
        </Link>
      </div>
    </header>
  );
}
