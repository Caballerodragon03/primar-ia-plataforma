'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';

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
      setFetchError('Failed to load order details.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleReleasePayment = async () => {
    if (!order) return;
    const match = order.matches.find((m) => m.transaccionId);
    if (!match?.transaccionId) {
      setReleaseError('No transaction found for this order.');
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
        axiosErr.response?.data?.message ?? 'Failed to release payment. Please contact support.'
      );
    } finally {
      setIsReleasing(false);
    }
  };

  const handleReportIssue = async () => {
    setIsReporting(true);
    // Navigate to issue report flow (Phase 2)
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
          <p className="text-red-600">{fetchError ?? 'Pedido no encontrado.'}</p>
          <Button variant="outline" onClick={() => router.push('/buyer/orders')}>
            Back to Orders
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Success header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <CheckCircle2 className="w-16 h-16 text-green-500" strokeWidth={1.5} />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground">Lot Received Successfully!</h1>
            <p className="text-sm text-muted-foreground">
              Please review the details below before releasing payment.
            </p>
          </div>
        </div>

        {/* Details card */}
        <div className="bg-card rounded-card border border-border shadow-soft p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Delivery Summary
          </h2>

          <dl className="space-y-3">
            <div className="flex justify-between items-center">
              <dt className="text-sm text-muted-foreground">Product</dt>
              <dd className="text-sm font-medium text-foreground text-right max-w-[60%]">{productName}</dd>
            </div>
            <div className="border-t border-gray-100" />
            <div className="flex justify-between items-center">
              <dt className="text-sm text-muted-foreground">Farmer ID</dt>
              <dd className="text-sm font-mono text-foreground">
                {primaryMatch ? primaryMatch.vendedorId.slice(-8).toUpperCase() : '—'}
              </dd>
            </div>
            <div className="border-t border-gray-100" />
            <div className="flex justify-between items-center">
              <dt className="text-sm text-muted-foreground">Quantity</dt>
              <dd className="text-sm font-medium text-foreground">
                {primaryMatch
                  ? `${parseFloat(primaryMatch.cantidadKg).toLocaleString('es-ES')} kg`
                  : `${order.totalKg.toLocaleString('es-ES')} kg`}
              </dd>
            </div>
            <div className="border-t border-gray-100" />
            <div className="flex justify-between items-center">
              <dt className="text-sm text-muted-foreground">Order ID</dt>
              <dd className="text-sm font-mono font-medium text-foreground">#{shortOrderId}</dd>
            </div>
          </dl>
        </div>

        {/* Error */}
        {releaseError && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p role="alert" className="text-sm text-red-700">{releaseError}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Button
            variant="primary"
            loading={isReleasing}
            onClick={handleReleasePayment}
            className="w-full"
          >
            Mark as Inspected & Release Payment
          </Button>
          <Button
            variant="ghost"
            onClick={handleReportIssue}
            disabled={isReleasing || isReporting}
            className="w-full text-red-600 hover:bg-red-50"
          >
            Report an Issue
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Releasing payment is irreversible. Only confirm if the lot has been inspected and accepted.
        </p>
      </div>
    </div>
  );
}
