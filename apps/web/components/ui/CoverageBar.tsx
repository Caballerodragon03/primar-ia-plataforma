'use client';

interface Props {
  percentage: number;
  className?: string;
}

export function CoverageBar({ percentage, className = '' }: Props) {
  const clamped = Math.min(100, Math.max(0, Math.round(percentage)));
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-xs font-medium text-text-secondary w-9 text-right tabular-nums">
        {clamped}%
      </span>
    </div>
  );
}
