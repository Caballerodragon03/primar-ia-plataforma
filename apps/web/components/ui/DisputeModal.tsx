'use client';

import { useState, useRef } from 'react';
import { X, AlertTriangle, Upload, CheckCircle2, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from './Button';
import { useT, useLocale } from '@/lib/i18n/LocaleProvider';
import type { MessageKey } from '@/lib/i18n/messages';

/* ─── Problem types by role ───────────────────────────────────────── */

type ProblemType = { value: string; labelKey: MessageKey; descKey: MessageKey; icon: string };

const BUYER_PROBLEM_TYPES: ProblemType[] = [
  { value: 'CALIDAD', labelKey: 'dispute.problemBuyer.calidad.label', descKey: 'dispute.problemBuyer.calidad.desc', icon: '🔍' },
  { value: 'CANTIDAD', labelKey: 'dispute.problemBuyer.cantidad.label', descKey: 'dispute.problemBuyer.cantidad.desc', icon: '⚖️' },
  { value: 'EMPAQUETADO', labelKey: 'dispute.problemBuyer.empaquetado.label', descKey: 'dispute.problemBuyer.empaquetado.desc', icon: '📦' },
  { value: 'CALIBRES', labelKey: 'dispute.problemBuyer.calibres.label', descKey: 'dispute.problemBuyer.calibres.desc', icon: '📏' },
  { value: 'PRODUCTO_DIFERENTE', labelKey: 'dispute.problemBuyer.productoDif.label', descKey: 'dispute.problemBuyer.productoDif.desc', icon: '🔄' },
  { value: 'RETRASO_ENTREGA', labelKey: 'dispute.problemBuyer.retraso.label', descKey: 'dispute.problemBuyer.retraso.desc', icon: '🕐' },
  { value: 'OTRO', labelKey: 'dispute.problemBuyer.otro.label', descKey: 'dispute.problemBuyer.otro.desc', icon: '❓' },
];

const SELLER_PROBLEM_TYPES: ProblemType[] = [
  { value: 'PAGO_NO_RECIBIDO', labelKey: 'dispute.problemSeller.pago.label', descKey: 'dispute.problemSeller.pago.desc', icon: '💳' },
  { value: 'COMPRADOR_NO_RESPONDE', labelKey: 'dispute.problemSeller.noResponde.label', descKey: 'dispute.problemSeller.noResponde.desc', icon: '📵' },
  { value: 'RECHAZO_INJUSTIFICADO', labelKey: 'dispute.problemSeller.rechazo.label', descKey: 'dispute.problemSeller.rechazo.desc', icon: '🚫' },
  { value: 'LOGISTICA', labelKey: 'dispute.problemSeller.logistica.label', descKey: 'dispute.problemSeller.logistica.desc', icon: '🚚' },
  { value: 'DATOS_INCORRECTOS', labelKey: 'dispute.problemSeller.datos.label', descKey: 'dispute.problemSeller.datos.desc', icon: '📍' },
  { value: 'CANCELACION_COMPRADOR', labelKey: 'dispute.problemSeller.cancelacion.label', descKey: 'dispute.problemSeller.cancelacion.desc', icon: '❌' },
  { value: 'OTRO', labelKey: 'dispute.problemSeller.otro.label', descKey: 'dispute.problemSeller.otro.desc', icon: '❓' },
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
  const t = useT();
  const { locale } = useLocale();
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
  const counterpartLabel = role === 'seller' ? t('dispute.buyerCounterpart') : t('dispute.sellerCounterpart');

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
      setError(t('dispute.uploadFail'));
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
      // Phase 14M v3.25 — extendido de 2.5s a 6s para que dé tiempo a leer
      // la confirmación con calma; antes desaparecía demasiado rápido.
      setTimeout(() => {
        handleClose();
        onSuccess?.();
      }, 6000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? t('dispute.submitFail');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const selectedInfo = problemTypes.find((p) => p.value === selectedType);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} aria-hidden="true" />
      <div className="relative z-10 bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div>
              <h2 className="font-semibold text-foreground text-base">{t('dispute.title')}</h2>
              <p className="text-[11px] text-muted-foreground">
                {role === 'seller' ? t('dispute.filingAsSeller') : t('dispute.filingAsBuyer')}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order context */}
        {orderInfo && (
          <div className="px-5 py-3 bg-muted/50 border-b border-gray-100">
            <p className="text-xs text-muted-foreground">
              {t('dispute.product')}: <span className="font-medium text-gray-800">{orderInfo.product}</span>
              {' · '}{orderInfo.kg.toLocaleString(locale === 'en' ? 'en-GB' : 'es-ES')} kg
              {' · '}{counterpartLabel}: <span className="font-medium text-gray-800">{orderInfo.seller}</span>
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {/* Step 1 — Select problem type */}
          {step === 'select' && (
            <div className="p-5 space-y-2">
              <p className="text-sm text-muted-foreground mb-4">
                {role === 'seller' ? t('dispute.selectPromptSeller') : t('dispute.selectPromptBuyer')}
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
                      : 'border-gray-100 hover:border-border bg-card',
                  ].join(' ')}
                >
                  <span className="text-xl mt-0.5 flex-shrink-0">{type.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{t(type.labelKey)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t(type.descKey)}</p>
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
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl">
                <span className="text-xl">{selectedInfo?.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{selectedInfo ? t(selectedInfo.labelKey) : ''}</p>
                  <p className="text-xs text-muted-foreground">{selectedInfo ? t(selectedInfo.descKey) : ''}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {t('dispute.describeLabel')} <span className="text-muted-foreground">{t('dispute.describeMin')}</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  maxLength={2000}
                  placeholder={role === 'seller' ? t('dispute.describePhSeller') : t('dispute.describePhBuyer')}
                  className="w-full px-3 py-2.5 border border-border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition-colors"
                />
                <p className="text-xs text-muted-foreground text-right mt-1">{description.length}/2000</p>
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  {t('dispute.reviewNote')} {role === 'buyer' ? t('dispute.reviewNoteBuyer') : t('dispute.reviewNoteSeller')}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{t('dispute.evidenceLabel')}</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {evidenceUrls.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {evidenceUrls.map((url, i) => (
                      <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
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
                    className="flex items-center gap-2 w-full p-3 bg-muted/50 rounded-xl border border-dashed border-border hover:border-gray-400 transition-colors text-left"
                  >
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {uploading ? t('dispute.uploading') : `${t('dispute.addEvidence')} (${evidenceUrls.length}/6)`}
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
              <h3 className="text-lg font-semibold text-foreground">{t('dispute.successTitle')}</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {t('dispute.successDesc')}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'success' && (
          <div className="px-5 py-4 border-t border-gray-100 flex justify-between gap-3">
            {step === 'describe' ? (
              <>
                <button type="button" onClick={() => setStep('select')} className="text-sm text-muted-foreground hover:text-foreground font-medium">
                  {t('dispute.back')}
                </button>
                <Button
                  variant="primary"
                  size="sm"
                  loading={loading}
                  disabled={description.trim().length < 20}
                  onClick={handleSubmit}
                  className="bg-red-500 hover:bg-red-600 border-red-500"
                >
                  {t('dispute.submit')}
                </Button>
              </>
            ) : (
              <>
                <button type="button" onClick={handleClose} className="text-sm text-muted-foreground hover:text-foreground font-medium">
                  {t('dispute.cancel')}
                </button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!selectedType}
                  onClick={() => setStep('describe')}
                  className="bg-red-500 hover:bg-red-600 border-red-500"
                >
                  {t('dispute.continue')}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
