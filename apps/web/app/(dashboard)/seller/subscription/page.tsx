'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { PlanComparison } from '@/components/subscriptions/PlanComparison';
import { UsageMeter } from '@/components/subscriptions/UsageMeter';

interface SubscriptionData {
  plan: string;
  badge: string | null;
  lotesActivos: number;
  maxLotes: number;
  hasActiveSubscription: boolean;
}

export default function SellerSubscriptionPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const success = searchParams.get('success');
  const cancelled = searchParams.get('cancelled');

  useEffect(() => {
    async function fetchData() {
      try {
        const [currentRes, usageRes] = await Promise.all([
          api.get<{ success: boolean; data: { plan: string; badge: string | null; hasActiveSubscription: boolean } }>('/subscriptions/current'),
          api.get<{ success: boolean; data: { lotesActivos: number; maxLotes: number } }>('/subscriptions/usage'),
        ]);
        setData({
          plan: currentRes.data.data.plan,
          badge: currentRes.data.data.badge,
          lotesActivos: usageRes.data.data.lotesActivos ?? 0,
          maxLotes: usageRes.data.data.maxLotes ?? 3,
          hasActiveSubscription: currentRes.data.data.hasActiveSubscription,
        });
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSelectPlan = async (plan: string) => {
    if (plan === 'COSECHA') return;
    setCheckoutLoading(true);
    try {
      const res = await api.post<{ success: boolean; data: { url: string } }>('/subscriptions/checkout', { plan });
      if (res.data.data.url) {
        window.location.href = res.data.data.url;
      }
    } catch {
      // handle error
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
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-4 bg-gray-200 rounded w-96" />
          <div className="grid grid-cols-3 gap-6 mt-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 bg-gray-100 rounded-[12px]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-1">Tu Suscripción</h1>
      <p className="text-sm text-text-secondary mb-6">
        Elige el plan que mejor se adapte a tu producción
      </p>

      {success === 'true' && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-[8px] text-sm text-green-800">
          ¡Tu suscripción se ha activado correctamente! Ya puedes disfrutar de los beneficios de tu nuevo plan.
        </div>
      )}

      {cancelled === 'true' && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-[8px] text-sm text-yellow-800">
          El proceso de pago fue cancelado. Puedes intentarlo de nuevo cuando quieras.
        </div>
      )}

      {data && (
        <>
          <div className="bg-surface border border-border rounded-[12px] p-4 mb-8">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-sm text-text-secondary">Plan actual:</span>
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
                  Gestionar suscripción
                </button>
              )}
            </div>
            <UsageMeter
              current={data.lotesActivos}
              max={data.maxLotes}
              label="Lotes activos"
            />
          </div>

          <PlanComparison
            role="VENDEDOR"
            currentPlan={data.plan}
            onSelectPlan={handleSelectPlan}
          />

          {checkoutLoading && (
            <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-[12px] shadow-lg text-center">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
                <p className="text-sm text-text-secondary">Redirigiendo a Stripe...</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
