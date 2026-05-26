'use client';

import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { type ColumnDef } from '@tanstack/react-table';
import { KPICard } from '@/components/ui/KPICard';
import { DataTable } from '@/components/ui/DataTable';
import { TrendingUp, DollarSign, ShoppingCart, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useT, useLocale } from '@/lib/i18n/LocaleProvider';
import { useMemo } from 'react';

const PRIMARY = '#E1C44D';

type AnalyticsData = {
  totalVolumen: number;
  totalGasto: number;
  avgPrecioKg: number;
  totalOrders: number;
  activeOrders: number;
  coveredOrders: number;
  volumeOverTime: { month: string; kg: number }[];
  topProducts: { product: string; kg: number }[];
  ordersByCategory: { category: string; orders: number }[];
  topVendedores: { farmer: string; volume: number; value: number; orders: number }[];
};

export default function BuyerAnalyticsPage() {
  const t = useT();
  const { locale } = useLocale();
  const numLoc = locale === 'en' ? 'en-GB' : 'es-ES';
  const farmerColumns = useMemo<ColumnDef<AnalyticsData['topVendedores'][number], string>[]>(() => [
    { accessorKey: 'farmer', header: t('analytics.col.farmer') },
    {
      accessorKey: 'volume',
      header: t('analytics.col.volume'),
      cell: ({ getValue }) => getValue<number>().toLocaleString(numLoc),
    },
    {
      accessorKey: 'value',
      header: t('analytics.col.value'),
      cell: ({ getValue }) => `€${getValue<number>().toLocaleString(numLoc, { maximumFractionDigits: 0 })}`,
    },
    { accessorKey: 'orders', header: t('analytics.col.matches') },
  ], [t, numLoc]);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/orders/analytics')
      .then(({ data: res }) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-foreground">{t('analytics.buyerTitle')}</h1>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-stagger">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-card" />
          ))}
        </div>
        <div className="h-64 bg-muted animate-pulse rounded-card" />
      </div>
    );
  }

  if (!data || data.totalOrders === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-foreground">{t('analytics.buyerTitle')}</h1>
        <div className="bg-card rounded-card border border-border p-10 text-center">
          <ShoppingCart className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm font-medium text-text-primary">{t('analytics.empty')}</p>
          <p className="text-xs text-text-secondary mt-1">
            {t('analytics.emptyBuyerHint')}
          </p>
        </div>
      </div>
    );
  }

  const hasMatches = data.totalVolumen > 0;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">Analíticas de compras</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-stagger">
        <KPICard
          label={t('analytics.kpi.totalOrders')}
          value={String(data.totalOrders)}
          sub={t('analytics.kpi.subActiveCovered').replace('{a}', String(data.activeOrders)).replace('{c}', String(data.coveredOrders))}
          icon={<ShoppingCart className="w-4 h-4" />}
        />
        <KPICard
          label={t('analytics.kpi.totalSpend')}
          value={hasMatches ? `€${data.totalGasto.toLocaleString(numLoc, { maximumFractionDigits: 0 })}` : '—'}
          sub={t('analytics.kpi.subFromCommitted')}
          icon={<DollarSign className="w-4 h-4" />}
        />
        <KPICard
          label={t('analytics.kpi.volumePurchased')}
          value={hasMatches ? `${data.totalVolumen.toLocaleString(numLoc)} kg` : '—'}
          sub={t('analytics.kpi.subAllOrders')}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <KPICard
          label={t('analytics.kpi.avgPrice')}
          value={hasMatches ? `${data.avgPrecioKg.toLocaleString(numLoc, { minimumFractionDigits: 2, maximumFractionDigits: 3 })} €/kg` : '—'}
          sub={t('analytics.kpi.subWeighted')}
          icon={<CheckCircle2 className="w-4 h-4 text-green-500" />}
        />
      </div>

      {/* Volume over time */}
      <div className="bg-card rounded-card border border-border p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">
          {t('analytics.volBuyerHeader')}
        </h2>
        {hasMatches ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.volumeOverTime} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="buyerVolumeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280' }} />
              <YAxis
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
              />
              <Tooltip formatter={(v: number) => [`${v.toLocaleString(numLoc)} kg`, t('analytics.tooltip.volume')]} />
              <Area type="monotone" dataKey="kg" stroke={PRIMARY} strokeWidth={2} fill="url(#buyerVolumeGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-text-muted text-center py-10">
            {t('analytics.noMatchedVolume')}
          </p>
        )}
      </div>

      {/* Two-column charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-stagger">
        {/* Top products */}
        <div className="bg-card rounded-card border border-border p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">{t('analytics.topProductsBuyer')}</h2>
          {data.topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(140, data.topProducts.length * 44)}>
              <BarChart
                data={data.topProducts}
                layout="vertical"
                margin={{ top: 4, right: 20, left: 100, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                />
                <YAxis type="category" dataKey="product" tick={{ fontSize: 11, fill: '#6B7280' }} width={100} />
                <Tooltip formatter={(v: number) => [`${v.toLocaleString(numLoc)} kg`, t('analytics.tooltip.volume')]} />
                <Bar dataKey="kg" fill={PRIMARY} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-text-muted text-center py-8">{t('analytics.noProductData')}</p>
          )}
        </div>

        {/* Orders by category */}
        <div className="bg-card rounded-card border border-border p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">{t('analytics.ordersByCategory')}</h2>
          {data.ordersByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(140, data.ordersByCategory.length * 44)}>
              <BarChart data={data.ordersByCategory} margin={{ top: 4, right: 8, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#6B7280' }} angle={-20} textAnchor="end" />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} allowDecimals={false} />
                <Tooltip formatter={(v: number) => [v, t('analytics.tooltip.orders')]} />
                <Bar dataKey="orders" fill={PRIMARY} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-text-muted text-center py-8">{t('analytics.noCategoryData')}</p>
          )}
        </div>
      </div>

      {/* Top sellers table */}
      <div className="bg-card rounded-card border border-border p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">{t('analytics.topSellers')}</h2>
        {data.topVendedores.length > 0 ? (
          <DataTable
            data={data.topVendedores}
            columns={farmerColumns}
            searchPlaceholder={t('analytics.searchSellers')}
            emptyMessage={t('analytics.noSellerDataAvailable')}
          />
        ) : (
          <p className="text-xs text-text-muted text-center py-8">
            {t('analytics.noSellerData')}
          </p>
        )}
      </div>
    </div>
  );
}
