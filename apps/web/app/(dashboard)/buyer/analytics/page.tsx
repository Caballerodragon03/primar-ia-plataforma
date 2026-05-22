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

const farmerColumns: ColumnDef<AnalyticsData['topVendedores'][number], string>[] = [
  { accessorKey: 'farmer', header: 'VENDEDOR' },
  {
    accessorKey: 'volume',
    header: 'VOLUMEN (kg)',
    cell: ({ getValue }) => getValue<number>().toLocaleString('es-ES'),
  },
  {
    accessorKey: 'value',
    header: 'VALOR (€)',
    cell: ({ getValue }) => `€${getValue<number>().toLocaleString('es-ES', { maximumFractionDigits: 0 })}`,
  },
  { accessorKey: 'orders', header: 'MATCHES' },
];

export default function BuyerAnalyticsPage() {
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
        <h1 className="text-xl font-bold text-foreground">Analíticas de compras</h1>
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
        <h1 className="text-xl font-bold text-foreground">Analíticas de compras</h1>
        <div className="bg-card rounded-card border border-border p-10 text-center">
          <ShoppingCart className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm font-medium text-text-primary">Sin datos aún</p>
          <p className="text-xs text-text-secondary mt-1">
            Create and publish your first order to start seeing your purchase analytics.
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
          label="Total Orders"
          value={String(data.totalOrders)}
          sub={`${data.activeOrders} active · ${data.coveredOrders} covered`}
          icon={<ShoppingCart className="w-4 h-4" />}
        />
        <KPICard
          label="Total Spend"
          value={hasMatches ? `€${data.totalGasto.toLocaleString('es-ES', { maximumFractionDigits: 0 })}` : '—'}
          sub="De lotes comprometidos"
          icon={<DollarSign className="w-4 h-4" />}
        />
        <KPICard
          label="Volume Purchased"
          value={hasMatches ? `${data.totalVolumen.toLocaleString('es-ES')} kg` : '—'}
          sub="En todos los pedidos"
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <KPICard
          label="Avg. Price / kg"
          value={hasMatches ? `${data.avgPrecioKg.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} €/kg` : '—'}
          sub="Media ponderada"
          icon={<CheckCircle2 className="w-4 h-4 text-green-500" />}
        />
      </div>

      {/* Volume over time */}
      <div className="bg-card rounded-card border border-border p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">
          Volumen comprado a lo largo del tiempo (kg) — Últimos 12 meses
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
              <Tooltip formatter={(v: number) => [`${v.toLocaleString('es-ES')} kg`, 'Volume']} />
              <Area type="monotone" dataKey="kg" stroke={PRIMARY} strokeWidth={2} fill="url(#buyerVolumeGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-text-muted text-center py-10">
            No matched volume yet. Matches appear once a seller accepts your order.
          </p>
        )}
      </div>

      {/* Two-column charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-stagger">
        {/* Top products */}
        <div className="bg-card rounded-card border border-border p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Productos más comprados por volumen (kg)</h2>
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
                <Tooltip formatter={(v: number) => [`${v.toLocaleString('es-ES')} kg`, 'Volume']} />
                <Bar dataKey="kg" fill={PRIMARY} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-text-muted text-center py-8">No product data yet.</p>
          )}
        </div>

        {/* Orders by category */}
        <div className="bg-card rounded-card border border-border p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">Pedidos por categoría de producto</h2>
          {data.ordersByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(140, data.ordersByCategory.length * 44)}>
              <BarChart data={data.ordersByCategory} margin={{ top: 4, right: 8, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#6B7280' }} angle={-20} textAnchor="end" />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} allowDecimals={false} />
                <Tooltip formatter={(v: number) => [v, 'Orders']} />
                <Bar dataKey="orders" fill={PRIMARY} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-text-muted text-center py-8">No category data yet.</p>
          )}
        </div>
      </div>

      {/* Top sellers table */}
      <div className="bg-card rounded-card border border-border p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Top vendedores por volumen</h2>
        {data.topVendedores.length > 0 ? (
          <DataTable
            data={data.topVendedores}
            columns={farmerColumns}
            searchPlaceholder="Buscar vendedores..."
            emptyMessage="Sin datos de vendedores disponibles."
          />
        ) : (
          <p className="text-xs text-text-muted text-center py-8">
            No seller data yet. Data appears once matches are confirmed.
          </p>
        )}
      </div>
    </div>
  );
}
