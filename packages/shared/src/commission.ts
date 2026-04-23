/**
 * Calculates Primar-IA platform commission (OneScale model).
 * Only the BUYER pays commission.
 *
 * Tiers:
 * <= 2,000EUR       -> 4.0%
 * 2,000-10,000EUR   -> 3.0%
 * 10,000-50,000EUR  -> 2.2% (min 49EUR / max 2,500EUR)
 * > 50,000EUR       -> 2.0%
 *
 * SEPA Direct Debit discount: -0.4pp
 */
export function calcularComision(
  importeBase: number,
  metodoPago: 'card' | 'sepa_debit' = 'card'
): {
  importe: number;
  porcentaje: number;
  total: number;
} {
  let pct: number;

  if (importeBase <= 2000) {
    pct = 0.04;
  } else if (importeBase <= 10000) {
    pct = 0.03;
  } else if (importeBase <= 50000) {
    pct = 0.022;
  } else {
    pct = 0.02;
  }

  if (metodoPago === 'sepa_debit') {
    pct = Math.max(0, pct - 0.004);
  }

  let comision = importeBase * pct;

  // Min/max caps for the 10k-50k tier
  if (importeBase > 10000 && importeBase <= 50000) {
    comision = Math.min(Math.max(comision, 49), 2500);
  }

  return {
    importe: importeBase,
    porcentaje: pct,
    total: Number(comision.toFixed(2)),
  };
}
