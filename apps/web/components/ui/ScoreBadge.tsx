import { Star } from 'lucide-react';

type ScoreStatus = 'NEW_USER' | 'ACTIVE' | 'RESTRICTED';

interface ScoreBadgeProps {
  score: number | null;
  status: ScoreStatus;
  size?: 'sm' | 'md';
}

function getStarCount(score: number | null, status: ScoreStatus): number | null {
  if (status === 'NEW_USER' || score === null) return null;
  if (score >= 90) return 5;
  if (score >= 75) return 4;
  if (score >= 60) return 3;
  if (score >= 40) return 2;
  return 1;
}

export function ScoreBadge({ score, status, size = 'md' }: ScoreBadgeProps) {
  const starCount = getStarCount(score, status);
  const iconClass = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  if (starCount === null) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-badge text-xs font-medium bg-muted text-muted-foreground">
        Nuevo
      </span>
    );
  }

  const isLow = starCount === 1;

  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${starCount} de 5 estrellas`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < starCount;
        return (
          <Star
            key={i}
            className={[
              iconClass,
              filled
                ? isLow
                  ? 'fill-red-500 text-red-500'
                  : 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-200 text-gray-200',
            ].join(' ')}
          />
        );
      })}
    </span>
  );
}
