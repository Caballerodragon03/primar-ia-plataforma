'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { AlertCircle, Plus, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { DataTable, StatusBadge, CoverageBar, Button } from '@/components/ui';

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

const TABS = [
  { key: 'all', label: 'Todos' },
  { key: 'open', label: 'Abiertos' },
  { key: 'inprogress', label: 'En curso' },
  { key: 'full', label: 'Completos' },
  { key: 'cancelled', label: 'Cancelados' },
  { key: 'closed', label: 'Cerrados' },
];

const columns = [
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
    header: 'ID Pedido',
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
  col.accessor('producto.nombre', { header: 'Producto' }),
  col.accessor('totalKg', {
    header: 'Cantidad total',
    cell: (info) => `${info.getValue().toLocaleString()} kg`,
  }),
  col.accessor('coverage', {
    header: '% Cobertura',
    cell: (info) => <CoverageBar percentage={info.getValue()} className="min-w-[120px]" />,
  }),
  col.accessor('estado', {
    header: 'Estado',
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  col.accessor('fechaEntregaDeseada', {
    header: 'Fecha entrega',
    cell: (info) => new Date(info.getValue()).toLocaleDateString('es-ES'),
  }),
];

export default function MyOrdersPage() {
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
        <h1 className="text-2xl font-bold text-text-primary">Mis Pedidos</h1>
        <Link href="/buyer/orders/new">
          <Button variant="primary" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Order
          </Button>
        </Link>
      </div>

      {pendingRating && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-300 rounded-card px-4 py-3">
          <Star className="w-4 h-4 text-yellow-500 flex-shrink-0 fill-yellow-500" />
          <p className="text-sm text-yellow-900 flex-1">
            Tienes una transacción pendiente de valorar.
          </p>
          <Link
            href={`/buyer/orders/${pendingRating.orderId}`}
            className="text-xs font-medium text-yellow-800 underline hover:no-underline flex-shrink-0"
          >
            Valorar ahora
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
        searchPlaceholder="Buscar por ID de pedido o producto..."
        isLoading={isLoading}
        emptyMessage="Sin pedidos. Crea tu primer pedido para empezar."
      />
    </div>
  );
}
