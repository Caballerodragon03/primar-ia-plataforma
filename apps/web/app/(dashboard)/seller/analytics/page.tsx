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
import { KPICard } from '@/components/ui/KPICard';
import { TrendingUp, DollarSign, Package, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useT, useLocale } from '@/lib/i18n/LocaleProvider';

const PRIMARY = '#E1C44D';

type AnalyticsData = {
  totalVolumen: number;
  totalValor: number;
  avgPrecioKg: number;
  activeLots: number;
  soldLots: number;
  totalLots: number;
  topProducts: { product: string; kg: number }[];
  volumeOverTime: { month: string; kg: number }[];
};

export default function SellerAnalyticsPage() {
  const t = useT();
  const { locale } = useLocale();
  const numLoc = locale === 'en' ? 'en-GB' : 'es-ES';
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/lots/analytics')
      .then(({ data: res }) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-foreground">{t('analytics.sellerTitle')}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-stagger">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-card" />
          ))}
        </div>
        <div className="h-64 bg-muted animate-pulse rounded-card" />
      </div>
    );
  }

  // Empty state — no transactions yet
  if (!data || data.totalLots === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-foreground">{t('analytics.sellerTitle')}</h1>
        <div className="bg-card rounded-card border border-border p-10 text-center">
          <TrendingUp className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm font-medium text-text-primary">{t('analytics.empty')}</p>
          <p className="text-xs text-text-secondary mt-1">
            {t('analytics.emptySellerHint')}
          </p>
        </div>
      </div>
    );
  }

  const hasMatches = data.totalVolumen > 0;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">Analíticas de ventas</h1>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-stagger">
        <KPICard
          label={t('analytics.kpi.totalVolMatched')}
          value={hasMatches ? `${data.totalVolumen.toLocaleString(numLoc)} kg` : '—'}
          sub={(data.activeLots === 1 ? t('analytics.kpi.subActiveLotsOne') : t('analytics.kpi.subActiveLotsMany')).replace('{n}', String(data.activeLots))}
          icon={<Package className="w-4 h-4" />}
        />
        <KPICard
          label={t('analytics.kpi.totalValue')}
          value={hasMatches ? `${data.totalValor.toLocaleString(numLoc, { maximumFractionDigits: 0 })} €` : '—'}
          sub={t('analytics.kpi.subFromConfirmed')}
          icon={<DollarSign className="w-4 h-4" />}
        />
        <KPICard
          label={t('analytics.kpi.avgPrice')}
          value={hasMatches ? `${data.avgPrecioKg.toLocaleString(numLoc, { minimumFractionDigits: 2, maximumFractionDigits: 3 })} €/kg` : '—'}
          sub={t('analytics.kpi.subAcrossCalibres')}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <KPICard
          label={t('analytics.kpi.lotsSold')}
          value={String(data.soldLots)}
          sub={t('analytics.kpi.subOfTotal').replace('{n}', String(data.totalLots))}
          icon={<CheckCircle2 className="w-4 h-4 text-green-500" />}
        />
      </div>

      {/* Volume over time */}
      <div className="bg-card rounded-card border border-border p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">
          {t('analytics.volSellerHeader')}
        </h2>
        {hasMatches ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.volumeOverTime} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="sellerVolumeGrad" x1="0" y1="0" x2="0" y2="1">
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
              <Area
                type="monotone"
                dataKey="kg"
                stroke={PRIMARY}
                strokeWidth={2}
                fill="url(#sellerVolumeGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-text-muted text-center py-10">
            {t('analytics.noMatchedVolumeSeller')}
          </p>
        )}
      </div>

      {/* Top products */}
      <div className="bg-card rounded-card border border-border p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">
          {t('analytics.topProductsSeller')}
        </h2>
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
              <YAxis
                type="category"
                dataKey="product"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                width={100}
              />
              <Tooltip formatter={(v: number) => [`${v.toLocaleString(numLoc)} kg`, t('analytics.tooltip.volume')]} />
              <Bar dataKey="kg" fill={PRIMARY} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-text-muted text-center py-8">
            {t('analytics.noProductDataSeller')}
          </p>
        )}
      </div>

      {/* Lot summary */}
      <div className="bg-card rounded-card border border-border p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">{t('analytics.lotSummary')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center animate-stagger">
          {[
            { label: t('analytics.lotSummary.total'), value: data.totalLots },
            { label: t('analytics.lotSummary.active'), value: data.activeLots },
            { label: t('analytics.lotSummary.sold'), value: data.soldLots },
          ].map(({ label, value }) => (
            <div key={label} className="bg-muted/50 rounded-input p-4">
              <p className="text-2xl font-bold text-text-primary">{value}</p>
              <p className="text-xs text-text-secondary mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
