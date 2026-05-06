'use client';

import { useEffect, useState, useCallback } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Select } from '@/components/ui/Select';
import { api } from '@/lib/api';
import { CheckCircle, XCircle, Eye } from 'lucide-react';

interface AdminUser {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  role: 'VENDEDOR' | 'COMPRADOR' | 'ADMIN';
  estado: string;
  empresa: string;
}

interface UserDetailModalProps {
  user: AdminUser;
  onClose: () => void;
  onVerify: (id: string) => void;
  onReject: (id: string) => void;
}

function UserDetailModal({ user, onClose, onVerify, onReject }: UserDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-lg w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">User Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none cursor-pointer">
            &times;
          </button>
        </div>

        <div className="space-y-2 text-sm">
          {[
            ['Name', `${user.nombre} ${user.apellidos}`],
            ['Email', user.email],
            ['Role', user.role],
            ['Company', user.empresa || '—'],
            ['Status', ''],
          ].map(([label, value]) =>
            label === 'Status' ? (
              <div key={label} className="flex justify-between items-center py-1 border-b border-[#E5E7EB]">
                <span className="text-gray-500 font-medium">{label}</span>
                <StatusBadge status={user.estado} />
              </div>
            ) : (
              <div key={label} className="flex justify-between py-1 border-b border-[#E5E7EB]">
                <span className="text-gray-500 font-medium">{label}</span>
                <span className="text-gray-900">{value}</span>
              </div>
            )
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => { onVerify(user.id); onClose(); }}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-[#E1C44D] text-gray-900 text-sm font-semibold rounded-[8px] hover:bg-[#c9ad40] transition-colors cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            Verify
          </button>
          <button
            onClick={() => { onReject(user.id); onClose(); }}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 text-sm font-semibold rounded-[8px] hover:bg-red-100 transition-colors cursor-pointer"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'COMPRADOR', label: 'Buyer' },
  { value: 'VENDEDOR', label: 'Seller' },
  { value: 'ADMIN', label: 'Admin' },
];

const ESTADO_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDIENTE_VERIFICACION', label: 'Pending Verification' },
  { value: 'VERIFICADO_ACTIVO', label: 'Verified Active' },
  { value: 'RECHAZADO', label: 'Rejected' },
  { value: 'SUSPENDIDO', label: 'Suspended' },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.set('role', roleFilter);
      if (estadoFilter) params.set('estado', estadoFilter);
      const res = await api.get<{ data: AdminUser[] }>(`/admin/users?${params.toString()}`);
      setUsers(res.data.data);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, estadoFilter]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleEstadoChange = async (id: string, newEstado: string) => {
    try {
      await api.patch(`/admin/users/${id}/estado`, { estado: newEstado });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, estado: newEstado } : u)));
    } catch {
      alert('Action failed. Please try again.');
    }
  };

  const columns: ColumnDef<AdminUser, string>[] = [
    {
      accessorKey: 'nombre',
      header: 'NAME',
      cell: ({ row }) => (
        <span className="font-medium text-gray-900">
          {row.original.nombre} {row.original.apellidos}
        </span>
      ),
    },
    { accessorKey: 'email', header: 'EMAIL' },
    { accessorKey: 'role', header: 'ROLE' },
    {
      accessorKey: 'estado',
      header: 'ESTADO',
      cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
    },
    {
      accessorKey: 'empresa',
      header: 'EMPRESA',
      cell: ({ getValue }) => getValue<string>() || '—',
    },
    {
      id: 'actions',
      header: 'ACTIONS',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedUser(row.original)}
            className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            title="View details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleEstadoChange(row.original.id, 'VERIFICADO_ACTIVO')}
            className="p-1.5 rounded text-green-400 hover:text-green-600 hover:bg-green-50 transition-colors cursor-pointer"
            title="Verify"
          >
            <CheckCircle className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleEstadoChange(row.original.id, 'RECHAZADO')}
            className="p-1.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
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
      <h1 className="text-xl font-bold text-gray-900">User Management</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          label="Role"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          options={ROLE_OPTIONS}
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
          data={users}
          columns={columns}
          isLoading={loading}
          emptyMessage="No users found."
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          searchPlaceholder="Search users..."
        />
      </div>

      {/* Detail Modal */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onVerify={(id) => handleEstadoChange(id, 'VERIFICADO_ACTIVO')}
          onReject={(id) => handleEstadoChange(id, 'RECHAZADO')}
        />
      )}
    </div>
  );
}
