'use client';
import { PlanCard } from './PlanCard';

interface PlanComparisonProps {
  role: 'VENDEDOR' | 'COMPRADOR';
  currentPlan: string;
  onSelectPlan: (plan: string) => void;
}

const SELLER_PLANS = [
  {
    id: 'COSECHA',
    name: 'Cosecha',
    price: 0,
    badge: null,
    features: [
      '3 lotes activos',
      '3 fotos por lote',
      'Matches con delay de 15 min',
      'Analytics últimos 30 días',
      '3 certificados',
      'Negociación en chat completa',
    ],
  },
  {
    id: 'CAMPO',
    name: 'Campo',
    price: 1900,
    badge: 'Vendedor Activo',
    popular: true,
    features: [
      '15 lotes activos',
      '10 fotos por lote',
      'Matches inmediatos',
      'Analytics completas (12 meses)',
      '5 certificados',
      'Export CSV',
      'Estimación de cosecha',
      'Soporte prioritario (24h)',
    ],
  },
  {
    id: 'FINCA',
    name: 'Finca',
    price: 4900,
    badge: 'Vendedor Pro',
    features: [
      'Lotes ilimitados',
      'Fotos ilimitadas',
      'Matches inmediatos + alertas',
      'Analytics + tendencias de mercado',
      'Certificados ilimitados',
      'Export CSV + PDF informes',
      'Estimación de cosecha',
      'Soporte prioritario + teléfono',
    ],
  },
];

const BUYER_PLANS = [
  {
    id: 'MERCADO',
    name: 'Mercado',
    price: 0,
    badge: null,
    features: [
      '5 pedidos activos',
      'Analytics últimos 30 días',
      'Comisión estándar',
      'Negociación en chat completa',
      'Descarga de facturas/contratos',
    ],
  },
  {
    id: 'LONJA',
    name: 'Lonja',
    price: 2900,
    badge: 'Comprador Verificado',
    popular: true,
    features: [
      '20 pedidos activos',
      'Analytics completas (12 meses)',
      'Comisión estándar',
      'Negociación en chat completa',
      'Descarga de facturas/contratos',
      'Soporte prioritario (24h)',
    ],
  },
  {
    id: 'CENTRAL',
    name: 'Central',
    price: 8900,
    badge: 'Comprador Premium',
    features: [
      'Pedidos ilimitados',
      'Analytics + tendencias de mercado',
      'Descuento -0,4pp en comisión',
      'Export estadísticas CSV + PDF',
      'Descarga de facturas/contratos',
      'Soporte dedicado + teléfono',
    ],
  },
];

export function PlanComparison({ role, currentPlan, onSelectPlan }: PlanComparisonProps) {
  const plans = role === 'VENDEDOR' ? SELLER_PLANS : BUYER_PLANS;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {plans.map((plan) => (
        <PlanCard
          key={plan.id}
          name={plan.name}
          price={plan.price}
          features={plan.features}
          badge={plan.badge}
          isCurrent={currentPlan === plan.id}
          popular={'popular' in plan && plan.popular}
          onSelect={() => onSelectPlan(plan.id)}
        />
      ))}
    </div>
  );
}
