interface UsageMeterProps {
  current: number;
  max: number;
  label: string;
}

export function UsageMeter({ current, max, label }: UsageMeterProps) {
  const isUnlimited = max < 0 || !isFinite(max);
  const pct = isUnlimited ? 0 : max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const atLimit = !isUnlimited && current >= max;
  const nearLimit = !isUnlimited && pct >= 80;

  const barColor = atLimit ? 'bg-red-500' : nearLimit ? 'bg-orange-400' : 'bg-primary';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-text-secondary">{label}</span>
        <span className={`font-medium ${atLimit ? 'text-red-600' : 'text-text-primary'}`}>
          {current}/{isUnlimited ? '∞' : max}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: isUnlimited ? '0%' : `${pct}%` }}
        />
      </div>
    </div>
  );
}
