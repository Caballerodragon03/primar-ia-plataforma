import { cn } from '@/lib/utils';

interface KPICardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function KPICard({ label, value, sub, icon, trend, className }: KPICardProps) {
  return (
    <div
      className={cn(
        'bg-card rounded-card border border-border/50 p-5 flex flex-col gap-3 shadow-soft hover:shadow-soft-md transition-all duration-200',
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
        <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
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
