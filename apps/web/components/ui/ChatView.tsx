'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Paperclip, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

interface Conversation {
  transaccionId: string;
  counterpartName: string;
  orderId: string;
  product: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  sentAt: string;
  intentoBypass?: boolean;
}

interface ChatViewProps {
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

export function ChatView({ role, initialTransaccionId }: ChatViewProps) {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialTransaccionId ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
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
    } catch {
      // silently fail
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  const fetchMessages = useCallback(async (transaccionId: string) => {
    try {
      const res = await api.get<{ data: Message[] }>(`/chat/${transaccionId}/messages`);
      setMessages(res.data.data ?? []);
      scrollToBottom();
    } catch {
      // silently fail
    }
  }, [scrollToBottom]);

  useEffect(() => {
    fetchConversations().then(() => {
      if (initialTransaccionId) setSelectedId(initialTransaccionId);
    });
  }, [fetchConversations, initialTransaccionId]);

  useEffect(() => {
    if (!selectedId) return;
    fetchMessages(selectedId);

    pollRef.current = setInterval(() => {
      fetchMessages(selectedId);
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedId, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    if (!selectedId || !text.trim() || sending) return;
    setSending(true);
    try {
      await api.post(`/chat/${selectedId}/messages`, { contenido: text.trim() });
      setText('');
      await fetchMessages(selectedId);
      await fetchConversations();
    } catch {
      // silently fail
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectedConv = conversations.find((c) => c.transaccionId === selectedId);

  return (
    <div className="flex h-full min-h-0 overflow-hidden rounded-card border border-border bg-surface">
      {/* Left panel — conversation list */}
      <div className="w-[240px] flex-shrink-0 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-gray-900">Messages</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse space-y-1.5">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-400">No conversations yet</div>
          ) : (
            conversations.map((conv) => {
              const isSelected = conv.transaccionId === selectedId;
              return (
                <button
                  key={conv.transaccionId}
                  onClick={() => setSelectedId(conv.transaccionId)}
                  className={[
                    'w-full text-left px-3 py-3 border-b border-border transition-colors duration-150 cursor-pointer',
                    isSelected ? 'bg-yellow-50' : 'hover:bg-gray-50',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center">
                      <span className="text-white text-[10px] font-semibold">
                        {getInitials(conv.counterpartName)}
                      </span>
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-semibold text-gray-900 truncate">{conv.counterpartName}</p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {conv.unreadCount > 0 && (
                            <span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-[9px] font-bold text-gray-900">
                              {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                            </span>
                          )}
                          <span className="text-[9px] text-gray-400">{formatConvTime(conv.lastMessageAt)}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 truncate">#{conv.orderId} · {conv.product}</p>
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">{conv.lastMessage}</p>
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
          <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 gap-3">
            <MessageSquare className="w-10 h-10 text-gray-200" />
            <p className="text-sm">Select a conversation</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center gap-3">
              {selectedConv && (
                <>
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[10px] font-semibold">
                      {getInitials(selectedConv.counterpartName)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{selectedConv.counterpartName}</p>
                    <p className="text-[10px] text-gray-500">Order #{selectedConv.orderId} · {selectedConv.product}</p>
                  </div>
                </>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 ? (
                <p className="text-center text-xs text-gray-400 mt-8">No messages yet. Say hello!</p>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.senderId === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={['flex flex-col gap-0.5', isOwn ? 'items-end' : 'items-start'].join(' ')}
                    >
                      <div
                        className={[
                          'max-w-[75%] px-3.5 py-2.5 text-sm',
                          isOwn
                            ? 'bg-[#E1C44D33] text-gray-900 rounded-l-xl rounded-tr-xl'
                            : 'bg-white border border-border text-gray-900 rounded-r-xl rounded-tl-xl',
                        ].join(' ')}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        {msg.intentoBypass && (
                          <p className="text-[10px] text-red-500 mt-1 font-medium">
                            BYPASS DETECTED — Message sanitized
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400">{formatTime(msg.sentAt)}</span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="px-4 py-3 border-t border-border flex items-end gap-2">
              <button
                type="button"
                disabled
                className="p-2 text-gray-300 cursor-not-allowed flex-shrink-0"
                aria-label="Attach file (coming soon)"
                title="Attachments coming soon"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message… (Ctrl+Enter to send)"
                rows={1}
                className="flex-1 resize-none px-3 py-2.5 rounded-input border border-border text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors min-h-[44px] max-h-[120px] overflow-y-auto"
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
                    ? 'bg-primary text-gray-900 hover:opacity-90 cursor-pointer'
                    : 'bg-gray-100 text-gray-300 cursor-not-allowed',
                ].join(' ')}
                aria-label="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
