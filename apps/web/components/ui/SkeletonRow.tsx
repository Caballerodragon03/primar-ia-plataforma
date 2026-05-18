const shimmerClass =
  'bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] animate-shimmer rounded';

export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className={`h-4 ${shimmerClass}`} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`${shimmerClass} ${className}`} />;
}
