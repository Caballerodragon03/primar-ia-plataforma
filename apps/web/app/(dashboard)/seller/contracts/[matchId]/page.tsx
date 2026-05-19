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
        <p className="text-red-600">{error || 'Contrato no encontrado.'}</p>
        <Button variant="outline" onClick={() => router.push('/seller/matches')}>
          Volver a matches
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
        <ArrowLeft className="w-4 h-4" /> Volver a matches
      </Link>

      <div className="flex items-center gap-3 flex-wrap">
        <FileText className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold text-foreground">Contrato — Firma como vendedor</h1>
        {estadoBadge(info.contratoEstado)}
      </div>

      {/* Operation summary — what's being signed */}
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
            <dt className="text-text-secondary">Importe total mercancía</dt>
            <dd className="font-semibold text-right text-green-700">{formatEur(info.precioTotalMercancia)}</dd>
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
          <p className="text-xs text-text-secondary mt-3">
            Recibirás el importe total directamente del comprador por transferencia según las condiciones de pago acordadas.
          </p>
        </div>

        <div className="p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Comisión Primar-IA</h2>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-text-secondary">Importe estimado</span>
            <span className="font-medium text-right">{formatEur(info.comisionEstimada)}</span>
            <span className="text-text-secondary">Porcentaje aplicado</span>
            <span className="font-medium text-right">
              {info.comisionPorcentaje !== null ? `${(info.comisionPorcentaje * 100).toFixed(2)}%` : '—'}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-3">
            La comisión la paga el comprador directamente a Primar-IA. Tú recibes el 100% del importe acordado del comprador por transferencia según las condiciones del contrato.
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
              El PDF lleva una marca de agua «No válido hasta firmar y pagar» hasta que ambas partes lo firmen y el comprador pague la comisión.
            </p>
          )}
        </div>

        {/* Signatures status */}
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
                  <PenTool className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">Vendedor (tú)</p>
                <p className="text-xs text-text-secondary">
                  {info.firmaVendedor ? `Firmado el ${formatDateTime(info.firmaVendedorFecha)}` : 'Pendiente de tu firma'}
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
                <p className="text-sm font-medium">Comprador</p>
                <p className="text-xs text-text-secondary">
                  {info.firmaComprador
                    ? `Firmado el ${formatDateTime(info.firmaCompradorFecha)}`
                    : 'Firmará después de pagar la comisión'}
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
            <p className="text-sm font-semibold text-amber-900">Tu firma es necesaria</p>
            <p className="text-xs text-amber-700 mt-1">
              Revisa el PDF antes de firmar. Una vez firmes, el comprador tendrá <strong>48 horas hábiles</strong>{' '}
              para pagar la comisión y firmar también. Si no lo hace, el contrato caducará y podrás iniciar de nuevo.
            </p>
          </div>
          {!showSignPad ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                onClick={() => setShowSignPad(true)}
                className="flex items-center gap-2"
              >
                <PenTool className="w-4 h-4" /> Firmar contrato
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(info.transaccionId ? `/seller/messages?tx=${info.transaccionId}` : '/seller/messages')}
              >
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
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-medium text-foreground">Dibuja tu firma:</p>
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
                <Button variant="outline" size="sm" onClick={clearSig}>Limpiar</Button>
                <Button
                  variant="primary"
                  size="sm"
                  loading={signing}
                  onClick={handleSign}
                  className="flex items-center gap-2"
                >
                  {signing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Confirmar firma
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowSignPad(false)}>Cancelar</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {waitingForBuyer && (
        <div className="bg-blue-50 border border-blue-200 rounded-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-700" />
            <p className="text-sm font-semibold text-blue-900">Esperando al comprador</p>
          </div>
          <p className="text-xs text-blue-800">
            Ya has firmado. El comprador debe pagar la comisión y firmar antes de:{' '}
            <strong>{formatDateTime(info.firmaVendedorDeadline)}</strong>. Si no, el contrato caducará y tu firma se anulará automáticamente.
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
              Abrir chat con el comprador
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCancelModal(true)}
              className="text-red-600 hover:!bg-red-50"
            >
              Cancelar contrato
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
            El comprador no firmó dentro del plazo. Puedes regenerar el contrato e iniciar la firma de nuevo desde la pantalla del match.
          </p>
        </div>
      )}

      {info.contratoEstado === 'FIRMADO' && (
        <>
          <div className="bg-green-50 border border-green-200 rounded-card p-5">
            <p className="text-sm font-semibold text-green-900">Contrato firmado por ambas partes</p>
            <p className="text-xs text-green-800 mt-1">
              El comprador pagó la comisión el {formatDateTime(info.comisionPagadaEn)}. Procede con la entrega y la cobranza según las condiciones acordadas.
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
              <h2 className="text-sm font-semibold text-foreground">Documentos generados</h2>
              <p className="text-xs text-text-secondary">
                Tras la firma del contrato hemos generado automáticamente la factura de tu venta y la de la comisión de Primar-IA.
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
                      <span className="text-sm font-medium text-foreground">Tu factura (venta al comprador)</span>
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
                      <span className="text-sm font-medium text-foreground">Factura comisión Primar-IA (referencia)</span>
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
