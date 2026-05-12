'use client';
import { useEffect, useState } from 'react';
import { Coins, Clock } from 'lucide-react';

interface Credits {
  available: number;
  max: number;
  nextRegenAt: string | null;
  isFreeTier: boolean;
}

interface CreationCreditsCardProps {
  credits: Credits | null;
  itemLabel?: string; // "lote" | "pedido"
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'ahora';
  const totalMinutes = Math.floor(ms / (60 * 1000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function CreationCreditsCard({ credits, itemLabel = 'creación' }: CreationCreditsCardProps) {
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000); // tick every minute
    return () => clearInterval(t);
  }, []);

  if (!credits || !credits.isFreeTier) return null;

  const { available, max, nextRegenAt } = credits;
  const ms = nextRegenAt ? new Date(nextRegenAt).getTime() - now : 0;
  const empty = available <= 0;

  return (
    <div className={[
      'rounded-input border p-4 mt-3',
      empty ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200',
    ].join(' ')}>
      <div className="flex items-center gap-2 mb-2">
        <Coins className={`w-4 h-4 ${empty ? 'text-red-600' : 'text-amber-700'}`} />
        <p className={`text-sm font-semibold ${empty ? 'text-red-800' : 'text-amber-900'}`}>
          Créditos de {itemLabel} disponibles: {available} / {max}
        </p>
      </div>
      <div className="flex gap-1 mb-2">
        {Array.from({ length: max }).map((_, i) => (
          <div
            key={i}
            className={[
              'h-2 flex-1 rounded-full',
              i < available ? 'bg-amber-500' : 'bg-amber-100',
            ].join(' ')}
          />
        ))}
      </div>
      {nextRegenAt ? (
        <div className="flex items-center gap-1.5 text-xs text-amber-800">
          <Clock className="w-3 h-3" />
          <span>Próximo crédito en <span className="font-medium">{formatCountdown(ms)}</span></span>
        </div>
      ) : (
        <p className="text-xs text-amber-700">Tienes el máximo de créditos disponibles.</p>
      )}
      {empty && (
        <p className="text-xs text-red-700 mt-1.5">
          Sin créditos. Mejora tu plan para crear sin límites.
        </p>
      )}
    </div>
  );
}
