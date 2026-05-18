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
    comprador?: { nombre: string; apellidos: string };
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
  RESPUESTA_VENDEDOR: 'Respuesta del vendedor',
  EN_REVISION: 'En revisión',
  RESUELTA: 'Resuelta',
};

export default function SellerDisputesPage() {
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
        <h1 className="text-xl font-bold text-foreground">Mis Reclamaciones</h1>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : disputes.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">Sin reclamaciones.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map((d) => {
            const comprador = d.transaccion?.comprador;
            const producto = d.transaccion?.match?.pedido?.producto?.nombre;
            const badgeClass = ESTADO_COLORS[d.estado] ?? 'bg-muted text-muted-foreground';
            const badgeLabel = ESTADO_LABELS[d.estado] ?? d.estado;

            return (
              <button
                key={d.id}
                onClick={() => router.push(`/seller/disputes/${d.id}`)}
                className="w-full text-left bg-card rounded-xl border border-border p-4 hover:border-border transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{d.tipoProblema.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground">
                      {producto && <span>{producto} · </span>}
                      {comprador && <span>Buyer: {comprador.nombre} {comprador.apellidos} · </span>}
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
