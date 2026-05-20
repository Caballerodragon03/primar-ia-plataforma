'use client';
import { useEffect, useState } from 'react';
import { Plus, Package, GitMerge, CheckCircle2, RefreshCw, PenLine, Camera, Zap, AlarmClock, MessageCircle, Sprout, Star } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { KPICard } from '@/components/ui/KPICard';
import { SkeletonRow, SkeletonBlock } from '@/components/ui/SkeletonRow';
import { SeasonalCalendar } from '@/components/ui/SeasonalCalendar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api } from '@/lib/api';

interface LoteCalibre {
  calibre: string;
  cantidad_kg: number;
  precio_min_kg: number;
}

interface Lote {
  id: string;
  estado: string;
  producto: { nombre: string };
  calibres: LoteCalibre[];
  totalKg: number;
  coverage: number;
}

interface Match {
  id: string;
  estado: string;
  cantidadKg: number;
  precioKg: number;
  scoreMatching: number;
  pedido: {
    producto: { nombre: string };
  };
  createdAt: string;
}

// "Closed" = the deal is over either way. PARCIALMENTE_VENDIDO is NOT closed —
// the seller can still match the remaining kg to new buyers.
const CLOSED_LOT_STATES = ['VENDIDO', 'CANCELADO'];
// "Active / in progress" = everything except the closed set above.
// Includes BORRADOR (draft), ACTIVO, PARCIALMENTE_VENDIDO, and EXPIRADO so
// sellers can see lots that need to be extended or republished.
const ACTIVE_LOT_STATES = ['BORRADOR', 'ACTIVO', 'PARCIALMENTE_VENDIDO', 'EXPIRADO'];

interface SellerNotifSummary {
  pendingMatches: number;
  pendingContracts: number;
  pendingPhotos: number;
  expiredLots: number;
  unreadMessages: number;
  firstPendingContractLotId?: string;
  firstPendingContractMatchId?: string;
  firstPendingPhotosLotId?: string;
  firstPendingPhotosTxId?: string;
  firstPendingPhotosMatchId?: string;
  pendingRatings?: number;
  firstPendingRatingMatchId?: string;
}

