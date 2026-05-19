'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Paperclip, MessageSquare, TrendingUp, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { NegotiationCard, type NegotiacionData } from './NegotiationCard';
import { NegotiationOfferModal } from './NegotiationOfferModal';

type TxEstado =
  | 'PENDIENTE_PAGO'
  | 'PAGO_CAPTURADO'
  | 'EN_TRANSITO'
  | 'ENTREGADO'
  | 'EN_DISPUTA'
  | 'COMPLETADO'
  | 'CANCELADO'
  | 'REEMBOLSADO';

const CLOSED_ESTADOS: readonly TxEstado[] = ['COMPLETADO', 'CANCELADO', 'REEMBOLSADO'];

function isClosed(estado: TxEstado | undefined): boolean {
  return !!estado && CLOSED_ESTADOS.includes(estado);
}

function estadoLabel(estado: TxEstado): { label: string; icon: typeof CheckCircle2; classes: string; banner: string } {
  switch (estado) {
    case 'COMPLETADO':
      return {
        label: 'Completado',
        icon: CheckCircle2,
        classes: 'bg-green-100 text-green-800 border-green-200',
        banner: 'Esta transacción está completada — la conversación es solo lectura.',
      };
    case 'CANCELADO':
      return {
        label: 'Cancelado',
        icon: XCircle,
        classes: 'bg-red-100 text-red-800 border-red-200',
        banner: 'Esta transacción fue cancelada — la conversación es solo lectura.',
      };
    case 'REEMBOLSADO':
      return {
        label: 'Reembolsado',
        icon: RotateCcw,
        classes: 'bg-muted text-foreground border-border',
        banner: 'Esta transacción fue reembolsada — la conversación es solo lectura.',
      };
    default:
      return {
        label: estado,
        icon: CheckCircle2,
        classes: 'bg-muted text-foreground border-border',
        banner: '',
      };
  }
}

interface Conversation {
  transaccionId: string;
  counterpartName: string;
  orderId: string;
  product: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  estado: TxEstado;
  /** Phase 8 — drives whether the chat privacy banner is shown.
   *  Hidden once both parties have signed (FIRMADO). */
  contratoEstado?: 'BORRADOR' | 'PENDIENTE_FIRMA_VENDEDOR' | 'PENDIENTE_PAGO_COMPRADOR' | 'FIRMADO' | 'CADUCADO' | 'CANCELADO' | null;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  tipo: string;
  sentAt: string;
  intentoBypass?: boolean;
  negociacion: NegotiacionData | null;
}

interface ChatViewProps {
  /** Phase 14G — si true, abre el modal de propuesta automáticamente una vez
   *  la conversación inicial esté cargada. Se usa desde
   *  /seller|buyer/contracts/[matchId] cuando el usuario pulsa
   *  "Modificar condiciones (chat)" para que llegue al chat ya con el modal. */
  autoOpenOffer?: boolean;
  role: 'buyer' | 'seller';
  initialTransaccionId?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '';
  }
}

function formatConvTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHrs = diffMs / (1000 * 60 * 60);
    if (diffHrs < 24) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export function ChatView({ role, initialTransaccionId, autoOpenOffer = false }: ChatViewProps) {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialTransaccionId ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  // Phase 14G — abre el modal de propuesta automáticamente la primera vez
  // que se carga el chat si la prop autoOpenOffer está activa. Se usa cuando
  // el usuario llega desde "Modificar condiciones (chat)" en la página de
  // contrato, para evitar que tenga que adivinar qué botón pulsar.
  const [showOfferModal, setShowOfferModal] = useState(false);
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (autoOpenOffer && !autoOpenedRef.current && selectedId && !loadingConvs) {
      autoOpenedRef.current = true;
      setShowOfferModal(true);
    }
  }, [autoOpenOffer, selectedId, loadingConvs]);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get<{ data: Conversation[] }>('/chat/conversations');
      setConversations(res.data.data ?? []);
    } catch (err) {
      console.error('[chat] fetchConversations failed:', err);
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  const fetchMessages = useCallback(async (transaccionId: string) => {
    try {
      const res = await api.get<{ data: Message[] }>(`/chat/${transaccionId}/messages`);
      setMessages(res.data.data ?? []);
      scrollToBottom();
    } catch (err) {
      console.error('[chat] fetchMessages failed:', err);
    }
  }, [scrollToBottom]);

  useEffect(() => {
    fetchConversations().then(() => {
      if (initialTransaccionId) setSelectedId(initialTransaccionId);
    });
  }, [fetchConversations, initialTransaccionId]);

  useEffect(() => {
    if (!selectedId) return;
    // Cancellation flag: if the user switches conversation (or unmounts)
    // mid-fetch, the in-flight response should not call setMessages on the
    // now-unmounted/stale effect.
    let cancelled = false;
    const safeFetch = async (id: string) => {
      try {
        const res = await api.get<{ data: Message[] }>(`/chat/${id}/messages`);
        if (cancelled) return;
        setMessages(res.data.data ?? []);
        scrollToBottom();
      } catch (err) {
        if (!cancelled) console.error('[chat] fetchMessages failed:', err);
      }
    };
    safeFetch(selectedId);

    pollRef.current = setInterval(() => {
      safeFetch(selectedId);
    }, 5000);

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedId, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    if (!selectedId || !text.trim() || sending) return;
    setSending(true);
    setSendError(null);
    try {
      await api.post(`/chat/${selectedId}/messages`, { contenido: text.trim() });
      setText('');
      await fetchMessages(selectedId);
      await fetchConversations();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const apiMsg =
        (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error ??
        (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.message;
      const msg = apiMsg ?? (status ? `Error ${status}` : 'No se pudo enviar el mensaje');
      console.error('[chat] sendMessage failed:', err);
      setSendError(msg);
    } finally {
      setSending(false);
    }
  };

  // Enter sends, Shift+Enter inserts newline (standard chat UX)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  // Get current terms from the latest offer card (for the "propose change" modal).
  // Phase 6 — also exposes logistica/terminoPago/calibres for the extended modal.
  const latestOfferMsg = [...messages].reverse().find((m) => m.tipo === 'OFERTA' && m.negociacion);
  const currentPrecioKg = latestOfferMsg?.negociacion?.currentPrecioKg ?? null;
  const currentIncoterm = latestOfferMsg?.negociacion?.currentIncoterm ?? null;
  const currentLogistica = latestOfferMsg?.negociacion?.currentLogistica ?? null;
  const currentTerminoPago = latestOfferMsg?.negociacion?.currentTerminoPago ?? null;
  const currentCalibres = latestOfferMsg?.negociacion?.currentCalibres ?? null;

  const selectedConv = conversations.find((c) => c.transaccionId === selectedId);

  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-card border border-border bg-card">
      {/* Left panel — conversation list */}
      <div className="w-[240px] flex-shrink-0 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Mensajes</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse space-y-1.5">
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-2.5 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">Aún no tienes conversaciones</div>
          ) : (
            conversations.map((conv) => {
              const isSelected = conv.transaccionId === selectedId;
              const closed = isClosed(conv.estado);
              const meta = closed ? estadoLabel(conv.estado) : null;
              return (
                <button
                  key={conv.transaccionId}
                  onClick={() => setSelectedId(conv.transaccionId)}
                  className={[
                    'w-full text-left px-3 py-3 border-b border-border transition-colors duration-150 cursor-pointer',
                    isSelected ? 'bg-yellow-50' : closed ? 'bg-muted/50 hover:bg-muted' : 'hover:bg-accent/50',
                    closed ? 'opacity-70' : '',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={[
                      'w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center',
                      closed ? 'bg-gray-400' : 'bg-secondary',
                    ].join(' ')}>
                      <span className="text-white text-[11px] font-semibold">
                        {getInitials(conv.counterpartName)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={[
                          'text-xs font-semibold truncate',
                          closed ? 'text-muted-foreground' : 'text-foreground',
                        ].join(' ')}>{conv.counterpartName}</p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {conv.unreadCount > 0 && !closed && (
                            <span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-[9px] font-bold text-foreground">
                              {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                            </span>
                          )}
                          <span className="text-[9px] text-muted-foreground">{formatConvTime(conv.lastMessageAt)}</span>
                        </div>
                      </div>
                      <p className={[
                        'text-[11px] truncate',
                        closed ? 'text-muted-foreground' : 'text-muted-foreground',
                      ].join(' ')}>#{conv.orderId} · {conv.product}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {meta && (
                          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full border ${meta.classes}`}>
                            {meta.label}
                          </span>
                        )}
                        <p className={[
                          'text-[11px] truncate flex-1',
                          closed ? 'text-muted-foreground/50 italic' : 'text-muted-foreground',
                        ].join(' ')}>{conv.lastMessage}</p>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel — active conversation */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground gap-3">
            <MessageSquare className="w-10 h-10 text-gray-200" />
            <p className="text-sm">Select a conversation</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center gap-3">
              {selectedConv && (() => {
                const closed = isClosed(selectedConv.estado);
                const meta = closed ? estadoLabel(selectedConv.estado) : null;
                const Icon = meta?.icon;
                return (
                  <>
                    <div className={[
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                      closed ? 'bg-gray-400' : 'bg-secondary',
                    ].join(' ')}>
                      <span className="text-white text-[11px] font-semibold">
                        {getInitials(selectedConv.counterpartName)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={[
                          'text-sm font-semibold',
                          closed ? 'text-muted-foreground' : 'text-foreground',
                        ].join(' ')}>{selectedConv.counterpartName}</p>
                        {meta && Icon && (
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full border ${meta.classes}`}>
                            <Icon className="w-3 h-3" />
                            {meta.label}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">Order #{selectedConv.orderId} · {selectedConv.product}</p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground mt-8">No messages yet. Say hello!</p>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.senderId === user?.id;

                  if (msg.tipo === 'OFERTA' && msg.negociacion) {
                    return (
                      <div
                        key={msg.id}
                        className={['flex flex-col gap-1', isOwn ? 'items-end' : 'items-start'].join(' ')}
                      >
                        <NegotiationCard
                          transaccionId={selectedId}
                          negociacion={msg.negociacion}
                          currentUserId={user?.id ?? ''}
                          onActionDone={() => {
                            fetchMessages(selectedId);
                            fetchConversations();
                          }}
                        />
                        <span className="text-[11px] text-muted-foreground">{formatTime(msg.sentAt)}</span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={['flex flex-col gap-0.5', isOwn ? 'items-end' : 'items-start'].join(' ')}
                    >
                      <div
                        className={[
                          'max-w-[75%] px-3.5 py-2.5 text-sm',
                          isOwn
                            ? 'bg-[#E1C44D33] text-foreground rounded-l-xl rounded-tr-xl'
                            : 'bg-card border border-border text-foreground rounded-r-xl rounded-tl-xl',
                        ].join(' ')}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        {msg.intentoBypass && (
                          <p className="text-[11px] text-red-500 mt-1 font-medium">
                            BYPASS DETECTED — Message sanitized
                          </p>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground">{formatTime(msg.sentAt)}</span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Error banner */}
            {sendError && (
              <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-xs text-red-700 flex items-center justify-between">
                <span>⚠ {sendError}</span>
                <button
                  onClick={() => setSendError(null)}
                  className="text-red-500 hover:text-red-700 font-medium ml-2"
                  aria-label="Cerrar"
                >
                  ×
                </button>
              </div>
            )}

            {/* Input bar OR closed-state banner */}
            {selectedConv && isClosed(selectedConv.estado) ? (
              (() => {
                const meta = estadoLabel(selectedConv.estado);
                const Icon = meta.icon;
                return (
                  <div className="px-4 py-4 border-t border-border bg-muted/50 flex items-center gap-2 text-xs text-muted-foreground justify-center">
                    <Icon className="w-4 h-4" />
                    <span>{meta.banner}</span>
                  </div>
                );
              })()
            ) : (
              <>
                {/* Phase 8 — Privacy reminder banner. Persistent reminder
                    above the input so users learn the rule. The daily Gemini
                    scanner enforces it; this is the education layer.
                    Hidden once contratoEstado === 'FIRMADO' — by then both
                    parties have signed, identifying info is in the contract,
                    and coordinating delivery requires sharing logistics
                    details. The IA scan still runs (anti retroactive bypass)
                    but we stop nagging the user. */}
                {selectedConv?.contratoEstado !== 'FIRMADO' && (
                  <div className="px-4 py-2 border-t border-border bg-blue-50/60 text-[11px] text-blue-900 flex items-start gap-1.5">
                    <span aria-hidden>🔒</span>
                    <span>
                      Por tu seguridad: no compartas teléfono, email ni cierres la operación fuera de Primar-IA hasta firmar el contrato. Los mensajes son revisados por IA.
                    </span>
                  </div>
                )}
                <div className="px-4 py-3 border-t border-border flex items-end gap-2">
                {/* Negotiate button */}
                <button
                  type="button"
                  onClick={() => setShowOfferModal(true)}
                  className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-button transition-colors flex-shrink-0"
                  aria-label="Proponer cambio de precio o incoterm"
                  title="Proponer cambio"
                >
                  <TrendingUp className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  disabled
                  className="p-2 text-muted-foreground/50 cursor-not-allowed flex-shrink-0"
                  aria-label="Adjuntar archivo (próximamente)"
                  title="Adjuntar archivos próximamente"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe un mensaje… (Enter para enviar, Shift+Enter para nueva línea)"
                  rows={1}
                  className="flex-1 resize-none px-3 py-2.5 rounded-input border border-border text-sm text-foreground placeholder-gray-400 bg-card focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors min-h-[44px] max-h-[120px] overflow-y-auto"
                  style={{ height: 'auto' }}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                  }}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!text.trim() || sending}
                  className={[
                    'p-2.5 rounded-button flex-shrink-0 transition-colors duration-150',
                    text.trim() && !sending
                      ? 'bg-primary text-foreground hover:opacity-90 cursor-pointer'
                      : 'bg-muted text-muted-foreground/50 cursor-not-allowed',
                  ].join(' ')}
                  aria-label="Enviar mensaje"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Offer modal */}
      {showOfferModal && selectedId && (
        <NegotiationOfferModal
          transaccionId={selectedId}
          currentPrecioKg={currentPrecioKg}
          currentIncoterm={currentIncoterm}
          currentLogistica={currentLogistica}
          currentTerminoPago={currentTerminoPago}
          currentCalibres={currentCalibres}
          onClose={() => setShowOfferModal(false)}
          onSuccess={() => {
            setShowOfferModal(false);
            fetchMessages(selectedId);
            fetchConversations();
          }}
        />
      )}
    </div>
  );
}
