'use client';

type StatusConfig = { label: string; classes: string };

const STATUS_MAP: Record<string, StatusConfig> = {
  ACTIVO:              { label: 'Open',        classes: 'bg-blue-100 text-blue-800' },
  BORRADOR:            { label: 'Draft',       classes: 'bg-gray-100 text-gray-600' },
  PARCIALMENTE_VENDIDO:{ label: 'In Progress', classes: 'bg-amber-100 text-amber-800' },
  PARCIALMENTE_CUBIERTO:{ label: 'In Progress',classes: 'bg-amber-100 text-amber-800' },
  VENDIDO:             { label: 'Full',        classes: 'bg-green-100 text-green-700' },
  TOTALMENTE_CUBIERTO: { label: 'Full',        classes: 'bg-green-100 text-green-700' },
  CANCELADO:           { label: 'Cancelled',   classes: 'bg-red-100 text-red-700' },
  EXPIRADO:            { label: 'Expired',     classes: 'bg-gray-200 text-gray-500' },
  CERRADO:             { label: 'Closed',      classes: 'bg-gray-200 text-gray-600' },
  EN_TRANSITO:         { label: 'In Transit',  classes: 'bg-blue-100 text-blue-700' },
  ENTREGADO:           { label: 'Delivered',   classes: 'bg-green-100 text-green-700' },
  COMPLETADO:          { label: 'Completed',   classes: 'bg-green-100 text-green-700' },
  PENDIENTE_PAGO:      { label: 'Pending Pay', classes: 'bg-amber-100 text-amber-800' },
};

interface Props {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: Props) {
  const config = STATUS_MAP[status] ?? { label: status, classes: 'bg-gray-100 text-gray-600' };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-badge text-xs font-medium ${config.classes} ${className}`}
    >
      {config.label}
    </span>
  );
}
