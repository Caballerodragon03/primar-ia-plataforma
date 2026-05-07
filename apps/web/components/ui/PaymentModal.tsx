'use client';

import { useState } from 'react';
import { X, CreditCard, Building2, Lock } from 'lucide-react';
import { Button } from './Button';
import { api } from '@/lib/api';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: string;
  orderSubtotal: number;
  logisticsCost: number;
  onSuccess: () => void;
}

type MetodoPago = 'card' | 'sepa_debit';

function formatEur(amount: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
}

export function PaymentModal({
  isOpen,
  onClose,
  matchId,
  orderSubtotal,
  logisticsCost,
  onSuccess,
}: PaymentModalProps) {
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('card');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = orderSubtotal + logisticsCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await api.post<{ success: boolean; data: { url: string } }>(
        '/stripe/payment-checkout',
        { matchId, metodoPago },
      );
      if (res.data.data.url) {
        window.location.href = res.data.data.url;
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; error?: string } } };
      setError(axiosErr.response?.data?.error ?? axiosErr.response?.data?.message ?? 'Error al iniciar el pago. Inténtalo de nuevo.');
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setError(null);
    setMetodoPago('card');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md bg-white rounded-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 id="payment-modal-title" className="text-lg font-semibold text-gray-900">
            Confirmar y pagar
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2.5">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal pedido</span>
                <span className="font-medium text-gray-900">{formatEur(orderSubtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Coste logístico estimado</span>
                <span className="font-medium text-gray-900">{formatEur(logisticsCost)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2.5 flex justify-between">
                <span className="text-base font-bold text-gray-900">Total</span>
                <span className="text-base font-bold text-gray-900">{formatEur(total)}</span>
              </div>
            </div>

            <div className="flex gap-2.5 text-sm text-gray-600 bg-blue-50 rounded-lg p-3">
              <Lock className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p>
                Serás redirigido a Stripe para completar el pago de forma segura. El importe
                quedará retenido hasta confirmar la entrega.
              </p>
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-gray-700 mb-2">Método de pago</legend>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={[
                    'flex items-center gap-2.5 border rounded-lg px-3 py-2.5 cursor-pointer transition-colors',
                    metodoPago === 'card'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-gray-400',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="metodoPago"
                    value="card"
                    checked={metodoPago === 'card'}
                    onChange={() => setMetodoPago('card')}
                    className="accent-primary"
                  />
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">Tarjeta</span>
                </label>
                <label
                  className={[
                    'flex items-center gap-2.5 border rounded-lg px-3 py-2.5 cursor-pointer transition-colors',
                    metodoPago === 'sepa_debit'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-gray-400',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="metodoPago"
                    value="sepa_debit"
                    checked={metodoPago === 'sepa_debit'}
                    onChange={() => setMetodoPago('sepa_debit')}
                    className="accent-primary"
                  />
                  <Building2 className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">SEPA</span>
                </label>
              </div>
            </fieldset>

            {error && (
              <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={isLoading}
                className="flex-1"
              >
                {isLoading ? 'Redirigiendo a Stripe...' : 'Pagar con Stripe'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
