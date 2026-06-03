'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { PlanComparison } from '@/components/subscriptions/PlanComparison';
import { UsageMeter } from '@/components/subscriptions/UsageMeter';
import { CreationCreditsCard } from '@/components/subscriptions/CreationCreditsCard';
import { PlanChangeConfirmModal, type PlanChangeKind } from '@/components/subscriptions/PlanChangeConfirmModal';
import { useT } from '@/lib/i18n/LocaleProvider';

// Phase 17.2 — pricing (céntimos) para detectar upgrade vs downgrade en cliente.
const SELLER_PLAN_PRICE: Record<string, number> = {
  COSECHA: 0,
  CAMPO: 1900,
  FINCA: 4900,
};

interface Credits {
  available: number;
  max: number;
  nextRegenAt: string | null;
  isFreeTier: boolean;
}

interface BreakdownVendedor {
  buscando: number;
  enTrato: number;
}

interface SubscriptionData {
  plan: string;
  badge: string | null;
  lotesActivos: number;
  maxLotes: number;
  hasActiveSubscription: boolean;
  credits: Credits | null;
  breakdownVendedor: BreakdownVendedor | null;
  pendingPlanChange: string | null;
  pendingChangeEffectiveAt: string | null;
  firstDowngradeGiftEligible: boolean;
}

