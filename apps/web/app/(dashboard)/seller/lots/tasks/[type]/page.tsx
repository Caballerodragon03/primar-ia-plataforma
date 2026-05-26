'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Sparkles, CheckCircle2, Loader2, QrCode, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { useT, useLocale } from '@/lib/i18n/LocaleProvider';
import type { MessageKey } from '@/lib/i18n/messages';

interface ContractTask {
  matchId: string;
  orderId: string;
  lotId: string;
  producto: string;
  counterpart: string;
  cantidadKg: number;
}

interface PhotoTask {
  txId: string;
  lotId: string;
  producto: string;
  buyer: string;
  cantidadKg: number;
}

interface MatchTask {
  matchId: string;
  lotId: string;
  producto: string;
  buyer: string;
  cantidadKg: number;
  precioKg: number;
}

interface ExpiryTask {
  lotId: string;
  producto: string;
  fechaFin: string;
  coverage: number;
  totalKg: number;
}

interface TasksData {
  contracts: ContractTask[];
  photos: PhotoTask[];
  matches: MatchTask[];
  expiredLots: ExpiryTask[];
}

const TYPE_CONFIG: Record<string, { titleKey: MessageKey; icon: React.ReactNode; color: string; emptyKey: MessageKey }> = {
  contracts: { titleKey: 'tasks.seller.contracts', icon: <FileText className="w-5 h-5" />, color: 'amber', emptyKey: 'tasks.empty.seller.contracts' },
  photos: { titleKey: 'tasks.seller.photos', icon: <QrCode className="w-5 h-5" />, color: 'blue', emptyKey: 'tasks.empty.seller.photos' },
  matches: { titleKey: 'tasks.seller.matches', icon: <Sparkles className="w-5 h-5" />, color: 'green', emptyKey: 'tasks.empty.seller.matches' },
  expiry: { titleKey: 'tasks.seller.expiry', icon: <Clock className="w-5 h-5" />, color: 'red', emptyKey: 'tasks.empty.seller.expiry' },
};

function shortLotId(id: string) {
  return id.slice(-5).toUpperCase();
}

