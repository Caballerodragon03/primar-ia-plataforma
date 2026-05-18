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
  AlertTriangle,
  LineChart,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/brand/Logo';
import { Avatar, AvatarFallback } from '@/components/shadcn/avatar';
import { Badge } from '@/components/shadcn/badge';
import { Separator } from '@/components/shadcn/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/shadcn/tooltip';

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
  { label: 'Disputes', href: '/buyer/disputes', icon: AlertTriangle },
  { label: 'Analytics', href: '/buyer/analytics', icon: BarChart3 },
  { label: 'Mercado', href: '/buyer/mercado', icon: LineChart },
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
  { label: 'Disputes', href: '/seller/disputes', icon: AlertTriangle },
  { label: 'Analytics', href: '/seller/analytics', icon: BarChart3 },
  { label: 'Mercado', href: '/seller/mercado', icon: LineChart },
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
  const [collapsed, setCollapsed] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: NotificationSummary }>(
        '/matching/notifications/summary'
      );
      if (res.data?.data) {
        setNotifications(res.data.data);
      }
    } catch {
      // silently ignore
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
      // silently ignore
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    fetchPlanInfo();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user, pathname, fetchNotifications, fetchPlanInfo]);

  const getBadgeCount = (keys?: Array<keyof NotificationSummary>): number => {
    if (!keys) return 0;
    return keys.reduce((sum, k) => sum + (notifications[k] ?? 0), 0);
  };

  const getPlanBadgeVariant = (plan: string) => {
    const p = plan.toUpperCase();
    if (p === 'FINCA' || p === 'CENTRAL') return 'delivered' as const;
    if (p === 'CAMPO' || p === 'LONJA') return 'funding' as const;
    return 'secondary' as const;
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

  const userInitials = user
    ? `${user.nombre?.[0] ?? ''}${user.apellidos?.[0] ?? ''}`.toUpperCase()
    : '?';

  const roleLabel = user?.role === 'COMPRADOR' ? 'Comprador' : 'Vendedor';

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'relative min-h-screen bg-card border-r border-border/50 flex flex-col flex-shrink-0 shadow-soft-sm transition-all duration-300 ease-out',
          collapsed ? 'w-[var(--sidebar-width-collapsed)]' : 'w-[var(--sidebar-width)]'
        )}
      >
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow-soft-sm hover:shadow-soft transition-all duration-200 cursor-pointer"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-muted-foreground" />
          )}
        </button>

        {/* Logo + User */}
        <div className={cn('p-4 pb-3', collapsed && 'px-2')}>
          <div className={cn('mb-4', collapsed ? 'flex justify-center' : '')}>
            {collapsed ? (
              <Logo variant="icon" width={32} />
            ) : (
              <Logo variant="small" width={120} />
            )}
          </div>

          {!collapsed && user && (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="text-xs bg-primary/15 text-foreground font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate leading-tight">
                  {user.nombre} {user.apellidos}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] text-muted-foreground">{roleLabel}</span>
                  {planInfo && (
                    <Badge variant={getPlanBadgeVariant(planInfo.plan)} className="text-[9px] px-1.5 py-0 h-4">
                      {planInfo.plan}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {collapsed && user && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex justify-center mt-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-[11px] bg-primary/15 text-foreground font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                {user.nombre} {user.apellidos}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <Separator />

        {/* Nav */}
        <nav className={cn('flex-1 p-2 flex flex-col gap-0.5 overflow-y-auto scrollbar-thin', collapsed && 'px-1.5')} aria-label="Main navigation">
          {navItems.map(({ label, href, icon: Icon, badgeKeys }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            const badgeCount = getBadgeCount(badgeKeys);

            const navLink = (
              <Link
                key={href}
                href={href}
                className={cn(
                  'group relative flex items-center gap-3 rounded-lg transition-all duration-200 cursor-pointer',
                  collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5',
                  'min-h-[40px]',
                  isActive
                    ? 'bg-primary/10 text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <span
                  className={cn(
                    'absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-primary transition-all duration-300 ease-out',
                    isActive ? 'h-5 opacity-100' : 'h-0 opacity-0'
                  )}
                />
                <Icon
                  className={cn(
                    'shrink-0 transition-colors duration-200',
                    collapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]',
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                />
                {!collapsed && (
                  <span className="text-[13px] leading-tight truncate">{label}</span>
                )}
                {badgeCount > 0 && (
                  <span
                    className={cn(
                      'flex items-center justify-center bg-destructive text-destructive-foreground font-medium rounded-full',
                      collapsed
                        ? 'absolute top-0.5 right-0.5 w-2 h-2 animate-pulse'
                        : 'ml-auto text-[11px] min-w-[18px] h-[18px] px-1'
                    )}
                  >
                    {!collapsed && badgeCount}
                  </span>
                )}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={href}>
                  <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                  <TooltipContent side="right" className="flex items-center gap-2">
                    {label}
                    {badgeCount > 0 && (
                      <span className="text-[11px] bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5">
                        {badgeCount}
                      </span>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return navLink;
          })}
        </nav>

        <Separator />

        {/* Logout */}
        <div className={cn('p-2', collapsed && 'px-1.5')}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 cursor-pointer',
                  collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'
                )}
                aria-label="Logout"
              >
                <LogOut className={cn(collapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]')} />
                {!collapsed && <span className="text-[13px]">Cerrar sesión</span>}
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">Cerrar sesión</TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
