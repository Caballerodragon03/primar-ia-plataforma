interface KPICardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
}

export function KPICard({ label, value, sub, icon }: KPICardProps) {
  return (
    <div className="bg-surface rounded-card border border-border p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-secondary uppercase tracking-wide">{label}</p>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-secondary">{sub}</p>}
    </div>
  );
}
