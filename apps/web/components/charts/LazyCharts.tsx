'use client';

/**
 * Recharts está aislado en este módulo para poder cargarlo con `next/dynamic`
 * (ssr: false) desde las páginas. Recharts pesa ~100KB gzip; al sacarlo del
 * bundle de la página, el shell (KPIs, cabeceras, estados) se monta y pinta
 * antes, y la librería del gráfico se descarga en paralelo sin bloquear el
 * resto. Comportamiento visual idéntico al inline anterior.
 */

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

const PRIMARY = '#E1C44D';

const kgAxis = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v));

/** Área de volumen en el tiempo (kg). */
export function VolumeAreaChart({
  data,
  numLoc,
  tooltipLabel,
  gradientId,
  height = 260,
}: {
  data: { month: string; kg: number }[];
  numLoc: string;
  tooltipLabel: string;
  gradientId: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.3} />
            <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280' }} />
        <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={kgAxis} />
        <Tooltip formatter={(v: number) => [`${v.toLocaleString(numLoc)} kg`, tooltipLabel]} />
        <Area type="monotone" dataKey="kg" stroke={PRIMARY} strokeWidth={2} fill={`url(#${gradientId})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Barras horizontales (categoría → kg), p.ej. top productos. */
export function HorizontalBarChart({
  data,
  categoryKey,
  valueKey,
  numLoc,
  tooltipLabel,
  height,
}: {
  data: Record<string, unknown>[];
  categoryKey: string;
  valueKey: string;
  numLoc: string;
  tooltipLabel: string;
  height: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, left: 100, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={kgAxis} />
        <YAxis type="category" dataKey={categoryKey} tick={{ fontSize: 11, fill: '#6B7280' }} width={100} />
        <Tooltip formatter={(v: number) => [`${v.toLocaleString(numLoc)} kg`, tooltipLabel]} />
        <Bar dataKey={valueKey} fill={PRIMARY} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Barras verticales por categoría (recuento entero), p.ej. pedidos por categoría. */
export function CategoryBarChart({
  data,
  categoryKey,
  valueKey,
  tooltipLabel,
  height,
}: {
  data: Record<string, unknown>[];
  categoryKey: string;
  valueKey: string;
  tooltipLabel: string;
  height: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
        <XAxis dataKey={categoryKey} tick={{ fontSize: 10, fill: '#6B7280' }} angle={-20} textAnchor="end" />
        <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} allowDecimals={false} />
        <Tooltip formatter={(v: number) => [v, tooltipLabel]} />
        <Bar dataKey={valueKey} fill={PRIMARY} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Línea de evolución de precio (€/kg) — usada en el panel de mercado. */
export function PriceLineChart({
  data,
  numLoc,
  tooltipLabel,
}: {
  data: { dia: string; avgPrice: number; totalKg: number }[];
  numLoc: string;
  tooltipLabel: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
        <YAxis
          tick={{ fontSize: 10 }}
          tickFormatter={(v) => `${v.toLocaleString(numLoc, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
          width={60}
        />
        <Tooltip
          formatter={(v: number) => [`${v.toLocaleString(numLoc, { minimumFractionDigits: 2, maximumFractionDigits: 3 })} €/kg`, tooltipLabel]}
          contentStyle={{ fontSize: 12 }}
        />
        <Line type="monotone" dataKey="avgPrice" stroke="#0B2E33" strokeWidth={2} dot={{ r: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Barras de precio medio por calibre (€/kg) — panel de mercado. */
export function CalibreBarChart({
  data,
  tooltipLabel,
}: {
  data: { calibre: string; avgPrice: number }[];
  tooltipLabel: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="calibre" tick={{ fontSize: 10 }} />
        <YAxis
          tick={{ fontSize: 10 }}
          tickFormatter={(v) => `${v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
          width={60}
        />
        <Tooltip
          formatter={(v: number) => [`${v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} €/kg`, tooltipLabel]}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="avgPrice" fill={PRIMARY} />
      </BarChart>
    </ResponsiveContainer>
  );
}
