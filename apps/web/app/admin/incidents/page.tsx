'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/DataTable';
import { Select } from '@/components/ui/Select';
import { api } from '@/lib/api';
import { AlertTriangle } from 'lucide-react';

interface Dispute {
  id: string;
  tipoProblema: string;
  estado: 'ABIERTA' | 'RESPUESTA_VENDEDOR' | 'EN_REVISION' | 'RESUELTA';
  createdAt: string;
  transaccion?: {
    comprador?: { nombre: string; apellidos: string };
    vendedor?: { nombre: string; apellidos: string };
    match?: { pedido?: { producto?: { nombre: string } } };
  };
}

const ESTADO_COLORS: Record<string, string> = {
  ABIERTA: 'bg-red-100 text-red-700',
  RESPUESTA_VENDEDOR: 'bg-amber-100 text-amber-700',
  EN_REVISION: 'bg-blue-100 text-blue-700',
  RESUELTA: 'bg-green-100 text-green-700',
};

const ESTADO_LABELS: Record<string, string> = {
  ABIERTA: 'Abierta',
  RESPUESTA_VENDEDOR: 'Resp. Vendedor',
  EN_REVISION: 'En Revisión',
  RESUELTA: 'Resuelta',
};

function DisputeBadge({ estado }: { estado: string }) {
  const classes = ESTADO_COLORS[estado] ?? 'bg-gray-100 text-gray-600';
  const label = ESTADO_LABELS[estado] ?? estado;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-badge text-xs font-medium ${classes}`}>
      {label}
    </span>
  );
}

const ESTADO_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'ABIERTA', label: 'Abierta' },
  { value: 'RESPUESTA_VENDEDOR', label: 'Respuesta Vendedor' },
  { value: 'EN_REVISION', label: 'En Revisión' },
  { value: 'RESUELTA', label: 'Resuelta' },
];

export default function AdminIncidentsPage() {
  const router = useRouter();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [estadoFilter, setEstadoFilter] = useState('');
  const [globalFilter, setGlobalFilter] = useState('');

  const openCount = disputes.filter((d) => d.estado !== 'RESUELTA').length;

  const loadDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (estadoFilter) params.set('estado', estadoFilter);
      const res = await api.get<{ data: Dispute[] }>(`/disputes?${params.toString()}`);
      setDisputes(res.data.data);
    } catch {
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  }, [estadoFilter]);

  useEffect(() => { loadDisputes(); }, [loadDisputes]);

  const columns: ColumnDef<Dispute, string>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-gray-500">{getValue<string>().slice(0, 8)}…</span>
      ),
    },
    {
      accessorKey: 'tipoProblema',
      header: 'TIPO PROBLEMA',
      cell: ({ getValue }) => (
        <span className="text-gray-900">{getValue<string>()}</span>
      ),
    },
    {
      accessorKey: 'estado',
      header: 'ESTADO',
      cell: ({ getValue }) => <DisputeBadge estado={getValue<string>()} />,
    },
    {
      accessorKey: 'createdAt',
      header: 'FECHA APERTURA',
      cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString('es-ES'),
    },
    {
      id: 'comprador',
      header: 'COMPRADOR',
      cell: ({ row }) => {
        const c = row.original.transaccion?.comprador;
        return c ? `${c.nombre} ${c.apellidos}` : '—';
      },
    },
    {
      id: 'vendedor',
      header: 'VENDEDOR',
      cell: ({ row }) => {
        const v = row.original.transaccion?.vendedor;
        return v ? `${v.nombre} ${v.apellidos}` : '—';
      },
    },
    {
      id: 'producto',
      header: 'PRODUCTO',
      cell: ({ row }) => row.original.transaccion?.match?.pedido?.producto?.nombre ?? '—',
    },
    {
      id: 'actions',
      header: 'ACCIONES',
      cell: ({ row }) => (
        <button
          onClick={() => router.push(`/admin/incidents/${row.original.id}`)}
          className="px-3 py-1.5 text-xs font-medium text-[#E1C44D] border border-[#E1C44D] rounded-[6px] hover:bg-[#E1C44D]/10 transition-colors cursor-pointer"
        >
          Ver detalle
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900">Incidentes</h1>
        {openCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-badge">
            <AlertTriangle className="w-3.5 h-3.5" />
            {openCount} sin resolver
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          label="Estado"
          value={estadoFilter}
          onChange={(e) => setEstadoFilter(e.target.value)}
          options={ESTADO_OPTIONS}
        />
      </div>

      {/* Table — clickable rows */}
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] p-5">
        <DataTable
          data={disputes}
          columns={columns}
          isLoading={loading}
          emptyMessage="No se encontraron incidentes."
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          searchPlaceholder="Buscar incidentes..."
        />
      </div>
    </div>
  );
}