export default function SellerTaskListPage() {
  const t = useT();
  const { locale } = useLocale();
  const numLoc = locale === 'en' ? 'en-GB' : 'es-ES';
  const { type } = useParams<{ type: string }>();
  const [tasks, setTasks] = useState<TasksData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [extendDate, setExtendDate] = useState<Record<string, string>>({});

  useEffect(() => {
    api.get<{ data: TasksData }>('/matching/notifications/tasks')
      .then(({ data }) => setTasks(data.data))
      .catch((err) => {
        const msg = err?.response?.data?.error ?? err?.message ?? 'Unknown error';
        setError(msg);
        console.error('[tasks]', err?.response?.data ?? err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleExtendLot = async (lotId: string) => {
    const newDate = extendDate[lotId];
    if (!newDate) return;
    setActionLoading(lotId);
    try {
      await api.post(`/matching/lots/${lotId}/extend`, { newDate: new Date(newDate).toISOString() });
      setTasks((prev) => prev ? { ...prev, expiredLots: prev.expiredLots.filter((l) => l.lotId !== lotId) } : prev);
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const handleCloseLot = async (lotId: string) => {
    setActionLoading(lotId);
    try {
      await api.post(`/matching/lots/${lotId}/close`);
      setTasks((prev) => prev ? { ...prev, expiredLots: prev.expiredLots.filter((l) => l.lotId !== lotId) } : prev);
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG['contracts']!;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link href="/seller" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> {t('tasks.backToDashboard')}
      </Link>

      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          config.color === 'amber' ? 'bg-amber-100 text-amber-600' :
          config.color === 'blue' ? 'bg-blue-100 text-blue-600' :
          config.color === 'red' ? 'bg-red-100 text-red-600' :
          'bg-green-100 text-green-600'
        }`}>
          {config.icon}
        </div>
        <h1 className="text-xl font-bold text-foreground">{t(config.titleKey)}</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-500 text-center py-8">Error: {error}</p>
      ) : !tasks ? (
        <p className="text-sm text-muted-foreground text-center py-8">{t('tasks.loadFail')}</p>
      ) : type === 'contracts' ? (
        <TaskList
          items={tasks.contracts}
          emptyMsg={t('tasks.empty.seller.contracts')}
          emptyCta={{ label: t('tasks.publishNewLot'), href: '/seller/lots/new' }}
          renderItem={(item) => (
            <Link
              key={item.matchId}
              href={`/seller/contracts/${item.matchId}`}
              className="block p-4 bg-card rounded-card border border-border hover:border-amber-300 hover:shadow-soft-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {t('tasks.lotPrefix')} {shortLotId(item.lotId)} — {item.producto}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('tasks.buyer')}: {item.counterpart} · {item.cantidadKg.toLocaleString(numLoc)} kg
                  </p>
                </div>
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-badge">{t('tasks.sign')}</span>
              </div>
            </Link>
          )}
        />
      ) : type === 'photos' ? (
        <TaskList
          items={tasks.photos}
          emptyMsg={t('tasks.empty.seller.photos')}
          emptyCta={{ label: t('tasks.publishNewLot'), href: '/seller/lots/new' }}
          renderItem={(item) => (
            <Link
              key={item.txId}
              href={`/seller/lots/${item.lotId}/qr/${item.txId}`}
              className="block p-4 bg-card rounded-card border border-border hover:border-blue-300 hover:shadow-soft-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {t('tasks.lotPrefix')} {shortLotId(item.lotId)} — {item.producto}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('tasks.buyer')}: {item.buyer} · {item.cantidadKg.toLocaleString(numLoc)} kg
                  </p>
                </div>
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-badge">{t('tasks.prepare')}</span>
              </div>
            </Link>
          )}
        />
      ) : type === 'matches' ? (
        <TaskList
          items={tasks.matches ?? []}
          emptyMsg={t('tasks.empty.seller.matches')}
          emptyCta={{ label: t('tasks.publishNewLot'), href: '/seller/lots/new' }}
          renderItem={(item) => (
            <Link
              key={item.matchId}
              href={`/seller/lots/${item.lotId}`}
              className="block p-4 bg-card rounded-card border border-border hover:border-green-300 hover:shadow-soft-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {t('tasks.lotPrefix')} {shortLotId(item.lotId)} — {item.producto}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('tasks.buyer')}: {item.buyer} · {item.cantidadKg.toLocaleString(numLoc)} kg · €{item.precioKg.toFixed(3)}/kg
                  </p>
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-badge">{t('tasks.review')}</span>
              </div>
            </Link>
          )}
        />
      ) : type === 'expiry' ? (
        <TaskList
          items={tasks.expiredLots ?? []}
          emptyMsg={t('tasks.empty.seller.expiry')}
          emptyCta={{ label: t('tasks.publishNewLot'), href: '/seller/lots/new' }}
          renderItem={(item) => (
            <div
              key={item.lotId}
              className="p-4 bg-card rounded-card border border-border space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {t('tasks.lotPrefix')} {shortLotId(item.lotId)} — {item.producto}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('tasks.ended')}: {new Date(item.fechaFin).toLocaleDateString(numLoc)} · {t('tasks.sold')}: {item.coverage}% · {item.totalKg.toLocaleString(numLoc)} kg
                  </p>
                </div>
                <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-badge">{t('tasks.expired')}</span>
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground block mb-1">{t('tasks.extendLabel')}</label>
                  <input
                    type="date"
                    className="w-full px-3 py-1.5 border border-border rounded-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={extendDate[item.lotId] ?? ''}
                    onChange={(e) => setExtendDate((prev) => ({ ...prev, [item.lotId]: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <button
                  onClick={() => handleExtendLot(item.lotId)}
                  disabled={!extendDate[item.lotId] || actionLoading === item.lotId}
                  className="px-4 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-40 transition-colors"
                >
                  {actionLoading === item.lotId ? t('tasks.saving') : t('tasks.extend')}
                </button>
                <button
                  onClick={() => handleCloseLot(item.lotId)}
                  disabled={actionLoading === item.lotId}
                  className="px-4 py-1.5 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-40 transition-colors"
                >
                  {t('tasks.closeLot')}
                </button>
              </div>
            </div>
          )}
        />
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">{t('tasks.unknownType')}</p>
      )}
    </div>
  );
}

function TaskList<T>({
  items,
  emptyMsg,
  emptyCta,
  renderItem,
}: {
  items: T[];
  emptyMsg: string;
  emptyCta: { label: string; href: string };
  renderItem: (item: T) => React.ReactNode;
}) {
  const t = useT();
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
        <CheckCircle2 className="w-10 h-10 text-green-400" />
        <div>
          <p className="text-sm font-semibold text-foreground">{t('tasks.allCaughtUp')}</p>
          <p className="text-xs text-muted-foreground mt-1">{emptyMsg}</p>
        </div>
        <Link
          href={emptyCta.href}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary border border-primary/30 bg-primary/5 px-4 py-2 rounded-lg hover:bg-primary/10 transition-colors"
        >
          {emptyCta.label} →
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{items.length} {items.length === 1 ? t('tasks.pendingTaskOne') : t('tasks.pendingTaskMany')}</p>
      {items.map(renderItem)}
    </div>
  );
}
