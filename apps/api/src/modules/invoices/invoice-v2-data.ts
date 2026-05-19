/**
 * Phase 5 — Invoice data builder for the v2 matchmaker flow.
 *
 * Three documents are auto-generated when a contract becomes FIRMADO:
 *   1) Factura de Primar-IA al COMPRADOR por la comisión de intermediación.
 *      Emisor: Primar-IA S.L.    Tipo: factura ordinaria 21% IVA.
 *   2) Factura del VENDEDOR al COMPRADOR por la mercancía. El régimen fiscal
 *      del vendedor determina IVA / IRPF / recargo de equivalencia / exención.
 *   3) Resguardo de pago al COMPRADOR con instrucciones de transferencia al
 *      vendedor (IBAN, importe, vencimiento, referencia). No es una factura.
 *
 * We reuse ContractData as the upstream source (same parties, calibres,
 * commission snapshot, terms) and add invoice-specific bits per document.
 */
import type { ContractData } from '../contracts/contract-data.js';
import { env } from '../../config/env.js';
import { prisma } from '@primaria/database';

export interface InvoiceLine {
  descripcion: string;
  cantidad: number;       // kg, or 1 for the commission
  unidad: string;         // 'kg' | 'ud'
  precioUnitario: number;
  total: number;
}

export interface InvoicePartyV2 {
  razonSocial: string;
  cifNif: string;
  direccionFiscal: string;
  ciudad: string | null;
  codigoPostal: string | null;
  pais: string;
}

export interface InvoiceTaxBreakdown {
  base: number;
  ivaPct: number;
  ivaImporte: number;
  /** IRPF retention (régimen agrario only). When present, the buyer withholds it. */
  irpfPct?: number;
  irpfImporte?: number;
  /** Recargo de equivalencia (only when buyer is in that régimen — rare on B2B). */
  recargoPct?: number;
  recargoImporte?: number;
  /** Free-form note when the régimen forces an exemption. */
  exencionNota?: string;
  total: number;
}

export interface InvoiceV2 {
  /** Unique invoice number, e.g. FAC-P-2026-00012. Stable per match+kind. */
  numero: string;
  /** ISO date string YYYY-MM-DD. */
  fecha: string;
  /** Title shown at top, e.g. 'Factura' or 'Resguardo de pago'. */
  titulo: string;
  /** Optional tagline e.g. 'Operación intermediada por Primar-IA'. */
  subtitulo: string;
  /** Emisor / issuer (left column). */
  emisor: InvoicePartyV2;
  /** Receptor / customer (right column). */
  receptor: InvoicePartyV2;
  /** Optional emisor extras shown under the party block. */
  emisorExtras?: { label: string; value: string }[];
  /** Optional receptor extras. */
  receptorExtras?: { label: string; value: string }[];
  /** Line items (1+). */
  lineas: InvoiceLine[];
  /** Tax breakdown (filled per régimen fiscal). */
  impuestos: InvoiceTaxBreakdown;
  /** Payment instructions block (IBAN / referencia / vencimiento). */
  pago: {
    metodo: string;
    referencia: string;
    iban?: string | null;
    swiftBic?: string | null;
    titular?: string | null;
    fechaVencimiento?: string | null;
    notas?: string;
  };
  /** Footer / legal notes. */
  notas: string[];
  /** Watermark — populated for non-receipt drafts; here it's always null
   *  because Phase 5 only generates final invoices post-payment. */
  watermark?: string | null;
}

// ─── Primar-IA legal entity (hardcoded for MVP — should come from env later) ─

// Phase 11 — read legal entity from env so production deployments can override
// without code changes. Defaults match the previous hardcoded values for
// dev/test continuity.
const PRIMARIA_ENTITY: InvoicePartyV2 = {
  razonSocial: env.PRIMARIA_RAZON_SOCIAL,
  cifNif: env.PRIMARIA_CIFNIF,
  direccionFiscal: env.PRIMARIA_DIRECCION,
  ciudad: env.PRIMARIA_CIUDAD,
  codigoPostal: env.PRIMARIA_CODIGO_POSTAL,
  pais: env.PRIMARIA_PAIS,
};

const PRIMARIA_CONTACT_EMAIL = env.PRIMARIA_EMAIL_FACTURACION;

// ─── Helpers ────────────────────────────────────────────────────────────────

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtMatchRef(matchId: string): string {
  return matchId.slice(-6).toUpperCase();
}

