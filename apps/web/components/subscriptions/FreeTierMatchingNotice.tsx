'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, Zap } from 'lucide-react';
import { api } from '@/lib/api';

interface FreeTierMatchingNoticeProps {
  /** "lot" or "order" — only changes wording. */
  itemKind: 'lote' | 'pedido';
  /** Path to the subscription page for the upgrade CTA. */
  subscriptionHref: string;
}

interface Credits {
  available: number;
  max: number;
  nextRegenAt: string | null;
  isFreeTier: boolean;
}

export function FreeTierMatchingNotice({ itemKind, subscriptionHref }: FreeTierMatchingNoticeProps) {
  const [credits, setCredits] = useState<Credits | null>(null);

  useEffect(() => {
    api
      .get<{ data: Credits }>('/subscriptions/credits')
      .then(({ data }) => setCredits(data.data))
      .catch(() => setCredits(null));
  }, []);

  // Only show for free-tier users
  if (!credits || !credits.isFreeTier) return null;

  const verb = itemKind === 'lote' ? 'publiques este lote' : 'publiques este pedido';
  const subject = itemKind === 'lote' ? 'lote' : 'pedido';

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-card p-4 flex items-start gap-3">
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
        <Clock className="w-4 h-4 text-amber-700" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900">
          Tu plan gratuito retrasa el matching 24 horas
        </p>
        <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
          Cuando {verb}, las propuestas de matching se generarán de inmediato pero no serán
          visibles hasta dentro de 24h. Mejora tu plan para que tu {subject} comience a
          recibir matches al instante.
        </p>
        <Link
          href={subscriptionHref}
          className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-amber-900 bg-amber-200/60 hover:bg-amber-200 px-3 py-1 rounded-button transition-colors"
        >
          <Zap className="w-3 h-3" />
          Ver planes y eliminar el retraso
        </Link>
      </div>
    </div>
  );
}
