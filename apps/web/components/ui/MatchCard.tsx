'use client';

import { cn } from '@/lib/utils';
import { CoverageBar } from './CoverageBar';
import { Button } from './Button';

export interface CalibresSolicitados {
  calibre: string;
  cantidad_kg: number;
  precio_max_kg: number;
}

export interface Match {
  id: string;
  loteId: string;
  pedidoId: string;
  cantidadKg: string;
  precioKg: string;
  calibresJson: unknown;
  estado: string;
  scoreMatching: number | null;
  scoreDetalle: unknown;
  pedido: {
    id: string;
    destinoFinal: string | null;
    calibresSolicitados: unknown;
    incoterm?: string;
    producto: { nombre: string };
    variedad: { nombre: string } | null;
  };
  lote: {
    id: string;
    calibres: unknown;
    direccionRecogida: string;
  };
  distanceKm?: number;
  coverage?: number;
  // Phase 14J — kg restantes por calibre (lote del vendedor y pedido del
  // comprador), descontando otros matches capacity-holding. Permite al
  // modal de contribución mostrar el máximo real disponible.
  loteRestantePorCalibre?: Record<string, number>;
  pedidoRestantePorCalibre?: Record<string, number>;
}

interface MatchCardProps {
  match: Match;
  onContribute: (match: Match) => void;
}

function getProfitabilityColor(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-muted-foreground';
}

function getProfitabilityBg(score: number): string {
  if (score >= 80) return 'bg-emerald-50';
  if (score >= 60) return 'bg-amber-50';
  return 'bg-muted';
}

export function MatchCard({ match, onContribute }: MatchCardProps) {
  const scoreRaw = match.scoreMatching ?? 0;
  const score = Math.round(scoreRaw * 100);
  const precioKg = parseFloat(match.precioKg);

  const calibresSolicitados = Array.isArray(match.pedido.calibresSolicitados)
    ? (match.pedido.calibresSolicitados as CalibresSolicitados[])
    : [];

  const totalKgNeeded = calibresSolicitados.reduce((sum, c) => sum + c.cantidad_kg, 0);
  const coveragePct = match.coverage ?? 0;
  const remainingPct = 100 - coveragePct;

  return (
    <div className="bg-card rounded-card border border-border/50 p-5 flex gap-5 items-stretch shadow-soft hover-lift hover-glow group">
      {/* Left: Profitability Index */}
      <div className={cn(
        'flex flex-col items-center justify-center min-w-[80px] rounded-lg px-3 py-2',
        getProfitabilityBg(score)
      )}>
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider text-center leading-tight mb-1">
          Índice de<br />rentabilidad
        </span>
        <span className={cn('text-3xl font-bold tabular-nums', getProfitabilityColor(score))}>
          {score}
        </span>
        <span className="text-xs text-muted-foreground">/100</span>
      </div>

      {/* Center: Details */}
      <div className="flex-1 flex flex-col gap-2.5 min-w-0">
        <div>
          <p className="font-semibold text-foreground text-base leading-tight">
            {match.pedido.producto.nombre}
          </p>
          {match.pedido.variedad && (
            <p className="text-sm text-muted-foreground">{match.pedido.variedad.nombre}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
          <span className="text-muted-foreground">
            Precio:{' '}
            <span className="font-medium text-foreground">
              €{precioKg.toFixed(2)}/kg
            </span>
          </span>
          <span className="text-muted-foreground">
            Destino:{' '}
            <span className="font-medium text-foreground">
              {match.pedido.destinoFinal ?? 'N/A'}
            </span>
          </span>
          <span className="text-muted-foreground">
            Distancia:{' '}
            <span className="font-medium text-foreground">
              {match.distanceKm != null ? `${match.distanceKm} km` : 'N/A'}
            </span>
          </span>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1.5">
            Cantidad restante:{' '}
            <span className="font-medium text-foreground">
              {totalKgNeeded > 0
                ? `${Math.round((remainingPct / 100) * totalKgNeeded).toLocaleString()} kg`
                : 'N/A'}
            </span>
          </p>
          <CoverageBar percentage={remainingPct} />
        </div>
      </div>

      {/* Right: CTA */}
      <div className="flex items-center flex-shrink-0">
        <Button
          variant="primary"
          size="sm"
          onClick={() => onContribute(match)}
          className="group-hover:shadow-soft"
        >
          Contribuir
        </Button>
      </div>
    </div>
  );
}