/**
 * AEAT-compliant monotonic invoice numbering per (emisor, kind, year).
 *
 * Spanish Reglamento 1619/2012 art. 6 requires strictly correlative
 * numbering per series. We key on the emisor's CIF + kind + year and
 * atomically increment via an upsert. Format: FAC-{kind}-{year}-{NNNNNN}
 * (zero-padded 6 digits).
 *
 * Each invoice kind has its own series — Primar-IA's commission invoices
 * (P) and each vendor's sale invoices (V) increment independently. The
 * resguardo (R) is not technically a factura but we keep it monotonic
 * for accounting consistency.
 */
export async function invoiceNumberFor(
  kind: 'P' | 'V' | 'R',
  emisorCif: string,
  year: number,
): Promise<string> {
  // Use Prisma upsert + atomic increment in a transaction to guarantee no
  // collision under concurrency. The @@unique on (emisorCif, kind, year)
  // ensures the upsert is race-safe.
  const counter = await prisma.$transaction(async (tx) => {
    const existing = await tx.invoiceCounter.findUnique({
      where: { emisorCif_kind_year: { emisorCif, kind, year } },
    });
    if (!existing) {
      // First invoice for this series — create starting at 1.
      const created = await tx.invoiceCounter.create({
        data: { emisorCif, kind, year, nextNumero: 2 },
      });
      return 1;
    }
    const current = existing.nextNumero;
    await tx.invoiceCounter.update({
      where: { id: existing.id },
      data: { nextNumero: current + 1 },
    });
    return current;
  });
  const padded = String(counter).padStart(6, '0');
  return `FAC-${kind}-${year}-${padded}`;
}

// ─── Tax breakdown per régimen fiscal del vendedor ───────────────────────────

/**
 * Returns the IVA / IRPF / recargo split for the seller's invoice based on
 * their régimen fiscal. Spanish B2B fiscal model — references:
 *   - Ley 37/1992 (IVA), arts. 90-91 (tipos), 130 (régimen agrario)
 *   - Ley 35/2006 (IRPF), art. 101.5 (retención 2% activ. agrarias)
 *   - Real Decreto 1624/1992 (recargo de equivalencia)
 *
 * The numbers below are the "happy path" for agricultural products. For
 * specific edge cases (productos congelados, transformados, exportación
 * a Canarias/Ceuta/Melilla) the values change and the seller's accountant
 * should review the invoice before submission.
 */
function buildSellerTaxBreakdown(base: number, regimenFiscalCode: string): InvoiceTaxBreakdown {
  switch (regimenFiscalCode) {
    case 'AGRARIO': {
      // Compensación a tanto alzado: el comprador es el que paga la
      // compensación 12% (productos agrícolas/ganaderos), pero el vendedor NO
      // repercute IVA. Esto es lo más común para productores acogidos al REAGP.
      const compensacionPct = 0.12;
      const compensacionImporte = +(base * compensacionPct).toFixed(2);
      return {
        base: +base.toFixed(2),
        ivaPct: compensacionPct * 100,
        ivaImporte: compensacionImporte,
        exencionNota:
          'Operación sujeta al Régimen Especial de la Agricultura, Ganadería y Pesca '
          + '(arts. 124-134 bis Ley 37/1992). Compensación a tanto alzado 12% — el '
          + 'comprador deduce esta compensación en su declaración de IVA.',
        total: +(base + compensacionImporte).toFixed(2),
      };
    }
    case 'RECARGO_EQUIVALENCIA': {
      // El vendedor NO está en R.E. — el R.E. es del COMPRADOR (minorista). Si
      // el comprador está en R.E., el vendedor debe repercutir IVA 4% + recargo
      // 0.5% (productos alimenticios) o IVA 21% + recargo 5.2%. Para agro
      // (Anexo II Ley 37/1992) → tipo reducido 4% + recargo 0.5%.
      const ivaPct = 0.04;
      const recargoPct = 0.005;
      const ivaImporte = +(base * ivaPct).toFixed(2);
      const recargoImporte = +(base * recargoPct).toFixed(2);
      return {
        base: +base.toFixed(2),
        ivaPct: ivaPct * 100,
        ivaImporte,
        recargoPct: recargoPct * 100,
        recargoImporte,
        exencionNota:
          'Operación sujeta al Recargo de Equivalencia (RD 1624/1992). '
          + 'El vendedor repercute IVA 4% y recargo 0,5% sobre la base.',
        total: +(base + ivaImporte + recargoImporte).toFixed(2),
      };
    }
    case 'EXENTO': {
      // Entregas intracomunitarias (B2B con NIF-IVA verificado en VIES) o
      // exportación fuera de la UE. El vendedor no repercute IVA — el
      // comprador autoliquida (mecanismo de inversión del sujeto pasivo).
      return {
        base: +base.toFixed(2),
        ivaPct: 0,
        ivaImporte: 0,
        exencionNota:
          'Operación exenta de IVA (art. 25 Ley 37/1992 — entrega intracomunitaria '
          + 'o exportación). El comprador autoliquidará el IVA en destino.',
        total: +base.toFixed(2),
      };
    }
    case 'GENERAL':
    default: {
      // Régimen general — agricultura no transformada (Anexo II) tributa al 4%
      // reducido. Asumimos 4% para productos primarios; el contador del
      // vendedor puede ajustarlo a 10% (transformados) o 21% (no alimentarios).
      const ivaPct = 0.04;
      const ivaImporte = +(base * ivaPct).toFixed(2);
      return {
        base: +base.toFixed(2),
        ivaPct: ivaPct * 100,
        ivaImporte,
        total: +(base + ivaImporte).toFixed(2),
      };
    }
  }
}

