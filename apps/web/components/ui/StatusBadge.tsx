'use client';

import { cn } from '@/lib/utils';

type StatusConfig = { label: string; classes: string };

const STATUS_MAP: Record<string, StatusConfig> = {
  ACTIVO:              { label: 'Activo',         classes: 'bg-blue-50 text-blue-700 border-blue-100' },
  BORRADOR:            { label: 'Borrador',       classes: 'bg-muted text-muted-foreground border-border' },
  PARCIALMENTE_VENDIDO:{ label: 'En progreso',    classes: 'bg-amber-50 text-amber-700 border-amber-100' },
  PARCIALMENTE_CUBIERTO:{ label: 'En progreso',   classes: 'bg-amber-50 text-amber-700 border-amber-100' },
  VENDIDO:             { label: 'Vendido',         classes: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  TOTALMENTE_CUBIERTO: { label: 'Cubierto',       classes: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  CANCELADO:           { label: 'Cancelado',       classes: 'bg-red-50 text-red-700 border-red-100' },
  EXPIRADO:            { label: 'Expirado',        classes: 'bg-muted text-muted-foreground border-border' },
  CERRADO:             { label: 'Cerrado',         classes: 'bg-muted text-muted-foreground border-border' },
  EN_TRANSITO:         { label: 'En tránsito',     classes: 'bg-blue-50 text-blue-700 border-blue-100' },
  ENTREGADO:           { label: 'Entregado',       classes: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  COMPLETADO:          { label: 'Completado',      classes: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  PENDIENTE_PAGO:      { label: 'Pago pendiente',  classes: 'bg-amber-50 text-amber-700 border-amber-100' },
};

interface Props {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: Props) {
  const config = STATUS_MAP[status] ?? { label: status, classes: 'bg-muted text-muted-foreground border-border' };
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-badge text-xs font-medium border',
        config.classes,
        className
      )}
    >
      {config.label}
    </span>
  );
}
