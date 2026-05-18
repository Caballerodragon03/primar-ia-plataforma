'use client';
import { useCallback, useEffect, useState } from 'react';
import { Bell, ChevronRight, LogOut, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
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

function generateBreadcrumbs(pathname: string, role?: string) {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];

  const labelMap: Record<string, string> = {
    buyer: 'Comprador',
    seller: 'Vendedor',
    admin: 'Admin',
    orders: 'Pedidos',
    lots: 'Lotes',
    messages: 'Mensajes',
    analytics: 'Analíticas',
    disputes: 'Incidencias',
    matches: 'Matches',
    profile: 'Perfil',
    mercado: 'Mercado',
    subscription: 'Suscripción',
    new: 'Nuevo',
    'harvest-estimation': 'Cosecha',
    dashboard: 'Dashboard',
    users: 'Usuarios',
    certificates: 'Certificados',
    incidents: 'Incidentes',
  };

  let href = '';
  for (const seg of segments) {
    href += `/${seg}`;
    if (seg.match(/^[a-f0-9-]{20,}$/i)) continue;
    const label = labelMap[seg] || seg.charAt(0).toUpperCase() + seg.slice(1);
    crumbs.push({ label, href });
  }

  return crumbs;
}

export function DashboardHeader() {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const pathname = usePathname();
  const router = useRouter();
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

  const breadcrumbs = generateBreadcrumbs(pathname, user?.role);
  const userInitials = user
    ? `${user.nombre?.[0] ?? ''}${user.apellidos?.[0] ?? ''}`.toUpperCase()
    : '?';
  const profileHref = user?.role === 'COMPRADOR' ? '/buyer/profile' : user?.role === 'ADMIN' ? '/admin/dashboard' : '/seller/profile';
  const messagesHref = user?.role === 'COMPRADOR' ? '/buyer/messages' : '/seller/messages';

  return (
    <header className="h-[var(--header-height)] bg-card/80 backdrop-blur-md border-b border-border/50 flex items-center justify-between px-6 flex-shrink-0 sticky top-0 z-30">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
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
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="w-[18px] h-[18px] text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-medium bg-destructive text-destructive-foreground rounded-full">
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
                Mi perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={profileHref} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Configuración
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
