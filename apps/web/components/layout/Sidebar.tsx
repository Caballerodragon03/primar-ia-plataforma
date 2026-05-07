'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  MessageSquare,
  BarChart3,
  LogOut,
  Zap,
  UserCircle,
  CreditCard,
  Sprout,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

interface NotificationSummary {
  pendingOffers: number;
  pendingMatches: number;
  unreadMessages: number;
  pendingContracts: number;
  pendingPhotos: number;
  pendingDeliveries: number;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badgeKeys?: Array<keyof NotificationSummary>;
}

const BUYER_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/buyer', icon: LayoutDashboard },
  {
    label: 'My Orders',
    href: '/buyer/orders',
    icon: ShoppingCart,
    badgeKeys: ['pendingOffers', 'pendingContracts', 'pendingDeliveries'],
  },
  {
    label: 'Messages',
    href: '/buyer/messages',
    icon: MessageSquare,
    badgeKeys: ['unreadMessages'],
  },
  { label: 'Analytics', href: '/buyer/analytics', icon: BarChart3 },
  { label: 'Suscripción', href: '/buyer/subscription', icon: CreditCard },
  { label: 'Profile', href: '/buyer/profile', icon: UserCircle },
];

const SELLER_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/seller', icon: LayoutDashboard },
  {
    label: 'My Lots',
    href: '/seller/lots',
    icon: Package,
    badgeKeys: ['pendingPhotos'],
  },
  {
    label: 'Matches',
    href: '/seller/matches',
    icon: Zap,
    badgeKeys: ['pendingMatches', 'pendingContracts'],
  },
  {
    label: 'Messages',
    href: '/seller/messages',
    icon: MessageSquare,
    badgeKeys: ['unreadMessages'],
  },
  { label: 'Analytics', href: '/seller/analytics', icon: BarChart3 },
  { label: 'Cosecha', href: '/seller/harvest-estimation', icon: Sprout },
  { label: 'Suscripción', href: '/seller/subscription', icon: CreditCard },
  { label: 'Profile', href: '/seller/profile', icon: UserCircle },
];

const POLL_INTERVAL_MS = 30_000;

const EMPTY_NOTIFICATIONS: NotificationSummary = {
  pendingOffers: 0,
  pendingMatches: 0,
  unreadMessages: 0,
  pendingContracts: 0,
  pendingPhotos: 0,
  pendingDeliveries: 0,
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  const [notifications, setNotifications] =
    useState<NotificationSummary>(EMPTY_NOTIFICATIONS);

  const [planInfo, setPlanInfo] = useState<{ plan: string; badge: string | null } | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: NotificationSummary }>(
        '/matching/notifications/summary'
      );
      if (res.data?.data) {
        setNotifications(res.data.data);
      }
    } catch {
      // silently ignore — notifications are non-critical
    }
  }, []);

  const fetchPlanInfo = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: { plan: string; badge?: string | null } }>(
        '/subscriptions/current'
      );
      if (res.data?.data) {
        setPlanInfo({
          plan: res.data.data.plan,
          badge: res.data.data.badge ?? null,
        });
      }
    } catch {
      // silently ignore — plan info is non-critical
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    fetchPlanInfo();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user, pathname, fetchNotifications, fetchPlanInfo]); // re-fetch immediately when user navigates

  const getBadgeCount = (keys?: Array<keyof NotificationSummary>): number => {
    if (!keys) return 0;
    return keys.reduce((sum, k) => sum + (notifications[k] ?? 0), 0);
  };

  const getPlanBadgeStyle = (plan: string): string => {
    const p = plan.toUpperCase();
    // Seller plans
    if (p === 'FINCA') return 'bg-green-100 text-green-700';
    if (p === 'CAMPO') return 'bg-yellow-100 text-yellow-700';
    if (p === 'COSECHA') return 'bg-gray-100 text-gray-600';
    // Buyer plans
    if (p === 'CENTRAL') return 'bg-green-100 text-green-700';
    if (p === 'LONJA') return 'bg-yellow-100 text-yellow-700';
    if (p === 'MERCADO') return 'bg-gray-100 text-gray-600';
    return 'bg-gray-100 text-gray-600';
  };

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
        {planInfo && (
          <span
            className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${getPlanBadgeStyle(planInfo.plan)}`}
          >
            {planInfo.plan}
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 flex flex-col gap-1" aria-label="Main navigation">
        {navItems.map(({ label, href, icon: Icon, badgeKeys }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          const hasBadge = getBadgeCount(badgeKeys) > 0;
          return (
            <Link
              key={href}
              href={href}
              className={[
                'relative flex flex-col items-center gap-1 p-2 rounded-input transition-colors duration-150 cursor-pointer',
                'min-h-[44px] justify-center text-center',
                isActive
                  ? 'bg-yellow-50 text-secondary font-semibold'
                  : 'text-gray-400 hover:bg-gray-50 hover:text-secondary',
              ].join(' ')}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={['w-5 h-5', isActive ? 'text-secondary' : 'text-gray-400'].join(' ')} />
              <span className="text-[10px] leading-tight">{label}</span>
              {hasBadge && (
                <span
                  className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"
                  aria-hidden="true"
                />
              )}
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
