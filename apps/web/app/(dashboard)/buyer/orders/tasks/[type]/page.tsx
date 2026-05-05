'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, CreditCard, Package, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

interface ContractTask {
  txId: string;
  orderId: string;
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

interface TasksData {
  contracts: ContractTask[];
  offers: OfferTask[];
  deliveries: DeliveryTask[];
}

const TYPE_CONFIG: Record<string, { title: string; icon: React.ReactNode; color: string }> = {
  contracts: { title: 'Contracts to Sign', icon: <FileText className="w-5 h-5" />, color: 'amber' },
  offers: { title: 'Offers to Authorize', icon: <CreditCard className="w-5 h-5" />, color: 'blue' },
  deliveries: { title: 'Deliveries to Confirm', icon: <Package className="w-5 h-5" />, color: 'green' },
};

function shortId(id: string) {
  return `ORD${id.slice(-5).toUpperCase()}`;
}

export default function BuyerTaskListPage() {
  const { type } = useParams<{ type: string }>();
  const [tasks, setTasks] = useState<TasksData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG['contracts']!;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link href="/buyer" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          config.color === 'amber' ? 'bg-amber-100 text-amber-600' :
          config.color === 'blue' ? 'bg-blue-100 text-blue-600' :
          'bg-green-100 text-green-600'
        }`}>
          {config.icon}
        </div>
        <h1 className="text-xl font-bold text-gray-900">{config.title}</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-500 text-center py-8">Error: {error}</p>
      ) : !tasks ? (
        <p className="text-sm text-gray-500 text-center py-8">Could not load tasks.</p>
      ) : type === 'contracts' ? (
        <TaskList
          items={tasks.contracts}
          emptyMsg="No contracts pending your signature."
          emptyCta={{ label: 'Create a New Order', href: '/buyer/orders/new' }}
          renderItem={(item) => (
            <Link
              key={item.txId}
              href={`/buyer/orders/${item.orderId}/contract/${item.txId}`}
              className="block p-4 bg-white rounded-card border border-border hover:border-amber-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {shortId(item.orderId)} — {item.producto}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Seller: {item.counterpart} · {item.cantidadKg.toLocaleString('es-ES')} kg
                  </p>
                </div>
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-badge">Sign →</span>
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
              className="block p-4 bg-white rounded-card border border-border hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {shortId(item.orderId)} — {item.producto}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
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
              className="block p-4 bg-white rounded-card border border-border hover:border-green-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {shortId(item.orderId)} — {item.producto}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Seller: {item.seller} · {item.cantidadKg.toLocaleString('es-ES')} kg
                  </p>
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-badge">Confirm →</span>
              </div>
            </Link>
          )}
        />
      ) : (
        <p className="text-sm text-gray-500 text-center py-8">Unknown task type.</p>
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
          <p className="text-sm font-semibold text-gray-700">You&apos;re all caught up!</p>
          <p className="text-xs text-gray-500 mt-1">{emptyMsg}</p>
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
      <p className="text-xs text-gray-500">{items.length} pending task{items.length !== 1 ? 's' : ''}</p>
      {items.map(renderItem)}
    </div>
  );
}
