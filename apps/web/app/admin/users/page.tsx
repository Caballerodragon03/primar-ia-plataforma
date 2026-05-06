'use client';

import { useEffect, useState, useCallback } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Select } from '@/components/ui/Select';
import { api } from '@/lib/api';
import { CheckCircle, XCircle, Eye, Ban, Trash2 } from 'lucide-react';

interface AdminUser {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  role: 'VENDEDOR' | 'COMPRADOR' | 'ADMIN';
  estado: string;
  empresa: { razonSocial: string; cifNif: string } | null;
}

interface UserDetailModalProps {
  user: AdminUser;
  onClose: () => void;
  onVerify: (id: string) => void;
  onReject: (id: string) => void;
  onBan: (id: string) => void;
  onDelete: (id: string) => void;
}

function UserDetailModal({ user, onClose, onVerify, onReject, onBan, onDelete }: UserDetailModalProps) {
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
            ['CIF/NIF', user.empresa?.cifNif || '—'],
            ['Company', user.empresa?.razonSocial || '—'],
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
                <span className="text-gray-900 text-right max-w-[60%] truncate">{value}</span>
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

        <div className="flex gap-3 border-t border-[#E5E7EB] pt-3">
          <button
            onClick={() => { onBan(user.id); onClose(); }}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-[8px] hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <Ban className="w-4 h-4" />
            Ban
          </button>
          <button
            onClick={() => { onDelete(user.id); onClose(); }}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-white text-red-600 text-sm font-semibold rounded-[8px] border border-red-200 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass: string;
  showReason?: boolean;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}

function ConfirmModal({ title, message, confirmLabel, confirmClass, showReason, onConfirm, onCancel }: ConfirmModalProps) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] shadow-lg w-full max-w-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-600">{message}</p>
        {showReason && (
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            className="w-full border border-[#E5E7EB] rounded-[8px] p-2 text-sm resize-none h-20"
          />
        )}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-[8px] hover:bg-gray-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason || undefined)}
            className={`flex-1 px-4 py-2 text-sm font-semibold rounded-[8px] transition-colors cursor-pointer ${confirmClass}`}
          >
            {confirmLabel}
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
  { value: 'EMAIL_NO_VERIFICADO', label: 'Email Not Verified' },
  { value: 'EMAIL_VERIFICADO', label: 'Email Verified' },
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
  const [confirmAction, setConfirmAction] = useState<{ type: 'ban' | 'delete'; userId: string } | null>(null);

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

  const handleBan = async (userId: string, reason?: string) => {
    try {
      await api.post(`/admin/users/${userId}/ban`, { reason });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      alert('Ban failed. Please try again.');
    }
    setConfirmAction(null);
  };

  const handleDelete = async (userId: string) => {
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      alert('Delete failed. Please try again.');
    }
    setConfirmAction(null);
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
      id: 'cifNif',
      header: 'CIF/NIF',
      cell: ({ row }) => row.original.empresa?.cifNif || '—',
    },
    {
      id: 'empresa',
      header: 'EMPRESA',
      cell: ({ row }) => row.original.empresa?.razonSocial || '—',
    },
    {
      id: 'actions',
      header: 'ACTIONS',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
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
          <button
            onClick={() => setConfirmAction({ type: 'ban', userId: row.original.id })}
            className="p-1.5 rounded text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Ban"
          >
            <Ban className="w-4 h-4" />
          </button>
          <button
            onClick={() => setConfirmAction({ type: 'delete', userId: row.original.id })}
            className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
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
          onBan={(id) => setConfirmAction({ type: 'ban', userId: id })}
          onDelete={(id) => setConfirmAction({ type: 'delete', userId: id })}
        />
      )}

      {/* Confirm Ban Modal */}
      {confirmAction?.type === 'ban' && (
        <ConfirmModal
          title="Ban User"
          message="This will permanently ban this user's email and CIF/NIF from the platform. They will not be able to register again. This action cannot be undone."
          confirmLabel="Ban User"
          confirmClass="bg-gray-900 text-white hover:bg-gray-800"
          showReason
          onConfirm={(reason) => handleBan(confirmAction.userId, reason)}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* Confirm Delete Modal */}
      {confirmAction?.type === 'delete' && (
        <ConfirmModal
          title="Delete Account"
          message="This will delete the user's account and all associated data. The user will be able to register again with the same email."
          confirmLabel="Delete Account"
          confirmClass="bg-red-600 text-white hover:bg-red-700"
          onConfirm={() => handleDelete(confirmAction.userId)}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
