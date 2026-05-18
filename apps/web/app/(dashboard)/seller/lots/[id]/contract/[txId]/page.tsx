'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, CheckCircle2, PenTool, Loader2, QrCode } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';

interface ContractInfo {
  transaccionId: string;
  estado: string;
  producto: string;
  variedad: string | null;
  calibres: unknown;
  cantidadKg: number;
  precioKg: number;
  precioTotal: number;
  comision: number;
  incoterm: string;
  destinoFinal: string | null;
  vendedor: { nombre: string; empresa: string | null; cif: string | null; direccion: string | null };
  comprador: { nombre: string; empresa: string | null; cif: string | null; direccion: string | null };
  firmaComprador: string | null;
  firmaCompradorFecha: string | null;
  firmaVendedor: string | null;
  firmaVendedorFecha: string | null;
  qrToken: string | null;
  qrUsado: boolean;
  fotosLoteUrls: string[];
}

function formatEur(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

export default function SellerContractPage() {
  const { id, txId } = useParams<{ id: string; txId: string }>();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [contract, setContract] = useState<ContractInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signing, setSigning] = useState(false);
  const [showSignPad, setShowSignPad] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    api.get(`/contracts/${txId}/info`)
      .then(({ data }) => setContract(data.data))
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
          ?? 'Could not load contract info.';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [txId]);

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
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
  };

  const stopDraw = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSign = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const signatureData = canvas.toDataURL('image/png');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const blank = !ctx.getImageData(0, 0, canvas.width, canvas.height).data.some((ch, i) => i % 4 === 3 && ch > 0);
    if (blank) { alert('Please draw your signature first.'); return; }

    setSigning(true);
    try {
      const { data } = await api.post(`/contracts/${txId}/sign`, { signatureData });
      setContract((prev) => prev ? { ...prev, firmaVendedor: signatureData, firmaVendedorFecha: new Date().toISOString() } : prev);
      setShowSignPad(false);
      if (data.data?.qrGenerated) {
        alert('Contract fully signed! A QR code has been generated. Go to the QR & Photos page to print it and upload lot photos.');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to sign contract.';
      alert(msg);
    } finally {
      setSigning(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const resp = await api.get(`/contracts/${txId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `contrato-${txId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Could not download contract PDF.');
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-64" />
        <div className="h-96 bg-muted rounded-card" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 mb-4">{error || 'Contract not found.'}</p>
        <Button variant="outline" onClick={() => router.push(`/seller/lots/${id}`)}>Back to Lot</Button>
      </div>
    );
  }

  const buyerSigned = !!contract.firmaComprador;
  const sellerSigned = !!contract.firmaVendedor;
  const bothSigned = buyerSigned && sellerSigned;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link href={`/seller/lots/${id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Lot
      </Link>

      <div className="flex items-center gap-3">
        <FileText className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold text-foreground">Contract — Sign as Seller</h1>
        {bothSigned && <CheckCircle2 className="w-5 h-5 text-green-500" />}
      </div>

      {/* Contract details */}
      <div className="bg-card rounded-card border border-border shadow-soft divide-y divide-border">
        <div className="p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Parties</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Seller (You)</p>
              <p className="text-sm font-medium">{contract.vendedor.nombre}</p>
              {contract.vendedor.empresa && <p className="text-xs text-muted-foreground">{contract.vendedor.empresa}</p>}
              {contract.vendedor.cif && <p className="text-xs text-muted-foreground">CIF: {contract.vendedor.cif}</p>}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Buyer</p>
              <p className="text-sm font-medium">{contract.comprador.nombre}</p>
              {contract.comprador.empresa && <p className="text-xs text-muted-foreground">{contract.comprador.empresa}</p>}
              {contract.comprador.cif && <p className="text-xs text-muted-foreground">CIF: {contract.comprador.cif}</p>}
            </div>
          </div>
        </div>

        <div className="p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Detalles del producto</h2>
          <dl className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm">
            <div><dt className="text-xs text-muted-foreground">Product</dt><dd className="font-medium">{contract.producto}</dd></div>
            {contract.variedad && <div><dt className="text-xs text-muted-foreground">Variety</dt><dd className="font-medium">{contract.variedad}</dd></div>}
            <div><dt className="text-xs text-muted-foreground">Quantity</dt><dd className="font-medium">{contract.cantidadKg.toLocaleString('es-ES')} kg</dd></div>
            <div><dt className="text-xs text-muted-foreground">Price/kg</dt><dd className="font-medium">{formatEur(contract.precioKg)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Incoterm</dt><dd className="font-medium">{contract.incoterm}</dd></div>
            {contract.destinoFinal && <div><dt className="text-xs text-muted-foreground">Destination</dt><dd className="font-medium">{contract.destinoFinal}</dd></div>}
          </dl>
        </div>

        <div className="p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Financial Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Base amount</span><span className="font-medium">{formatEur(contract.precioTotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Platform fee</span><span className="font-medium">{formatEur(contract.comision)}</span></div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="font-semibold">You will receive</span>
              <span className="font-bold text-green-700">{formatEur(contract.precioTotal)}</span>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Signatures</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${buyerSigned ? 'bg-green-100' : 'bg-muted'}`}>
                {buyerSigned ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <PenTool className="w-4 h-4 text-muted-foreground" />}
              </div>
              <div>
                <p className="text-sm font-medium">{contract.comprador.nombre} (Buyer)</p>
                <p className="text-xs text-muted-foreground">
                  {buyerSigned ? `Signed on ${new Date(contract.firmaCompradorFecha!).toLocaleDateString('es-ES')}` : 'Pending'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${sellerSigned ? 'bg-green-100' : 'bg-muted'}`}>
                {sellerSigned ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <PenTool className="w-4 h-4 text-muted-foreground" />}
              </div>
              <div>
                <p className="text-sm font-medium">{contract.vendedor.nombre} (Seller — You)</p>
                <p className="text-xs text-muted-foreground">
                  {sellerSigned ? `Signed on ${new Date(contract.firmaVendedorFecha!).toLocaleDateString('es-ES')}` : 'Your signature required'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seller sign action */}
      {!buyerSigned && (
        <div className="bg-muted/50 border border-border rounded-card p-5 text-center">
          <p className="text-sm text-muted-foreground">The buyer has not signed this contract yet. You will be able to sign once the buyer completes their signature.</p>
        </div>
      )}

      {buyerSigned && !sellerSigned && (
        <div className="bg-amber-50 border border-amber-200 rounded-card p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-amber-900">Your signature is required</p>
            <p className="text-xs text-amber-700 mt-1">The buyer has signed. Review the contract and countersign to finalize. A QR code will be generated for lot tracking.</p>
          </div>
          {!showSignPad ? (
            <Button variant="primary" onClick={() => setShowSignPad(true)} className="flex items-center gap-2">
              <PenTool className="w-4 h-4" /> Countersign Contract
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-foreground font-medium">Draw your signature:</p>
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
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={clearSignature}>Clear</Button>
                <Button variant="primary" size="sm" loading={signing} onClick={handleSign} className="flex items-center gap-2">
                  {signing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Confirm Signature
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowSignPad(false)}>Cancelar</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {bothSigned && (
        <div className="bg-green-50 border border-green-200 rounded-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-green-900">Contract fully executed</p>
              <p className="text-xs text-green-700 mt-1">Print the QR code and attach it to the lot before shipping.</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadPdf}>Download PDF</Button>
          </div>
          <Link href={`/seller/lots/${id}/qr/${txId}`}>
            <Button variant="primary" size="sm" className="flex items-center gap-2">
              <QrCode className="w-4 h-4" /> View QR Code & Upload Photos
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
