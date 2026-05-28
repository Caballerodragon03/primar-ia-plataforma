'use client';
import { PlanCard } from './PlanCard';
import { useT } from '@/lib/i18n/LocaleProvider';
import type { MessageKey } from '@/lib/i18n/messages';

interface PlanComparisonProps {
  role: 'VENDEDOR' | 'COMPRADOR';
  currentPlan: string;
  onSelectPlan: (plan: string) => void;
}

type PlanDef = {
  id: string;
  nameKey: MessageKey;
  price: number;
  badgeKey: MessageKey | null;
  popular?: boolean;
  featureKeys: MessageKey[];
};

const SELLER_PLANS: PlanDef[] = [
  {
    id: 'COSECHA',
    nameKey: 'plan.seller.cosecha.name',
    price: 0,
    badgeKey: null,
    featureKeys: [
      'plan.feature.lotes3',
      'plan.feature.credits3regenWeek',
      'plan.feature.photos3',
      'plan.feature.certs3',
      'plan.feature.matches15min',
      'plan.feature.analytics30d',
      'plan.feature.negotiation',
      'plan.feature.invoiceDownload',
    ],
  },
  {
    id: 'CAMPO',
    nameKey: 'plan.seller.campo.name',
    price: 1900,
    badgeKey: 'plan.badge.campo',
    popular: true,
    featureKeys: [
      'plan.feature.lotes15',
      'plan.feature.creditsUnlimited',
      'plan.feature.photos10',
      'plan.feature.certs5',
      'plan.feature.matchesNow',
      'plan.feature.analyticsFull',
      'plan.feature.exportCsv',
      'plan.feature.harvestEstim',
      'plan.feature.negotiation',
      'plan.feature.invoiceDownload',
      'plan.feature.support24h',
    ],
  },
  {
    id: 'FINCA',
    nameKey: 'plan.seller.finca.name',
    price: 4900,
    badgeKey: 'plan.badge.finca',
    featureKeys: [
      'plan.feature.lotesUnlimited',
      'plan.feature.creditsUnlimited',
      'plan.feature.photosUnlimited',
      'plan.feature.certsUnlimited',
      'plan.feature.matchesAlerts',
      'plan.feature.analyticsTrends',
      'plan.feature.exportCsvPdf',
      'plan.feature.harvestEstim',
      'plan.feature.negotiation',
      'plan.feature.invoiceDownload',
      'plan.feature.supportPhone',
    ],
  },
];

const BUYER_PLANS: PlanDef[] = [
  {
    id: 'MERCADO',
    nameKey: 'plan.buyer.mercado.name',
    price: 0,
    badgeKey: null,
    featureKeys: [
      'plan.feature.orders5',
      'plan.feature.credits3regenWeek',
      'plan.feature.matches15min',
      'plan.feature.analytics30d',
      'plan.feature.commissionStandard',
      'plan.feature.negotiation',
      'plan.feature.invoiceDownload',
    ],
  },
  {
    id: 'LONJA',
    nameKey: 'plan.buyer.lonja.name',
    price: 2900,
    badgeKey: 'plan.badge.lonja',
    popular: true,
    featureKeys: [
      'plan.feature.orders20',
      'plan.feature.creditsUnlimited',
      'plan.feature.matchesNow',
      'plan.feature.analyticsFull',
      'plan.feature.commissionStandard',
      'plan.feature.negotiation',
      'plan.feature.invoiceDownload',
      'plan.feature.support24h',
    ],
  },
  {
    id: 'CENTRAL',
    nameKey: 'plan.buyer.central.name',
    price: 8900,
    badgeKey: 'plan.badge.central',
    featureKeys: [
      'plan.feature.ordersUnlimited',
      'plan.feature.creditsUnlimited',
      'plan.feature.matchesAlerts',
      'plan.feature.analyticsTrends',
      'plan.feature.commissionDiscount',
      'plan.feature.exportStats',
      'plan.feature.negotiation',
      'plan.feature.invoiceDownload',
      'plan.feature.supportDedicated',
    ],
  },
];

// Features de comisión: se resaltan y muestran un "(ver más)" enlace a
// la página explicativa /commissions. Ambas son sobre el mismo sistema
// de comisiones — solo cambia que CENTRAL aplica un descuento.
const COMMISSION_FEATURE_KEYS = new Set<MessageKey>([
  'plan.feature.commissionStandard',
  'plan.feature.commissionDiscount',
]);

export function PlanComparison({ role, currentPlan, onSelectPlan }: PlanComparisonProps) {
  const t = useT();
  const plans = role === 'VENDEDOR' ? SELLER_PLANS : BUYER_PLANS;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {plans.map((plan) => (
        <PlanCard
          key={plan.id}
          name={t(plan.nameKey)}
          price={plan.price}
          features={plan.featureKeys.map((k) => {
            const isCommission = COMMISSION_FEATURE_KEYS.has(k);
            return {
              text: t(k),
              highlight: isCommission,
              moreLink: isCommission
                ? { href: '/commissions', label: t('plan.feature.commissionMore') }
                : undefined,
            };
          })}
          badge={plan.badgeKey ? t(plan.badgeKey) : null}
          isCurrent={currentPlan === plan.id}
          popular={plan.popular ?? false}
          onSelect={() => onSelectPlan(plan.id)}
        />
      ))}
    </div>
  );
}
