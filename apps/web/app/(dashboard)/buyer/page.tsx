'use client';
import { useEffect, useState } from 'react';
import { Plus, TrendingUp, Clock, DollarSign, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { KPICard } from '@/components/ui/KPICard';
import { SkeletonRow, SkeletonBlock } from '@/components/ui/SkeletonRow';
import { SeasonalCalendar } from '@/components/ui/SeasonalCalendar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { api } from '@/lib/api';

interface OrderMatch {
  estado: string;
  cantidadKg: string | number;
  precioKg: string | number;
}

interface Order {
  id: string;
  estado: string;
  coverage: number;
  totalKg: number;
  createdAt: string;
  producto: { nombre: string };
  variedad?: { nombre: string } | null;
  matches: OrderMatch[];
}

interface NotifSummary {
  pendingOffers: number;
  pendingContracts: number;
  pendingDeliveries: number;
  expiredOrders: number;
  unreadMessages: number;
  firstPendingOfferOrderId?: string;
  firstPendingContractOrderId?: string;
  firstPendingContractTxId?: string;
  firstPendingDeliveryOrderId?: string;
  firstPendingDeliveryTxId?: string;
}

const IN_PROGRESS_STATES = ['ACTIVO', 'PARCIALMENTE_CUBIERTO', 'TOTALMENTE_CUBIERTO'];
const PAID_STATES = ['ACEPTADO_VENDEDOR', 'PENDIENTE_PAGO', 'CONFIRMADO'];

export default function BuyerDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifs, setNotifs] = useState<NotifSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, notifRes] = await Promise.all([
        api.get<{ success: boolean; data: Order[] }>('/orders'),
        api.get<{ success: boolean; data: NotifSummary }>('/matching/notifications/summary').catch(() => ({ data: { data: null } })),
      ]);
      setOrders(res.data.data ?? []);
      setNotifs(notifRes.data?.data ?? null);
    } catch {
      setError('Error al cargar los datos del panel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const ordersInProgress = orders.filter((o) => IN_PROGRESS_STATES.includes(o.estado)).length;
  // pendingDeliveries comes from the notifications endpoint which counts actual
  // transactions waiting on buyer confirmation (EN_TRANSITO / ENTREGADO_PENDIENTE_PAGO).
  // The previous filter counted orders in TOTALMENTE_CUBIERTO which meant "fully
  // matched" — that's NOT the same as "delivery pending".
  const pendingDeliveries = notifs?.pendingDeliveries ?? 0;
  const totalValue = orders.reduce((sum, o) => {
    const matchValue = o.matches
      .filter((m) => PAID_STATES.includes(m.estado))
      .reduce((s, m) => s + Number(m.cantidadKg) * Number(m.precioKg), 0);
    return sum + matchValue;
  }, 0);

  const topOrders = orders
    .filter((o) => IN_PROGRESS_STATES.includes(o.estado))
    .slice(0, 5);

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  const n = notifs;
  const actionItems = [
    n && n.pendingContracts > 0 && {
      icon: '✍️',
      label: `Sign ${n.pendingContracts} contract${n.pendingContracts > 1 ? 's' : ''}`,
      desc: 'A seller has signed — your signature is required to proceed.',
      href: n.pendingContracts === 1 && n.firstPendingContractOrderId && n.firstPendingContractTxId
        ? `/buyer/orders/${n.firstPendingContractOrderId}/contract/${n.firstPendingContractTxId}`
        : '/buyer/orders/tasks/contracts',
      color: 'amber',
    },
    n && n.pendingOffers > 0 && {
      icon: '💳',
      label: `Authorize payment for ${n.pendingOffers} offer${n.pendingOffers > 1 ? 's' : ''}`,
      desc: 'Pre-authorize payment to confirm the deal in escrow.',
      href: n.pendingOffers === 1 && n.firstPendingOfferOrderId
        ? `/buyer/orders/${n.firstPendingOfferOrderId}`
        : '/buyer/orders/tasks/offers',
      color: 'blue',
    },
    n && n.pendingDeliveries > 0 && {
      icon: '📦',
      label: `Confirm delivery of ${n.pendingDeliveries} shipment${n.pendingDeliveries > 1 ? 's' : ''}`,
      desc: 'Scan the QR code or enter the verification code to release payment.',
      href: n.pendingDeliveries === 1 && n.firstPendingDeliveryOrderId && n.firstPendingDeliveryTxId
        ? `/buyer/orders/${n.firstPendingDeliveryOrderId}/delivery/${n.firstPendingDeliveryTxId}`
        : '/buyer/orders/tasks/deliveries',
      color: 'green',
    },
    n && n.expiredOrders > 0 && {
      icon: '⏰',
      label: `${n.expiredOrders} order${n.expiredOrders > 1 ? 's' : ''} past delivery date`,
      desc: 'Extend the deadline or close the order with the current coverage.',
      href: '/buyer/orders/tasks/expiry',
      color: 'red',
    },
    n && n.unreadMessages > 0 && {
      icon: '💬',
      label: `${n.unreadMessages} unread message${n.unreadMessages > 1 ? 's' : ''}`,
      desc: 'You have unread messages from sellers.',
      href: '/buyer/messages',
      color: 'purple',
    },
  ].filter(Boolean) as { icon: string; label: string; desc: string; href: string; color: string }[];

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">¡Bienvenido de nuevo!</h1>
          <p className="text-secondary text-sm mt-1">Aquí tienes un resumen de tus pedidos.</p>
        </div>
        <Link href="/buyer/orders/new">
          <Button variant="primary" size="md" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create New Order
          </Button>
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          label="Orders in Progress"
          value={loading ? '—' : String(ordersInProgress)}
          sub={loading ? 'Loading...' : 'Pedidos activos'}
          icon={<Clock className="w-4 h-4" />}
        />
        <KPICard
          label="Total Value"
          value={loading ? '—' : `€${totalValue.toLocaleString('es-ES', { maximumFractionDigits: 0 })}`}
          sub={loading ? 'Loading...' : 'Valor comprometido'}
          icon={<DollarSign className="w-4 h-4" />}
        />
        <KPICard
          label="Pending Deliveries"
          value={loading ? '—' : String(pendingDeliveries)}
          sub={loading ? 'Loading...' : 'Listo para pagar'}
          icon={<TrendingUp className="w-4 h-4" />}
        />
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-card">
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 text-sm text-red-700 font-medium hover:underline"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {!loading && actionItems.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Action Required
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {actionItems.map((item) => (
              <Link key={item.href + item.label} href={item.href}>
                <div className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-soft-md ${
                  item.color === 'amber' ? 'border-amber-200 bg-amber-50 hover:border-amber-300' :
                  item.color === 'blue'  ? 'border-blue-200 bg-blue-50 hover:border-blue-300' :
                  item.color === 'green' ? 'border-green-200 bg-green-50 hover:border-green-300' :
                  item.color === 'red'   ? 'border-red-200 bg-red-50 hover:border-red-300' :
                  'border-purple-200 bg-purple-50 hover:border-purple-300'
                }`}>
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!loading && actionItems.length === 0 && (
        <Link href="/buyer/orders/new">
          <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all cursor-pointer">
            <span className="text-2xl">🌿</span>
            <div>
              <p className="text-sm font-semibold text-foreground">¡Estás al día!</p>
              <p className="text-xs text-muted-foreground mt-0.5">Sin acciones pendientes — ¿listo para crear un nuevo pedido?</p>
            </div>
            <span className="ml-auto text-sm font-medium text-primary">Crear pedido →</span>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Orders Table */}
        <div className="lg:col-span-2 bg-card rounded-card border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Resumen de pedidos activos</h2>
            <Link href="/buyer/orders" className="text-xs text-secondary hover:underline font-medium">
              View All Orders
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                {['ID PEDIDO', 'PRODUCTO', 'CANTIDAD', 'COBERTURA', 'ESTADO'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-[10px] font-semibold text-secondary uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <>
                  <SkeletonRow cols={5} />
                  <SkeletonRow cols={5} />
                  <SkeletonRow cols={5} />
                </>
              ) : topOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-secondary">
                    Sin pedidos activos.{' '}
                    <Link href="/buyer/orders/new" className="text-primary underline">Create one</Link>
                  </td>
                </tr>
              ) : (
                topOrders.map((order) => {
                  const hasOffer = order.matches.some((m) => m.estado === 'ACEPTADO_VENDEDOR');
                  const orderId = `ORD${order.id.slice(-5).toUpperCase()}`;
                  const coveragePct = Math.min(100, Math.round(Number(order.coverage) || 0));
                  const totalKg = Number(order.totalKg ?? 0);
                  return (
                    <tr key={order.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-secondary">
                        <span className="relative inline-flex items-center gap-1">
                          {orderId}
                          {hasOffer && (
                            <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" title="Seller offer pending" />
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {order.producto?.nombre ?? '—'}
                        {order.variedad && (
                          <span className="text-secondary"> / {order.variedad.nombre}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {totalKg.toLocaleString('es-ES', { maximumFractionDigits: 0 })} kg
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium w-9 tabular-nums">{coveragePct}%</span>
                          <div className="flex-1 h-1.5 max-w-[80px] bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${coveragePct >= 100 ? 'bg-green-500' : coveragePct > 0 ? 'bg-primary' : 'bg-gray-300'}`}
                              style={{ width: `${coveragePct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.estado} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Recent Activity */}
        <div className="bg-card rounded-card border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Actividad reciente</h2>
          </div>
          <div className="p-4 flex flex-col gap-3">
            {loading ? (
              <>
                <SkeletonBlock className="h-12 w-full" />
                <SkeletonBlock className="h-12 w-full" />
                <SkeletonBlock className="h-12 w-full" />
              </>
            ) : recentOrders.length === 0 ? (
              <p className="text-xs text-secondary text-center mt-2">Sin pedidos aún</p>
            ) : (
              recentOrders.map((order) => {
                const hasOffer = order.matches.some((m) => m.estado === 'ACEPTADO_VENDEDOR');
                return (
                  <div
                    key={order.id}
                    className="flex items-start justify-between p-3 bg-muted/50 rounded-input"
                  >
                    <div>
                      <p className="text-xs font-medium text-foreground flex items-center gap-1">
                        {order.producto?.nombre ?? '—'}
                        {hasOffer && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" title="Seller offer pending" />
                        )}
                      </p>
                      <p className="text-[10px] text-secondary mt-0.5">
                        {Number(order.totalKg).toLocaleString()} kg — {Math.min(100, Math.round(order.coverage ?? 0))}% covered
                      </p>
                    </div>
                    <StatusBadge status={order.estado} />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Seasonal Calendar */}
      <div className="bg-card rounded-card border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Calendario estacional — España</h2>
          <p className="text-xs text-secondary mt-0.5">Temporadas de producción y comercialización por categoría de producto</p>
        </div>
        <div className="p-4">
          <SeasonalCalendar />
        </div>
      </div>
    </div>
  );
}
