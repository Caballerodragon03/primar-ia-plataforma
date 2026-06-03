'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { PlanComparison } from '@/components/subscriptions/PlanComparison';
import { UsageMeter } from '@/components/subscriptions/UsageMeter';
import { CreationCreditsCard } from '@/components/subscriptions/CreationCreditsCard';
import { useT } from '@/lib/i18n/LocaleProvider';

interface Credits {
  available: number;
  max: number;
  nextRegenAt: string | null;
  isFreeTier: boolean;
}

interface BreakdownComprador {
  buscando: number;
  enTrato: number;
  reservadoPendienteComision: number;
}

interface SubscriptionData {
  plan: string;
  badge: string | null;
  pedidosActivos: number;
  maxPedidos: number;
  hasActiveSubscription: boolean;
  credits: Credits | null;
  breakdownComprador: BreakdownComprador | null;
  // Phase 17 — pending downgrade info.
  pendingPlanChange: string | null;
  pendingChangeEffectiveAt: string | null;
}

export default function BuyerSubscriptionPage() {
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
        // Reconcile against Stripe before reading /current so the new plan
        // shows even if the webhook hasn't landed yet. See seller page.
        if (success === 'true' && sessionId) {
          try {
            await api.post('/subscriptions/reconcile-checkout', { sessionId });
          } catch {
            /* ignore — webhook fallback */
          }
        }
        const [currentRes, usageRes] = await Promise.all([
          api.get<{ success: boolean; data: { plan: string; badge: string | null; hasActiveSubscription: boolean; pendingPlanChange: string | null; pendingChangeEffectiveAt: string | null } }>('/subscriptions/current'),
          api.get<{ success: boolean; data: { pedidosActivos: number; maxPedidos: number; credits: Credits; breakdownComprador?: BreakdownComprador } }>('/subscriptions/usage'),
        ]);
        setData({
          plan: currentRes.data.data.plan,
          badge: currentRes.data.data.badge,
          pedidosActivos: usageRes.data.data.pedidosActivos ?? 0,
          maxPedidos: usageRes.data.data.maxPedidos ?? -1,
          hasActiveSubscription: currentRes.data.data.hasActiveSubscription,
          credits: usageRes.data.data.credits ?? null,
          breakdownComprador: usageRes.data.data.breakdownComprador ?? null,
          pendingPlanChange: currentRes.data.data.pendingPlanChange,
          pendingChangeEffectiveAt: currentRes.data.data.pendingChangeEffectiveAt,
        });
      } catch {
        setData({
          plan: 'MERCADO',
          badge: null,
          pedidosActivos: 0,
          maxPedidos: 5,
          hasActiveSubscription: false,
          credits: null,
          breakdownComprador: null,
          pendingPlanChange: null,
          pendingChangeEffectiveAt: null,
        });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSelectPlan = async (plan: string) => {
    setCheckoutLoading(true);
    setError(null);
    try {
      // Phase 17 — comportamiento:
      //   - No active sub + free plan: noop (ya estás en MERCADO).
      //   - No active sub + paid plan: Stripe Checkout para crear sub.
      //   - Active sub: change-plan (upgrade inmediato / downgrade
      //     diferido al fin de período / cancel a free al fin de período).
      const hasSub = data?.hasActiveSubscription;
      if (!hasSub) {
        if (plan === 'MERCADO') return; // ya estás en free
        const res = await api.post<{ success: boolean; data: { url: string } }>('/subscriptions/checkout', { plan });
        if (res.data.data.url) window.location.href = res.data.data.url;
        return;
      }
      // Usuario con sub activa → endpoint change-plan.
      const res = await api.post<{
        success: boolean;
        data:
          | { kind: 'no-active-sub' }
          | { kind: 'noop' }
          | { kind: 'upgraded'; newPlan: string }
          | { kind: 'downgrade-scheduled'; newPlan: string; effectiveAt: string }
          | { kind: 'cancel-scheduled'; effectiveAt: string };
      }>('/subscriptions/change-plan', { plan });
      const result = res.data.data;
      if (result.kind === 'no-active-sub') {
        // Race: backend dice que no hay sub → caer a Checkout normal.
        const r2 = await api.post<{ success: boolean; data: { url: string } }>('/subscriptions/checkout', { plan });
        if (r2.data.data.url) window.location.href = r2.data.data.url;
      } else if (result.kind === 'upgraded') {
        alert(t('subscription.changed.upgradedNow').replace('{plan}', result.newPlan));
        window.location.reload();
      } else if (result.kind === 'downgrade-scheduled') {
        alert(
          t('subscription.changed.downgradeScheduled')
            .replace('{plan}', result.newPlan)
            .replace('{date}', new Date(result.effectiveAt).toLocaleDateString()),
        );
        window.location.reload();
      } else if (result.kind === 'cancel-scheduled') {
        alert(
          t('subscription.changed.cancelScheduled').replace(
            '{date}',
            new Date(result.effectiveAt).toLocaleDateString(),
          ),
        );
        window.location.reload();
      }
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
        {t('subscription.subtitleBuyer')}
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
          {(data.pendingPlanChange === 'MERCADO' || data.pendingPlanChange === 'COSECHA')
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
              current={data.pedidosActivos}
              max={data.maxPedidos}
              label={t('subscription.activeOrders')}
              breakdown={
                data.breakdownComprador
                  ? [
                      { label: t('subscription.breakdown.searching'), value: data.breakdownComprador.buscando },
                      { label: t('subscription.breakdown.dealing'), value: data.breakdownComprador.enTrato },
                      { label: t('subscription.breakdown.reserved'), value: data.breakdownComprador.reservadoPendienteComision },
                    ]
                  : undefined
              }
            />
            <CreationCreditsCard credits={data.credits} itemLabel={t('subscription.itemOrder')} />
          </div>

          <PlanComparison
            role="COMPRADOR"
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
        </>
      )}
    </div>
  );
}
