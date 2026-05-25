'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { Plus, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { DataTable, StatusBadge, CoverageBar, Button } from '@/components/ui';
import { useT, useLocale } from '@/lib/i18n/LocaleProvider';

type LotRow = {
  id: string;
  producto: { nombre: string };
  totalKg: number;
  coverage: number;
  estado: string;
  fechaDisponibilidad: string;
};

const col = createColumnHelper<LotRow>();

// Phase 14M v3.40 — TABS y columns ahora dependen del locale (se
// construyen dentro del componente con useT) en lugar de ser constantes
// a nivel de módulo. Antes los headers/labels eran siempre en español.

export default function MyLotsPage() {
  const router = useRouter();
  const t = useT();
  const { locale } = useLocale();

  const TABS = useMemo(() => [
    { key: 'all', label: t('lots.tab.all') },
    { key: 'open', label: t('lots.tab.open') },
    { key: 'inprogress', label: t('lots.tab.inProgress') },
    { key: 'full', label: t('lots.tab.full') },
    { key: 'cancelled', label: t('lots.tab.cancelled') },
  ], [t]);

  const columns = useMemo(() => [
    col.accessor('id', {
      header: t('lots.col.id'),
      cell: (info) => (
        <Link
          href={`/seller/lots/${info.getValue()}`}
          className="text-secondary font-medium hover:text-primary transition-colors"
        >
          #{info.getValue().slice(-6).toUpperCase()}
        </Link>
      ),
    }),
    col.accessor('producto.nombre', { header: t('lots.col.product') }),
    col.accessor('totalKg', {
      header: t('lots.col.totalKg'),
      cell: (info) => `${info.getValue().toLocaleString()} kg`,
    }),
    col.accessor('coverage', {
      header: t('lots.col.coverage'),
      cell: (info) => <CoverageBar percentage={info.getValue()} className="min-w-[120px]" />,
    }),
    col.accessor('estado', {
      header: t('lots.col.status'),
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    col.accessor('fechaDisponibilidad', {
      header: t('lots.col.availableDate'),
      cell: (info) => new Date(info.getValue()).toLocaleDateString(locale === 'en' ? 'en-GB' : 'es-ES'),
    }),
  ], [t, locale]);

  const [lots, setLots] = useState<LotRow[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [globalFilter, setGlobalFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [pendingRating, setPendingRating] = useState<{ transaccionId: string; matchId: string; lotId: string; orderId: string; destinatarioId: string } | null>(null);

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
        <h1 className="text-2xl font-bold text-text-primary">{t('lots.title')}</h1>
        <Link href="/seller/lots/new" data-tutorial="btn-nuevo-lote">
          <Button variant="primary" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {t('lots.newLot')}
          </Button>
        </Link>
      </div>

      {pendingRating && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-300 rounded-card px-4 py-3">
          <Star className="w-4 h-4 text-yellow-500 flex-shrink-0 fill-yellow-500" />
          <p className="text-sm text-yellow-900 flex-1">
            {t('lots.pendingRating')}
          </p>
          <Link
            href={`/seller/contracts/${pendingRating.matchId}`}
            className="text-xs font-medium text-yellow-800 underline hover:no-underline flex-shrink-0"
          >
            {t('lots.rateNow')}
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
        searchPlaceholder={t('lots.search')}
        isLoading={isLoading}
        emptyMessage={t('lots.empty')}
        onRowClick={(row) => router.push(`/seller/lots/${row.id}`)}
      />
    </div>
  );
}
