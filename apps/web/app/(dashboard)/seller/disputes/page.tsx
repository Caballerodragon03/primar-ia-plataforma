'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { AlertTriangle } from 'lucide-react';
import { useT, useLocale } from '@/lib/i18n/LocaleProvider';
import type { MessageKey } from '@/lib/i18n/messages';

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

const ESTADO_LABEL_KEYS: Record<string, MessageKey> = {
  ABIERTA: 'disputes.estado.open',
  RESPUESTA_VENDEDOR: 'disputes.estado.sellerResponded',
  EN_REVISION: 'disputes.estado.inReview',
  RESUELTA: 'disputes.estado.resolved',
};

export default function SellerDisputesPage() {
  const t = useT();
  const { locale } = useLocale();
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
        <h1 className="text-xl font-bold text-foreground">{t('disputes.title')}</h1>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : disputes.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">{t('disputes.none')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map((d) => {
            const comprador = d.transaccion?.comprador;
            const producto = d.transaccion?.match?.pedido?.producto?.nombre;
            const badgeClass = ESTADO_COLORS[d.estado] ?? 'bg-muted text-muted-foreground';
            const labelKey = ESTADO_LABEL_KEYS[d.estado];
            const badgeLabel = labelKey ? t(labelKey) : d.estado;

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
                      {comprador && <span>{t('disputes.role.buyer')}: {comprador.nombre} {comprador.apellidos} · </span>}
                      {new Date(d.createdAt).toLocaleDateString(locale === 'en' ? 'en-GB' : 'es-ES')}
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
