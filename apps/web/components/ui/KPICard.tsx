'use client';

import { cn } from '@/lib/utils';
import { useCountUp } from '@/lib/useCountUp';

interface KPICardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

function extractNumber(val: string | number): { prefix: string; num: number; suffix: string } | null {
  if (typeof val === 'number') return { prefix: '', num: val, suffix: '' };
  const m = String(val).match(/^([^\d]*?)([\d,.]+)(.*)$/);
  if (!m) return null;
  const num = parseFloat(m[2]!.replace(/\./g, '').replace(',', '.'));
  if (isNaN(num)) return null;
  return { prefix: m[1]!, num, suffix: m[3]! };
}

export function KPICard({ label, value, sub, icon, trend, className }: KPICardProps) {
  const parsed = extractNumber(value);
  const animated = useCountUp(parsed?.num ?? 0, 900, !!parsed);

  const displayValue = parsed
    ? `${parsed.prefix}${animated.toLocaleString('es-ES', { maximumFractionDigits: 0 })}${parsed.suffix}`
    : value;

  return (
    <div
      className={cn(
        'bg-card rounded-card border border-border/50 p-5 flex flex-col gap-3 shadow-soft hover-lift hover-glow',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        {icon && (
          <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary">
            {icon}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground tabular-nums">{displayValue}</p>
        {sub && (
          <p className={cn(
            'text-xs mt-1',
            trend === 'up' && 'text-emerald-600',
            trend === 'down' && 'text-destructive',
            !trend && 'text-muted-foreground'
          )}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}
