'use client';

/**
 * Seller contract review + sign page (Phase 4e — match-level).
 *
 * Flow:
 *   1. Seller fetches contract metadata via GET /contracts/match/:id/info.
 *   2. Reviews the draft PDF (watermarked "no es válido hasta pago") by
 *      clicking "Descargar contrato".
 *   3. If still in BORRADOR / PENDIENTE_FIRMA_VENDEDOR, can either:
 *      - "Modificar condiciones" → back to chat with the buyer.
 *      - "Firmar contrato" → opens signature pad → POST sign-seller.
 *   4. After signing, contract moves to PENDIENTE_PAGO_COMPRADOR and the
 *      buyer has 48 business hours to pay + sign. We show the deadline.
 */

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, FileText, Download, PenTool, CheckCircle2, Loader2, Clock, AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { CancelContractModal } from '@/components/ui/CancelContractModal';
import { useT } from '@/lib/i18n/LocaleProvider';
import { ShippingEventsSection } from '@/components/ui/ShippingEventsSection';

interface CalibreItem { calibre: string; cantidad_kg: number; precio_min_kg?: number }

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
  // Product / price details (Phase 4 fix)
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
  // Phase 5 — auto-generated documents (null until contract is FIRMADO)
  facturaPlataformaUrl: string | null;
  facturaVendedorUrl: string | null;
  resguardoPagoUrl: string | null;
  // Signatures
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

function estadoBadge(estado: MatchContractInfo['contratoEstado']) {
  const labels: Record<MatchContractInfo['contratoEstado'], { text: string; cls: string }> = {
    BORRADOR: { text: 'Borrador', cls: 'bg-muted text-text-secondary' },
    PENDIENTE_FIRMA_VENDEDOR: { text: 'Pendiente tu firma', cls: 'bg-amber-100 text-amber-800' },
    PENDIENTE_PAGO_COMPRADOR: { text: 'Esperando al comprador', cls: 'bg-blue-100 text-blue-800' },
    FIRMADO: { text: 'Firmado', cls: 'bg-green-100 text-green-800' },
    CADUCADO: { text: 'Caducado', cls: 'bg-red-100 text-red-700' },
    CANCELADO: { text: 'Cancelado', cls: 'bg-red-100 text-red-700' },
  };
  const { text, cls } = labels[estado];
  return <span className={`px-2 py-0.5 rounded-badge text-xs font-medium ${cls}`}>{text}</span>;
}

