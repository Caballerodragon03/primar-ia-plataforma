'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Camera, Sparkles, CheckCircle2, Loader2, QrCode, Clock } from 'lucide-react';
import { api } from '@/lib/api';

interface ContractTask {
  txId: string;
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

const TYPE_CONFIG: Record<string, { title: string; icon: React.ReactNode; color: string }> = {
  contracts: { title: 'Contracts to Countersign', icon: <FileText className="w-5 h-5" />, color: 'amber' },
  photos:    { title: 'Shipment Prep & QR Code', icon: <QrCode className="w-5 h-5" />, color: 'blue' },
  matches:   { title: 'Offers to Review', icon: <Sparkles className="w-5 h-5" />, color: 'green' },
  expiry:    { title: 'Lots Past Availability Date', icon: <Clock className="w-5 h-5" />, color: 'red' },
};

function shortLotId(id: string) {
  return id.slice(-5).toUpperCase();
}

export default function SellerTaskListPage() {
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
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          config.color === 'amber' ? 'bg-amber-100 text-amber-600' :
          config.color === 'blue'  ? 'bg-blue-100 text-blue-600' :
          config.color === 'red'   ? 'bg-red-100 text-red-600' :
          'bg-green-100 text-green-600'
        }`}>
          {config.icon}
        </div>
        <h1 className="text-xl font-bold text-foreground">{config.title}</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-500 text-center py-8">Error: {error}</p>
      ) : !tasks ? (
        <p className="text-sm text-muted-foreground text-center py-8">Could not load tasks.</p>
      ) : type === 'contracts' ? (
        <TaskList
          items={tasks.contracts}
          emptyMsg="No contracts pending your signature."
          emptyCta={{ label: 'Publish a New Lot', href: '/seller/lots/new' }}
          renderItem={(item) => (
            <Link
              key={item.txId}
              href={`/seller/lots/${item.lotId}/contract/${item.txId}`}
              className="block p-4 bg-card rounded-card border border-border hover:border-amber-300 hover:shadow-soft-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Lot {shortLotId(item.lotId)} — {item.producto}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Buyer: {item.counterpart} · {item.cantidadKg.toLocaleString('es-ES')} kg
                  </p>
                </div>
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-badge">Sign →</span>
              </div>
            </Link>
          )}
        />
      ) : type === 'photos' ? (
        <TaskList
          items={tasks.photos}
          emptyMsg="No shipments pending QR preparation or photo upload."
          emptyCta={{ label: 'Publish a New Lot', href: '/seller/lots/new' }}
          renderItem={(item) => (
            <Link
              key={item.txId}
              href={`/seller/lots/${item.lotId}/qr/${item.txId}`}
              className="block p-4 bg-card rounded-card border border-border hover:border-blue-300 hover:shadow-soft-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Lot {shortLotId(item.lotId)} — {item.producto}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Buyer: {item.buyer} · {item.cantidadKg.toLocaleString('es-ES')} kg
                  </p>
                </div>
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-badge">Prepare →</span>
              </div>
            </Link>
          )}
        />
      ) : type === 'matches' ? (
        <TaskList
          items={tasks.matches ?? []}
          emptyMsg="No pending match offers to review."
          emptyCta={{ label: 'Publish a New Lot', href: '/seller/lots/new' }}
          renderItem={(item) => (
            <Link
              key={item.matchId}
              href={`/seller/lots/${item.lotId}`}
              className="block p-4 bg-card rounded-card border border-border hover:border-green-300 hover:shadow-soft-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Lot {shortLotId(item.lotId)} — {item.producto}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Buyer: {item.buyer} · {item.cantidadKg.toLocaleString('es-ES')} kg · €{item.precioKg.toFixed(3)}/kg
                  </p>
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-badge">Review →</span>
              </div>
            </Link>
          )}
        />
      ) : type === 'expiry' ? (
        <TaskList
          items={tasks.expiredLots ?? []}
          emptyMsg="No lots past their availability date."
          emptyCta={{ label: 'Publish a New Lot', href: '/seller/lots/new' }}
          renderItem={(item) => (
            <div
              key={item.lotId}
              className="p-4 bg-card rounded-card border border-border space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Lot {shortLotId(item.lotId)} — {item.producto}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ended: {new Date(item.fechaFin).toLocaleDateString('es-ES')} · Sold: {item.coverage}% · {item.totalKg.toLocaleString('es-ES')} kg
                  </p>
                </div>
                <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-badge">Expired</span>
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground block mb-1">Extend to new date</label>
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
                  {actionLoading === item.lotId ? 'Saving...' : 'Extend'}
                </button>
                <button
                  onClick={() => handleCloseLot(item.lotId)}
                  disabled={actionLoading === item.lotId}
                  className="px-4 py-1.5 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-40 transition-colors"
                >
                  Close Lot
                </button>
              </div>
            </div>
          )}
        />
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">Unknown task type.</p>
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
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
        <CheckCircle2 className="w-10 h-10 text-green-400" />
        <div>
          <p className="text-sm font-semibold text-foreground">¡Estás al día!</p>
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
      <p className="text-xs text-muted-foreground">{items.length} pending task{items.length !== 1 ? 's' : ''}</p>
      {items.map(renderItem)}
    </div>
  );
}
