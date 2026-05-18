'use client';

import { cn } from '@/lib/utils';

interface Props {
  percentage: number;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function CoverageBar({ percentage, className = '', showLabel = true, size = 'sm' }: Props) {
  const clamped = Math.min(100, Math.max(0, Math.round(percentage)));
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'flex-1 bg-primary/10 rounded-full overflow-hidden',
          size === 'sm' ? 'h-2' : 'h-3'
        )}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-primary rounded-full animate-width-grow"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground w-9 text-right tabular-nums">
          {clamped}%
        </span>
      )}
    </div>
  );
}