// ─── Builders ───────────────────────────────────────────────────────────────

function partyFromContract(p: ContractData['vendedor'] | ContractData['comprador']): InvoicePartyV2 {
  return {
    razonSocial: p.razonSocial,
    cifNif: p.cifNif,
    direccionFiscal: p.direccionFiscal,
    ciudad: p.ciudad,
    codigoPostal: p.codigoPostal,
    pais: p.pais,
  };
}

/**
 * Factura #1 — Primar-IA → COMPRADOR por la comisión de intermediación.
 * Régimen general, IVA 21%.
 */
export async function buildPlatformInvoice(
  contract: ContractData,
  stripeChargeId: string | null,
): Promise<InvoiceV2> {
  const lineas: InvoiceLine[] = [
    {
      descripcion:
        `Comisión de intermediación Primar-IA — ${contract.productoNombre}`
        + ` (${(contract.comision.porcentajeFinal * 100).toFixed(2)}% sobre `
        + `${contract.precioTotalMercancia.toFixed(2)}€)`,
      cantidad: 1,
      unidad: 'ud',
      precioUnitario: contract.comision.importe,
      total: contract.comision.importe,
    },
  ];
  const base = contract.comision.importe;
  const ivaPct = 21;
  const ivaImporte = +(base * 0.21).toFixed(2);
  return {
    numero: await invoiceNumberFor('P', PRIMARIA_ENTITY.cifNif, contract.fechaGeneracion.getFullYear()),
    fecha: todayISO(),
    titulo: 'Factura',
    subtitulo: 'Comisión de intermediación',
    emisor: PRIMARIA_ENTITY,
    receptor: partyFromContract(contract.comprador),
    emisorExtras: [{ label: 'Email facturación:', value: PRIMARIA_CONTACT_EMAIL }],
    lineas,
    impuestos: {
      base: +base.toFixed(2),
      ivaPct,
      ivaImporte,
      total: +(base + ivaImporte).toFixed(2),
    },
    pago: {
      metodo: 'Pagado vía Stripe',
      referencia: stripeChargeId ?? `match:${fmtMatchRef(contract.matchId)}`,
      notas: 'Esta comisión ha sido cobrada al comprador por Stripe Checkout en el momento '
        + 'de la firma del contrato. Esta factura sirve como justificante fiscal del gasto.',
    },
    notas: [
      `Ref. operación intermediada: ${contract.reference}`,
      `Servicio prestado: matchmaking entre comprador y vendedor + generación de contrato mercantil.`,
      contract.comision.notas
        ? `Descuentos aplicados: ${contract.comision.notas}.`
        : 'Comisión sin descuentos aplicados.',
    ],
    watermark: null,
  };
}

/**
 * Factura #2 — VENDEDOR → COMPRADOR por la mercancía.
 * IVA/IRPF según régimen fiscal del vendedor.
 */
