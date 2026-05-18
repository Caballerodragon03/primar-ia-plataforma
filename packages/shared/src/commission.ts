/**
 * Calculates Primar-IA platform commission.
 * Only the BUYER pays commission (paid to Primar-IA at contract signature).
 *
 * Base tiers (by ticket size):
 *   <  500 EUR        -> 5.0%
 *   500 - 2,000 EUR   -> 4.0%
 *   2k  - 10,000 EUR  -> 3.0%
 *   10k - 50,000 EUR  -> 2.5%
 *   > 50,000 EUR      -> 2.0%
 *
 * Subscription discount (paid by the buyer's tier):
 *   MERCADO (free)   -> 0
 *   LONJA   (mid)    -> -0.5pp
 *   CENTRAL (top)    -> -1.0pp
 *
 * Volume discount (buyer's confirmed platform volume in the last 30 days):
 *   <  25 000 EUR     -> 0
 *   25k - 100 000 EUR -> -0.1pp
 *   100k - 500 000 EUR-> -0.2pp
 *   > 500 000 EUR     -> -0.3pp (or custom negotiated)
 *
 * Caps:
 *   Min 5 EUR per transaction (admin overhead)
 *   Max 5 000 EUR per transaction (cap on mega-deals)
 *
 * Returned `porcentajeFinal` reflects discounts but NEVER goes below 0.
 */

export type BuyerSubscriptionTier = 'FREE' | 'MID' | 'TOP';

export interface CommissionOptions {
  subscriptionTier?: BuyerSubscriptionTier;
  monthlyVolumeEur?: number;
}

export interface CommissionResult {
  importe: number;
  porcentajeBase: number;
  descuentoSuscripcion: number;
  descuentoVolumen: number;
  porcentajeFinal: number;
  comisionAntesCaps: number;
  total: number;
  // Backwards-compat aliases (used by older callers).
  porcentaje: number;
}

const MIN_COMMISSION = 5;
const MAX_COMMISSION = 5000;

function basePctForAmount(amount: number): number {
  if (amount < 500) return 0.05;
  if (amount < 2000) return 0.04;
  if (amount < 10000) return 0.03;
  if (amount < 50000) return 0.025;
  return 0.02;
}

function subscriptionDiscount(tier: BuyerSubscriptionTier): number {
  switch (tier) {
    case 'TOP':  return 0.01;
    case 'MID':  return 0.005;
    case 'FREE':
    default:     return 0;
  }
}

function volumeDiscount(monthlyVolumeEur: number): number {
  if (monthlyVolumeEur >= 500000) return 0.003;
  if (monthlyVolumeEur >= 100000) return 0.002;
  if (monthlyVolumeEur >= 25000)  return 0.001;
  return 0;
}

export function calcularComision(
  importeBase: number,
  options: CommissionOptions = {},
): CommissionResult {
  // Defensive normalization — never charge commission on negative/NaN amounts.
  const importe = Number.isFinite(importeBase) && importeBase > 0 ? importeBase : 0;

  const porcentajeBase = basePctForAmount(importe);
  const descuentoSuscripcion = subscriptionDiscount(options.subscriptionTier ?? 'FREE');
  const descuentoVolumen = volumeDiscount(options.monthlyVolumeEur ?? 0);

  const porcentajeFinal = Math.max(
    0,
    porcentajeBase - descuentoSuscripcion - descuentoVolumen,
  );

  const comisionAntesCaps = importe * porcentajeFinal;
  // Apply min/max caps. Note: floor only applies if importe > 0 (no commission
  // on zero-value transactions).
  const total = importe > 0
    ? Math.max(MIN_COMMISSION, Math.min(MAX_COMMISSION, comisionAntesCaps))
    : 0;

  return {
    importe,
    porcentajeBase,
    descuentoSuscripcion,
    descuentoVolumen,
    porcentajeFinal,
    comisionAntesCaps: Number(comisionAntesCaps.toFixed(2)),
    total: Number(total.toFixed(2)),
    porcentaje: porcentajeFinal,
  };
}

// Backwards-compat: some old callers still pass a method-of-payment string.
// We accept it but ignore it (the new model has no SEPA discount because
// commission is paid via card by the buyer at contract signing).
export function calcularComisionLegacy(
  importeBase: number,
  _metodoPago: 'card' | 'sepa_debit' = 'card',
  descuentoPlanLegacyPct = 0,
): { importe: number; porcentaje: number; total: number } {
  const tier: BuyerSubscriptionTier =
    descuentoPlanLegacyPct >= 0.01 ? 'TOP' :
    descuentoPlanLegacyPct >= 0.005 ? 'MID' : 'FREE';
  const r = calcularComision(importeBase, { subscriptionTier: tier });
  return { importe: r.importe, porcentaje: r.porcentajeFinal, total: r.total };
}
