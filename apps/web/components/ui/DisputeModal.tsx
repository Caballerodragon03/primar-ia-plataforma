'use client';

import { useState, useRef } from 'react';
import { X, AlertTriangle, Upload, CheckCircle2, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from './Button';

/* ─── Problem types by role ───────────────────────────────────────── */

const BUYER_PROBLEM_TYPES = [
  { value: 'CALIDAD', label: 'Quality issue', desc: 'Product does not meet the agreed quality standards', icon: '🔍' },
  { value: 'CANTIDAD', label: 'Wrong quantity', desc: 'Received fewer kg than agreed', icon: '⚖️' },
  { value: 'EMPAQUETADO', label: 'Packaging issue', desc: 'Product arrived damaged or poorly packaged', icon: '📦' },
  { value: 'CALIBRES', label: 'Wrong calibers', desc: 'Received calibers different from what was ordered', icon: '📏' },
  { value: 'PRODUCTO_DIFERENTE', label: 'Different product', desc: 'Received a product different from what was ordered', icon: '🔄' },
  { value: 'RETRASO_ENTREGA', label: 'Delivery delay', desc: 'Product has not arrived within the agreed timeframe', icon: '🕐' },
  { value: 'OTRO', label: 'Other issue', desc: 'Other problem not listed above', icon: '❓' },
];

const SELLER_PROBLEM_TYPES = [
  { value: 'PAGO_NO_RECIBIDO', label: 'Payment not received', desc: 'Payment has not been released after confirmed delivery', icon: '💳' },
  { value: 'COMPRADOR_NO_RESPONDE', label: 'Buyer not responding', desc: 'The buyer is not responding to messages or delivery confirmation', icon: '📵' },
  { value: 'RECHAZO_INJUSTIFICADO', label: 'Unjustified rejection', desc: 'The buyer rejected the delivery without valid reason', icon: '🚫' },
  { value: 'LOGISTICA', label: 'Logistics / access issue', desc: 'Unable to complete delivery due to logistics or access problems', icon: '🚚' },
  { value: 'DATOS_INCORRECTOS', label: 'Incorrect delivery data', desc: 'The delivery address or contact information provided is wrong', icon: '📍' },
  { value: 'CANCELACION_COMPRADOR', label: 'Buyer cancelled unfairly', desc: 'The buyer cancelled after the lot was already prepared and dispatched', icon: '❌' },
  { value: 'OTRO', label: 'Other issue', desc: 'Other problem not listed above', icon: '❓' },
];

/* ─── Types ──────────────────────────────────────────────────────── */

interface DisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaccionId: string;
  /**
   * For buyers: { product, seller, kg }
   * For sellers: { product, seller (buyer name), kg }
   */
  orderInfo?: { product: string; seller: string; kg: number };
  onSuccess?: () => void;
  /** 'buyer' shows buyer-centric problem types; 'seller' shows seller-centric ones */
  role?: 'buyer' | 'seller';
}

type Step = 'select' | 'describe' | 'success';

/* ─── Component ──────────────────────────────────────────────────── */

