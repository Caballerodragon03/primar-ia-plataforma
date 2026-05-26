'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ArrowLeft, Send, X } from 'lucide-react';
import { useT, useLocale } from '@/lib/i18n/LocaleProvider';
import type { MessageKey } from '@/lib/i18n/messages';

interface Dispute {
  id: string;
  tipoProblema: string;
  estado: string;
  descripcion: string;
  evidenciasUrls: string[];
  respuestaVendedor?: string | null;
  evidenciasVendedorUrls?: string[];
  createdAt: string;
  transaccion: {
    compradorId: string;
    vendedorId: string;
    cantidadKg: number;
    precioTotal: number;
    comprador?: { nombre: string; apellidos: string };
    vendedor?: { nombre: string; apellidos: string };
    match?: { pedido?: { producto?: { nombre: string } } };
  };
}

interface Message {
  id: string;
  contenido: string;
  createdAt: string;
  autor: { nombre: string; apellidos: string; role: string };
}

const ESTADO_COLORS: Record<string, string> = {
  ABIERTA: 'bg-red-100 text-red-700',
  RESPUESTA_VENDEDOR: 'bg-amber-100 text-amber-700',
  EN_REVISION: 'bg-blue-100 text-blue-700',
  RESUELTA: 'bg-green-100 text-green-700',
};

const ESTADO_LABEL_KEYS: Record<string, MessageKey> = {
  ABIERTA: 'disputes.estado.open',
  RESPUESTA_VENDEDOR: 'disputes.estado.sellerResponded',
  EN_REVISION: 'disputes.estado.inReview',
  RESUELTA: 'disputes.estado.resolved',
};

export default function BuyerDisputeDetailPage() {
  const t = useT();
  const { locale } = useLocale();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const disputeId = params.id;

  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    try {
      const [dRes, mRes] = await Promise.all([
        api.get<{ data: Dispute }>(`/disputes/${disputeId}`),
        api.get<{ data: Message[] }>(`/disputes/${disputeId}/messages`),
      ]);
      setDispute(dRes.data.data);
      setMessages(mRes.data.data);
    } catch {}
    setLoading(false);
  }, [disputeId]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await api.post(`/disputes/${disputeId}/messages`, { contenido: text.trim() });
      setText('');
      const mRes = await api.get<{ data: Message[] }>(`/disputes/${disputeId}/messages`);
      setMessages(mRes.data.data);
    } catch {}
    setSending(false);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 p-6">
        {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-muted-foreground">{t('disputes.notFound')}</p>
      </div>
    );
  }

  const vendedor = dispute.transaccion?.vendedor;
  const producto = dispute.transaccion?.match?.pedido?.producto?.nombre;
  const badgeClass = ESTADO_COLORS[dispute.estado] ?? 'bg-muted text-muted-foreground';
  const labelKey = ESTADO_LABEL_KEYS[dispute.estado];
  const badgeLabel = labelKey ? t(labelKey) : dispute.estado;
  const dateLoc = locale === 'en' ? 'en-GB' : 'es-ES';

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <button onClick={() => router.push('/buyer/disputes')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
        <ArrowLeft className="w-4 h-4" /> {t('disputes.back')}
      </button>

      {/* Header */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-lg font-bold text-foreground">{dispute.tipoProblema.replace(/_/g, ' ')}</h1>
            <p className="text-xs text-muted-foreground">
              {t('disputes.opened')} {new Date(dispute.createdAt).toLocaleDateString(dateLoc, { day: 'numeric', month: 'long', year: 'numeric' })}
              {producto && ` · ${producto}`}
              {vendedor && ` · ${t('disputes.role.seller')}: ${vendedor.nombre} ${vendedor.apellidos}`}
            </p>
          </div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeClass}`}>
            {badgeLabel}
          </span>
        </div>
      </div>

      {/* Description + evidence */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">{t('disputes.yourDescription')}</h3>
        <p className="text-sm text-foreground leading-relaxed">{dispute.descripcion}</p>
        {dispute.evidenciasUrls.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{t('disputes.evidence')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {dispute.evidenciasUrls.map((url, i) => (
                <button key={i} onClick={() => setLightbox(url)} className="aspect-square rounded-lg overflow-hidden border border-border hover:opacity-80 transition-opacity cursor-pointer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Seller response */}
      {dispute.respuestaVendedor && (
        <div className="bg-card rounded-xl border border-border p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">{t('disputes.sellerResponseTitle')}</h3>
          <p className="text-sm text-foreground leading-relaxed">{dispute.respuestaVendedor}</p>
          {dispute.evidenciasVendedorUrls && dispute.evidenciasVendedorUrls.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{t('disputes.sellerEvidence')}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {dispute.evidenciasVendedorUrls.map((url, i) => (
                  <button key={i} onClick={() => setLightbox(url)} className="aspect-square rounded-lg overflow-hidden border border-border hover:opacity-80 transition-opacity cursor-pointer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Seller evidence ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chat */}
      <div className="bg-card rounded-xl border border-border flex flex-col" style={{ minHeight: '300px' }}>
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">{t('disputes.chatTitle')}</h3>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3" style={{ maxHeight: '360px' }}>
          {messages.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">{t('disputes.chatEmpty')}</p>}
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-0.5">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-foreground">{msg.autor.nombre} {msg.autor.apellidos}</span>
                <span className="text-xs text-muted-foreground">{msg.autor.role === 'ADMIN' ? t('disputes.role.admin') : msg.autor.role === 'COMPRADOR' ? t('disputes.role.buyer') : t('disputes.role.seller')}</span>
                <span className="text-xs text-muted-foreground/50 ml-auto">
                  {new Date(msg.createdAt).toLocaleString(dateLoc, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm text-gray-800 bg-muted/50 rounded-lg px-3 py-2">{msg.contenido}</p>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="px-5 py-3 border-t border-border flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={t('disputes.chatPlaceholder')}
            className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:border-yellow-400"
          />
          <button onClick={handleSend} disabled={sending || !text.trim()} className="p-2.5 bg-[#E1C44D] text-foreground rounded-lg hover:bg-[#c9ad40] transition-colors disabled:opacity-50 cursor-pointer">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setLightbox(null)}>
          <div className="relative max-w-3xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setLightbox(null)} className="absolute -top-8 right-0 text-white hover:text-muted-foreground/50 transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox} alt="Evidence" className="w-full rounded-lg object-contain max-h-[80vh]" />
          </div>
        </div>
      )}
    </div>
  );
}