export default function SellerDashboard() {
  const [lots, setLots] = useState<Lote[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [notifs, setNotifs] = useState<SellerNotifSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [lotsRes, matchesRes, notifRes] = await Promise.all([
        api.get<{ data: Lote[] }>('/lots'),
        api.get<{ success: boolean; data: Match[] }>('/matching/seller/matches'),
        api.get<{ success: boolean; data: SellerNotifSummary }>('/matching/notifications/summary').catch(() => ({ data: { data: null } })),
      ]);
      setLots(lotsRes.data.data ?? []);
      setMatches(matchesRes.data.data ?? []);
      setNotifs(notifRes.data?.data ?? null);
    } catch {
      setError('Error al cargar los datos del panel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const activeLots = lots.filter((l) => ACTIVE_LOT_STATES.includes(l.estado)).length;
  const pendingMatches = matches.filter((m) =>
    ['PROPUESTO', 'ENVIADO_VENDEDOR'].includes(m.estado)
  ).length;
  const completedSales = lots.filter((l) => CLOSED_LOT_STATES.includes(l.estado)).length;

  const topActiveLots = lots.filter((l) => ACTIVE_LOT_STATES.includes(l.estado)).slice(0, 5);
  const recentMatches = matches.slice(0, 3);

  const n = notifs;
  const actionItems = [
    n && n.pendingContracts > 0 && {
      icon: <PenLine className="w-5 h-5" />,
      label: `Firmar ${n.pendingContracts} contrato${n.pendingContracts > 1 ? 's' : ''}`,
      desc: 'Tienes contratos pendientes de firmar como vendedor. El comprador podrá pagar y firmar después.',
      href: n.pendingContracts === 1 && n.firstPendingContractMatchId
        ? `/seller/contracts/${n.firstPendingContractMatchId}`
        : '/seller/lots/tasks/contracts',
      color: 'amber',
    },
    n && n.pendingPhotos > 0 && {
      icon: <Camera className="w-5 h-5" />,
      // Phase 14M v3.19 — antes decía "Subir fotos" (legacy v1). En v2
      // la tarea es marcar como enviado en la pantalla del contrato.
      label: `Marcar como enviado ${n.pendingPhotos} envío${n.pendingPhotos > 1 ? 's' : ''}`,
      desc: 'El contrato ya está firmado y pagado. Marca la mercancía como enviada para que el comprador pueda confirmar la recepción.',
      href: n.pendingPhotos === 1 && n.firstPendingPhotosMatchId
        ? `/seller/contracts/${n.firstPendingPhotosMatchId}`
        : '/seller/lots/tasks/photos',
      color: 'blue',
    },
    n && n.pendingMatches > 0 && {
      icon: <Zap className="w-5 h-5" />,
      label: `${n.pendingMatches} new match${n.pendingMatches > 1 ? 'es' : ''} to review`,
      desc: 'New buyers matched to your lots. Review and accept.',
      href: n.pendingMatches === 1 ? '/seller/matches' : '/seller/lots/tasks/matches',
      color: 'green',
    },
    n && (n.pendingRatings ?? 0) > 0 && {
      icon: <Star className="w-5 h-5" />,
      label: `Valorar al comprador en ${n.pendingRatings} operación${(n.pendingRatings ?? 0) > 1 ? 'es' : ''}`,
      desc: 'La mercancía ya fue recibida. Valora al comprador para cerrar la operación.',
      href: n.firstPendingRatingMatchId
        ? `/seller/contracts/${n.firstPendingRatingMatchId}`
        : '/seller/lots/tasks/photos',
      color: 'yellow',
    },
    n && n.expiredLots > 0 && {
      icon: <AlarmClock className="w-5 h-5" />,
      label: `${n.expiredLots} lot${n.expiredLots > 1 ? 's' : ''} past availability date`,
      desc: 'Extend the period or close the lot with the current sales.',
      href: '/seller/lots/tasks/expiry',
      color: 'red',
    },
    n && n.unreadMessages > 0 && {
      icon: <MessageCircle className="w-5 h-5" />,
      label: `${n.unreadMessages} unread message${n.unreadMessages > 1 ? 's' : ''}`,
      desc: 'You have unread messages from buyers.',
      href: '/seller/messages',
      color: 'purple',
    },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; desc: string; href: string; color: string }[];

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">¡Bienvenido de nuevo!</h1>
          <p className="text-secondary text-sm mt-1">Gestiona tus lotes y revisa tus matches.</p>
        </div>
        <Link href="/seller/lots/new">
          <Button variant="primary" size="md" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Publicar lote nuevo
          </Button>
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-stagger">
        <KPICard
          label="Active Lots"
          value={loading ? '—' : String(activeLots)}
          sub={loading ? 'Loading...' : `${activeLots} lot${activeLots !== 1 ? 's' : ''} active or in progress`}
          icon={<Package className="w-4 h-4" />}
        />
        <KPICard
          label="Pending Matches"
          value={loading ? '—' : String(pendingMatches)}
          sub={loading ? 'Loading...' : 'Esperando tu revisión'}
          icon={<GitMerge className="w-4 h-4" />}
        />
        <KPICard
          label="Lots Closed"
          value={loading ? '—' : String(completedSales)}
          sub={loading ? 'Loading...' : 'Vendidos o cancelados'}
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-card">
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 text-sm text-red-700 font-medium hover:underline"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {!loading && actionItems.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Acciones requeridas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-stagger">
            {actionItems.map((item) => (
              <Link key={item.href + item.label} href={item.href}>
                <div className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer hover-lift hover:shadow-soft-md ${
                  item.color === 'amber' ? 'border-amber-200 bg-amber-50 hover:border-amber-300' :
                  item.color === 'blue'  ? 'border-blue-200 bg-blue-50 hover:border-blue-300' :
                  item.color === 'green' ? 'border-green-200 bg-green-50 hover:border-green-300' :
                  item.color === 'red'   ? 'border-red-200 bg-red-50 hover:border-red-300' :
                  'border-purple-200 bg-purple-50 hover:border-purple-300'
                }`}>
                  <span className="flex-shrink-0 text-foreground/70">{item.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!loading && actionItems.length === 0 && (
        <Link href="/seller/lots/new">
          <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all cursor-pointer">
            <Sprout className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">¡Estás al día!</p>
              <p className="text-xs text-muted-foreground mt-0.5">Sin acciones pendientes — ¿listo para publicar un nuevo lote?</p>
            </div>
            <span className="ml-auto text-sm font-medium text-primary">Publicar lote →</span>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-stagger">
        {/* Active Lots Table */}
        <div className="lg:col-span-2 bg-card rounded-card border border-border overflow-hidden hover-lift">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Lotes activos y en curso</h2>
            <Link href="/seller/lots" className="text-xs text-secondary hover:underline font-medium">
              View All Lots
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                {['ID LOTE', 'PRODUCTO', 'CANTIDAD', 'COBERTURA', 'ESTADO'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-[11px] font-semibold text-secondary uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <>
                  <SkeletonRow cols={5} />
                  <SkeletonRow cols={5} />
                  <SkeletonRow cols={5} />
                </>
              ) : topActiveLots.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-secondary">
                    Sin lotes activos. <Link href="/seller/lots/new" className="text-primary underline">Publica uno</Link>
                  </td>
                </tr>
              ) : (
                topActiveLots.map((lot) => {
                  // Prefer API-computed totals; fall back to client sum for legacy responses
                  const totalKg = Number(lot.totalKg ?? lot.calibres?.reduce((s, c) => s + c.cantidad_kg, 0) ?? 0);
                  const coveragePct = Math.min(100, Math.round(Number(lot.coverage ?? 0)));
                  return (
                    <tr key={lot.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-secondary">
                        {lot.id.slice(-5).toUpperCase()}
                      </td>
                      <td className="px-4 py-3 text-foreground">{lot.producto?.nombre ?? '—'}</td>
                      <td className="px-4 py-3 text-foreground">
                        {totalKg.toLocaleString('es-ES', { maximumFractionDigits: 0 })} kg
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium w-9 tabular-nums">{coveragePct}%</span>
                          <div className="flex-1 h-1.5 max-w-[80px] bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${coveragePct >= 100 ? 'bg-green-500' : coveragePct > 0 ? 'bg-primary' : 'bg-gray-300'}`}
                              style={{ width: `${coveragePct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={lot.estado} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Recent Activity */}
        <div className="bg-card rounded-card border border-border overflow-hidden hover-lift">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Actividad reciente</h2>
          </div>
          <div className="p-4 flex flex-col gap-3">
            {loading ? (
              <>
                <SkeletonBlock className="h-12 w-full" />
                <SkeletonBlock className="h-12 w-full" />
                <SkeletonBlock className="h-12 w-full" />
              </>
            ) : recentMatches.length === 0 ? (
              <p className="text-xs text-secondary text-center mt-2">Sin matches recientes</p>
            ) : (
              recentMatches.map((match) => {
                const qty = Number(match.cantidadKg);
                const price = Number(match.precioKg);
                const total = qty * price;
                return (
                  <div
                    key={match.id}
                    className="flex items-start justify-between p-3 bg-muted/50 rounded-input"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {match.pedido?.producto?.nombre ?? 'Product'}
                      </p>
                      <p className="text-[11px] text-secondary mt-0.5">
                        {qty.toLocaleString('es-ES', { maximumFractionDigits: 0 })} kg · {price.toFixed(2)} €/kg
                      </p>
                      <p className="text-[11px] font-semibold text-secondary mt-0.5">
                        {total.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €
                      </p>
                    </div>
                    <StatusBadge status={match.estado} />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Seasonal Calendar */}
      <div className="bg-card rounded-card border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Calendario estacional — España</h2>
          <p className="text-xs text-secondary mt-0.5">Temporadas de producción y comercialización por categoría de producto</p>
        </div>
        <div className="p-4">
          <SeasonalCalendar />
        </div>
      </div>
    </div>
  );
}
