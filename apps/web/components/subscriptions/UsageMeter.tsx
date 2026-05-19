interface UsageBreakdownItem {
  label: string;
  value: number;
}

interface UsageMeterProps {
  current: number;
  max: number;
  label: string;
  // Phase 14K — desglose opcional ("3 buscando · 1 en trato · 2 reservados").
  // Si está vacío o no se pasa, se oculta.
  breakdown?: UsageBreakdownItem[];
}

export function UsageMeter({ current, max, label, breakdown }: UsageMeterProps) {
  const isUnlimited = max < 0 || !isFinite(max);
  const pct = isUnlimited ? 0 : max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const atLimit = !isUnlimited && current >= max;
  const nearLimit = !isUnlimited && pct >= 80;

  const barColor = atLimit ? 'bg-red-500' : nearLimit ? 'bg-orange-400' : 'bg-primary';

  const visibleBreakdown = (breakdown ?? []).filter((b) => b.value > 0);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-text-secondary">{label}</span>
        <span className={`font-medium ${atLimit ? 'text-red-600' : 'text-text-primary'}`}>
          {current}/{isUnlimited ? '∞' : max}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: isUnlimited ? '0%' : `${pct}%` }}
        />
      </div>
      {visibleBreakdown.length > 0 && (
        <div className="text-[11px] text-text-secondary flex flex-wrap gap-x-2 gap-y-0.5 pt-0.5">
          {visibleBreakdown.map((b, i) => (
            <span key={b.label}>
              <span className="font-medium text-foreground">{b.value}</span> {b.label}
              {i < visibleBreakdown.length - 1 && <span className="ml-1 text-muted-foreground">·</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
