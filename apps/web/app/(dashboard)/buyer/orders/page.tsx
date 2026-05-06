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
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'inprogress', label: 'In Progress' },
  { key: 'full', label: 'Full' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'closed', label: 'Closed' },
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
    header: 'Order ID',
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
  col.accessor('producto.nombre', { header: 'Product' }),
  col.accessor('totalKg', {
    header: 'Total Quantity',
    cell: (info) => `${info.getValue().toLocaleString()} kg`,
  }),
  col.accessor('coverage', {
    header: 'Coverage %',
    cell: (info) => <CoverageBar percentage={info.getValue()} className="min-w-[120px]" />,
  }),
  col.accessor('estado', {
    header: 'Status',
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  col.accessor('fechaEntregaDeseada', {
    header: 'Delivery Date',
    cell: (info) => new Date(info.getValue()).toLocaleDateString('es-ES'),
  }),
];

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [globalFilter, setGlobalFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

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

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setGlobalFilter('');
  };

  const completedOrders = orders.filter((o) => o.estado === 'COMPLETADO');
  const firstCompleted = completedOrders[0];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">My Orders</h1>
        <Link href="/buyer/orders/new">
          <Button variant="primary" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Order
          </Button>
        </Link>
      </div>

      {!isLoading && firstCompleted && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-300 rounded-card px-4 py-3">
          <Star className="w-4 h-4 text-yellow-500 flex-shrink-0 fill-yellow-500" />
          <p className="text-sm text-yellow-900 flex-1">
            Tienes {completedOrders.length > 1 ? `${completedOrders.length} transacciones pendientes` : 'una transaccion pendiente'} de valorar.
          </p>
          <Link
            href={`/buyer/orders/${firstCompleted.id}`}
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
        searchPlaceholder="Search by Order ID or Product..."
        isLoading={isLoading}
        emptyMessage="No orders found. Create your first order to get started."
      />
    </div>
  );
}
