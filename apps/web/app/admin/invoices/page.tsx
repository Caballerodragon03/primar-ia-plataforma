'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

interface PlatformInvoice {
  id: string;
  numero: string;
  fecha: string;
  producto: string;
  vendedor: { nombre: string; empresa: string | null; cifNif: string | null };
  comprador: { nombre: string; empresa: string | null; cifNif: string | null };
  precioTotal: number;
  comisionPlataforma: number;
  comisionPorcentaje: number;
  estado: string;
}

interface InvoiceListResponse {
  data: PlatformInvoice[];
  total: number;
  page: number;
  totalPages: number;
}

function formatEur(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<PlatformInvoice[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [totalComision, setTotalComision] = useState(0);

  const fetchInvoices = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: InvoiceListResponse }>(`/invoices/admin?page=${p}`);
      const d = res.data.data;
      setInvoices(d.data);
      setPage(d.page);
      setTotalPages(d.totalPages);
      setTotal(d.total);
      setTotalComision(d.data.reduce((acc, i) => acc + i.comisionPlataforma, 0));
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices(1);
  }, [fetchInvoices]);

  const openInvoice = async (txId: string) => {
    try {
      const res = await api.get(`/invoices/admin/${txId}/html`, { responseType: 'text' });
      const blob = new Blob([res.data], { type: 'text/html' });
      window.open(URL.createObjectURL(blob), '_blank');
    } catch {
      alert('Error al abrir la factura');
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-64 bg-gray-100 rounded" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Facturas de Plataforma</h1>
          <p className="text-sm text-gray-500 mt-1">{total} transacciones completadas</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-right">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Comisión total (página)</p>
          <p className="text-lg font-bold text-gray-900">{formatEur(totalComision)}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {['Nº Factura', 'Fecha', 'Producto', 'Vendedor', 'Comprador', 'Precio total', 'Comisión', '%', 'Estado', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{inv.numero}</td>
                <td className="px-4 py-3">{inv.fecha}</td>
                <td className="px-4 py-3 font-medium">{inv.producto}</td>
                <td className="px-4 py-3">
                  <div>{inv.vendedor.empresa ?? inv.vendedor.nombre}</div>
                  {inv.vendedor.cifNif && <div className="text-xs text-gray-400">{inv.vendedor.cifNif}</div>}
                </td>
                <td className="px-4 py-3">
                  <div>{inv.comprador.empresa ?? inv.comprador.nombre}</div>
                  {inv.comprador.cifNif && <div className="text-xs text-gray-400">{inv.comprador.cifNif}</div>}
                </td>
                <td className="px-4 py-3 text-right font-medium">{formatEur(inv.precioTotal)}</td>
                <td className="px-4 py-3 text-right font-semibold text-green-700">{formatEur(inv.comisionPlataforma)}</td>
                <td className="px-4 py-3 text-right text-gray-500">{(inv.comisionPorcentaje * 100).toFixed(2)}%</td>
                <td className="px-4 py-3">
                  <span className={[
                    'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium',
                    inv.estado === 'COMPLETADO' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700',
                  ].join(' ')}>
                    {inv.estado}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => openInvoice(inv.id)}
                    className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                    title="Ver factura"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                  No hay facturas todavía
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={() => fetchInvoices(page - 1)}
            disabled={page <= 1}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => fetchInvoices(page + 1)}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