export default function SellerSubscriptionPage() {
  const t = useT();
  const searchParams = useSearchParams();
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const success = searchParams.get('success');
  const cancelled = searchParams.get('cancelled');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    async function fetchData() {
      try {
        // If Stripe just redirected back, reconcile against the checkout
        // session BEFORE reading /current — otherwise the page may render
        // the old plan because the webhook hasn't landed yet. Failures are
        // non-fatal: the webhook will eventually catch up.
        if (success === 'true' && sessionId) {
          try {
            await api.post('/subscriptions/reconcile-checkout', { sessionId });
          } catch {
            /* ignore — webhook fallback */
          }
        }
        const [currentRes, usageRes] = await Promise.all([
          api.get<{ success: boolean; data: { plan: string; badge: string | null; hasActiveSubscription: boolean; pendingPlanChange: string | null; pendingChangeEffectiveAt: string | null; firstDowngradeGiftEligible?: boolean } }>('/subscriptions/current'),
          api.get<{ success: boolean; data: { lotesActivos: number; maxLotes: number; credits: Credits; breakdownVendedor?: BreakdownVendedor } }>('/subscriptions/usage'),
        ]);
        setData({
          plan: currentRes.data.data.plan,
          badge: currentRes.data.data.badge,
          lotesActivos: usageRes.data.data.lotesActivos ?? 0,
          maxLotes: usageRes.data.data.maxLotes ?? -1,
          hasActiveSubscription: currentRes.data.data.hasActiveSubscription,
          credits: usageRes.data.data.credits ?? null,
          breakdownVendedor: usageRes.data.data.breakdownVendedor ?? null,
          pendingPlanChange: currentRes.data.data.pendingPlanChange,
          pendingChangeEffectiveAt: currentRes.data.data.pendingChangeEffectiveAt,
          firstDowngradeGiftEligible: currentRes.data.data.firstDowngradeGiftEligible ?? false,
        });
      } catch {
        setData({
          plan: 'COSECHA',
          badge: null,
          lotesActivos: 0,
          maxLotes: 3,
          hasActiveSubscription: false,
          credits: null,
          breakdownVendedor: null,
          pendingPlanChange: null,
          pendingChangeEffectiveAt: null,
          firstDowngradeGiftEligible: false,
        });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Phase 17.2 — modal state.
  const [pendingTargetPlan, setPendingTargetPlan] = useState<string | null>(null);
  const pendingKind: PlanChangeKind | null = (() => {
    if (!pendingTargetPlan || !data) return null;
    if (pendingTargetPlan === 'COSECHA') return 'downgrade-free';
    const currentPrice = SELLER_PLAN_PRICE[data.plan] ?? 0;
    const targetPrice = SELLER_PLAN_PRICE[pendingTargetPlan] ?? 0;
    if (targetPrice > currentPrice) return 'upgrade';
    if (targetPrice < currentPrice) return 'downgrade-paid';
    return null;
  })();

  const handleSelectPlan = async (plan: string) => {
    setError(null);
    const hasSub = data?.hasActiveSubscription;
    if (!hasSub) {
      if (plan === 'COSECHA') return;
      setCheckoutLoading(true);
      try {
        const res = await api.post<{ success: boolean; data: { url: string } }>('/subscriptions/checkout', { plan });
        if (res.data.data.url) window.location.href = res.data.data.url;
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t('subscription.errorCheckout');
        setError(msg);
      } finally {
        setCheckoutLoading(false);
      }
      return;
    }
    if (plan === data?.plan) return;
    setPendingTargetPlan(plan);
  };

  const confirmPlanChange = async () => {
    if (!pendingTargetPlan) return;
    setCheckoutLoading(true);
    setError(null);
    try {
      const res = await api.post<{
        success: boolean;
        data:
          | { kind: 'no-active-sub' }
          | { kind: 'noop' }
          | { kind: 'upgraded'; newPlan: string }
          | { kind: 'downgrade-scheduled'; newPlan: string; effectiveAt: string }
          | { kind: 'cancel-scheduled'; effectiveAt: string };
      }>('/subscriptions/change-plan', { plan: pendingTargetPlan });
      const result = res.data.data;
      if (result.kind === 'no-active-sub') {
        const r2 = await api.post<{ success: boolean; data: { url: string } }>('/subscriptions/checkout', { plan: pendingTargetPlan });
        if (r2.data.data.url) window.location.href = r2.data.data.url;
        return;
      }
      setPendingTargetPlan(null);
      window.location.reload();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t('subscription.errorCheckout');
      setError(msg);
      setPendingTargetPlan(null);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const acceptDowngradeGift = async () => {
    setError(null);
    setCheckoutLoading(true);
    try {
      const res = await api.post<{
        success: boolean;
        data:
          | { applied: false; reason: string }
          | { applied: true; newPeriodEnd: string };
      }>('/subscriptions/accept-downgrade-gift');
      const result = res.data.data;
      if (result.applied) {
        alert(
          t('subscription.confirm.giftApplied').replace(
            '{date}',
            new Date(result.newPeriodEnd).toLocaleDateString(),
          ),
        );
      }
      setPendingTargetPlan(null);
      window.location.reload();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t('subscription.errorCheckout');
      setError(msg);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManage = async () => {
    try {
      const res = await api.post<{ success: boolean; data: { url: string } }>('/subscriptions/portal');
      if (res.data.data.url) {
        window.location.href = res.data.data.url;
      }
    } catch {
      // handle error
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-4 bg-muted rounded w-96" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 bg-muted rounded-[12px]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-1">{t('subscription.title')}</h1>
      <p className="text-sm text-text-secondary mb-6">
        {t('subscription.subtitleSeller')}
      </p>

      {success === 'true' && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-[8px] text-sm text-green-800">
          {t('subscription.success')}
        </div>
      )}

      {cancelled === 'true' && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-[8px] text-sm text-yellow-800">
          {t('subscription.cancelled')}
        </div>
      )}

      {/* Phase 17 — banner de cambio pendiente. */}
      {data?.pendingPlanChange && data.pendingChangeEffectiveAt && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-[8px] text-sm text-amber-900">
          {(data.pendingPlanChange === 'COSECHA' || data.pendingPlanChange === 'MERCADO')
            ? t('subscription.banner.cancelPending').replace(
                '{date}',
                new Date(data.pendingChangeEffectiveAt).toLocaleDateString(),
              )
            : t('subscription.banner.downgradePending')
                .replace('{plan}', data.pendingPlanChange)
                .replace(
                  '{date}',
                  new Date(data.pendingChangeEffectiveAt).toLocaleDateString(),
                )}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-[8px] text-sm text-red-800">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="bg-card border border-border rounded-[12px] p-4 mb-8">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-sm text-text-secondary">{t('subscription.currentPlan')}</span>
                <span className="ml-2 font-semibold text-text-primary">{data.plan}</span>
                {data.badge && (
                  <span className="ml-2 text-xs bg-primary/10 text-secondary px-2 py-0.5 rounded-full">
                    {data.badge}
                  </span>
                )}
              </div>
              {data.hasActiveSubscription && (
                <button
                  onClick={handleManage}
                  className="text-sm text-secondary hover:text-text-primary underline cursor-pointer"
                >
                  {t('subscription.manage')}
                </button>
              )}
            </div>
            <UsageMeter
              current={data.lotesActivos}
              max={data.maxLotes}
              label={t('subscription.activeLots')}
              breakdown={
                data.breakdownVendedor
                  ? [
                      { label: t('subscription.breakdown.searching'), value: data.breakdownVendedor.buscando },
                      { label: t('subscription.breakdown.dealing'), value: data.breakdownVendedor.enTrato },
                    ]
                  : undefined
              }
            />
            <CreationCreditsCard credits={data.credits} itemLabel={t('subscription.itemLot')} />
          </div>

          <PlanComparison
            role="VENDEDOR"
            currentPlan={data.plan}
            onSelectPlan={handleSelectPlan}
          />

          {checkoutLoading && (
            <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
              <div className="bg-card p-6 rounded-[12px] shadow-lg text-center">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-sm text-text-secondary">{t('subscription.redirecting')}</p>
              </div>
            </div>
          )}

          {/* Phase 17.2 — modal de confirmación de cambio de plan. */}
          <PlanChangeConfirmModal
            isOpen={pendingTargetPlan !== null && pendingKind !== null}
            currentPlanLabel={data.plan}
            targetPlanLabel={pendingTargetPlan ?? ''}
            kind={pendingKind ?? 'downgrade-paid'}
            giftEligible={data.firstDowngradeGiftEligible}
            loading={checkoutLoading}
            onCancel={() => setPendingTargetPlan(null)}
            onConfirm={confirmPlanChange}
            onAcceptGift={acceptDowngradeGift}
          />
        </>
      )}
    </div>
  );
}
