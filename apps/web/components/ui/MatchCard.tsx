'use client';

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
}

interface MatchCardProps {
  match: Match;
  onContribute: (match: Match) => void;
}

function getProfitabilityColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-gray-500';
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
    <div className="bg-surface rounded-card border border-border p-5 flex gap-5 items-stretch hover:shadow-sm transition-shadow">
      {/* Left: Profitability Index */}
      <div className="flex flex-col items-center justify-center min-w-[80px] border-r border-border pr-5">
        <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wide text-center leading-tight mb-1">
          Profitability<br />Index
        </span>
        <span className={`text-3xl font-bold tabular-nums ${getProfitabilityColor(score)}`}>
          {score}
        </span>
        <span className="text-xs text-text-secondary">/100</span>
      </div>

      {/* Center: Details */}
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <div>
          <p className="font-semibold text-text-primary text-base leading-tight">
            {match.pedido.producto.nombre}
          </p>
          {match.pedido.variedad && (
            <p className="text-sm text-text-secondary">{match.pedido.variedad.nombre}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span className="text-text-secondary">
            Price Offered:{' '}
            <span className="font-medium text-text-primary">
              €{precioKg.toFixed(2)}/kg
            </span>
          </span>
          <span className="text-text-secondary">
            Destination:{' '}
            <span className="font-medium text-text-primary">
              {match.pedido.destinoFinal ?? 'N/A'}
            </span>
          </span>
          <span className="text-text-secondary">
            Distance:{' '}
            <span className="font-medium text-text-primary">
              {match.distanceKm != null ? `${match.distanceKm} km` : 'N/A'}
            </span>
          </span>
        </div>

        <div>
          <p className="text-xs text-text-secondary mb-1">
            Remaining Quantity Needed:{' '}
            <span className="font-medium text-text-primary">
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
        >
          Contribute My Lot
        </Button>
      </div>
    </div>
  );
}
