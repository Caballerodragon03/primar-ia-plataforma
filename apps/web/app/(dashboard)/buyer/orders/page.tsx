'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { AlertCircle, Plus, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { DataTable, StatusBadge, CoverageBar, Button } from '@/components/ui';
import { useT, useLocale } from '@/lib/i18n/LocaleProvider';

type OrderRow = {
  id: string;
  producto: { nombre: string };
  totalKg: number;
  coverage: number;
  estado: string;
  fechaEntregaDeseada: string;
  calibresSolicitados: Array<{ cantidad_kg: number }>;
  matches?: Array<{ estado: string }>;
};

const col = createColumnHelper<OrderRow>();

// Phase 14M v3.40 — TABS y columns ahora dependen del locale.

export default function MyOrdersPage() {
  const router = useRouter();
  const t = useT();
  const { locale } = useLocale();

  const TABS = useMemo(() => [
    { key: 'all', label: t('orders.tab.all') },
    { key: 'open', label: t('orders.tab.open') },
    { key: 'inprogress', label: t('orders.tab.inProgress') },
    { key: 'full', label: t('orders.tab.covered') },
    { key: 'cancelled', label: t('orders.tab.cancelled') },
    { key: 'closed', label: t('orders.tab.closed') },
  ], [t]);

  const columns = useMemo(() => [
    col.display({
      id: 'alert',
      header: '',
      cell: (info) => {
        const coverage = info.row.original.coverage;
        return coverage === 0 ? (
          <AlertCircle className="w-4 h-4 text-amber-500" />
        ) : null;
      },
    }),
    col.accessor('id', {
      header: t('orders.col.id'),
      cell: (info) => {
        const hasPendingAccepted = info.row.original.matches?.some(
          (m) => m.estado === 'ACEPTADO_VENDEDOR'
        );
        return (
          <div className="flex items-center gap-1.5">
            <Link
              href={`/buyer/orders/${info.getValue()}`}
              className="text-secondary font-medium hover:text-primary transition-colors"
            >
              #{info.getValue().slice(-6).toUpperCase()}
            </Link>
            {hasPendingAccepted && (
              <span
                className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0"
                title="Seller accepted — action required"
              />
            )}
          </div>
        );
      },
    }),
    col.accessor('producto.nombre', { header: t('orders.col.product') }),
    col.accessor('totalKg', {
      header: t('orders.col.totalKg'),
      cell: (info) => `${info.getValue().toLocaleString()} kg`,
    }),
    col.accessor('coverage', {
      header: t('orders.col.coverage'),
      cell: (info) => <CoverageBar percentage={info.getValue()} className="min-w-[120px]" />,
    }),
    col.accessor('estado', {
      header: t('orders.col.status'),
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    col.accessor('fechaEntregaDeseada', {
      header: t('orders.col.deliveryDate'),
      cell: (info) => new Date(info.getValue()).toLocaleDateString(locale === 'en' ? 'en-GB' : 'es-ES'),
    }),
  ], [t, locale]);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [globalFilter, setGlobalFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [pendingRating, setPendingRating] = useState<{ transaccionId: string; orderId: string; destinatarioId: string } | null>(null);

  const fetchOrders = useCallback(async (tab: string) => {
    setIsLoading(true);
    try {
      const params = tab !== 'all' ? { tab } : {};
      const { data } = await api.get('/orders', { params });
      setOrders(data.data);
    } catch {
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Read ?tab= from URL on first mount (e.g. redirect from delivery confirmation)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && TABS.some((t) => t.key === tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  useEffect(() => { fetchOrders(activeTab); }, [activeTab, fetchOrders]);

  useEffect(() => {
    api.get('/valoraciones/pending').then(({ data }) => setPendingRating(data.data)).catch(() => {});
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setGlobalFilter('');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">{t('orders.title')}</h1>
        <Link href="/buyer/orders/new" data-tutorial="btn-nuevo-pedido">
          <Button variant="primary" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {t('orders.newOrder')}
          </Button>
        </Link>
      </div>

      {pendingRating && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-300 rounded-card px-4 py-3">
          <Star className="w-4 h-4 text-yellow-500 flex-shrink-0 fill-yellow-500" />
          <p className="text-sm text-yellow-900 flex-1">
            {t('orders.pendingRating')}
          </p>
          <Link
            href={`/buyer/orders/${pendingRating.orderId}`}
            className="text-xs font-medium text-yellow-800 underline hover:no-underline flex-shrink-0"
          >
            {t('orders.rateNow')}
          </Link>
        </div>
      )}

      <DataTable
        data={orders}
        columns={columns}
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        searchPlaceholder={t('orders.search')}
        isLoading={isLoading}
        emptyMessage={t('orders.empty')}
        onRowClick={(row) => router.push(`/buyer/orders/${row.id}`)}
        mobileCard={(row) => {
          const hasPendingAccepted = row.matches?.some((m) => m.estado === 'ACEPTADO_VENDEDOR');
          return (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {row.coverage === 0 && (
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  )}
                  <Link
                    href={`/buyer/orders/${row.id}`}
                    className="text-secondary font-semibold hover:text-primary transition-colors text-sm"
                  >
                    #{row.id.slice(-6).toUpperCase()}
                  </Link>
                  {hasPendingAccepted && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                  )}
                </div>
                <StatusBadge status={row.estado} />
              </div>
              <p className="text-sm font-medium text-foreground truncate">{row.producto.nombre}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{row.totalKg.toLocaleString()} kg</span>
                <span>{new Date(row.fechaEntregaDeseada).toLocaleDateString(locale === 'en' ? 'en-GB' : 'es-ES')}</span>
              </div>
              <CoverageBar percentage={row.coverage} />
            </div>
          );
        }}
      />
    </div>
  );
}
