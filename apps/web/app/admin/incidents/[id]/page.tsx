'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Select } from '@/components/ui/Select';
import { ArrowLeft, Star, X, Send, AlertTriangle } from 'lucide-react';

/* ─── Types ─── */

interface Dispute {
  id: string;
  tipoProblema: string;
  estado: 'ABIERTA' | 'RESPUESTA_VENDEDOR' | 'EN_REVISION' | 'RESUELTA';
  createdAt: string;
  descripcion: string;
  evidencias: string[];
  respuestaVendedor?: string | null;
  evidenciasVendedor?: string[];
  compradorId: string;
  vendedorId: string;
  lote?: { titulo: string } | null;
  resolucion?: ResolucionAplicada | null;
}

interface ResolucionAplicada {
  tipo: string;
  porcentajeComprador: number;
  notasAdmin: string;
  penalizacionComprador: number;
  penalizacionVendedor: number;
  incentivoComprador: number;
  incentivoVendedor: number;
  suscripcionGratuita: string;
  suscripcionGratisPlan?: string;
  banComprador: boolean;
  banVendedor: boolean;
}

interface DisputeMessage {
  id: string;
  contenido: string;
  autorId: string;
  autorNombre: string;
  autorRol: string;
  createdAt: string;
}

interface UserInfo {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  role: string;
  score: number | null;
  empresa?: { razonSocial: string } | null;
}

/* ─── Helpers ─── */

const ESTADO_COLORS: Record<string, string> = {
  ABIERTA: 'bg-red-100 text-red-700',
  RESPUESTA_VENDEDOR: 'bg-amber-100 text-amber-700',
  EN_REVISION: 'bg-blue-100 text-blue-700',
  RESUELTA: 'bg-green-100 text-green-700',
};

const ESTADO_LABELS: Record<string, string> = {
  ABIERTA: 'Abierta',
  RESPUESTA_VENDEDOR: 'Resp. Vendedor',
  EN_REVISION: 'En Revisión',
  RESUELTA: 'Resuelta',
};

function scoreToStars(score: number | null): { stars: number; label: string } {
  if (score === null) return { stars: 0, label: 'Nuevo' };
  if (score >= 90) return { stars: 5, label: '5★' };
  if (score >= 75) return { stars: 4, label: '4★' };
  if (score >= 60) return { stars: 3, label: '3★' };
  if (score >= 40) return { stars: 2, label: '2★' };
  return { stars: 1, label: '1★' };
}

function StarRating({ score }: { score: number | null }) {
  const { stars, label } = scoreToStars(score);
  if (score === null) {
    return <span className="text-xs text-gray-400 italic">Nuevo Usuario</span>;
  }
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i < stars ? 'text-[#E1C44D] fill-[#E1C44D]' : 'text-gray-300'}`}
        />
      ))}
      <span className="text-xs text-gray-500 ml-1">{label}</span>
    </div>
  );
}

function DisputeBadge({ estado }: { estado: string }) {
  const classes = ESTADO_COLORS[estado] ?? 'bg-gray-100 text-gray-600';
  const label = ESTADO_LABELS[estado] ?? estado;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-badge text-xs font-semibold ${classes}`}>
      {label}
    </span>
  );
}

/* ─── Image modal ─── */

function ImageModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div className="relative max-w-3xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-8 right-0 text-white hover:text-gray-300 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="Evidencia ampliada" className="w-full rounded-[8px] object-contain max-h-[80vh]" />
      </div>
    </div>
  );
}

/* ─── Evidence gallery ─── */

