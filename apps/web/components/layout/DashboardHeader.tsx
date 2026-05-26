'use client';
import { useCallback, useEffect, useState } from 'react';
import { Bell, ChevronRight, LogOut, Menu, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n/LocaleProvider';
import type { MessageKey } from '@/lib/i18n/messages';
import { Avatar, AvatarFallback } from '@/components/shadcn/avatar';
import { Badge } from '@/components/shadcn/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';

// Phase 14M v3.38 — slug → MessageKey para los breadcrumbs traducibles.
// Si un slug no está en este mapa, se renderiza tal cual (capitalizado).
const BREADCRUMB_KEYS: Record<string, MessageKey> = {
  buyer: 'header.breadcrumbBuyer',
  seller: 'header.breadcrumbSeller',
  orders: 'header.breadcrumbOrders',
  lots: 'header.breadcrumbLots',
  messages: 'header.breadcrumbMessages',
  analytics: 'header.breadcrumbAnalytics',
  disputes: 'header.breadcrumbDisputes',
  matches: 'header.breadcrumbMatches',
  profile: 'header.breadcrumbProfile',
  mercado: 'header.breadcrumbMercado',
  subscription: 'header.breadcrumbSubscription',
  new: 'header.breadcrumbNew',
  'harvest-estimation': 'header.breadcrumbHarvest',
  dashboard: 'header.breadcrumbDashboard',
  users: 'header.breadcrumbUsers',
  certificates: 'header.breadcrumbCertificates',
  incidents: 'header.breadcrumbIncidents',
};

function generateBreadcrumbs(pathname: string, t: (k: MessageKey) => string) {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];

  let href = '';
  for (const seg of segments) {
    href += `/${seg}`;
    if (seg.match(/^[a-f0-9-]{20,}$/i)) continue;
    const key = BREADCRUMB_KEYS[seg];
    const label = key ? t(key) : seg.charAt(0).toUpperCase() + seg.slice(1);
    crumbs.push({ label, href });
  }

  return crumbs;
}

export function DashboardHeader() {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: { unreadMessages: number } }>(
        '/matching/notifications/summary'
      );
      if (res.data?.data) {
        setUnreadCount(res.data.data.unreadMessages ?? 0);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchUnread();
    const interval = setInterval(fetchUnread, 30_000);
    return () => clearInterval(interval);
  }, [user, fetchUnread]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    clearAuth();
    router.push('/login');
  };

  const breadcrumbs = generateBreadcrumbs(pathname, t);
  const userInitials = user
    ? `${user.nombre?.[0] ?? ''}${user.apellidos?.[0] ?? ''}`.toUpperCase()
    : '?';
  const profileHref = user?.role === 'COMPRADOR' ? '/buyer/profile' : user?.role === 'ADMIN' ? '/admin/dashboard' : '/seller/profile';
  const messagesHref = user?.role === 'COMPRADOR' ? '/buyer/messages' : '/seller/messages';

  return (
    <header className="h-[var(--header-height)] bg-card/80 backdrop-blur-md border-b border-border/50 flex items-center justify-between gap-2 px-3 md:px-6 flex-shrink-0 sticky top-0 z-30">
      {/* Phase 14N — Hamburguesa (solo mobile). Emite evento global que
          MobileSidebar escucha para abrirse. */}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event('mobile-sidebar:open'))}
        className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg hover:bg-accent transition-colors cursor-pointer flex-shrink-0"
        aria-label={t('sidebar.expand')}
      >
        <Menu className="w-5 h-5 text-foreground" />
      </button>

      {/* Breadcrumbs */}
      <nav className="flex-1 min-w-0 flex items-center gap-1.5 text-sm overflow-hidden" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, i) => (
          <div key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />}
            {i === breadcrumbs.length - 1 ? (
              <span className="font-medium text-foreground">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="text-muted-foreground hover:text-foreground transition-colors duration-150"
              >
                {crumb.label}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Notification Bell */}
        <Link
          href={messagesHref}
          className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-accent transition-colors duration-150 cursor-pointer"
          aria-label={`${t('header.notifications')}${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
        >
          <Bell className="w-[18px] h-[18px] text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[11px] font-medium bg-destructive text-destructive-foreground rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors duration-150 cursor-pointer outline-none">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-primary/15 text-foreground font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className={cn('text-left hidden md:block')}>
                <p className="text-sm font-medium text-foreground leading-tight">
                  {user?.nombre}
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {user?.email}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.nombre} {user?.apellidos}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={profileHref} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                {t('header.myProfile')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={profileHref} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                {t('header.settings')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t('nav.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
