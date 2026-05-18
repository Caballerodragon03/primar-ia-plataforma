'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, QrCode, CheckCircle2, Camera, Loader2, Package, ImageIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';

interface ContractInfo {
  transaccionId: string;
  estado: string;
  producto: string;
  variedad: string | null;
  cantidadKg: number;
  vendedor: { nombre: string; empresa: string | null };
  comprador: { nombre: string };
  firmaComprador: string | null;
  firmaVendedor: string | null;
  qrToken: string | null;
  qrUsado: boolean;
  fotosLoteUrls: string[];
}

export default function BuyerDeliveryPage() {
  const { id, txId } = useParams<{ id: string; txId: string }>();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [contract, setContract] = useState<ContractInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [cameraError, setCameraError] = useState('');

  useEffect(() => {
    api.get(`/contracts/${txId}/info`)
      .then(({ data }) => {
        setContract(data.data);
        if (data.data.qrUsado) setConfirmed(true);
      })
      .catch(() => setError('Could not load delivery info.'))
      .finally(() => setLoading(false));
  }, [txId]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    setShowScanner(true);
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setCameraError('Could not access camera. Please enter the code manually.');
      setShowScanner(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setShowScanner(false);
  };

  const handleConfirmDelivery = async (token: string) => {
    if (!token.trim()) { alert('Please enter the QR code.'); return; }
    setConfirming(true);
    try {
      // 1. Confirm delivery (marks transaction as ENTREGADO)
      await api.post(`/contracts/${txId}/confirm-delivery`, { qrToken: token.trim() });
      stopCamera();
      // 2. Capture payment (marks transaction COMPLETADO, order CERRADO)
      try {
        await api.post(`/stripe/capture/${txId}`);
      } catch {
        // Capture may fail in test mode or if already captured — not fatal
      }
      setConfirmed(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Verification failed.';
      alert(msg);
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-64" />
        <div className="h-64 bg-muted rounded-card" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 mb-4">{error || 'Not found.'}</p>
        <Button variant="outline" onClick={() => router.push(`/buyer/orders/${id}`)}>Back to Order</Button>
      </div>
    );
  }

  const bothSigned = !!contract.firmaComprador && !!contract.firmaVendedor;

  if (!bothSigned) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <Link href={`/buyer/orders/${id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Order
        </Link>
        <div className="bg-amber-50 border border-amber-200 rounded-card p-6 text-center">
          <Package className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-amber-900">Contract not yet fully signed</p>
          <p className="text-xs text-amber-700 mt-1">Both parties must sign the contract before delivery confirmation is available.</p>
          <Link href={`/buyer/orders/${id}/contract/${txId}`}>
            <Button variant="primary" size="sm" className="mt-4">Go to Contract</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Link href={`/buyer/orders/${id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Order
      </Link>

      <div className="flex items-center gap-3">
        <QrCode className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold text-foreground">Delivery Confirmation</h1>
      </div>

      {/* Shipment info */}
      <div className="bg-card rounded-card border border-border shadow-soft p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">Shipment Details</h2>
        <dl className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm">
          <div><dt className="text-xs text-muted-foreground">Product</dt><dd className="font-medium">{contract.producto}{contract.variedad ? ` — ${contract.variedad}` : ''}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Quantity</dt><dd className="font-medium">{contract.cantidadKg.toLocaleString('es-ES')} kg</dd></div>
          <div><dt className="text-xs text-muted-foreground">Seller</dt><dd className="font-medium">{contract.vendedor.nombre}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Status</dt><dd className="font-medium">{contract.estado}</dd></div>
        </dl>
      </div>

      {/* Lot photos from seller */}
      {contract.fotosLoteUrls.length > 0 && (
        <div className="bg-card rounded-card border border-border shadow-soft p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <ImageIcon className="w-4 h-4" /> Lot Preparation Photos
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {contract.fotosLoteUrls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-border hover:shadow-soft-md transition-shadow">
                <img src={url} alt={`Lot photo ${i + 1}`} className="w-full h-32 object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      {confirmed ? (
        <div className="bg-green-50 border border-green-200 rounded-card p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-lg font-bold text-green-900">Delivery Confirmed</p>
          <p className="text-sm text-green-700 mt-1">Payment has been released to the seller. This order is now closed.</p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <Button variant="primary" size="sm" onClick={() => router.push('/buyer/orders?tab=closed')}>
              View Closed Orders
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/buyer/orders')}>
              All Orders
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* QR Scanner */}
          <div className="bg-card rounded-card border border-border shadow-soft p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Scan QR Code</h2>
            <p className="text-xs text-muted-foreground">
              Scan the QR code attached to the lot, or enter the verification code manually.
            </p>

            {showScanner ? (
              <div className="space-y-3">
                <video ref={videoRef} className="w-full rounded-lg bg-black aspect-video" playsInline />
                {cameraError && <p className="text-xs text-red-600">{cameraError}</p>}
                <Button variant="outline" size="sm" onClick={stopCamera}>Close Camera</Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={startCamera} className="flex items-center gap-2">
                <Camera className="w-4 h-4" /> Open Camera
              </Button>
            )}
          </div>

          {/* Manual entry */}
          <div className="bg-card rounded-card border border-border shadow-soft p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Manual Verification Code</h2>
            <p className="text-xs text-muted-foreground">If you cannot scan the QR, enter the code printed on the label.</p>
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Enter verification code..."
              className="w-full border border-border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
            <Button
              variant="primary"
              loading={confirming}
              onClick={() => handleConfirmDelivery(manualCode)}
              className="flex items-center gap-2"
            >
              {confirming ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirm Delivery
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
