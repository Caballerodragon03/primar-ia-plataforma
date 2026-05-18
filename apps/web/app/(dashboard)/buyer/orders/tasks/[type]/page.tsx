'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, CreditCard, Package, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { api } from '@/lib/api';

interface ContractTask {
  matchId: string;
  orderId: string;
  lotId: string;
  producto: string;
  counterpart: string;
  cantidadKg: number;
}

interface OfferTask {
  matchId: string;
  orderId: string;
  producto: string;
  seller: string;
  cantidadKg: number;
  precioKg: number;
}

interface DeliveryTask {
  txId: string;
  orderId: string;
  producto: string;
  seller: string;
  cantidadKg: number;
}

interface ExpiryTask {
  orderId: string;
  producto: string;
  fechaEntrega: string;
  coverage: number;
  totalKg: number;
}

interface TasksData {
  contracts: ContractTask[];
  offers: OfferTask[];
  deliveries: DeliveryTask[];
  expiredOrders: ExpiryTask[];
}

const TYPE_CONFIG: Record<string, { title: string; icon: React.ReactNode; color: string }> = {
  contracts: { title: 'Contracts to Sign', icon: <FileText className="w-5 h-5" />, color: 'amber' },
  offers: { title: 'Offers to Authorize', icon: <CreditCard className="w-5 h-5" />, color: 'blue' },
  deliveries: { title: 'Deliveries to Confirm', icon: <Package className="w-5 h-5" />, color: 'green' },
  expiry: { title: 'Orders Past Delivery Date', icon: <Clock className="w-5 h-5" />, color: 'red' },
};

function shortId(id: string) {
  return `ORD${id.slice(-5).toUpperCase()}`;
}

export default function BuyerTaskListPage() {
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

  const handleExtendOrder = async (orderId: string) => {
    const newDate = extendDate[orderId];
    if (!newDate) return;
    setActionLoading(orderId);
    try {
      await api.post(`/matching/orders/${orderId}/extend`, { newDate: new Date(newDate).toISOString() });
      setTasks((prev) => prev ? { ...prev, expiredOrders: prev.expiredOrders.filter((o) => o.orderId !== orderId) } : prev);
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const handleCloseOrder = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      await api.post(`/matching/orders/${orderId}/close`);
      setTasks((prev) => prev ? { ...prev, expiredOrders: prev.expiredOrders.filter((o) => o.orderId !== orderId) } : prev);
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG['contracts']!;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link href="/buyer" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
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
          emptyCta={{ label: 'Create a New Order', href: '/buyer/orders/new' }}
          renderItem={(item) => (
            <Link
              key={item.matchId}
              href={`/buyer/contracts/${item.matchId}`}
              className="block p-4 bg-card rounded-card border border-border hover:border-amber-300 hover:shadow-soft-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {shortId(item.orderId)} — {item.producto}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Vendedor: {item.counterpart} · {item.cantidadKg.toLocaleString('es-ES')} kg
                  </p>
                </div>
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-badge">Firmar y pagar →</span>
              </div>
            </Link>
          )}
        />
      ) : type === 'offers' ? (
        <TaskList
          items={tasks.offers}
          emptyMsg="No offers awaiting payment authorization."
          emptyCta={{ label: 'Create a New Order', href: '/buyer/orders/new' }}
          renderItem={(item) => (
            <Link
              key={item.matchId}
              href={`/buyer/orders/${item.orderId}`}
              className="block p-4 bg-card rounded-card border border-border hover:border-blue-300 hover:shadow-soft-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {shortId(item.orderId)} — {item.producto}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Seller: {item.seller} · {item.cantidadKg.toLocaleString('es-ES')} kg · €{item.precioKg.toFixed(3)}/kg
                  </p>
                </div>
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-badge">Authorize →</span>
              </div>
            </Link>
          )}
        />
      ) : type === 'deliveries' ? (
        <TaskList
          items={tasks.deliveries}
          emptyMsg="No deliveries pending confirmation."
          emptyCta={{ label: 'Create a New Order', href: '/buyer/orders/new' }}
          renderItem={(item) => (
            <Link
              key={item.txId}
              href={`/buyer/orders/${item.orderId}/delivery/${item.txId}`}
              className="block p-4 bg-card rounded-card border border-border hover:border-green-300 hover:shadow-soft-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {shortId(item.orderId)} — {item.producto}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Seller: {item.seller} · {item.cantidadKg.toLocaleString('es-ES')} kg
                  </p>
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-badge">Confirm →</span>
              </div>
            </Link>
          )}
        />
      ) : type === 'expiry' ? (
        <TaskList
          items={tasks.expiredOrders ?? []}
          emptyMsg="No orders past their delivery date."
          emptyCta={{ label: 'Create a New Order', href: '/buyer/orders/new' }}
          renderItem={(item) => (
            <div
              key={item.orderId}
              className="p-4 bg-card rounded-card border border-border space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {shortId(item.orderId)} — {item.producto}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Due: {new Date(item.fechaEntrega).toLocaleDateString('es-ES')} · Coverage: {item.coverage}% · {item.totalKg.toLocaleString('es-ES')} kg
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
                    value={extendDate[item.orderId] ?? ''}
                    onChange={(e) => setExtendDate((prev) => ({ ...prev, [item.orderId]: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <button
                  onClick={() => handleExtendOrder(item.orderId)}
                  disabled={!extendDate[item.orderId] || actionLoading === item.orderId}
                  className="px-4 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-40 transition-colors"
                >
                  {actionLoading === item.orderId ? 'Saving...' : 'Extend'}
                </button>
                <button
                  onClick={() => handleCloseOrder(item.orderId)}
                  disabled={actionLoading === item.orderId}
                  className="px-4 py-1.5 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-40 transition-colors"
                >
                  Close Order
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
