'use client';

/**
 * Phase 14N — Sidebar mobile (Sheet drawer).
 *
 * Reusa toda la lógica de navegación, notificaciones y plan que tiene
 * la <Sidebar /> desktop, pero la renderiza dentro de un Sheet
 * off-canvas que se abre con el botón hamburguesa del header.
 *
 * Patrón: el botón hamburguesa (en DashboardHeader) emite un evento
 * personalizado 'mobile-sidebar:open' que este componente escucha.
 * Esto evita tener que liftar estado a layout.tsx y mantener el
 * cambio aditivo (cero modificación de la API del layout).
 */
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
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/LocaleProvider';
import type { MessageKey } from '@/lib/i18n/messages';
import { Logo } from '@/components/brand/Logo';
import { Avatar, AvatarFallback } from '@/components/shadcn/avatar';
import { Badge } from '@/components/shadcn/badge';
import { Separator } from '@/components/shadcn/separator';
import { Sheet, SheetContent } from '@/components/shadcn/sheet';

interface NotificationSummary {
  pendingOffers: number;
  pendingMatches: number;
  unreadMessages: number;
  pendingContracts: number;
  pendingPhotos: number;
  pendingDeliveries: number;
}

interface NavItem {
  labelKey: MessageKey;
  href: string;
  icon: React.ElementType;
  badgeKeys?: Array<keyof NotificationSummary>;
}

const BUYER_NAV: NavItem[] = [
  { labelKey: 'nav.dashboard', href: '/buyer', icon: LayoutDashboard },
  { labelKey: 'nav.orders', href: '/buyer/orders', icon: ShoppingCart, badgeKeys: ['pendingOffers', 'pendingContracts', 'pendingDeliveries'] },
  { labelKey: 'nav.messages', href: '/buyer/messages', icon: MessageSquare, badgeKeys: ['unreadMessages'] },
  { labelKey: 'nav.disputes', href: '/buyer/disputes', icon: AlertTriangle },
  { labelKey: 'nav.analytics', href: '/buyer/analytics', icon: BarChart3 },
  { labelKey: 'nav.mercado', href: '/buyer/mercado', icon: LineChart },
  { labelKey: 'nav.subscription', href: '/buyer/subscription', icon: CreditCard },
  { labelKey: 'nav.profile', href: '/buyer/profile', icon: UserCircle },
];

const SELLER_NAV: NavItem[] = [
  { labelKey: 'nav.dashboard', href: '/seller', icon: LayoutDashboard },
  { labelKey: 'nav.lots', href: '/seller/lots', icon: Package, badgeKeys: ['pendingPhotos'] },
  { labelKey: 'nav.matches', href: '/seller/matches', icon: Zap, badgeKeys: ['pendingMatches', 'pendingContracts'] },
  { labelKey: 'nav.messages', href: '/seller/messages', icon: MessageSquare, badgeKeys: ['unreadMessages'] },
  { labelKey: 'nav.disputes', href: '/seller/disputes', icon: AlertTriangle },
  { labelKey: 'nav.analytics', href: '/seller/analytics', icon: BarChart3 },
  { labelKey: 'nav.mercado', href: '/seller/mercado', icon: LineChart },
  { labelKey: 'nav.harvest', href: '/seller/harvest-estimation', icon: Sprout },
  { labelKey: 'nav.subscription', href: '/seller/subscription', icon: CreditCard },
  { labelKey: 'nav.profile', href: '/seller/profile', icon: UserCircle },
];

const POLL_INTERVAL_MS = 30_000;
const EMPTY_NOTIFICATIONS: NotificationSummary = {
  pendingOffers: 0, pendingMatches: 0, unreadMessages: 0,
  pendingContracts: 0, pendingPhotos: 0, pendingDeliveries: 0,
};

export function MobileSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const t = useT();

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationSummary>(EMPTY_NOTIFICATIONS);
  const [planInfo, setPlanInfo] = useState<{ plan: string; badge: string | null } | null>(null);

  // Listener del evento del header hamburguesa.
  useEffect(() => {
    const openHandler = () => setOpen(true);
    window.addEventListener('mobile-sidebar:open', openHandler);
    return () => window.removeEventListener('mobile-sidebar:open', openHandler);
  }, []);

  // Cerrar al cambiar de ruta.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: NotificationSummary }>(
        '/matching/notifications/summary'
      );
      if (res.data?.data) setNotifications(res.data.data);
    } catch { /* ignore */ }
  }, []);

  const fetchPlanInfo = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: { plan: string; badge?: string | null } }>(
        '/subscriptions/current'
      );
      if (res.data?.data) {
        setPlanInfo({ plan: res.data.data.plan, badge: res.data.data.badge ?? null });
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!user || !open) return;
    fetchNotifications();
    fetchPlanInfo();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user, open, fetchNotifications, fetchPlanInfo]);

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
    } catch { /* ignore */ }
    clearAuth();
    setOpen(false);
    router.push('/login');
  };

  const userInitials = user
    ? `${user.nombre?.[0] ?? ''}${user.apellidos?.[0] ?? ''}`.toUpperCase()
    : '?';
  const roleLabel = user?.role === 'COMPRADOR' ? t('role.buyer') : t('role.seller');

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-[280px] max-w-[80vw] p-0 flex flex-col">
        {/* Logo + user */}
        <div className="p-4 pt-12">
          <Logo variant="small" width={120} className="mb-4" />
          {user && (
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
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
        </div>

        <Separator />

        {/* Nav */}
        <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto" aria-label="Mobile navigation">
          {navItems.map(({ labelKey, href, icon: Icon, badgeKeys }) => {
            const label = t(labelKey);
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            const badgeCount = getBadgeCount(badgeKeys);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'group relative flex items-center gap-3 rounded-lg px-3 py-3 transition-all duration-200 min-h-[44px]',
                  isActive
                    ? 'bg-primary/10 text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={cn('shrink-0 w-5 h-5', isActive ? 'text-primary' : 'text-muted-foreground')} />
                <span className="text-sm leading-tight flex-1">{label}</span>
                {badgeCount > 0 && (
                  <span className="flex items-center justify-center bg-destructive text-destructive-foreground font-medium rounded-full text-[11px] min-w-[20px] h-[20px] px-1.5">
                    {badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <Separator />

        {/* Logout */}
        <div className="p-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 min-h-[44px]"
            aria-label={t('nav.logout')}
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm">{t('nav.logout')}</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