export default function SellerMatchContractPage() {
  const t = useT();
  const { matchId } = useParams<{ matchId: string }>();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [info, setInfo] = useState<MatchContractInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signing, setSigning] = useState(false);
  const [showSignPad, setShowSignPad] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

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

  // Authorization guard — if backend returned isSeller=false redirect them away.
  useEffect(() => {
    if (info && !info.isSeller) {
      router.replace(`/buyer/contracts/${matchId}`);
    }
  }, [info, matchId, router]);

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

  function startDraw(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  }
  function draw(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  }
  function stopDraw() { setIsDrawing(false); }
  function clearSig() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  }

  async function handleSign() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const blank = !ctx.getImageData(0, 0, canvas.width, canvas.height).data.some(
      (ch, i) => i % 4 === 3 && ch > 0,
    );
    if (blank) {
      alert('Dibuja tu firma antes de continuar.');
      return;
    }
    const signatureData = canvas.toDataURL('image/png');
    setSigning(true);
    try {
      await api.post(`/contracts/match/${matchId}/sign-seller`, { signatureData });
      setShowSignPad(false);
      await loadInfo();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'No se pudo firmar el contrato.';
      alert(msg);
    } finally {
      setSigning(false);
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
        <Button variant="outline" onClick={() => router.push('/seller/matches')}>
          {t('contract.backToMatches')}
        </Button>
      </div>
    );
  }

  const canSign =
    info.isSeller &&
    !info.firmaVendedor &&
    (info.contratoEstado === 'BORRADOR' || info.contratoEstado === 'PENDIENTE_FIRMA_VENDEDOR');

  const waitingForBuyer =
    info.contratoEstado === 'PENDIENTE_PAGO_COMPRADOR' && !!info.firmaVendedor && !info.firmaComprador;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link
        href="/seller/matches"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> {t('contract.backToMatches')}
      </Link>

      <div className="flex items-center gap-3 flex-wrap">
        <FileText className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold text-foreground">{t('contract.sellerTitle')}</h1>
        {estadoBadge(info.contratoEstado)}
      </div>

      {/* Operation summary — what's being signed */}
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
            <dd className="font-medium text-right">{info.cantidadKg.toLocaleString('es-ES')} kg</dd>
            <dt className="text-text-secondary">{t('contract.summary.pricePerKg')}</dt>
            <dd className="font-medium text-right">{formatEur(info.precioKg)}</dd>
            <dt className="text-text-secondary">{t('contract.summary.totalGoods')}</dt>
            <dd className="font-semibold text-right text-green-700">{formatEur(info.precioTotalMercancia)}</dd>
            {info.incoterm && (
              <>
                <dt className="text-text-secondary">{t('contract.summary.incoterm')}</dt>
                <dd className="font-medium text-right">{info.incoterm}</dd>
              </>
            )}
            {info.terminoPago && (
              <>
                <dt className="text-text-secondary">{t('contract.summary.paymentTerms')}</dt>
                <dd className="font-medium text-right">{formatTerminoPago(info.terminoPago)}</dd>
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
                    {c.calibre}: {c.cantidad_kg.toLocaleString('es-ES')} kg
                  </span>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-text-secondary mt-3">
            {t('contract.summary.transferHint')}
          </p>
        </div>

        <div data-tutorial="contract-comision" className="p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">{t('contract.commission.title')}</h2>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-text-secondary">{t('contract.commission.amount')}</span>
            <span className="font-medium text-right">{formatEur(info.comisionEstimada)}</span>
            <span className="text-text-secondary">{t('contract.commission.percent')}</span>
            <span className="font-medium text-right">
              {info.comisionPorcentaje !== null ? `${(info.comisionPorcentaje * 100).toFixed(2)}%` : '—'}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-3">
            {t('contract.commission.helpSeller')}
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
              {t('contract.document.watermark')}
            </p>
          )}
        </div>

        {/* Signatures status */}
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
                  <PenTool className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">{t('contract.signatures.sellerYou')}</p>
                <p className="text-xs text-text-secondary">
                  {info.firmaVendedor ? `${t('contract.signatures.signedOn')} ${formatDateTime(info.firmaVendedorFecha)}` : t('contract.signatures.pendingYours')}
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
                  <PenTool className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">{t('contract.signatures.buyer')}</p>
                <p className="text-xs text-text-secondary">
                  {info.firmaComprador
                    ? `${t('contract.signatures.signedOn')} ${formatDateTime(info.firmaCompradorFecha)}`
                    : t('contract.signatures.buyerWillSignLater')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action area */}
      {canSign && (
        <div className="bg-amber-50 border border-amber-200 rounded-card p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-amber-900">{t('contract.sign.needTitle')}</p>
            <p className="text-xs text-amber-700 mt-1">
              {t('contract.sign.needDesc')} <strong>{t('contract.sign.deadlineWord')}</strong>{' '}
              {t('contract.sign.deadlineTail')}
            </p>
          </div>
          {!showSignPad ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                onClick={() => setShowSignPad(true)}
                className="flex items-center gap-2"
                data-tutorial="btn-firmar-vendedor"
              >
                <PenTool className="w-4 h-4" /> {t('contract.sign.btn')}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(info.transaccionId ? `/seller/messages?tx=${info.transaccionId}&propose=1` : '/seller/messages')}
              >
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
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-medium text-foreground">{t('contract.sign.drawHere')}</p>
              <canvas
                ref={canvasRef}
                width={400}
                height={150}
                className="border border-border rounded-lg bg-card cursor-crosshair w-full"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
              />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={clearSig}>{t('contract.sign.clear')}</Button>
                <Button
                  variant="primary"
                  size="sm"
                  loading={signing}
                  onClick={handleSign}
                  className="flex items-center gap-2"
                >
                  {signing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {t('contract.sign.confirm')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowSignPad(false)}>{t('contract.sign.cancelDraw')}</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {waitingForBuyer && (
        <div className="bg-blue-50 border border-blue-200 rounded-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-700" />
            <p className="text-sm font-semibold text-blue-900">{t('contract.waitingBuyer.title')}</p>
          </div>
          <p className="text-xs text-blue-800">
            {t('contract.waitingBuyer.desc.before')}{' '}
            <strong>{formatDateTime(info.firmaVendedorDeadline)}</strong>. {t('contract.waitingBuyer.desc.after')}
          </p>
          {/* During the 48h waiting window the seller may still want to
              renegotiate (e.g. drop the price) to give the buyer another
              reason to close. Expose chat from this state too. */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(info.transaccionId ? `/seller/messages?tx=${info.transaccionId}` : '/seller/messages')}
            >
              {t('contract.waitingBuyer.openChat')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCancelModal(true)}
              className="text-red-600 hover:!bg-red-50"
            >
              {t('contract.waitingBuyer.cancel')}
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
            {t('contract.expired.desc')}
          </p>
        </div>
      )}

      {/* Phase 14A — render explícito del estado CANCELADO. Sin este bloque
          el vendedor caía en un limbo sin contexto post-cancelación. */}
      {info.contratoEstado === 'CANCELADO' && (
        <div className="bg-red-50 border border-red-200 rounded-card p-5 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-700" />
            <p className="text-sm font-semibold text-red-900">{t('contract.cancelled.title')}</p>
          </div>
          <p className="text-xs text-red-800">
            {info.canceladoPorMi
              ? `${t('contract.cancelled.byYou')} ${formatDateTime(info.canceladoEn)}.`
              : `${t('contract.cancelled.byBuyer')} ${formatDateTime(info.canceladoEn)}.`}
          </p>
          {info.motivoCancelacion && (
            <p className="text-xs text-red-800 italic">
              <strong>{t('contract.cancelled.reason')}</strong> {info.motivoCancelacion}
            </p>
          )}
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/seller/matches')}
            >
              {t('contract.cancelled.back')}
            </Button>
          </div>
        </div>
      )}

      {info.contratoEstado === 'FIRMADO' && (
        <>
          <div className="bg-green-50 border border-green-200 rounded-card p-5">
            <p className="text-sm font-semibold text-green-900">{t('contract.signed.title')}</p>
            <p className="text-xs text-green-800 mt-1">
              {t('contract.signed.desc').replace('{date}', formatDateTime(info.comisionPagadaEn) ?? '')}
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

          {/* Phase 5 — auto-generated documents. The seller can download both
              invoices (their own to send to accounting, and the platform's for
              reference). The resguardo de pago is buyer-only. */}
          {(info.facturaPlataformaUrl || info.facturaVendedorUrl) && (
            <div className="bg-card border border-border rounded-card p-5 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">{t('contract.docs.title')}</h2>
              <p className="text-xs text-text-secondary">
                {t('contract.docs.intro')}
              </p>
              <div className="space-y-2">
                {info.facturaVendedorUrl && (
                  <a
                    href={info.facturaVendedorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 px-3 py-2 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">{t('contract.docs.sellerInvoice')}</span>
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
                      <span className="text-sm font-medium text-foreground">{t('contract.docs.platformInvoice')}</span>
                    </div>
                    <Download className="w-4 h-4 text-text-secondary" />
                  </a>
                )}
              </div>
            </div>
          )}
        </>
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
