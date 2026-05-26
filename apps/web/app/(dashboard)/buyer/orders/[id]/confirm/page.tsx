'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useT, useLocale } from '@/lib/i18n/LocaleProvider';

interface OrderSummary {
  id: string;
  producto: { nombre: string };
  variedad?: { nombre: string };
  totalKg: number;
  matches: Array<{
    id: string;
    vendedorId: string;
    cantidadKg: string;
    estado: string;
    transaccionId?: string;
  }>;
}

export default function ConfirmReceptionPage() {
  const t = useT();
  const { locale } = useLocale();
  const numLoc = locale === 'en' ? 'en-GB' : 'es-ES';
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { id } = params;

  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReleasing, setIsReleasing] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const { data } = await api.get(`/orders/${id}`);
      setOrder(data.data);
    } catch {
      setFetchError(t('confirm.loadFail'));
    } finally {
      setIsLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleReleasePayment = async () => {
    if (!order) return;
    const match = order.matches.find((m) => m.transaccionId);
    if (!match?.transaccionId) {
      setReleaseError(t('confirm.noTx'));
      return;
    }
    setReleaseError(null);
    setIsReleasing(true);
    try {
      await api.post(`/stripe/capture/${match.transaccionId}`);
      router.push('/buyer/orders');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setReleaseError(
        axiosErr.response?.data?.message ?? t('confirm.releaseFail')
      );
    } finally {
      setIsReleasing(false);
    }
  };

  const handleReportIssue = async () => {
    setIsReporting(true);
    router.push(`/buyer/orders/${id}?report=true`);
  };

  const productName = order
    ? order.variedad
      ? `${order.producto.nombre} — ${order.variedad.nombre}`
      : order.producto.nombre
    : '—';

  const primaryMatch = order?.matches[0];
  const shortOrderId = order ? `ORD${order.id.slice(-5).toUpperCase()}` : '—';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4 animate-pulse">
          <div className="h-16 w-16 bg-muted rounded-full mx-auto" />
          <div className="h-6 bg-muted rounded w-48 mx-auto" />
          <div className="h-48 bg-muted rounded-card" />
        </div>
      </div>
    );
  }

  if (fetchError || !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <p className="text-red-600">{fetchError ?? t('confirm.notFound')}</p>
          <Button variant="outline" onClick={() => router.push('/buyer/orders')}>
            {t('confirm.backToOrders')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <CheckCircle2 className="w-16 h-16 text-green-500" strokeWidth={1.5} />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground">{t('confirm.successTitle')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('confirm.successDesc')}
            </p>
          </div>
        </div>

        <div className="bg-card rounded-card border border-border shadow-soft p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            {t('confirm.summary')}
          </h2>

          <dl className="space-y-3">
            <div className="flex justify-between items-center">
              <dt className="text-sm text-muted-foreground">{t('confirm.product')}</dt>
              <dd className="text-sm font-medium text-foreground text-right max-w-[60%]">{productName}</dd>
            </div>
            <div className="border-t border-gray-100" />
            <div className="flex justify-between items-center">
              <dt className="text-sm text-muted-foreground">{t('confirm.farmerId')}</dt>
              <dd className="text-sm font-mono text-foreground">
                {primaryMatch ? primaryMatch.vendedorId.slice(-8).toUpperCase() : '—'}
              </dd>
            </div>
            <div className="border-t border-gray-100" />
            <div className="flex justify-between items-center">
              <dt className="text-sm text-muted-foreground">{t('confirm.quantity')}</dt>
              <dd className="text-sm font-medium text-foreground">
                {primaryMatch
                  ? `${parseFloat(primaryMatch.cantidadKg).toLocaleString(numLoc)} kg`
                  : `${order.totalKg.toLocaleString(numLoc)} kg`}
              </dd>
            </div>
            <div className="border-t border-gray-100" />
            <div className="flex justify-between items-center">
              <dt className="text-sm text-muted-foreground">{t('confirm.orderId')}</dt>
              <dd className="text-sm font-mono font-medium text-foreground">#{shortOrderId}</dd>
            </div>
          </dl>
        </div>

        {releaseError && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p role="alert" className="text-sm text-red-700">{releaseError}</p>
          </div>
        )}

        <div className="space-y-3">
          <Button
            variant="primary"
            loading={isReleasing}
            onClick={handleReleasePayment}
            className="w-full"
          >
            {t('confirm.releaseBtn')}
          </Button>
          <Button
            variant="ghost"
            onClick={handleReportIssue}
            disabled={isReleasing || isReporting}
            className="w-full text-red-600 hover:bg-red-50"
          >
            {t('confirm.reportBtn')}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {t('confirm.warning')}
        </p>
      </div>
    </div>
  );
}
