'use client';
import Link from 'next/link';
import { ArrowUpCircle } from 'lucide-react';

interface LimitPromptProps {
  type: 'lot' | 'order';
  current: number;
  max: number;
  role: 'VENDEDOR' | 'COMPRADOR';
  feature?: never;
  requiredPlan?: never;
  currentPlan?: never;
}

interface FeaturePromptProps {
  feature: string;
  requiredPlan: string;
  currentPlan: string;
  role?: 'VENDEDOR' | 'COMPRADOR';
  type?: never;
  current?: never;
  max?: never;
}

type UpgradePromptProps = LimitPromptProps | FeaturePromptProps;

const PLAN_NAMES: Record<string, string> = {
  VENDEDOR: 'Cosecha',
  COMPRADOR: 'Mercado',
};

export function UpgradePrompt(props: UpgradePromptProps) {
  // Feature-gate variant
  if ('feature' in props && props.feature) {
    const roleSlug =
      props.currentPlan.toUpperCase() === 'MERCADO' ||
      props.currentPlan.toUpperCase() === 'LONJA' ||
      props.currentPlan.toUpperCase() === 'CENTRAL'
        ? 'buyer'
        : 'seller';
    const href = `/${roleSlug}/subscription`;

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="bg-surface border border-border rounded-[12px] p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ArrowUpCircle className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-2">
            Función no disponible
          </h3>
          <p className="text-sm text-text-secondary mb-6">
            <strong>{props.feature}</strong> requiere el plan{' '}
            <span className="font-semibold text-text-primary">{props.requiredPlan}</span>{' '}
            o superior. Tu plan actual es{' '}
            <span className="font-semibold">{props.currentPlan}</span>.
          </p>
          <Link
            href={href}
            className="inline-flex items-center gap-2 py-2.5 px-6 rounded-[8px] bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <ArrowUpCircle className="w-4 h-4" />
            Mejorar plan
          </Link>
        </div>
      </div>
    );
  }

  // Limit-reached variant (original)
  const { type, current, max, role } = props as LimitPromptProps;
  const itemLabel = type === 'lot' ? 'lotes activos' : 'pedidos activos';
  const planName = PLAN_NAMES[role] ?? 'gratuito';
  const href = role === 'VENDEDOR' ? '/seller/subscription' : '/buyer/subscription';

  return (
    <div className="bg-surface border border-border rounded-[12px] p-8 text-center max-w-md mx-auto">
      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      </div>

      <h3 className="text-lg font-bold text-text-primary mb-2">
        Límite alcanzado
      </h3>

      <p className="text-sm text-text-secondary mb-6">
        Has alcanzado el límite de {max} {itemLabel} de tu plan {planName}.
        Actualmente tienes {current} activos. Mejora tu plan para seguir{' '}
        {type === 'lot' ? 'publicando' : 'creando pedidos'}.
      </p>

      <Link
        href={href}
        className="inline-block py-2.5 px-6 rounded-[8px] bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
      >
        Ver Planes
      </Link>
    </div>
  );
}
