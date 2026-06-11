'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { type ColumnDef } from '@tanstack/react-table';
import { KPICard } from '@/components/ui/KPICard';
import { DataTable } from '@/components/ui/DataTable';
import { TrendingUp, DollarSign, ShoppingCart, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useT, useLocale } from '@/lib/i18n/LocaleProvider';
import { useMemo } from 'react';

const chartLoading = () => <div className="h-[260px] bg-muted animate-pulse rounded-card" />;
const VolumeAreaChart = dynamic(() => import('@/components/charts/LazyCharts').then((m) => m.VolumeAreaChart), { ssr: false, loading: chartLoading });
const HorizontalBarChart = dynamic(() => import('@/components/charts/LazyCharts').then((m) => m.HorizontalBarChart), { ssr: false, loading: chartLoading });
const CategoryBarChart = dynamic(() => import('@/components/charts/LazyCharts').then((m) => m.CategoryBarChart), { ssr: false, loading: chartLoading });

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
          <VolumeAreaChart
            data={data.volumeOverTime}
            numLoc={numLoc}
            tooltipLabel={t('analytics.tooltip.volume')}
            gradientId="buyerVolumeGrad"
          />
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
            <HorizontalBarChart
              data={data.topProducts}
              categoryKey="product"
              valueKey="kg"
              numLoc={numLoc}
              tooltipLabel={t('analytics.tooltip.volume')}
              height={Math.max(140, data.topProducts.length * 44)}
            />
          ) : (
            <p className="text-xs text-text-muted text-center py-8">{t('analytics.noProductData')}</p>
          )}
        </div>

        {/* Orders by category */}
        <div className="bg-card rounded-card border border-border p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">{t('analytics.ordersByCategory')}</h2>
          {data.ordersByCategory.length > 0 ? (
            <CategoryBarChart
              data={data.ordersByCategory}
              categoryKey="category"
              valueKey="orders"
              tooltipLabel={t('analytics.tooltip.orders')}
              height={Math.max(140, data.ordersByCategory.length * 44)}
            />
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
