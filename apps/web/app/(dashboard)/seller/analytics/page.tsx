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
        <h1 className="text-xl font-bold text-foreground">Analíticas de ventas</h1>
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
        <h1 className="text-xl font-bold text-foreground">Analíticas de ventas</h1>
        <div className="bg-card rounded-card border border-border p-10 text-center">
          <TrendingUp className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm font-medium text-text-primary">Sin datos aún</p>
          <p className="text-xs text-text-secondary mt-1">
            Publish your first lot and complete a match to see your analytics here.
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
          label="Total Volume Matched"
          value={hasMatches ? `${data.totalVolumen.toLocaleString('es-ES')} kg` : '—'}
          sub={`${data.activeLots} active lot${data.activeLots !== 1 ? 's' : ''}`}
          icon={<Package className="w-4 h-4" />}
        />
        <KPICard
          label="Total Value"
          value={hasMatches ? `${data.totalValor.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €` : '—'}
          sub="De matches confirmados"
          icon={<DollarSign className="w-4 h-4" />}
        />
        <KPICard
          label="Avg. Price / kg"
          value={hasMatches ? `${data.avgPrecioKg.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} €/kg` : '—'}
          sub="En todos los calibres"
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <KPICard
          label="Lots Sold"
          value={String(data.soldLots)}
          sub={`of ${data.totalLots} total lots`}
          icon={<CheckCircle2 className="w-4 h-4 text-green-500" />}
        />
      </div>

      {/* Volume over time */}
      <div className="bg-card rounded-card border border-border p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">
          Volumen comprometido a lo largo del tiempo (kg) — Últimos 12 meses
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
              <Tooltip formatter={(v: number) => [`${v.toLocaleString('es-ES')} kg`, 'Volume']} />
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
            No matched volume yet. Complete your first match to see the chart.
          </p>
        )}
      </div>

      {/* Top products */}
      <div className="bg-card rounded-card border border-border p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">
          Productos más vendidos por volumen (kg)
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
              <Tooltip formatter={(v: number) => [`${v.toLocaleString('es-ES')} kg`, 'Volume']} />
              <Bar dataKey="kg" fill={PRIMARY} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-text-muted text-center py-8">
            No product data available yet.
          </p>
        )}
      </div>

      {/* Lot summary */}
      <div className="bg-card rounded-card border border-border p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Resumen de lotes</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center animate-stagger">
          {[
            { label: 'Total lotes', value: data.totalLots },
            { label: 'Activos', value: data.activeLots },
            { label: 'Vendidos', value: data.soldLots },
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
