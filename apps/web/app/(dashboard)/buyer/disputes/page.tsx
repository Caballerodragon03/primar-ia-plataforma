'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { AlertTriangle } from 'lucide-react';

interface Dispute {
  id: string;
  tipoProblema: string;
  estado: string;
  createdAt: string;
  transaccion?: {
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
  ABIERTA: 'Open',
  RESPUESTA_VENDEDOR: 'Seller responded',
  EN_REVISION: 'Under review',
  RESUELTA: 'Resolved',
};

export default function BuyerDisputesPage() {
  const router = useRouter();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: Dispute[] }>('/disputes')
      .then((res) => setDisputes(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-red-500" />
        <h1 className="text-xl font-bold text-gray-900">My Disputes</h1>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : disputes.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400">No disputes found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map((d) => {
            const vendedor = d.transaccion?.vendedor;
            const producto = d.transaccion?.match?.pedido?.producto?.nombre;
            const badgeClass = ESTADO_COLORS[d.estado] ?? 'bg-gray-100 text-gray-600';
            const badgeLabel = ESTADO_LABELS[d.estado] ?? d.estado;

            return (
              <button
                key={d.id}
                onClick={() => router.push(`/buyer/disputes/${d.id}`)}
                className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{d.tipoProblema.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-500">
                      {producto && <span>{producto} · </span>}
                      {vendedor && <span>Seller: {vendedor.nombre} {vendedor.apellidos} · </span>}
                      {new Date(d.createdAt).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${badgeClass}`}>
                    {badgeLabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
