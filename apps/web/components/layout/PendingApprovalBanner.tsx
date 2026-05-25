'use client';

/**
 * Phase 14M v3.35 — Banner sticky para usuarios que han confirmado su email
 * pero aún están pendientes de aprobación admin. Aparece debajo del header
 * en todas las páginas del dashboard hasta que el admin pone su estado a
 * VERIFICADO_ACTIVO. Mientras tanto los endpoints sensibles devuelven 403
 * via requireEstado('VERIFICADO_ACTIVO').
 */
import { useAuthStore } from '@/store/auth.store';
import { Clock } from 'lucide-react';
import { useT } from '@/lib/i18n/LocaleProvider';

const PENDING_STATES = new Set(['EMAIL_VERIFICADO', 'PENDIENTE_VERIFICACION', 'PENDIENTE_ACLARACION']);

export function PendingApprovalBanner() {
  const { user } = useAuthStore();
  const t = useT();
  if (!user || !PENDING_STATES.has(user.estado)) return null;

  const stateMsg = user.estado === 'PENDIENTE_ACLARACION'
    ? t('pendingBanner.bodyClarification')
    : (user.role === 'VENDEDOR' ? t('pendingBanner.bodySeller') : t('pendingBanner.bodyBuyer'));

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2.5 flex items-center gap-2 text-sm" role="status">
      <Clock className="w-4 h-4 text-yellow-700 shrink-0" />
      <p className="text-yellow-900">
        <span className="font-semibold">{t('pendingBanner.title')}</span>{' '}
        {stateMsg}{' '}{t('pendingBanner.bodyTail')}
      </p>
    </div>
  );
}