export function DisputeModal({
  isOpen,
  onClose,
  transaccionId,
  orderInfo,
  onSuccess,
  role = 'buyer',
}: DisputeModalProps) {
  const [step, setStep] = useState<Step>('select');
  const [selectedType, setSelectedType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const problemTypes = role === 'seller' ? SELLER_PROBLEM_TYPES : BUYER_PROBLEM_TYPES;
  const counterpartLabel = role === 'seller' ? 'Buyer' : 'Seller';

  const handleClose = () => {
    setStep('select');
    setSelectedType('');
    setDescription('');
    setEvidenceUrls([]);
    setError(null);
    onClose();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || evidenceUrls.length >= 6) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'disputes');
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setEvidenceUrls((prev) => [...prev, res.data.data.url]);
    } catch {
      setError('Failed to upload file.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!selectedType || description.trim().length < 20) return;
    setLoading(true);
    setError(null);
    try {
      await api.post('/disputes', {
        transaccionId,
        tipoProblema: selectedType,
        descripcion: description.trim(),
        evidenciasUrls: evidenceUrls,
      });
      setStep('success');
      setTimeout(() => {
        handleClose();
        onSuccess?.();
      }, 2500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Failed to open claim. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const selectedInfo = problemTypes.find((p) => p.value === selectedType);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} aria-hidden="true" />
      <div className="relative z-10 bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div>
              <h2 className="font-semibold text-gray-900 text-base">Open a Claim</h2>
              <p className="text-[10px] text-gray-400">
                {role === 'seller' ? 'Filing as seller' : 'Filing as buyer'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order context */}
        {orderInfo && (
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-xs text-gray-500">
              Product: <span className="font-medium text-gray-800">{orderInfo.product}</span>
              {' · '}{orderInfo.kg.toLocaleString('es-ES')} kg
              {' · '}{counterpartLabel}: <span className="font-medium text-gray-800">{orderInfo.seller}</span>
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {/* Step 1 — Select problem type */}
          {step === 'select' && (
            <div className="p-5 space-y-2">
              <p className="text-sm text-gray-600 mb-4">
                {role === 'seller'
                  ? 'What issue are you experiencing with this transaction?'
                  : 'What is the issue with this order?'}
              </p>
              {problemTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSelectedType(type.value)}
                  className={[
                    'w-full flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all',
                    selectedType === type.value
                      ? 'border-red-400 bg-red-50'
                      : 'border-gray-100 hover:border-gray-200 bg-white',
                  ].join(' ')}
                >
                  <span className="text-xl mt-0.5 flex-shrink-0">{type.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{type.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{type.desc}</p>
                  </div>
                  {selectedType === type.value && (
                    <CheckCircle2 className="w-5 h-5 text-red-500 ml-auto flex-shrink-0 mt-0.5" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Step 2 — Describe */}
          {step === 'describe' && (
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                <span className="text-xl">{selectedInfo?.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{selectedInfo?.label}</p>
                  <p className="text-xs text-gray-500">{selectedInfo?.desc}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Describe the issue <span className="text-gray-400">(min. 20 characters)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  maxLength={2000}
                  placeholder={
                    role === 'seller'
                      ? 'Explain the situation in detail. Include dates, communication attempts, and any relevant context...'
                      : 'Explain what happened in detail. Include quantities, dates, and any other relevant information...'
                  }
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition-colors"
                />
                <p className="text-xs text-gray-400 text-right mt-1">{description.length}/2000</p>
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Our team will review your claim within <strong>48 hours</strong>. Both parties will be notified and can provide evidence.
                  {role === 'buyer' ? ' Funds remain in escrow during the process.' : ' You will be notified of any resolution.'}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-600">Evidence (up to 6 files)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {evidenceUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {evidenceUrls.map((url, i) => (
                      <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setEvidenceUrls((prev) => prev.filter((_, j) => j !== i))}
                          className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {evidenceUrls.length < 6 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 w-full p-3 bg-gray-50 rounded-xl border border-dashed border-gray-300 hover:border-gray-400 transition-colors text-left"
                  >
                    <Upload className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {uploading ? 'Uploading…' : `Add photo or PDF (${evidenceUrls.length}/6)`}
                    </span>
                  </button>
                )}
              </div>

              {error && (
                <p className="text-sm text-red-500 text-center" role="alert">{error}</p>
              )}
            </div>
          )}

          {/* Step 3 — Success */}
          {step === 'success' && (
            <div className="p-8 flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-2">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Claim submitted</h3>
              <p className="text-sm text-gray-500 max-w-xs">
                Our team will review your claim within 48 hours. You&apos;ll be notified of any updates.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'success' && (
          <div className="px-5 py-4 border-t border-gray-100 flex justify-between gap-3">
            {step === 'describe' ? (
              <>
                <button type="button" onClick={() => setStep('select')} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
                  ← Back
                </button>
                <Button
                  variant="primary"
                  size="sm"
                  loading={loading}
                  disabled={description.trim().length < 20}
                  onClick={handleSubmit}
                  className="bg-red-500 hover:bg-red-600 border-red-500"
                >
                  Submit Claim
                </Button>
              </>
            ) : (
              <>
                <button type="button" onClick={handleClose} className="text-sm text-gray-500 hover:text-gray-700 font-medium">
                  Cancel
                </button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!selectedType}
                  onClick={() => setStep('describe')}
                  className="bg-red-500 hover:bg-red-600 border-red-500"
                >
                  Continue →
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
