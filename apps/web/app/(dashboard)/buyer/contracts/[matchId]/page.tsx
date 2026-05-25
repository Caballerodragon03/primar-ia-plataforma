'use client';

/**
 * Buyer contract review + sign-and-pay page (Phase 4e — match-level).
 *
 * Flow:
 *   1. Buyer fetches contract metadata via GET /contracts/match/:id/info.
 *   2. Reviews the draft PDF (watermarked) via "Descargar contrato".
 *   3. If contratoEstado === PENDIENTE_PAGO_COMPRADOR (i.e. the seller has
 *      already signed) the buyer sees the "Firmar y pagar" button.
 *   4. Clicking it opens a modal with:
 *        - A free-text signature field (rúbrica),
 *        - A mandatory checkbox acknowledging that the signature is IRREVOCABLE,
 *        - "Cancelar" / "Confirmar y pagar" buttons.
 *      The signature is a text rubric (not a canvas) because Stripe metadata
 *      caps at 500 chars and a base64 PNG is far too large.
 *   5. On confirm, POST /contracts/match/:id/buyer-checkout returns the
 *      Stripe Checkout URL. We redirect the buyer to it. On success Stripe
 *      will redirect back to /buyer/orders/... and our webhook will atomically
 *      persist the signature + commission + generate the final PDF.
 *
 * The signature is NOT persisted before payment — it lives only in Stripe
 * metadata until the webhook fires. This keeps the contract irrevocability
 * promise honest: no payment, no signature.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, FileText, Download, CheckCircle2, Loader2, AlertTriangle, Clock, ShieldAlert,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { CancelContractModal } from '@/components/ui/CancelContractModal';
import { ShippingEventsSection } from '@/components/ui/ShippingEventsSection';
import { useT, useLocale } from '@/lib/i18n/LocaleProvider';

interface CalibreItem { calibre: string; cantidad_kg: number; precio_max_kg?: number }

interface MatchContractInfo {
  matchId: string;
  transaccionId: string | null;
  contratoEstado:
    | 'BORRADOR'
    | 'PENDIENTE_FIRMA_VENDEDOR'
    | 'PENDIENTE_PAGO_COMPRADOR'
    | 'FIRMADO'
    | 'CADUCADO'
    | 'CANCELADO';
  contratoBorradorUrl: string | null;
  contratoPdfUrl: string | null;
  comisionEstimada: number | null;
  comisionPorcentaje: number | null;
  producto: string | null;
  variedad: string | null;
  cantidadKg: number;
  precioKg: number;
  precioTotalMercancia: number;
  calibres: CalibreItem[] | null;
  incoterm: string | null;
  logistica: string | null;
  terminoPago: string | null;
  destinoFinal: string | null;
  direccionRecogida: string | null;
  // Phase 5 — auto-generated documents
  facturaPlataformaUrl: string | null;
  facturaVendedorUrl: string | null;
  resguardoPagoUrl: string | null;
  firmaVendedorDeadline: string | null;
  firmaVendedor: string | null;
  firmaVendedorFecha: string | null;
  firmaComprador: string | null;
  firmaCompradorFecha: string | null;
  comisionPagadaEn: string | null;
  // Phase 10 — shipping events
  enviadoEn: string | null;
  recibidoEn: string | null;
  hasRatedCounterpart: boolean;
  counterpartId: string | null;
  // Phase 14A — cancellation context
  canceladoEn: string | null;
  motivoCancelacion: string | null;
  canceladoPorMi: boolean;
  isSeller: boolean;
  isBuyer: boolean;
  // Phase 14M v3.14 — true si hay sesión Stripe de comisión creada que
  // todavía no se ha cerrado (pago en curso). Lo calcula el backend.
  paymentInFlight?: boolean;
}

function formatEur(n: number | null, locale: 'es' | 'en'): string {
  if (n === null) return '—';
  return new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}
function formatDateTime(iso: string | null, locale: 'es' | 'en'): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(locale === 'en' ? 'en-GB' : 'es-ES', { dateStyle: 'medium', timeStyle: 'short' });
}

const TERMINO_PAGO_LABELS_ES: Record<string, string> = {
  INMEDIATO: 'Inmediato',
  DIAS_30: '30 días',
  DIAS_60: '60 días',
};
const TERMINO_PAGO_LABELS_EN: Record<string, string> = {
  INMEDIATO: 'Immediate',
  DIAS_30: '30 days',
  DIAS_60: '60 days',
};
function formatTerminoPago(value: string, locale: 'es' | 'en'): string {
  const dict = locale === 'en' ? TERMINO_PAGO_LABELS_EN : TERMINO_PAGO_LABELS_ES;
  return dict[value] ?? value;
}

export default function BuyerMatchContractPage() {
  const t = useT();
  const { locale } = useLocale();
  const { matchId } = useParams<{ matchId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paidFlag = searchParams.get('paid') === '1';
  const cancelledFlag = searchParams.get('cancelled') === '1';

  const [info, setInfo] = useState<MatchContractInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [pollingForWebhook, setPollingForWebhook] = useState(paidFlag);
  // Phase 12 — escalated banner after ~2 min waiting for webhook. The polling
  // loop still tries (extended), but the UX shifts from "esto suele tardar
  // segundos" to "contacta soporte si persiste" so the user knows when to
  // escalate.
  const [paymentStuck, setPaymentStuck] = useState(false);

  // Modal state
  const [showSignModal, setShowSignModal] = useState(false);
  const [signatureText, setSignatureText] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function loadInfo() {
    setLoading(true);
    try {
      const { data } = await api.get(`/contracts/match/${matchId}/info`);
      setInfo(data.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? t('contract.notFound');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  // Authorization guard
  useEffect(() => {
    if (info && !info.isBuyer) {
      router.replace(`/seller/contracts/${matchId}`);
    }
  }, [info, matchId, router]);

  // Phase 14M v3.28 — Stripe redirects back faster than its webhook arrives.
  // Antes: solo hacíamos polling cada 2s esperando que el webhook llegase
  // y actualizase la DB. UX malo cuando el webhook tarda 5-30s (Railway
  // cold start + PDF gen heredada del flujo). Ahora hacemos un reconcile
  // proactivo INMEDIATAMENTE al volver con ?paid=1, en paralelo al
  // polling. reconcile-commission consulta Stripe directamente y aplica
  // la misma lógica que el webhook, así que con 1 round-trip (~500ms)
  // tenemos contratoEstado=FIRMADO sin esperar al webhook.
  useEffect(() => {
    if (!paidFlag) return;
    if (info?.contratoEstado === 'FIRMADO') {
      setPollingForWebhook(false);
      return;
    }
    setPollingForWebhook(true);

    // Reconcile proactivo — fire-and-forget. Si el webhook ya llegó esto
    // devuelve {finalized} pero no hace nada nuevo (idempotente). Si el
    // webhook NO llegó, esto fuerza la finalización en una sola llamada.
    let cancelled = false;
    (async () => {
      try {
        await api.post(`/contracts/match/${matchId}/reconcile-commission`);
        if (cancelled) return;
        // Refresh info inmediatamente para mostrar el FIRMADO.
        const { data } = await api.get(`/contracts/match/${matchId}/info`);
        if (cancelled) return;
        setInfo(data.data);
        if (data.data?.contratoEstado === 'FIRMADO') {
          setPollingForWebhook(false);
        }
      } catch { /* silent — el polling sigue como fallback */ }
    })();

    const start = Date.now();
    // Phase 12 — fallback polling. Tras el reconcile inicial casi nunca
    // hace falta, pero si Stripe está lento o el reconcile falla, el
    // polling lo recupera.
    const interval = setInterval(async () => {
      const elapsed = Date.now() - start;
      if (elapsed > 30_000) setPaymentStuck(true);
      if (elapsed > 120_000) {
        clearInterval(interval);
        setPollingForWebhook(false);
        return;
      }
      try {
        const { data } = await api.get(`/contracts/match/${matchId}/info`);
        if (cancelled) return;
        setInfo(data.data);
        if (data.data?.contratoEstado === 'FIRMADO') {
          clearInterval(interval);
          setPollingForWebhook(false);
        }
      } catch { /* silent */ }
    }, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paidFlag, info?.contratoEstado, matchId]);

  async function handleDownload() {
    setDownloading(true);
    try {
      const resp = await api.get(`/contracts/match/${matchId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `contrato-${matchId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert(t('contract.downloadFail'));
    } finally {
      setDownloading(false);
    }
  }

  function openSignModal() {
    setSignatureText('');
    setAcknowledged(false);
    setShowSignModal(true);
  }
  function closeSignModal() {
    if (submitting) return;
    setShowSignModal(false);
  }

  async function handleConfirmAndPay() {
    const trimmed = signatureText.trim();
    if (trimmed.length < 3) {
      alert('Escribe tu firma (nombre y apellidos).');
      return;
    }
    if (trimmed.length > 500) {
      alert('La firma es demasiado larga (máximo 500 caracteres).');
      return;
    }
    if (!acknowledged) {
      alert('Debes aceptar el aviso de firma irrevocable.');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post(`/contracts/match/${matchId}/buyer-checkout`, {
        signatureData: trimmed,
        ack: true,
      });
      const url = data?.data?.url as string | undefined;
      if (!url) {
        alert('Respuesta inesperada del servidor — no se pudo iniciar el pago.');
        setSubmitting(false);
        return;
      }
      // Redirect to Stripe Checkout. Don't reset submitting — we're leaving the page.
      window.location.assign(url);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'No se pudo iniciar el pago de la comisión.';
      alert(msg);
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-64" />
        <div className="h-96 bg-muted rounded-card" />
      </div>
    );
  }
  if (error || !info) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-red-600">{error || t('contract.notFound')}</p>
        <Button variant="outline" onClick={() => router.push('/buyer/orders')}>
          {t('contract.backToOrders')}
        </Button>
      </div>
    );
  }

  const sellerSigned = !!info.firmaVendedor;
  const deadlineExpired = info.firmaVendedorDeadline
    ? new Date(info.firmaVendedorDeadline).getTime() < Date.now()
    : false;
  // Phase 14M v3.14 — paymentInFlight ahora viene del backend (mira si
  // hay sesión Stripe creada y la comisión sin cobrar). Antes dependíamos
  // solo del ?paid=1 de la URL, que se perdía al refrescar y dejaba que
  // el comprador volviera a pulsar "Firmar y pagar". El paidFlag se
  // mantiene como señal de "vienes de Stripe redirigido" para arrancar
  // el polling inmediatamente.
  const paymentInFlight = (info.paymentInFlight === true || paidFlag) && info.contratoEstado !== 'FIRMADO';
  const canSignAndPay = info.isBuyer && sellerSigned && !info.firmaComprador
    && info.contratoEstado === 'PENDIENTE_PAGO_COMPRADOR'
    && !deadlineExpired
    && !paymentInFlight;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link
        href="/buyer/orders"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> {t('contract.backToOrders')}
      </Link>

      <div className="flex items-center gap-3 flex-wrap">
        <FileText className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold text-foreground">{t('contract.buyerTitle')}</h1>
      </div>

      {/* Post-Stripe redirect banners */}
      {paymentInFlight && pollingForWebhook && (
        <div className="bg-blue-50 border border-blue-200 rounded-card p-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-900">{t('contract.payment.processing.title')}</p>
            <p className="text-xs text-blue-800">
              {t('contract.payment.processing.desc')}
            </p>
          </div>
        </div>
      )}
      {paymentInFlight && !pollingForWebhook && (
        <div className="bg-amber-50 border border-amber-200 rounded-card p-4 flex items-start gap-3">
          <Loader2 className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">{t('contract.payment.finalizing.title')}</p>
            <p className="text-xs text-amber-800 mt-1">
              {t('contract.payment.finalizing.desc1')}
            </p>
            <p className="text-xs text-amber-800 mt-2">
              {t('contract.payment.finalizing.desc2')}
            </p>
            <div className="flex gap-2 mt-3 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                {t('contract.payment.refresh')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  try {
                    const { data } = await api.post(`/contracts/match/${matchId}/reconcile-commission`);
                    const result = data?.data as { status: string; checkoutUrl?: string; message?: string };
                    if (result?.status === 'finalized') {
                      window.location.reload();
                    } else if (result?.status === 'pending' && result.checkoutUrl) {
                      window.location.href = result.checkoutUrl;
                    } else {
                      alert(result?.message ?? '');
                      window.location.reload();
                    }
                  } catch (err: unknown) {
                    const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
                      ?? '';
                    alert(msg);
                  }
                }}
              >
                {t('contract.payment.reconcile')}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Phase 12 — escalated banner after ~30s of polling without webhook. */}
      {paymentInFlight && pollingForWebhook && paymentStuck && (
        <div className="bg-red-50 border border-red-200 rounded-card p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-900">{t('contract.payment.stuck.title')}</p>
            <p className="text-xs text-red-800 mt-1">
              {t('contract.payment.stuck.desc')}
            </p>
            <a
              href="mailto:soporte@primar-ia.com?subject=Pago%20procesando%20-%20Contrato"
              className="inline-block mt-3 text-xs underline text-red-700 hover:text-red-900"
            >
              soporte@primar-ia.com
            </a>
          </div>
        </div>
      )}
      {cancelledFlag && info.contratoEstado === 'PENDIENTE_PAGO_COMPRADOR' && !paymentInFlight && (
        <div className="bg-amber-50 border border-amber-200 rounded-card p-4">
          <p className="text-sm font-semibold text-amber-900">{t('contract.payment.cancelled.title')}</p>
          <p className="text-xs text-amber-800 mt-1">
            {t('contract.payment.cancelled.desc')}
          </p>
        </div>
      )}

      {/* Operation summary — what you're signing */}
      <div className="bg-card border border-border rounded-card divide-y divide-border shadow-soft">
        <div data-tutorial="contract-resumen" className="p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">{t('contract.summary')}</h2>
          <dl className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm">
            {info.producto && (
              <>
                <dt className="text-text-secondary">{t('contract.summary.product')}</dt>
                <dd className="font-medium text-right">{info.producto}{info.variedad ? ` — ${info.variedad}` : ''}</dd>
              </>
            )}
            <dt className="text-text-secondary">{t('contract.summary.quantity')}</dt>
            <dd className="font-medium text-right">{info.cantidadKg.toLocaleString(locale === 'en' ? 'en-GB' : 'es-ES')} kg</dd>
            <dt className="text-text-secondary">{t('contract.summary.pricePerKg')}</dt>
            <dd className="font-medium text-right">{formatEur(info.precioKg, locale)}</dd>
            <dt className="text-text-secondary">{t('contract.summary.amountToSeller')}</dt>
            <dd className="font-semibold text-right">{formatEur(info.precioTotalMercancia, locale)}</dd>
            {info.incoterm && (
              <>
                <dt className="text-text-secondary">{t('contract.summary.incoterm')}</dt>
                <dd className="font-medium text-right">{info.incoterm}</dd>
              </>
            )}
            {info.terminoPago && (
              <>
                <dt className="text-text-secondary">{t('contract.summary.paymentTerms')}</dt>
                <dd className="font-medium text-right">{formatTerminoPago(info.terminoPago, locale)}</dd>
              </>
            )}
            {info.destinoFinal && (
              <>
                <dt className="text-text-secondary">{t('contract.summary.destination')}</dt>
                <dd className="font-medium text-right">{info.destinoFinal}</dd>
              </>
            )}
          </dl>
          {info.calibres && info.calibres.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-text-secondary mb-2">{t('contract.summary.calibres')}</p>
              <div className="flex flex-wrap gap-1.5">
                {info.calibres.map((c) => (
                  <span key={c.calibre} className="text-xs bg-muted text-text-secondary px-2 py-0.5 rounded-badge">
                    {c.calibre}: {c.cantidad_kg.toLocaleString(locale === 'en' ? 'en-GB' : 'es-ES')} kg
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div data-tutorial="contract-comision" className="p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">{t('contract.commission.title')}</h2>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-text-secondary">{t('contract.commission.amountToPay')}</span>
            <span className="font-medium text-right">{formatEur(info.comisionEstimada, locale)}</span>
            <span className="text-text-secondary">{t('contract.commission.percent')}</span>
            <span className="font-medium text-right">
              {info.comisionPorcentaje !== null ? `${(info.comisionPorcentaje * 100).toFixed(2)}%` : '—'}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-3">
            {t('contract.commission.helpBuyer')}
          </p>
        </div>

        <div className="p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">{t('contract.document')}</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {t('contract.document.download')}
          </Button>
          {info.contratoEstado !== 'FIRMADO' && (
            <p className="text-xs text-amber-700 mt-2">
              {t('contract.document.watermarkBuyer')}
            </p>
          )}
        </div>

        {/* Signatures */}
        <div data-tutorial="contract-firmas" className="p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">{t('contract.signatures')}</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  info.firmaVendedor ? 'bg-green-100' : 'bg-muted'
                }`}
              >
                {info.firmaVendedor ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <Clock className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">{t('contract.signatures.seller')}</p>
                <p className="text-xs text-text-secondary">
                  {info.firmaVendedor
                    ? `${t('contract.signatures.signedOn')} ${formatDateTime(info.firmaVendedorFecha, locale)}`
                    : t('contract.signatures.sellerPending')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  info.firmaComprador ? 'bg-green-100' : 'bg-muted'
                }`}
              >
                {info.firmaComprador ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <Clock className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">{t('contract.signatures.buyerYou')}</p>
                <p className="text-xs text-text-secondary">
                  {info.firmaComprador
                    ? `${t('contract.signatures.signedOn')} ${formatDateTime(info.firmaCompradorFecha, locale)}`
                    : t('contract.signatures.buyerWillSignOnPay')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action area */}
      {!sellerSigned && (
        <div className="bg-muted/50 border border-border rounded-card p-5 text-center">
          <p className="text-sm text-text-secondary">
            {t('contract.sellerNotSignedYet')}
          </p>
        </div>
      )}

      {canSignAndPay && (
        <div className="bg-amber-50 border border-amber-200 rounded-card p-5 space-y-4">
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">{t('contract.sellerSignedBanner.title')}</p>
              <p className="text-xs text-amber-700 mt-1">
                {t('contract.sellerSignedBanner.before')} <strong>{formatDateTime(info.firmaVendedorDeadline, locale)}</strong>{' '}
                ({t('contract.sellerSignedBanner.deadlineWord')}) {t('contract.sellerSignedBanner.after')}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={openSignModal} className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {t('contract.signAndPay')}
            </Button>
            <Button variant="outline" onClick={() => router.push(info.transaccionId ? `/buyer/messages?tx=${info.transaccionId}&propose=1` : '/buyer/messages')}>
              {t('contract.sign.modify')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowCancelModal(true)}
              className="text-red-600 hover:!bg-red-50"
            >
              {t('contract.sign.cancel')}
            </Button>
          </div>
        </div>
      )}

      {/* Deadline expired but cron hasn't moved it to CADUCADO yet — show
          inert state so the user doesn't get a confusing 410 on click. */}
      {sellerSigned && !info.firmaComprador
        && info.contratoEstado === 'PENDIENTE_PAGO_COMPRADOR'
        && deadlineExpired && (
        <div className="bg-red-50 border border-red-200 rounded-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-700" />
            <p className="text-sm font-semibold text-red-900">{t('contract.deadlineExpiredBuyer.title')}</p>
          </div>
          <p className="text-xs text-red-800">
            {t('contract.deadlineExpiredBuyer.desc').replace('{date}', formatDateTime(info.firmaVendedorDeadline, locale))}
          </p>
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={() => router.push(info.transaccionId ? `/buyer/messages?tx=${info.transaccionId}` : '/buyer/messages')}>
              {t('contract.openSellerChat')}
            </Button>
          </div>
        </div>
      )}

      {info.contratoEstado === 'CADUCADO' && (
        <div className="bg-red-50 border border-red-200 rounded-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-700" />
            <p className="text-sm font-semibold text-red-900">{t('contract.expired.title')}</p>
          </div>
          <p className="text-xs text-red-800">
            {t('contract.expired.descBuyer')}
          </p>
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={() => router.push(info.transaccionId ? `/buyer/messages?tx=${info.transaccionId}` : '/buyer/messages')}>
              {t('contract.openSellerChat')}
            </Button>
          </div>
        </div>
      )}

      {/* Phase 14A — render explícito del estado CANCELADO. */}
      {info.contratoEstado === 'CANCELADO' && (
        <div className="bg-red-50 border border-red-200 rounded-card p-5 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-700" />
            <p className="text-sm font-semibold text-red-900">{t('contract.cancelled.title')}</p>
          </div>
          <p className="text-xs text-red-800">
            {info.canceladoPorMi
              ? `${t('contract.cancelled.byBuyerSelf')} ${formatDateTime(info.canceladoEn, locale)}.`
              : `${t('contract.cancelled.bySeller')} ${formatDateTime(info.canceladoEn, locale)}.`}
          </p>
          {info.motivoCancelacion && (
            <p className="text-xs text-red-800 italic">
              <strong>{t('contract.cancelled.reason')}</strong> {info.motivoCancelacion}
            </p>
          )}
          <div className="pt-2 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(info.transaccionId ? `/buyer/messages?tx=${info.transaccionId}` : '/buyer/messages')}
            >
              {t('contract.openSellerChat')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push('/buyer/orders')}>
              {t('contract.cancelled.backToOrders')}
            </Button>
          </div>
        </div>
      )}

      {info.contratoEstado === 'FIRMADO' && (
        <>
          <div className="bg-green-50 border border-green-200 rounded-card p-5">
            <p className="text-sm font-semibold text-green-900">{t('contract.signed.titleBuyer')}</p>
            <p className="text-xs text-green-800 mt-1">
              {t('contract.signed.descBuyer').replace('{date}', formatDateTime(info.comisionPagadaEn, locale))}
            </p>
          </div>

          {/* Phase 10 — Shipping tracking + ratings */}
          <ShippingEventsSection
            matchId={matchId}
            transaccionId={info.transaccionId}
            counterpartId={info.counterpartId}
            isSeller={info.isSeller}
            isBuyer={info.isBuyer}
            enviadoEn={info.enviadoEn}
            recibidoEn={info.recibidoEn}
            hasRatedCounterpart={info.hasRatedCounterpart}
            onChanged={loadInfo}
          />

          {/* Phase 5 — auto-generated documents for the buyer */}
          {(info.facturaPlataformaUrl || info.facturaVendedorUrl || info.resguardoPagoUrl) && (
            <div className="bg-card border border-border rounded-card p-5 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">{t('contract.docs.title')}</h2>
              <p className="text-xs text-text-secondary">
                {t('contract.docs.introBuyer')}
              </p>
              <div className="space-y-2">
                {info.resguardoPagoUrl && (
                  <a
                    href={info.resguardoPagoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 px-3 py-2 border border-primary/40 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary-dark" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{t('contract.docs.escrow')}</p>
                        <p className="text-[11px] text-text-secondary">{t('contract.docs.escrowSub')}</p>
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-primary-dark" />
                  </a>
                )}
                {info.facturaVendedorUrl && (
                  <a
                    href={info.facturaVendedorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 px-3 py-2 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">{t('contract.docs.sellerInvoiceBuyer')}</span>
                    </div>
                    <Download className="w-4 h-4 text-text-secondary" />
                  </a>
                )}
                {info.facturaPlataformaUrl && (
                  <a
                    href={info.facturaPlataformaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 px-3 py-2 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">{t('contract.docs.platformInvoiceBuyer')}</span>
                    </div>
                    <Download className="w-4 h-4 text-text-secondary" />
                  </a>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Sign-and-pay modal with irrevocability ack */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-card border border-border shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <h3 className="text-base font-bold text-foreground">{t('contract.signModal.title')}</h3>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-900 leading-relaxed">
                {t('contract.signModal.warning1')}
              </p>
              <p className="text-xs text-red-800 mt-2 leading-relaxed">
                {t('contract.signModal.warning2')}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-foreground">
                {t('contract.signModal.fieldLabel')}
              </label>
              <input
                type="text"
                value={signatureText}
                onChange={(e) => setSignatureText(e.target.value)}
                placeholder={t('contract.signModal.placeholder')}
                maxLength={500}
                disabled={submitting}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-text-secondary">
                {t('contract.signModal.fieldHelp')}
              </p>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                disabled={submitting}
                className="mt-0.5 w-4 h-4 accent-primary"
              />
              <span className="text-xs text-foreground leading-relaxed">
                {t('contract.signModal.ack')}
              </span>
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={closeSignModal} disabled={submitting}>
                {t('contract.signModal.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmAndPay}
                disabled={submitting || !acknowledged || signatureText.trim().length < 3}
                className="flex items-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {t('contract.signModal.confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 9 — Cancel-contract modal */}
      {showCancelModal && (
        <CancelContractModal
          matchId={matchId}
          onClose={() => setShowCancelModal(false)}
          onSuccess={() => { setShowCancelModal(false); void loadInfo(); }}
        />
      )}
    </div>
  );
}