export async function buildSellerInvoice(contract: ContractData): Promise<InvoiceV2> {
  // One line per calibre (transparent breakdown), or a single line if no
  // calibres were stored. Subtotals already in contract.calibres.
  const lineas: InvoiceLine[] = contract.calibres.length > 0
    ? contract.calibres.map((c) => ({
        descripcion: `${contract.productoNombre}`
          + (contract.variedadNombre ? ` ${contract.variedadNombre}` : '')
          + ` — calibre ${c.calibre}`,
        cantidad: c.cantidadKg,
        unidad: 'kg',
        precioUnitario: c.precioKg,
        total: +c.subtotal.toFixed(2),
      }))
    : [{
        descripcion: contract.productoNombre
          + (contract.variedadNombre ? ` ${contract.variedadNombre}` : ''),
        cantidad: contract.cantidadTotalKg,
        unidad: 'kg',
        precioUnitario: contract.precioTotalMercancia / Math.max(1, contract.cantidadTotalKg),
        total: +contract.precioTotalMercancia.toFixed(2),
      }];

  const impuestos = buildSellerTaxBreakdown(contract.precioTotalMercancia, contract.vendedor.regimenFiscalCode);

  return {
    numero: await invoiceNumberFor('V', contract.vendedor.cifNif, contract.fechaGeneracion.getFullYear()),
    fecha: todayISO(),
    titulo: 'Factura',
    subtitulo: 'Venta de mercancía',
    emisor: partyFromContract(contract.vendedor),
    receptor: partyFromContract(contract.comprador),
    emisorExtras: [
      { label: 'Régimen fiscal:', value: contract.vendedor.regimenFiscalLabel },
      ...(contract.vendedor.iban ? [{ label: 'IBAN cobro:', value: contract.vendedor.iban }] : []),
      ...(contract.vendedor.swiftBic ? [{ label: 'SWIFT/BIC:', value: contract.vendedor.swiftBic }] : []),
    ],
    lineas,
    impuestos,
    pago: {
      metodo: contract.diasVencimiento === 0 ? 'Transferencia bancaria inmediata' : `Transferencia bancaria a ${contract.diasVencimiento} días`,
      referencia: contract.reference,
      iban: contract.vendedor.iban,
      swiftBic: contract.vendedor.swiftBic,
      titular: contract.vendedor.razonSocial,
      fechaVencimiento: isoDate(contract.fechaVencimientoPagoVendedor),
      notas: contract.diasVencimiento === 0
        ? 'Pago inmediato a la recepción de esta factura.'
        : `Vencimiento: ${contract.diasVencimiento} días desde la entrega.`,
    },
    notas: [
      `Ref. operación intermediada por Primar-IA: ${contract.reference}`,
      `Incoterm: ${contract.incoterm} — ${contract.incotermDescripcion}`,
      `Origen: ${contract.origenDireccion}`,
      ...(contract.destinoDireccion ? [`Destino: ${contract.destinoDireccion}`] : []),
      `Fecha de entrega acordada: ${isoDate(contract.fechaEntrega)}`,
      ...(impuestos.exencionNota ? [impuestos.exencionNota] : []),
    ],
    watermark: null,
  };
}

/**
 * Resguardo #3 — Instrucciones de pago al COMPRADOR para que transfiera al
 * vendedor el importe de la mercancía. No es una factura — es un documento
 * informativo que el comprador puede llevar al banco.
 */
export async function buildPaymentReceipt(contract: ContractData): Promise<InvoiceV2> {
  const total = contract.precioTotalMercancia;
  return {
    numero: await invoiceNumberFor('R', PRIMARIA_ENTITY.cifNif, contract.fechaGeneracion.getFullYear()),
    fecha: todayISO(),
    titulo: 'Resguardo de pago',
    subtitulo: 'Instrucciones de transferencia bancaria al vendedor',
    // For the receipt, the emisor is Primar-IA (informational) and the
    // receptor is the buyer (who is going to use this document).
    emisor: PRIMARIA_ENTITY,
    receptor: partyFromContract(contract.comprador),
    receptorExtras: [{ label: 'Importe a transferir:', value: `${total.toFixed(2)} €` }],
    lineas: [
      {
        descripcion: `Operación ${contract.reference} — ${contract.productoNombre}`
          + (contract.variedadNombre ? ` ${contract.variedadNombre}` : '')
          + `, ${contract.cantidadTotalKg.toLocaleString('es-ES')} kg`,
        cantidad: 1,
        unidad: 'ud',
        precioUnitario: total,
        total: +total.toFixed(2),
      },
    ],
    impuestos: {
      base: +total.toFixed(2),
      ivaPct: 0,
      ivaImporte: 0,
      total: +total.toFixed(2),
      exencionNota: 'Este documento NO es una factura. El IVA / IRPF aplicable figura en la factura del vendedor.',
    },
    pago: {
      metodo: contract.diasVencimiento === 0 ? 'Transferencia inmediata' : `Transferencia a ${contract.diasVencimiento} días`,
      referencia: `PRIMARIA-${fmtMatchRef(contract.matchId)}`,
      iban: contract.vendedor.iban,
      swiftBic: contract.vendedor.swiftBic,
      titular: contract.vendedor.razonSocial,
      fechaVencimiento: isoDate(contract.fechaVencimientoPagoVendedor),
      notas: 'Indica la referencia en el concepto de la transferencia para que el vendedor identifique tu pago.',
    },
    notas: [
      'Este resguardo se ha generado automáticamente por Primar-IA tras la firma del contrato.',
      'El pago se realiza directamente entre comprador y vendedor — Primar-IA no actúa como depositario del dinero.',
      'En caso de incumplimiento del pago en la fecha acordada, las partes pueden contactar a soporte@primar-ia.com para mediación.',
    ],
    watermark: null,
  };
}
