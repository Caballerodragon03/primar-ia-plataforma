'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, QrCode, Upload, CheckCircle2, ImageIcon, Printer, Loader2, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { RatingModal } from '@/components/RatingModal';

interface ContractInfo {
  transaccionId: string;
  estado: string;
  producto: string;
  variedad: string | null;
  cantidadKg: number;
  vendedor: { nombre: string };
  comprador: { nombre: string };
  firmaComprador: string | null;
  firmaVendedor: string | null;
  qrToken: string | null;
  qrUsado: boolean;
  fotosLoteUrls: string[];
  vendedorId: string;
  compradorId: string;
}

function QRCodeDisplay({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 200;
    canvas.width = size;
    canvas.height = size;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';

    const qrSize = 160;
    const offset = (size - qrSize) / 2;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(offset, offset, qrSize, qrSize);

    ctx.fillStyle = '#000000';
    const cellSize = 8;
    const gridSize = Math.floor(qrSize / cellSize);
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    }
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const seed = (hash + row * gridSize + col) * 2654435761;
        if ((seed >>> 0) % 3 !== 0) {
          ctx.fillRect(offset + col * cellSize, offset + row * cellSize, cellSize - 1, cellSize - 1);
        }
      }
    }

    // Corner markers
    const drawCorner = (x: number, y: number) => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(x, y, 24, 24);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 3, y + 3, 18, 18);
      ctx.fillStyle = '#000000';
      ctx.fillRect(x + 6, y + 6, 12, 12);
    };
    drawCorner(offset, offset);
    drawCorner(offset + qrSize - 24, offset);
    drawCorner(offset, offset + qrSize - 24);

  }, [value]);

  return <canvas ref={canvasRef} className="border border-gray-200 rounded-lg" />;
}

