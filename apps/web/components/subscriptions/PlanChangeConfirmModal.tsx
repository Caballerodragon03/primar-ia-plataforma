'use client';

/**
 * Phase 17.2 — modal de confirmación al cambiar de plan.
 *
 * Cuando el usuario pulsa un plan distinto al actual, en vez de
 * disparar el cambio directamente mostramos este modal con:
 *
 *   - Resumen de qué va a pasar (upgrade inmediato vs downgrade
 *     diferido al fin del periodo vs cancelación al fin del periodo).
 *   - Botón "Mantener mi plan actual" (cancela el flujo, no hay
 *     llamada al backend).
 *   - Botón principal de confirmación: "Cambiar / Bajar / Cancelar".
 *   - Si es el PRIMER downgrade del usuario y giftEligible=true,
 *     mostramos un bloque ámbar destacando el regalo de 1 mes gratis
 *     con su propio botón "🎁 Aceptar regalo y mantener mi plan".
 *
 * Compartido entre /buyer/subscription y /seller/subscription.
 */
import { useState } from 'react';
import { X, Gift, ArrowDownCircle, ArrowUpCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useT } from '@/lib/i18n/LocaleProvider';

export type PlanChangeKind = 'upgrade' | 'downgrade-paid' | 'downgrade-free';

interface Props {
  isOpen: boolean;
  /** Plan al que se quiere cambiar (display name). */
  targetPlanLabel: string;
  /** Plan actual (display name). */
  currentPlanLabel: string;
  /** Tipo de cambio para decidir copy + iconos. */
  kind: PlanChangeKind;
  /** ¿Mostrar el bloque del regalo de 1er-downgrade? */
  giftEligible: boolean;
  /** Loading state mientras se aplica el cambio o el regalo. */
  loading?: boolean;

  onCancel: () => void;
  onConfirm: () => void;
  onAcceptGift: () => void;
}

export function PlanChangeConfirmModal({
  isOpen,
  targetPlanLabel,
  currentPlanLabel,
  kind,
  giftEligible,
  loading,
  onCancel,
  onConfirm,
  onAcceptGift,
}: Props) {
  const t = useT();
  const [acceptingGift, setAcceptingGift] = useState(false);

  if (!isOpen) return null;

  const titleKey =
    kind === 'upgrade'
      ? 'subscription.confirm.upgradeTitle'
      : kind === 'downgrade-free'
      ? 'subscription.confirm.cancelTitle'
      : 'subscription.confirm.downgradeTitle';

  const bodyKey =
    kind === 'upgrade'
      ? 'subscription.confirm.upgradeBody'
      : kind === 'downgrade-free'
      ? 'subscription.confirm.cancelBody'
      : 'subscription.confirm.downgradeBody';

  const ctaKey =
    kind === 'upgrade'
      ? 'subscription.confirm.upgradeCta'
      : kind === 'downgrade-free'
      ? 'subscription.confirm.cancelCta'
      : 'subscription.confirm.downgradeCta';

  const IconCmp =
    kind === 'upgrade' ? ArrowUpCircle : kind === 'downgrade-free' ? XCircle : ArrowDownCircle;
  const iconColor =
    kind === 'upgrade' ? 'text-emerald-600' : kind === 'downgrade-free' ? 'text-red-600' : 'text-amber-600';

  // El regalo solo aplica a downgrades (paid o free), no a upgrades.
  const showGift = giftEligible && kind !== 'upgrade';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
      <div className="relative w-full max-w-md bg-card rounded-card shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <IconCmp className={`w-5 h-5 ${iconColor}`} />
            {t(titleKey)}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="p-1.5 rounded-full text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-foreground leading-relaxed">
            {t(bodyKey)
              .replace('{current}', currentPlanLabel)
              .replace('{target}', targetPlanLabel)}
          </p>

          {/* Phase 17.2 — bloque de regalo destacado */}
          {showGift && (
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-200/70 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-amber-800" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-900">
                    {t('subscription.confirm.giftTitle')}
                  </p>
                  <p className="text-xs text-amber-900/90 mt-1 leading-relaxed">
                    {t('subscription.confirm.giftBody').replace('{current}', currentPlanLabel)}
                  </p>
                </div>
              </div>
              <Button
                variant="primary"
                disabled={loading || acceptingGift}
                onClick={async () => {
                  setAcceptingGift(true);
                  try {
                    await onAcceptGift();
                  } finally {
                    setAcceptingGift(false);
                  }
                }}
                className="w-full !bg-amber-500 hover:!bg-amber-600"
              >
                {acceptingGift
                  ? t('subscription.confirm.giftLoading')
                  : t('subscription.confirm.giftCta')}
              </Button>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex-1"
            >
              {t('subscription.confirm.keepPlan')}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={onConfirm}
              loading={loading}
              className="flex-1"
            >
              {t(ctaKey)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
