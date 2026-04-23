'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  MessageSquare,
  BarChart3,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const BUYER_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard/buyer', icon: LayoutDashboard },
  { label: 'My Orders', href: '/dashboard/buyer/orders', icon: ShoppingCart },
  { label: 'Messages', href: '/dashboard/buyer/messages', icon: MessageSquare },
  { label: 'Analytics', href: '/dashboard/buyer/analytics', icon: BarChart3 },
];

const SELLER_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard/seller', icon: LayoutDashboard },
  { label: 'My Lots', href: '/dashboard/seller/lots', icon: Package },
  { label: 'Messages', href: '/dashboard/seller/messages', icon: MessageSquare },
  { label: 'Analytics', href: '/dashboard/seller/analytics', icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  const navItems = user?.role === 'COMPRADOR' ? BUYER_NAV : SELLER_NAV;

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
    <aside className="w-[140px] min-h-screen bg-surface border-r border-border flex flex-col flex-shrink-0">
      {/* Logo + Company */}
      <div className="p-3 border-b border-border">
        <p className="text-sm font-bold text-gray-900">
          Primar<span className="text-primary">-IA</span>
        </p>
        {user && (
          <p className="text-[10px] text-secondary mt-0.5 truncate">
            {user.nombre} {user.apellidos}
          </p>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 flex flex-col gap-1" aria-label="Main navigation">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex flex-col items-center gap-1 p-2 rounded-input transition-colors duration-150 cursor-pointer',
                'min-h-[44px] justify-center text-center',
                isActive
                  ? 'bg-yellow-50 text-secondary font-semibold'
                  : 'text-gray-400 hover:bg-gray-50 hover:text-secondary',
              ].join(' ')}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={['w-5 h-5', isActive ? 'text-secondary' : 'text-gray-400'].join(' ')} />
              <span className="text-[10px] leading-tight">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-border">
        <button
          onClick={handleLogout}
          className="w-full flex flex-col items-center gap-1 p-2 rounded-input text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors duration-150 cursor-pointer min-h-[44px] justify-center"
          aria-label="Logout"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-[10px]">Logout</span>
        </button>
      </div>
    </aside>
  );
}