function EvidenceGallery({ urls }: { urls: string[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  if (!urls || urls.length === 0) {
    return <p className="text-sm text-gray-400 italic">Sin evidencias adjuntas.</p>;
  }
  return (
    <>
      <div className="grid grid-cols-3 gap-2 mt-2">
        {urls.map((url, i) => (
          <button
            key={i}
            onClick={() => setSelected(url)}
            className="aspect-square rounded-[8px] overflow-hidden border border-[#E5E7EB] hover:opacity-80 transition-opacity cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Evidencia ${i + 1}`} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
      {selected && <ImageModal src={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

/* ─── User card ─── */

function UserCard({ user, label }: { user: UserInfo | null; label: string }) {
  if (!user) {
    return (
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] p-4 space-y-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
      </div>
    );
  }
  return (
    <div className="bg-white rounded-[12px] border border-[#E5E7EB] p-4 space-y-1.5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-gray-900">
        {user.nombre} {user.apellidos}
      </p>
      {user.empresa && (
        <p className="text-xs text-gray-500">{user.empresa.razonSocial}</p>
      )}
      <p className="text-xs text-gray-400">{user.email}</p>
      <StarRating score={user.score} />
    </div>
  );
}

/* ─── Resolution display ─── */

function ResolucionDisplay({ res }: { res: ResolucionAplicada }) {
  const items: { label: string; value: string }[] = [
    { label: 'Tipo', value: res.tipo },
    { label: '% para comprador', value: `${res.porcentajeComprador}%` },
    { label: 'Penalización comprador', value: res.penalizacionComprador !== 0 ? `${res.penalizacionComprador} pts` : '—' },
    { label: 'Penalización vendedor', value: res.penalizacionVendedor !== 0 ? `${res.penalizacionVendedor} pts` : '—' },
    { label: 'Incentivo comprador', value: res.incentivoComprador !== 0 ? `+${res.incentivoComprador} pts` : '—' },
    { label: 'Incentivo vendedor', value: res.incentivoVendedor !== 0 ? `+${res.incentivoVendedor} pts` : '—' },
    { label: 'Suscripción gratuita', value: res.suscripcionGratuita !== 'NINGUNO' ? `${res.suscripcionGratuita}${res.suscripcionGratisPlan ? ` — ${res.suscripcionGratisPlan}` : ''}` : '—' },
    { label: 'Ban comprador', value: res.banComprador ? 'Sí' : 'No' },
    { label: 'Ban vendedor', value: res.banVendedor ? 'Sí' : 'No' },
  ];

  return (
    <div className="bg-green-50 border border-green-200 rounded-[12px] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-badge text-xs font-semibold bg-green-100 text-green-700">
          Resuelta
        </span>
        <p className="text-sm font-semibold text-green-800">Resolución aplicada</p>
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
        {items.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-xs text-gray-500">{label}</dt>
            <dd className="text-sm font-medium text-gray-900">{value}</dd>
          </div>
        ))}
      </dl>
      {res.notasAdmin && (
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Notas del admin</p>
          <p className="text-sm text-gray-700">{res.notasAdmin}</p>
        </div>
      )}
    </div>
  );
}

/* ─── Resolution form ─── */

const RESOLUCION_OPTIONS = [
  { value: 'FAVOR_COMPRADOR', label: 'A favor del comprador' },
  { value: 'FAVOR_VENDEDOR', label: 'A favor del vendedor' },
  { value: 'PARCIAL', label: 'Parcial' },
  { value: 'ACUERDO_PARTES', label: 'Acuerdo entre partes' },
];

const SUSCRIPCION_TARGET_OPTIONS = [
  { value: 'NINGUNO', label: 'Ninguno' },
  { value: 'COMPRADOR', label: 'Comprador' },
  { value: 'VENDEDOR', label: 'Vendedor' },
];

const BUYER_PLAN_OPTIONS = [
  { value: 'MERCADO', label: 'Mercado (Free)' },
  { value: 'LONJA', label: 'Lonja (29€)' },
  { value: 'CENTRAL', label: 'Central (89€)' },
];

const SELLER_PLAN_OPTIONS = [
  { value: 'COSECHA', label: 'Cosecha (Free)' },
  { value: 'CAMPO', label: 'Campo (19€)' },
  { value: 'FINCA', label: 'Finca (49€)' },
];

interface ResolveFormState {
  tipo: string;
  porcentajeComprador: number;
  notasAdmin: string;
  penalizacionComprador: number;
  penalizacionVendedor: number;
  incentivoComprador: number;
  incentivoVendedor: number;
  suscripcionTarget: string;
  suscripcionPlan: string;
  banComprador: boolean;
  banVendedor: boolean;
}

function ResolutionForm({
  disputeId,
  compradorId,
  vendedorId,
  onResolved,
}: {
  disputeId: string;
  compradorId: string;
  vendedorId: string;
  onResolved: () => void;
}) {
  const [form, setForm] = useState<ResolveFormState>({
    tipo: 'FAVOR_COMPRADOR',
    porcentajeComprador: 100,
    notasAdmin: '',
    penalizacionComprador: 0,
    penalizacionVendedor: 0,
    incentivoComprador: 0,
    incentivoVendedor: 0,
    suscripcionTarget: 'NINGUNO',
    suscripcionPlan: '',
    banComprador: false,
    banVendedor: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = <K extends keyof ResolveFormState>(key: K, value: ResolveFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const suscripcionGratisUserId =
        form.suscripcionTarget === 'COMPRADOR' ? compradorId
          : form.suscripcionTarget === 'VENDEDOR' ? vendedorId
            : undefined;
      const suscripcionGratisPlan =
        suscripcionGratisUserId && form.suscripcionPlan ? form.suscripcionPlan : undefined;

      await api.post(`/disputes/${disputeId}/resolve-admin`, {
        resolucion: form.tipo,
        porcentajeComprador: form.porcentajeComprador,
        notasAdmin: form.notasAdmin || undefined,
        penalizacionComprador: form.penalizacionComprador || undefined,
        penalizacionVendedor: form.penalizacionVendedor || undefined,
        incentivoComprador: form.incentivoComprador || undefined,
        incentivoVendedor: form.incentivoVendedor || undefined,
        suscripcionGratisUserId,
        suscripcionGratisPlan,
        banearComprador: form.banComprador || undefined,
        banearVendedor: form.banVendedor || undefined,
      });
      onResolved();
    } catch {
      setError('Error al resolver la incidencia. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-[12px] border border-[#E5E7EB] p-5 space-y-5">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        Panel de resolución
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Resolución"
          value={form.tipo}
          onChange={(e) => setField('tipo', e.target.value)}
          options={RESOLUCION_OPTIONS}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">% para comprador</label>
          <input
            type="number"
            min={0}
            max={100}
            value={form.porcentajeComprador}
            onChange={(e) => setField('porcentajeComprador', Number(e.target.value))}
            className="w-full px-3 py-2.5 min-h-[44px] rounded-input border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1.5">Notas del admin</label>
        <textarea
          value={form.notasAdmin}
          onChange={(e) => setField('notasAdmin', e.target.value)}
          rows={3}
          className="w-full px-3 py-2.5 rounded-input border border-border text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          placeholder="Observaciones internas sobre la resolución..."
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Penalización comprador</label>
          <p className="text-xs text-gray-400">(-50 a 0)</p>
          <input
            type="number"
            min={-50}
            max={0}
            value={form.penalizacionComprador}
            onChange={(e) => setField('penalizacionComprador', Number(e.target.value))}
            className="w-full px-3 py-2.5 min-h-[44px] rounded-input border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Penalización vendedor</label>
          <p className="text-xs text-gray-400">(-50 a 0)</p>
          <input
            type="number"
            min={-50}
            max={0}
            value={form.penalizacionVendedor}
            onChange={(e) => setField('penalizacionVendedor', Number(e.target.value))}
            className="w-full px-3 py-2.5 min-h-[44px] rounded-input border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Incentivo comprador</label>
          <p className="text-xs text-gray-400">(0 a +25)</p>
          <input
            type="number"
            min={0}
            max={25}
            value={form.incentivoComprador}
            onChange={(e) => setField('incentivoComprador', Number(e.target.value))}
            className="w-full px-3 py-2.5 min-h-[44px] rounded-input border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Incentivo vendedor</label>
          <p className="text-xs text-gray-400">(0 a +25)</p>
          <input
            type="number"
            min={0}
            max={25}
            value={form.incentivoVendedor}
            onChange={(e) => setField('incentivoVendedor', Number(e.target.value))}
            className="w-full px-3 py-2.5 min-h-[44px] rounded-input border border-border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end flex-wrap">
        <Select
          label="Suscripción gratuita 1 mes para:"
          value={form.suscripcionTarget}
          onChange={(e) => {
            setField('suscripcionTarget', e.target.value);
            setField('suscripcionPlan', '');
          }}
          options={SUSCRIPCION_TARGET_OPTIONS}
        />
        {form.suscripcionTarget !== 'NINGUNO' && (
          <Select
            label="Plan a otorgar:"
            value={form.suscripcionPlan}
            onChange={(e) => setField('suscripcionPlan', e.target.value)}
            options={form.suscripcionTarget === 'VENDEDOR' ? SELLER_PLAN_OPTIONS : BUYER_PLAN_OPTIONS}
          />
        )}
        <div className="flex items-center gap-6 pb-1">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.banComprador}
              onChange={(e) => setField('banComprador', e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary/40"
            />
            Banear comprador
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.banVendedor}
              onChange={(e) => setField('banVendedor', e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary/40"
            />
            Banear vendedor
          </label>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-[8px] px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-5 py-2.5 bg-[#E1C44D] text-gray-900 text-sm font-semibold rounded-[8px] hover:bg-[#c9ad40] transition-colors disabled:opacity-50 cursor-pointer"
        >
          {submitting ? 'Resolviendo…' : 'Resolver incidencia'}
        </button>
      </div>
    </div>
  );
}

/* ─── Chat ─── */

function DisputeChat({ disputeId }: { disputeId: string }) {
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    try {
      const res = await api.get<{ data: DisputeMessage[] }>(`/disputes/${disputeId}/messages`);
      setMessages(res.data.data);
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }, [disputeId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await api.post(`/disputes/${disputeId}/messages`, { contenido: text.trim() });
      setText('');
      await loadMessages();
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  }, [text, disputeId, loadMessages]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="bg-white rounded-[12px] border border-[#E5E7EB] flex flex-col" style={{ minHeight: '320px' }}>
      <div className="px-5 py-3 border-b border-[#E5E7EB]">
        <h3 className="text-sm font-semibold text-gray-900">Chat de incidencia</h3>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3" style={{ maxHeight: '360px' }}>
        {loading && (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-[8px] animate-pulse" />
          ))
        )}
        {!loading && messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">Sin mensajes aún.</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-0.5">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-semibold text-gray-700">{msg.autorNombre}</span>
              <span className="text-xs text-gray-400">{msg.autorRol}</span>
              <span className="text-xs text-gray-300 ml-auto">
                {new Date(msg.createdAt).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-sm text-gray-800 bg-gray-50 rounded-[8px] px-3 py-2">{msg.contenido}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="px-5 py-3 border-t border-[#E5E7EB] flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje..."
          className="flex-1 px-3 py-2 text-sm border border-border rounded-input bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="p-2.5 bg-[#E1C44D] text-gray-900 rounded-[8px] hover:bg-[#c9ad40] transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ─── Page ─── */

export default function AdminIncidentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const disputeId = params.id;

  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [comprador, setComprador] = useState<UserInfo | null>(null);
  const [vendedor, setVendedor] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const disputeRes = await api.get<{ data: Dispute }>(`/disputes/${disputeId}`);
      const d = disputeRes.data.data;
      setDispute(d);

      const [cRes, vRes] = await Promise.all([
        api.get<{ data: UserInfo }>(`/admin/users/${d.compradorId}`),
        api.get<{ data: UserInfo }>(`/admin/users/${d.vendedorId}`),
      ]);
      setComprador(cRes.data.data);
      setVendedor(vRes.data.data);
    } catch {
      // keep whatever loaded
    } finally {
      setLoading(false);
    }
  }, [disputeId]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-[12px] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <p className="text-gray-500">Incidente no encontrado.</p>
        <button
          onClick={() => router.push('/admin/incidents')}
          className="mt-4 text-sm text-[#E1C44D] hover:underline cursor-pointer"
        >
          Volver a incidentes
        </button>
      </div>
    );
  }

  const isResuelta = dispute.estado === 'RESUELTA';

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Back + Header */}
      <button
        onClick={() => router.push('/admin/incidents')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a incidentes
      </button>

      <div className="bg-white rounded-[12px] border border-[#E5E7EB] p-5 space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs text-gray-400 font-mono">ID: {dispute.id}</p>
            <h1 className="text-lg font-bold text-gray-900">{dispute.tipoProblema}</h1>
            <p className="text-xs text-gray-400">
              Abierta el {new Date(dispute.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              {dispute.lote && ` · Producto: ${dispute.lote.titulo}`}
            </p>
          </div>
          <DisputeBadge estado={dispute.estado} />
        </div>
      </div>

      {/* Partes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UserCard user={comprador} label="Comprador (demandante)" />
        <UserCard user={vendedor} label="Vendedor (demandado)" />
      </div>

      {/* Descripción + evidencias demandante */}
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Descripción del demandante</h3>
        <p className="text-sm text-gray-700 leading-relaxed">{dispute.descripcion}</p>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Evidencias</p>
          <EvidenceGallery urls={dispute.evidencias} />
        </div>
      </div>

      {/* Respuesta del demandado */}
      {(dispute.respuestaVendedor || (dispute.evidenciasVendedor && dispute.evidenciasVendedor.length > 0)) && (
        <div className="bg-white rounded-[12px] border border-[#E5E7EB] p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Respuesta del demandado</h3>
          {dispute.respuestaVendedor && (
            <p className="text-sm text-gray-700 leading-relaxed">{dispute.respuestaVendedor}</p>
          )}
          {dispute.evidenciasVendedor && dispute.evidenciasVendedor.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Evidencias</p>
              <EvidenceGallery urls={dispute.evidenciasVendedor} />
            </div>
          )}
        </div>
      )}

      {/* Chat */}
      <DisputeChat disputeId={disputeId} />

      {/* Resolution */}
      {isResuelta && dispute.resolucion ? (
        <ResolucionDisplay res={dispute.resolucion} />
      ) : !isResuelta ? (
        <ResolutionForm
          disputeId={disputeId}
          compradorId={comprador?.id ?? ''}
          vendedorId={vendedor?.id ?? ''}
          onResolved={loadData}
        />
      ) : null}
    </div>
  );
}