export default function SellerQRPage() {
  const { id, txId } = useParams<{ id: string; txId: string }>();
  const [contract, setContract] = useState<ContractInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get(`/contracts/${txId}/info`)
      .then(({ data }) => {
        setContract(data.data);
        setPhotoUrls(data.data.fotosLoteUrls ?? []);
      })
      .catch(() => setError('Could not load contract info.'))
      .finally(() => setLoading(false));
  }, [txId]);

  const handlePhotoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
    if (file.size > 10 * 1024 * 1024) { alert('Image must be under 10MB.'); return; }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'lot-photos');
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url: string = data.data.url;
      setPhotoUrls((prev) => [...prev, url]);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Upload failed.';
      alert(msg);
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUploadPhotos = async () => {
    if (photoUrls.length === 0) { alert('Add at least one photo URL.'); return; }
    setUploading(true);
    try {
      await api.post(`/contracts/${txId}/photos`, { photoUrls });
      alert('Photos uploaded successfully! The buyer will be able to see them.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to upload photos.';
      alert(msg);
    } finally {
      setUploading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-64" />
        <div className="h-64 bg-gray-200 rounded-card" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 mb-4">{error || 'Not found.'}</p>
        <Link href={`/seller/lots/${id}`}><Button variant="outline">Back to Lot</Button></Link>
      </div>
    );
  }

  if (!contract.qrToken) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <Link href={`/seller/lots/${id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /> Back to Lot
        </Link>
        <div className="bg-amber-50 border border-amber-200 rounded-card p-6 text-center">
          <QrCode className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-amber-900">QR code not yet generated</p>
          <p className="text-xs text-amber-700 mt-1">Both parties must sign the contract before the QR code is generated.</p>
          <Link href={`/seller/lots/${id}/contract/${txId}`}>
            <Button variant="primary" size="sm" className="mt-4">Go to Contract</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Link href={`/seller/lots/${id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 print:hidden">
        <ArrowLeft className="w-4 h-4" /> Back to Lot
      </Link>

      <div className="flex items-center gap-3">
        <QrCode className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold text-gray-900">QR Code & Lot Photos</h1>
      </div>

      {/* QR Code */}
      <div className="bg-white rounded-card border border-border shadow-sm p-6 text-center" id="qr-print-area">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Lot Verification QR Code</h2>
        <div className="inline-block">
          <QRCodeDisplay value={contract.qrToken} />
        </div>
        <p className="text-xs text-gray-500 mt-3">Print this QR code and attach it to the lot before shipping.</p>
        <p className="text-xs text-gray-400 mt-1">The buyer will scan this code to confirm delivery.</p>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Verification Code (manual entry):</p>
          <p className="text-sm font-mono font-bold text-gray-900 select-all break-all">{contract.qrToken}</p>
        </div>

        {contract.qrUsado && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
            <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-xs font-semibold text-green-900">Delivery confirmed by buyer</p>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 text-yellow-600 border-yellow-300 hover:bg-yellow-50 mx-auto"
              onClick={() => setShowRating(true)}
            >
              <Star className="w-3.5 h-3.5" /> Rate Buyer
            </Button>
          </div>
        )}

        <div className="mt-4 print:hidden">
          <Button variant="outline" size="sm" onClick={handlePrint} className="flex items-center gap-2 mx-auto">
            <Printer className="w-4 h-4" /> Print QR Code
          </Button>
        </div>
      </div>

      {/* Shipment info */}
      <div className="bg-white rounded-card border border-border shadow-sm p-5 print:hidden">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Shipment</h2>
        <dl className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm">
          <div><dt className="text-xs text-gray-500">Product</dt><dd className="font-medium">{contract.producto}{contract.variedad ? ` — ${contract.variedad}` : ''}</dd></div>
          <div><dt className="text-xs text-gray-500">Quantity</dt><dd className="font-medium">{contract.cantidadKg.toLocaleString('es-ES')} kg</dd></div>
          <div><dt className="text-xs text-gray-500">Buyer</dt><dd className="font-medium">{contract.comprador.nombre}</dd></div>
          <div><dt className="text-xs text-gray-500">Status</dt><dd className="font-medium">{contract.estado}</dd></div>
        </dl>
      </div>

      {/* Photo upload */}
      {!contract.qrUsado && (
        <div className="bg-white rounded-card border border-border shadow-sm p-5 space-y-4 print:hidden">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <ImageIcon className="w-4 h-4" /> Lot Preparation Photos
          </h2>
          <p className="text-xs text-gray-500">Upload photos of the prepared lot. The buyer will see these before delivery.</p>

          {/* Existing photos */}
          {photoUrls.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photoUrls.map((url, i) => (
                <div key={i} className="relative group rounded-lg overflow-hidden border border-border">
                  <img src={url} alt={`Photo ${i + 1}`} className="w-full h-28 object-cover" />
                  <button
                    onClick={() => handleRemovePhoto(i)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload photo */}
          <div className="space-y-3">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handlePhotoFileSelect}
            />
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-primary hover:text-primary transition-colors w-full justify-center disabled:opacity-50"
            >
              {uploadingPhoto ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="w-4 h-4" /> Click to upload photo</>
              )}
            </button>
            <p className="text-xs text-gray-400 text-center">JPG or PNG, max 10MB each</p>
          </div>

          <Button
            variant="primary"
            loading={uploading}
            onClick={handleUploadPhotos}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" /> Save Photos
          </Button>
        </div>
      )}

      {/* Already uploaded photos (read-only when QR used) */}
      {contract.qrUsado && photoUrls.length > 0 && (
        <div className="bg-white rounded-card border border-border shadow-sm p-5 print:hidden">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <ImageIcon className="w-4 h-4" /> Lot Photos
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photoUrls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-border">
                <img src={url} alt={`Photo ${i + 1}`} className="w-full h-28 object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}

      {showRating && contract && (
        <RatingModal
          transaccionId={contract.transaccionId}
          destinatarioId={contract.compradorId}
          tipo="VENDEDOR_A_COMPRADOR"
          onClose={() => setShowRating(false)}
        />
      )}
    </div>
  );
}
