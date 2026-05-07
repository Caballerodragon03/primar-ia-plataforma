'use client';
import { useEffect, useState } from 'react';
import { Plus, Package, GitMerge, CheckCircle2, RefreshCw } from 'lucide-react';
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

interface SellerNotifSummary {
  pendingMatches: number;
  pendingContracts: number;
  pendingPhotos: number;
  expiredLots: number;
  unreadMessages: number;
  firstPendingContractLotId?: string;
  firstPendingContractSellerTxId?: string;
  firstPendingPhotosLotId?: string;
  firstPendingPhotosTxId?: string;
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
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const activeLots = lots.filter((l) => ['ACTIVO', 'PARCIALMENTE_VENDIDO'].includes(l.estado)).length;
  const pendingMatches = matches.filter((m) =>
    ['PROPUESTO', 'ENVIADO_VENDEDOR'].includes(m.estado)
  ).length;
  const completedSales = lots.filter((l) => l.estado === 'VENDIDO').length;

  const topActiveLots = lots.filter((l) => ['ACTIVO', 'PARCIALMENTE_VENDIDO'].includes(l.estado)).slice(0, 5);
  const recentMatches = matches.slice(0, 3);

  const n = notifs;
  const actionItems = [
    n && n.pendingContracts > 0 && {
      icon: '✍️',
      label: `Countersign ${n.pendingContracts} contract${n.pendingContracts > 1 ? 's' : ''}`,
      desc: 'The buyer has signed — your countersignature is needed to proceed.',
      href: n.pendingContracts === 1 && n.firstPendingContractLotId && n.firstPendingContractSellerTxId
        ? `/seller/lots/${n.firstPendingContractLotId}/contract/${n.firstPendingContractSellerTxId}`
        : '/seller/lots/tasks/contracts',
      color: 'amber',
    },
    n && n.pendingPhotos > 0 && {
      icon: '📸',
      label: `Upload photos for ${n.pendingPhotos} shipment${n.pendingPhotos > 1 ? 's' : ''}`,
      desc: 'Both parties signed. Upload lot preparation photos before shipping.',
      href: n.pendingPhotos === 1 && n.firstPendingPhotosLotId && n.firstPendingPhotosTxId
        ? `/seller/lots/${n.firstPendingPhotosLotId}/qr/${n.firstPendingPhotosTxId}`
        : '/seller/lots/tasks/photos',
      color: 'blue',
    },
    n && n.pendingMatches > 0 && {
      icon: '⚡',
      label: `${n.pendingMatches} new match${n.pendingMatches > 1 ? 'es' : ''} to review`,
      desc: 'New buyers matched to your lots. Review and accept.',
      href: n.pendingMatches === 1 ? '/seller/matches' : '/seller/lots/tasks/matches',
      color: 'green',
    },
    n && n.expiredLots > 0 && {
      icon: '⏰',
      label: `${n.expiredLots} lot${n.expiredLots > 1 ? 's' : ''} past availability date`,
      desc: 'Extend the period or close the lot with the current sales.',
      href: '/seller/lots/tasks/expiry',
      color: 'red',
    },
    n && n.unreadMessages > 0 && {
      icon: '💬',
      label: `${n.unreadMessages} unread message${n.unreadMessages > 1 ? 's' : ''}`,
      desc: 'You have unread messages from buyers.',
      href: '/seller/messages',
      color: 'purple',
    },
  ].filter(Boolean) as { icon: string; label: string; desc: string; href: string; color: string }[];

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back!</h1>
          <p className="text-secondary text-sm mt-1">Manage your lots and track your matches.</p>
        </div>
        <Link href="/seller/lots/new">
          <Button variant="primary" size="md" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Publish New Lot
          </Button>
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          label="Active Lots"
          value={loading ? '—' : String(activeLots)}
          sub={loading ? 'Loading...' : `${activeLots} lot${activeLots !== 1 ? 's' : ''} active or in progress`}
          icon={<Package className="w-4 h-4" />}
        />
        <KPICard
          label="Pending Matches"
          value={loading ? '—' : String(pendingMatches)}
          sub={loading ? 'Loading...' : 'Awaiting your review'}
          icon={<GitMerge className="w-4 h-4" />}
        />
        <KPICard
          label="Completed Sales"
          value={loading ? '—' : String(completedSales)}
          sub={loading ? 'Loading...' : 'Sold or partially sold'}
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
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Action Required
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {actionItems.map((item) => (
              <Link key={item.href + item.label} href={item.href}>
                <div className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                  item.color === 'amber' ? 'border-amber-200 bg-amber-50 hover:border-amber-300' :
                  item.color === 'blue'  ? 'border-blue-200 bg-blue-50 hover:border-blue-300' :
                  item.color === 'green' ? 'border-green-200 bg-green-50 hover:border-green-300' :
                  item.color === 'red'   ? 'border-red-200 bg-red-50 hover:border-red-300' :
                  'border-purple-200 bg-purple-50 hover:border-purple-300'
                }`}>
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{item.desc}</p>
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
            <span className="text-2xl">🌱</span>
            <div>
              <p className="text-sm font-semibold text-gray-900">You&apos;re all caught up!</p>
              <p className="text-xs text-gray-500 mt-0.5">No pending actions — ready to publish a new lot?</p>
            </div>
            <span className="ml-auto text-sm font-medium text-primary">Publish New Lot →</span>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Lots Table */}
        <div className="lg:col-span-2 bg-surface rounded-card border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-gray-900">Active &amp; In Progress Lots</h2>
            <Link href="/seller/lots" className="text-xs text-secondary hover:underline font-medium">
              View All Lots
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                {['LOT ID', 'PRODUCT', 'QUANTITY', 'STATUS'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-[10px] font-semibold text-secondary uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <>
                  <SkeletonRow cols={4} />
                  <SkeletonRow cols={4} />
                  <SkeletonRow cols={4} />
                </>
              ) : topActiveLots.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-secondary">
                    No active lots. <Link href="/seller/lots/new" className="text-primary underline">Publish one</Link>
                  </td>
                </tr>
              ) : (
                topActiveLots.map((lot) => {
                  const totalKg = lot.calibres.reduce((s, c) => s + c.cantidad_kg, 0);
                  return (
                    <tr key={lot.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-secondary">
                        {lot.id.slice(-5).toUpperCase()}
                      </td>
                      <td className="px-4 py-3 text-gray-900">{lot.producto?.nombre ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{totalKg.toLocaleString()} kg</td>
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
        <div className="bg-surface rounded-card border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="p-4 flex flex-col gap-3">
            {loading ? (
              <>
                <SkeletonBlock className="h-12 w-full" />
                <SkeletonBlock className="h-12 w-full" />
                <SkeletonBlock className="h-12 w-full" />
              </>
            ) : recentMatches.length === 0 ? (
              <p className="text-xs text-secondary text-center mt-2">No recent matches yet</p>
            ) : (
              recentMatches.map((match) => (
                <div
                  key={match.id}
                  className="flex items-start justify-between p-3 bg-gray-50 rounded-input"
                >
                  <div>
                    <p className="text-xs font-medium text-gray-900">
                      {match.pedido?.producto?.nombre ?? 'Product'}
                    </p>
                    <p className="text-[10px] text-secondary mt-0.5">
                      {Number(match.cantidadKg).toLocaleString()} kg — score {Math.round((match.scoreMatching ?? 0) * 100)}%
                    </p>
                  </div>
                  <StatusBadge status={match.estado} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Seasonal Calendar */}
      <div className="bg-surface rounded-card border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-gray-900">Seasonal Calendar — Spain</h2>
          <p className="text-xs text-secondary mt-0.5">Production and commercialization seasons by product category</p>
        </div>
        <div className="p-4">
          <SeasonalCalendar />
        </div>
      </div>
    </div>
  );
}
