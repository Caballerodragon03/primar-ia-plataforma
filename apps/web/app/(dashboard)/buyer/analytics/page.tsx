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
  { accessorKey: 'farmer', header: 'SELLER' },
  {
    accessorKey: 'volume',
    header: 'VOLUME (kg)',
    cell: ({ getValue }) => getValue<number>().toLocaleString('es-ES'),
  },
  {
    accessorKey: 'value',
    header: 'VALUE (€)',
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
        <h1 className="text-xl font-bold text-gray-900">Buyer Analytics</h1>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-card" />
          ))}
        </div>
        <div className="h-64 bg-gray-100 animate-pulse rounded-card" />
      </div>
    );
  }

  if (!data || data.totalOrders === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-gray-900">Buyer Analytics</h1>
        <div className="bg-surface rounded-card border border-border p-10 text-center">
          <ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-text-primary">No data yet</p>
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
      <h1 className="text-xl font-bold text-gray-900">Buyer Analytics</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KPICard
          label="Total Orders"
          value={String(data.totalOrders)}
          sub={`${data.activeOrders} active · ${data.coveredOrders} covered`}
          icon={<ShoppingCart className="w-4 h-4" />}
        />
        <KPICard
          label="Total Spend"
          value={hasMatches ? `€${data.totalGasto.toLocaleString('es-ES', { maximumFractionDigits: 0 })}` : '—'}
          sub="From matched lots"
          icon={<DollarSign className="w-4 h-4" />}
        />
        <KPICard
          label="Volume Purchased"
          value={hasMatches ? `${data.totalVolumen.toLocaleString('es-ES')} kg` : '—'}
          sub="Across all orders"
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <KPICard
          label="Avg. Price / kg"
          value={hasMatches ? `€${data.avgPrecioKg.toFixed(3)}` : '—'}
          sub="Weighted average"
          icon={<CheckCircle2 className="w-4 h-4 text-green-500" />}
        />
      </div>

      {/* Volume over time */}
      <div className="bg-surface rounded-card border border-border p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          Volume Purchased Over Time (kg) — Last 12 months
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top products */}
        <div className="bg-surface rounded-card border border-border p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Top Products by Volume (kg)</h2>
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
        <div className="bg-surface rounded-card border border-border p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Orders by Product Category</h2>
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
      <div className="bg-surface rounded-card border border-border p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Top Sellers by Volume Matched</h2>
        {data.topVendedores.length > 0 ? (
          <DataTable
            data={data.topVendedores}
            columns={farmerColumns}
            searchPlaceholder="Search sellers..."
            emptyMessage="No seller data available."
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
