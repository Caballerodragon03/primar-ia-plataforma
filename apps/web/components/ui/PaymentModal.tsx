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
  const [success, setSuccess] = useState(false);

  const total = orderSubtotal + logisticsCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await api.post('/stripe/payment-intent', { matchId, metodoPago });
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; error?: string } } };
      setError(axiosErr.response?.data?.error ?? axiosErr.response?.data?.message ?? 'Failed to pre-authorize payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setError(null);
    setSuccess(false);
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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 id="payment-modal-title" className="text-lg font-semibold text-gray-900">
            Confirm and Pre-authorize Payment
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {success ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-base font-semibold text-gray-900">Payment pre-authorized successfully!</p>
              <p className="text-sm text-gray-500 mt-1">The order will be published shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Breakdown */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2.5">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Order Subtotal</span>
                  <span className="font-medium text-gray-900">{formatEur(orderSubtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Estimated Logistics Cost</span>
                  <span className="font-medium text-gray-900">{formatEur(logisticsCost)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2.5 flex justify-between">
                  <span className="text-base font-bold text-gray-900">Total to Authorize</span>
                  <span className="text-base font-bold text-gray-900">{formatEur(total)}</span>
                </div>
              </div>

              {/* Escrow notice */}
              <div className="flex gap-2.5 text-sm text-gray-600 bg-blue-50 rounded-lg p-3">
                <Lock className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p>
                  This amount will be held in a secure escrow account and released to the farmers upon
                  successful delivery.
                </p>
              </div>

              {/* Payment method selector */}
              <fieldset>
                <legend className="text-sm font-medium text-gray-700 mb-2">Payment Method</legend>
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
                    <span className="text-sm text-gray-700">Credit/Debit Card</span>
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
                    <span className="text-sm text-gray-700">SEPA Direct Debit</span>
                  </label>
                </div>
              </fieldset>

              {/* Stripe secure processing notice */}
              <p className="text-sm text-gray-500">El pago se procesará de forma segura a través de Stripe.</p>

              {error && (
                <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={isLoading}
                  className="flex-1"
                >
                  Authorize and Publish Order
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
