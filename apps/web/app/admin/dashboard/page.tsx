'use client';

import { useEffect, useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { KPICard } from '@/components/ui/KPICard';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api } from '@/lib/api';
import { Users, Clock, Package, DollarSign } from 'lucide-react';

interface AdminStats {
  users: { total: number; byRole: Record<string, number>; byEstado: Record<string, number> };
  lots: { total: number };
  orders: { total: number };
  transactions: { total: number };
  commissionEarned: number;
}

interface PendingUser {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  role: string;
  empresa: { razonSocial: string; cifNif: string } | null;
  createdAt: string;
}

interface PendingCertificate {
  id: string;
  userName: string;
  certType: string;
  estado: string;
  createdAt: string;
}

const pendingUserColumns: ColumnDef<PendingUser, string>[] = [
  {
    accessorKey: 'nombre',
    header: 'NAME',
    cell: ({ row }) => `${row.original.nombre} ${row.original.apellidos}`,
  },
  { accessorKey: 'email', header: 'EMAIL' },
  { accessorKey: 'role', header: 'ROLE' },
  {
    accessorKey: 'empresa',
    header: 'COMPANY',
    cell: ({ row }) => row.original.empresa?.razonSocial ?? '—',
  },
  {
    accessorKey: 'createdAt',
    header: 'REGISTERED',
    cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString(),
  },
];

const pendingCertColumns: ColumnDef<PendingCertificate, string>[] = [
  { accessorKey: 'userName', header: 'USER' },
  { accessorKey: 'certType', header: 'CERT TYPE' },
  {
    accessorKey: 'estado',
    header: 'STATUS',
    cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
  },
  {
    accessorKey: 'createdAt',
    header: 'SUBMITTED',
    cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString(),
  },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [pendingCerts, setPendingCerts] = useState<PendingCertificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, usersRes, certsRes] = await Promise.all([
          api.get<{ data: AdminStats }>('/admin/stats'),
          api.get<{ data: PendingUser[] }>('/admin/users?estado=EMAIL_NO_VERIFICADO,EMAIL_VERIFICADO,PENDIENTE_VERIFICACION'),
          api.get<{ data: PendingCertificate[] }>('/admin/certificados?estado=PENDIENTE&limit=5'),
        ]);
        setStats(statsRes.data.data);
        setPendingUsers(usersRes.data.data);
        setPendingCerts(certsRes.data.data);
      } catch {
        // fallback: keep empty state
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Users"
          value={stats ? stats.users.total.toLocaleString() : '—'}
          icon={<Users className="w-4 h-4" />}
        />
        <KPICard
          label="Pending Verification"
          value={stats ? (
            (stats.users.byEstado['EMAIL_NO_VERIFICADO'] ?? 0) +
            (stats.users.byEstado['EMAIL_VERIFICADO'] ?? 0) +
            (stats.users.byEstado['PENDIENTE_VERIFICACION'] ?? 0)
          ).toLocaleString() : '—'}
          sub="Awaiting review"
          icon={<Clock className="w-4 h-4 text-amber-500" />}
        />
        <KPICard
          label="Active Lots"
          value={stats ? stats.lots.total.toLocaleString() : '—'}
          icon={<Package className="w-4 h-4" />}
        />
        <KPICard
          label="Platform Commission"
          value={stats ? `€${stats.commissionEarned.toLocaleString()}` : '—'}
          sub="This month"
          icon={<DollarSign className="w-4 h-4 text-green-500" />}
        />
      </div>

      {/* Pending Users */}
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Pending Users</h2>
          <a href="/admin/users" className="text-xs text-[#E1C44D] hover:underline font-medium">
            View all
          </a>
        </div>
        <DataTable
          data={pendingUsers}
          columns={pendingUserColumns}
          isLoading={loading}
          emptyMessage="No pending users."
          searchPlaceholder="Search..."
        />
      </div>

      {/* Pending Certificates */}
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Pending Certificates</h2>
          <a href="/admin/certificates" className="text-xs text-[#E1C44D] hover:underline font-medium">
            View all
          </a>
        </div>
        <DataTable
          data={pendingCerts}
          columns={pendingCertColumns}
          isLoading={loading}
          emptyMessage="No pending certificates."
          searchPlaceholder="Search..."
        />
      </div>
    </div>
  );
}
