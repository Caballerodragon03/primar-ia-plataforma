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
  isSeller: boolean;
  isBuyer: boolean;
}

function formatEur(n: number | null): string {
  if (n === null) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}
function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
}

const TERMINO_PAGO_LABELS: Record<string, string> = {
  INMEDIATO: 'Inmediato',
  DIAS_30: '30 días',
  DIAS_60: '60 días',
};
function formatTerminoPago(value: string): string {
  return TERMINO_PAGO_LABELS[value] ?? value;
}

export default function BuyerMatchContractPage() {
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
        ?? 'No se pudo cargar el contrato.';
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

  // After Stripe redirects back with ?paid=1 the webhook may not have fired
  // yet. Poll the info endpoint every 2s for up to 20s waiting for
  // contratoEstado=FIRMADO. Stop as soon as we see it (or when the user
  // navigates away — useEffect cleanup).
  useEffect(() => {
    if (!paidFlag) return;
    if (info?.contratoEstado === 'FIRMADO') {
      setPollingForWebhook(false);
      return;
    }
    setPollingForWebhook(true);
    const start = Date.now();
    const interval = setInterval(async () => {
      if (Date.now() - start > 20_000) {
        clearInterval(interval);
        setPollingForWebhook(false);
        return;
      }
      try {
        const { data } = await api.get(`/contracts/match/${matchId}/info`);
        setInfo(data.data);
        if (data.data?.contratoEstado === 'FIRMADO') {
          clearInterval(interval);
          setPollingForWebhook(false);
        }
      } catch { /* silent */ }
    }, 2000);
    return () => clearInterval(interval);
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
      alert('No se pudo descargar el contrato.');
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
        <p className="text-red-600">{error || 'Contrato no encontrado.'}</p>
        <Button variant="outline" onClick={() => router.push('/buyer/orders')}>
          Volver a pedidos
        </Button>
      </div>
    );
  }

  const sellerSigned = !!info.firmaVendedor;
  const deadlineExpired = info.firmaVendedorDeadline
    ? new Date(info.firmaVendedorDeadline).getTime() < Date.now()
    : false;
  // Anti double-charge: if Stripe redirected us back with ?paid=1, NEVER
  // re-show the "Firmar y pagar" button — even if the webhook hasn't fired
  // yet and the state still says PENDIENTE_PAGO_COMPRADOR. The user already
  // paid; clicking again would create a second Checkout Session.
  // The backend has its own protection (reuses the same session) but defense
  // in depth: also block here.
  const paymentInFlight = paidFlag && info.contratoEstado !== 'FIRMADO';
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
        <ArrowLeft className="w-4 h-4" /> Volver a pedidos
      </Link>

      <div className="flex items-center gap-3 flex-wrap">
        <FileText className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold text-foreground">Contrato — Firma y pago</h1>
      </div>

      {/* Post-Stripe redirect banners */}
      {paymentInFlight && pollingForWebhook && (
        <div className="bg-blue-50 border border-blue-200 rounded-card p-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Procesando tu pago…</p>
            <p className="text-xs text-blue-800">
              Stripe ha confirmado el pago. Estamos finalizando la firma y el contrato. Esto suele tardar unos segundos.
            </p>
          </div>
        </div>
      )}
      {paymentInFlight && !pollingForWebhook && (
        <div className="bg-amber-50 border border-amber-200 rounded-card p-4 flex items-start gap-3">
          <Loader2 className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">El pago se está finalizando</p>
            <p className="text-xs text-amber-800 mt-1">
              Tu pago se ha enviado a Stripe pero aún no hemos recibido la confirmación final. No vuelvas a pulsar «Firmar y pagar» — ya está en curso. Refresca esta página en un minuto.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => window.location.reload()}
            >
              Refrescar
            </Button>
          </div>
        </div>
      )}
      {cancelledFlag && info.contratoEstado === 'PENDIENTE_PAGO_COMPRADOR' && !paymentInFlight && (
        <div className="bg-amber-50 border border-amber-200 rounded-card p-4">
          <p className="text-sm font-semibold text-amber-900">Pago cancelado</p>
          <p className="text-xs text-amber-800 mt-1">
            Cancelaste el pago en Stripe. Puedes reintentar cuando quieras, siempre que el vendedor no haya caducado su firma.
          </p>
        </div>
      )}

      {/* Operation summary — what you're signing */}
      <div className="bg-card border border-border rounded-card divide-y divide-border shadow-soft">
        <div className="p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Resumen de la operación</h2>
          <dl className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm">
            {info.producto && (
              <>
                <dt className="text-text-secondary">Producto</dt>
                <dd className="font-medium text-right">{info.producto}{info.variedad ? ` — ${info.variedad}` : ''}</dd>
              </>
            )}
            <dt className="text-text-secondary">Cantidad</dt>
            <dd className="font-medium text-right">{info.cantidadKg.toLocaleString('es-ES')} kg</dd>
            <dt className="text-text-secondary">Precio/kg acordado</dt>
            <dd className="font-medium text-right">{formatEur(info.precioKg)}</dd>
            <dt className="text-text-secondary">Importe a pagar al vendedor</dt>
            <dd className="font-semibold text-right">{formatEur(info.precioTotalMercancia)}</dd>
            {info.incoterm && (
              <>
                <dt className="text-text-secondary">Incoterm</dt>
                <dd className="font-medium text-right">{info.incoterm}</dd>
              </>
            )}
            {info.terminoPago && (
              <>
                <dt className="text-text-secondary">Condiciones de pago</dt>
                <dd className="font-medium text-right">{formatTerminoPago(info.terminoPago)}</dd>
              </>
            )}
            {info.destinoFinal && (
              <>
                <dt className="text-text-secondary">Destino</dt>
                <dd className="font-medium text-right">{info.destinoFinal}</dd>
              </>
            )}
          </dl>
          {info.calibres && info.calibres.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-text-secondary mb-2">Calibres</p>
              <div className="flex flex-wrap gap-1.5">
                {info.calibres.map((c) => (
                  <span key={c.calibre} className="text-xs bg-muted text-text-secondary px-2 py-0.5 rounded-badge">
                    {c.calibre}: {c.cantidad_kg.toLocaleString('es-ES')} kg
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Comisión Primar-IA</h2>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-text-secondary">Importe a pagar</span>
            <span className="font-medium text-right">{formatEur(info.comisionEstimada)}</span>
            <span className="text-text-secondary">Porcentaje aplicado</span>
            <span className="font-medium text-right">
              {info.comisionPorcentaje !== null ? `${(info.comisionPorcentaje * 100).toFixed(2)}%` : '—'}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-3">
            Esta comisión la paga el comprador (tú) directamente a Primar-IA por el servicio de matchmaking. El importe de la mercancía lo pagas directamente al vendedor según las condiciones acordadas en el contrato.
          </p>
        </div>

        <div className="p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Documento</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Descargar contrato (PDF)
          </Button>
          {info.contratoEstado !== 'FIRMADO' && (
            <p className="text-xs text-amber-700 mt-2">
              Revisa el contrato con calma antes de firmar. Lleva marca de agua hasta que firmes y pagues la comisión.
            </p>
          )}
        </div>

        {/* Signatures */}
        <div className="p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Estado de firmas</h2>
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
                <p className="text-sm font-medium">Vendedor</p>
                <p className="text-xs text-text-secondary">
                  {info.firmaVendedor
                    ? `Firmado el ${formatDateTime(info.firmaVendedorFecha)}`
                    : 'Pendiente — debe firmar primero'}
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
                <p className="text-sm font-medium">Comprador (tú)</p>
                <p className="text-xs text-text-secondary">
                  {info.firmaComprador
                    ? `Firmado el ${formatDateTime(info.firmaCompradorFecha)}`
                    : 'Firmarás al pagar la comisión'}
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
            El vendedor todavía no ha firmado. Podrás firmar y pagar cuando el vendedor complete su firma.
          </p>
        </div>
      )}

      {canSignAndPay && (
        <div className="bg-amber-50 border border-amber-200 rounded-card p-5 space-y-4">
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">El vendedor ha firmado</p>
              <p className="text-xs text-amber-700 mt-1">
                Tienes hasta <strong>{formatDateTime(info.firmaVendedorDeadline)}</strong>{' '}
                (48 horas hábiles) para firmar y pagar la comisión. Pasado ese plazo el contrato caducará.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={openSignModal} className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Firmar y pagar comisión
            </Button>
            <Button variant="outline" onClick={() => router.push(info.transaccionId ? `/buyer/messages?tx=${info.transaccionId}` : '/buyer/messages')}>
              Modificar condiciones (chat)
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowCancelModal(true)}
              className="text-red-600 hover:!bg-red-50"
            >
              Cancelar contrato
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
            <p className="text-sm font-semibold text-red-900">Plazo de firma vencido</p>
          </div>
          <p className="text-xs text-red-800">
            El plazo de 48 horas hábiles expiró el {formatDateTime(info.firmaVendedorDeadline)}.
            El contrato pasará a caducado en breve. Habla con el vendedor por chat si quieres reabrir la operación.
          </p>
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={() => router.push(info.transaccionId ? `/buyer/messages?tx=${info.transaccionId}` : '/buyer/messages')}>
              Abrir chat con el vendedor
            </Button>
          </div>
        </div>
      )}

      {info.contratoEstado === 'CADUCADO' && (
        <div className="bg-red-50 border border-red-200 rounded-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-700" />
            <p className="text-sm font-semibold text-red-900">Contrato caducado</p>
          </div>
          <p className="text-xs text-red-800">
            El plazo de 48 horas hábiles para firmar y pagar ha vencido. Habla con el vendedor por chat si quieres iniciar de nuevo.
          </p>
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={() => router.push(info.transaccionId ? `/buyer/messages?tx=${info.transaccionId}` : '/buyer/messages')}>
              Abrir chat con el vendedor
            </Button>
          </div>
        </div>
      )}

      {info.contratoEstado === 'FIRMADO' && (
        <>
          <div className="bg-green-50 border border-green-200 rounded-card p-5">
            <p className="text-sm font-semibold text-green-900">Contrato firmado y comisión pagada</p>
            <p className="text-xs text-green-800 mt-1">
              Comisión pagada el {formatDateTime(info.comisionPagadaEn)}. Ahora procede el pago del importe al vendedor según las condiciones del contrato.
            </p>
          </div>

          {/* Phase 5 — auto-generated documents for the buyer */}
          {(info.facturaPlataformaUrl || info.facturaVendedorUrl || info.resguardoPagoUrl) && (
            <div className="bg-card border border-border rounded-card p-5 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Documentos generados</h2>
              <p className="text-xs text-text-secondary">
                Hemos generado automáticamente las facturas y el resguardo con las instrucciones para que pagues al vendedor.
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
                        <p className="text-sm font-semibold text-foreground">Resguardo de pago al vendedor</p>
                        <p className="text-[11px] text-text-secondary">IBAN, importe y referencia para tu transferencia</p>
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
                      <span className="text-sm font-medium text-foreground">Factura del vendedor (mercancía)</span>
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
                      <span className="text-sm font-medium text-foreground">Factura Primar-IA (comisión)</span>
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
              <h3 className="text-base font-bold text-foreground">Firma irrevocable</h3>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-900 leading-relaxed">
                <strong>Aviso importante.</strong> Al firmar y pagar la comisión, aceptas el contrato de forma <strong>vinculante e irrevocable</strong>. No podrás deshacer la firma ni recuperar la comisión.
              </p>
              <p className="text-xs text-red-800 mt-2 leading-relaxed">
                Si dejas de cumplir las condiciones acordadas, podrás incurrir en responsabilidades legales según el Código de Comercio y el Reglamento (UE) 910/2014 (eIDAS).
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-foreground">
                Tu firma (nombre y apellidos)
              </label>
              <input
                type="text"
                value={signatureText}
                onChange={(e) => setSignatureText(e.target.value)}
                placeholder="Ej: Juan García López"
                maxLength={500}
                disabled={submitting}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-text-secondary">
                Esto se considera firma electrónica simple según el Reglamento eIDAS.
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
                Entiendo que esta firma es <strong>irrevocable</strong> y que al continuar acepto el contrato en su totalidad.
              </span>
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={closeSignModal} disabled={submitting}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmAndPay}
                disabled={submitting || !acknowledged || signatureText.trim().length < 3}
                className="flex items-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirmar y pagar
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
