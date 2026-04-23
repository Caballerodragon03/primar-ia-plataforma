'use client';
import { Bell, User } from 'lucide-react';
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
        <button
          className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer" title={user?.email}>
          <User className="w-4 h-4 text-gray-900" />
        </div>
      </div>
    </header>
  );
}
