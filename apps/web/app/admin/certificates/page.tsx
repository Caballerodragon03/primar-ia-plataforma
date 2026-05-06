'use client';

import { useEffect, useState, useCallback } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Select } from '@/components/ui/Select';
import { api } from '@/lib/api';
import { CheckCircle, XCircle } from 'lucide-react';

interface Certificate {
  id: string;
  userName: string;
  userEmail: string;
  certType: string;
  estado: string;
  expiry: string | null;
  fileUrl?: string;
}

const CERT_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'GLOBAL_GAP', label: 'GlobalG.A.P.' },
  { value: 'BIO', label: 'Organic / Bio' },
  { value: 'ISO', label: 'ISO' },
  { value: 'OTHER', label: 'Other' },
];

const ESTADO_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDIENTE', label: 'Pending' },
  { value: 'VERIFICADO', label: 'Verified' },
  { value: 'RECHAZADO', label: 'Rejected' },
  { value: 'EXPIRADO', label: 'Expired' },
];

export default function AdminCertificatesPage() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [certTypeFilter, setCertTypeFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [globalFilter, setGlobalFilter] = useState('');

  const loadCerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (certTypeFilter) params.set('certType', certTypeFilter);
      if (estadoFilter) params.set('estado', estadoFilter);
      const res = await api.get<{ data: Certificate[] }>(`/admin/certificados?${params.toString()}`);
      setCerts(res.data.data);
    } catch {
      setCerts([]);
    } finally {
      setLoading(false);
    }
  }, [certTypeFilter, estadoFilter]);

  useEffect(() => { loadCerts(); }, [loadCerts]);

  const handleAction = async (id: string, action: 'verify' | 'reject') => {
    try {
      if (action === 'verify') {
        await api.post(`/admin/certificados/${id}/verify`);
        setCerts((prev) => prev.map((c) => (c.id === id ? { ...c, estado: 'VERIFICADO' } : c)));
      } else {
        await api.post(`/admin/certificados/${id}/verify`, { action: 'reject' });
        setCerts((prev) => prev.map((c) => (c.id === id ? { ...c, estado: 'RECHAZADO' } : c)));
      }
    } catch {
      alert('Action failed. Please try again.');
    }
  };

  const columns: ColumnDef<Certificate, string>[] = [
    {
      accessorKey: 'userName',
      header: 'USER',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-gray-900">{row.original.userName}</p>
          <p className="text-xs text-gray-500">{row.original.userEmail}</p>
        </div>
      ),
    },
    { accessorKey: 'certType', header: 'CERT TYPE' },
    {
      accessorKey: 'estado',
      header: 'ESTADO',
      cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
    },
    {
      accessorKey: 'expiry',
      header: 'EXPIRY',
      cell: ({ getValue }) => {
        const v = getValue<string | null>();
        return v ? new Date(v).toLocaleDateString() : '—';
      },
    },
    {
      id: 'actions',
      header: 'ACTIONS',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.fileUrl && (
            <a
              href={row.original.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#E1C44D] hover:underline font-medium"
            >
              View File
            </a>
          )}
          <button
            onClick={() => handleAction(row.original.id, 'verify')}
            disabled={row.original.estado === 'VERIFICADO'}
            className="p-1.5 rounded text-green-400 hover:text-green-600 hover:bg-green-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Verify"
          >
            <CheckCircle className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleAction(row.original.id, 'reject')}
            disabled={row.original.estado === 'RECHAZADO'}
            className="p-1.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Reject"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900">Certificate Management</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          label="Cert Type"
          value={certTypeFilter}
          onChange={(e) => setCertTypeFilter(e.target.value)}
          options={CERT_TYPE_OPTIONS}
        />
        <Select
          label="Status"
          value={estadoFilter}
          onChange={(e) => setEstadoFilter(e.target.value)}
          options={ESTADO_OPTIONS}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] p-5">
        <DataTable
          data={certs}
          columns={columns}
          isLoading={loading}
          emptyMessage="No certificates found."
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          searchPlaceholder="Search certificates..."
        />
      </div>
    </div>
  );
}
