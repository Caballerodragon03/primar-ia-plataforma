'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { Plus, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { DataTable, StatusBadge, CoverageBar, Button } from '@/components/ui';

type LotRow = {
  id: string;
  producto: { nombre: string };
  totalKg: number;
  coverage: number;
  estado: string;
  fechaDisponibilidad: string;
};

const col = createColumnHelper<LotRow>();

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'inprogress', label: 'In Progress' },
  { key: 'full', label: 'Full' },
  { key: 'cancelled', label: 'Cancelled' },
];

const columns = [
  col.accessor('id', {
    header: 'Lot ID',
    cell: (info) => (
      <Link
        href={`/seller/lots/${info.getValue()}`}
        className="text-secondary font-medium hover:text-primary transition-colors"
      >
        #{info.getValue().slice(-6).toUpperCase()}
      </Link>
    ),
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
  col.accessor('fechaDisponibilidad', {
    header: 'Pickup Date',
    cell: (info) => new Date(info.getValue()).toLocaleDateString('es-ES'),
  }),
];

export default function MyLotsPage() {
  const [lots, setLots] = useState<LotRow[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [globalFilter, setGlobalFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [pendingRating, setPendingRating] = useState<{ transaccionId: string; lotId: string; orderId: string; destinatarioId: string } | null>(null);

  const fetchLots = useCallback(async (tab: string) => {
    setIsLoading(true);
    try {
      const params = tab !== 'all' ? { tab } : {};
      const { data } = await api.get('/lots', { params });
      setLots(data.data);
    } catch {
      setLots([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchLots(activeTab); }, [activeTab, fetchLots]);

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
        <h1 className="text-2xl font-bold text-text-primary">My Lots</h1>
        <Link href="/seller/lots/new">
          <Button variant="primary" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Lot
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
            href={`/seller/lots/${pendingRating.lotId}/qr/${pendingRating.transaccionId}`}
            className="text-xs font-medium text-yellow-800 underline hover:no-underline flex-shrink-0"
          >
            Valorar ahora
          </Link>
        </div>
      )}

      <DataTable
        data={lots}
        columns={columns}
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        searchPlaceholder="Search by Lot ID or Product..."
        isLoading={isLoading}
        emptyMessage="No lots found. Publish your first lot to start selling."
      />
    </div>
  );
}
