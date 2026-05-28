'use client';
import Link from 'next/link';
import { useT } from '@/lib/i18n/LocaleProvider';

export interface PlanFeature {
  text: string;
  /** Si la feature es "Comisión estándar" se resalta y se renderiza
   *  un "(ver más)" detrás que enlaza a `/commissions`. Para cualquier
   *  otra feature `highlight` queda undefined. */
  highlight?: boolean;
  moreLink?: { href: string; label: string };
}

interface PlanCardProps {
  name: string;
  price: number;
  features: PlanFeature[];
  badge: string | null;
  isCurrent: boolean;
  onSelect?: () => void;
  popular?: boolean;
}

export function PlanCard({ name, price, features, badge, isCurrent, onSelect, popular }: PlanCardProps) {
  const t = useT();
  return (
    <div
      className={[
        'relative flex flex-col rounded-[12px] border p-6 bg-card transition-shadow',
        popular ? 'border-primary shadow-lg ring-2 ring-primary/20' : 'border-border',
        isCurrent ? 'ring-2 ring-green-200 border-green-300' : '',
      ].join(' ')}
    >
      {popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full">
          {t('plan.popular')}
        </span>
      )}

      <h3 className="text-lg font-bold text-text-primary">{name}</h3>

      <div className="mt-2 mb-4">
        {price === 0 ? (
          <span className="text-2xl font-bold text-text-primary">{t('plan.free')}</span>
        ) : (
          <>
            <span className="text-2xl font-bold text-text-primary">{price / 100}€</span>
            <span className="text-sm text-text-secondary">{t('plan.perMonth')}</span>
          </>
        )}
      </div>

      {badge && (
        <span className="inline-block text-xs font-medium bg-primary/10 text-secondary px-2 py-0.5 rounded-full mb-3 w-fit">
          {badge}
        </span>
      )}

      <ul className="flex-1 space-y-2 mb-6">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
            <svg className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>
              <span className={f.highlight ? 'font-semibold text-foreground' : ''}>{f.text}</span>
              {f.moreLink && (
                <>
                  {' '}
                  <Link
                    href={f.moreLink.href}
                    className="text-primary hover:underline font-medium whitespace-nowrap"
                  >
                    ({f.moreLink.label})
                  </Link>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <button
          disabled
          className="w-full py-2.5 px-4 rounded-[8px] bg-muted text-muted-foreground text-sm font-medium cursor-not-allowed"
        >
          {t('plan.current')}
        </button>
      ) : (
        <button
          onClick={onSelect}
          className="w-full py-2.5 px-4 rounded-[8px] bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
        >
          {t('plan.upgrade')}
        </button>
      )}
    </div>
  );
}
