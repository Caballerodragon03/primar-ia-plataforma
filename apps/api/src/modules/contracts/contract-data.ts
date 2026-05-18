/**
 * Builder for the comprehensive contract data structure.
 *
 * One source of truth: takes a matchId, loads everything needed to render a
 * legally complete contract (PDF), and returns a `ContractData` record. The
 * PDF generator stays pure and is fed this record.
 */
import { prisma } from '@primaria/database';
import { AppError } from '../../middleware/error.middleware.js';
import {
  calcularComision,
  type BuyerSubscriptionTier,
  type Incoterm,
  type LogisticaPreferencia,
  type TerminoPago,
  LOGISTICA_LABELS,
  TERMINO_PAGO_LABELS,
} from '@primaria/shared';

export interface ContractParty {
  // Visible legal identifiers
  razonSocial: string;
  cifNif: string;
  formaJuridica: string | null;
  direccionFiscal: string;
  ciudad: string | null;
  codigoPostal: string | null;
  pais: string;
  // Persona de contacto
  personaContactoLegal: string;
  cargoContactoLegal: string;
  email: string;
  telefono: string | null;
}

export interface ContractSellerParty extends ContractParty {
  // Datos bancarios + fiscales — sólo el vendedor los expone.
  iban: string | null;
  swiftBic: string | null;
  regimenFiscalLabel: string; // human-readable
  regimenFiscalCode: string;  // raw enum value for downstream logic
}

export interface ContractCalibre {
  calibre: string;
  cantidadKg: number;
  precioKg: number;
  subtotal: number;
}

export interface ContractCommission {
  base: number;             // precio total mercancía
  porcentajeFinal: number;  // 0.025 → 2.5%
  importe: number;          // commission in EUR (sin IVA)
  iva: number;              // IVA over commission (21%)
  totalConIva: number;
  notas: string;            // "tras descuentos por plan y volumen"
}

export interface ContractData {
  // Metadata
  matchId: string;
  reference: string;            // human-readable, e.g. CON-2026-XXXXX
  fechaGeneracion: Date;
  esFinal: boolean;             // true once both signed + commission paid
  // Partes
  vendedor: ContractSellerParty;
  comprador: ContractParty;
  // Objeto
  productoNombre: string;
  variedadNombre: string | null;
  calibres: ContractCalibre[];
  cantidadTotalKg: number;
  precioTotalMercancia: number;
  // Logística + términos
  incoterm: Incoterm;
  incotermDescripcion: string;
  logistica: LogisticaPreferencia;
  logisticaLabel: string;
  terminoPago: TerminoPago;
  terminoPagoLabel: string;
  diasVencimiento: number;       // 0 | 30 | 60
  fechaEntrega: Date;
  // Dirección de recogida (origen) y destino (si aplica)
  origenDireccion: string;
  destinoDireccion: string | null;
  // Comisión Primar-IA (informativa, la paga el comprador por separado)
  comision: ContractCommission;
  // Firmas (vacías hasta que se firmen)
  firmaVendedor: { firma: string | null; fecha: Date | null };
  firmaComprador: { firma: string | null; fecha: Date | null };
  // Vencimiento del pago del comprador al vendedor (calculado)
  fechaVencimientoPagoVendedor: Date;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const REGIMEN_FISCAL_LABELS: Record<string, string> = {
  GENERAL: 'Régimen general (IVA 21%, sin retención)',
  AGRARIO: 'Régimen especial agrario (IVA reducido, IRPF 2%)',
  RECARGO_EQUIVALENCIA: 'Recargo de equivalencia',
  EXENTO: 'Exento (intracomunitario / exportación)',
};

const INCOTERM_DESCRIPCIONES: Record<string, string> = {
  EXW: 'Ex Works — El comprador retira la mercancía en el almacén del vendedor.',
  FCA: 'Free Carrier — El vendedor entrega la mercancía al transportista del comprador en el punto acordado.',
  CPT: 'Carriage Paid To — El vendedor paga el transporte hasta destino; el riesgo se transfiere al cargar.',
  CIP: 'Carriage and Insurance Paid — Como CPT pero el vendedor también contrata seguro mínimo del 110%.',
  DAP: 'Delivered at Place — El vendedor entrega en el lugar acordado del comprador; el comprador descarga.',
  DPU: 'Delivered at Place Unloaded — Como DAP pero el vendedor también descarga en destino.',
  DDP: 'Delivered Duty Paid — Máxima responsabilidad del vendedor, incluye aduanas e impuestos de importación.',
  FOB: 'Free On Board (marítimo) — El vendedor entrega a bordo del buque en el puerto de origen.',
  CIF: 'Cost Insurance Freight (marítimo) — El vendedor paga flete y seguro hasta el puerto destino.',
  CFR: 'Cost and Freight (marítimo) — El vendedor paga el flete pero no el seguro.',
  FAS: 'Free Alongside Ship (marítimo) — Entrega al costado del buque en puerto origen.',
  DAT: 'Delivered at Terminal — Entrega en terminal de transporte; el vendedor es responsable hasta la descarga.',
};

function diasFromTerminoPago(tp: TerminoPago): number {
  switch (tp) {
    case 'INMEDIATO': return 0;
    case 'DIAS_30':   return 30;
    case 'DIAS_60':   return 60;
  }
}

function deriveSubscriptionTier(planComprador: string | null | undefined): BuyerSubscriptionTier {
  if (planComprador === 'CENTRAL') return 'TOP';
  if (planComprador === 'LONJA')   return 'MID';
  return 'FREE';
}

/**
 * Computes the buyer's last-30-days confirmed-platform volume (only matches
 * with estado CONFIRMADO are counted, matching the commission-tier policy).
 */
async function getBuyerMonthlyVolumeEur(buyerId: string): Promise<number> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const agg = await prisma.transaccion.aggregate({
    where: {
      compradorId: buyerId,
      estado: 'COMPLETADO',
      updatedAt: { gte: since },
    },
    _sum: { precioTotal: true },
  });
  return Number(agg._sum.precioTotal ?? 0);
}

interface CalibreInputRaw {
  calibre: string;
  cantidad_kg: number;
  precio_kg?: number;
  precio_min_kg?: number;
}

/**
 * Loads everything needed to render a contract for the given match, AND
 * computes the commission snapshot. Validates that the seller has IBAN
 * (mandatory under the new model). Selects the most conservative agreed
 * payment term from the intersection of seller and buyer accepted terms.
 */
export async function buildContractData(matchId: string, opts: { esFinal?: boolean } = {}): Promise<ContractData> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      lote: {
        include: {
          producto: true,
          variedad: true,
          vendedor: { include: { empresa: true } },
        },
      },
      pedido: {
        include: {
          producto: true,
          variedad: true,
          comprador: {
            include: {
              empresa: true,
              suscripcion: { select: { planComprador: true, estado: true } },
            },
          },
        },
      },
      transaccion: true,
    },
  });
  if (!match) throw new AppError('Match no encontrado', 404);

  const vendedorEmpresa = match.lote.vendedor.empresa;
  if (!vendedorEmpresa) {
    throw new AppError('El vendedor no tiene datos fiscales registrados', 400);
  }
  if (!vendedorEmpresa.iban) {
    throw new AppError(
      'El vendedor no tiene IBAN registrado. Contacta con Primar-IA para añadirlo antes de generar el contrato.',
      400,
    );
  }
  const compradorEmpresa = match.pedido.comprador.empresa;
  if (!compradorEmpresa) {
    throw new AppError('El comprador no tiene datos fiscales registrados', 400);
  }

  // Calibres — viene de match.calibresJson (snapshot al crear el match) o
  // del lote como fallback.
  const rawCalibres = ((match.calibresJson as unknown) as CalibreInputRaw[]) ?? [];
  const precioKgFinal = Number(match.precioKgFinal ?? match.precioKg);
  const calibres: ContractCalibre[] = rawCalibres.map((c) => ({
    calibre: c.calibre,
    cantidadKg: Number(c.cantidad_kg),
    precioKg: Number(c.precio_kg ?? precioKgFinal),
    subtotal: Number(c.cantidad_kg) * Number(c.precio_kg ?? precioKgFinal),
  }));
  const cantidadTotalKg = calibres.reduce((s, c) => s + c.cantidadKg, 0);
  const precioTotalMercancia = calibres.reduce((s, c) => s + c.subtotal, 0);

  // Incoterm y logística finales — si no se han negociado, hereda del pedido.
  const incoterm = (match.incotermFinal ?? match.pedido.incoterm) as Incoterm;
  const logistica = (match.logisticaFinal ?? match.lote.logistica ?? 'INDIFERENTE') as LogisticaPreferencia;

  // Término de pago — intersección lote ∩ pedido, eligiendo el MÁS rápido
  // (más conservador) en caso de empate.
  const sellerAccepted = ((match.lote.terminosPagoAceptados as unknown) as TerminoPago[]) ?? ['INMEDIATO'];
  const buyerAccepted = ((match.pedido.terminosPagoAceptados as unknown) as TerminoPago[]) ?? ['INMEDIATO'];
  const intersection = sellerAccepted.filter((tp) => buyerAccepted.includes(tp));
  const order: TerminoPago[] = ['INMEDIATO', 'DIAS_30', 'DIAS_60'];
  const terminoPago: TerminoPago = (match.terminoPagoFinal as TerminoPago)
    ?? order.find((tp) => intersection.includes(tp))
    ?? 'INMEDIATO';
  const diasVencimiento = diasFromTerminoPago(terminoPago);

  // Fecha de vencimiento del pago = fechaEntrega + días.
  const fechaEntrega = match.pedido.fechaEntregaDeseada;
  const fechaVencimientoPagoVendedor = new Date(fechaEntrega);
  fechaVencimientoPagoVendedor.setDate(fechaVencimientoPagoVendedor.getDate() + diasVencimiento);

  // Comisión: necesita el plan + volumen del comprador.
  const buyerSub = match.pedido.comprador.suscripcion;
  const tier = (buyerSub?.estado === 'ACTIVA' || buyerSub?.estado === 'TRIAL')
    ? deriveSubscriptionTier(buyerSub.planComprador)
    : 'FREE';
  const monthlyVolume = await getBuyerMonthlyVolumeEur(match.pedido.compradorId);
  const commissionResult = calcularComision(precioTotalMercancia, {
    subscriptionTier: tier,
    monthlyVolumeEur: monthlyVolume,
  });
  const importeIva = commissionResult.total * 0.21;
  const tierNotas = tier === 'TOP' ? '−1,0pp por plan CENTRAL'
                  : tier === 'MID' ? '−0,5pp por plan LONJA'
                  : '';
  const volNotas = monthlyVolume >= 500000 ? '−0,3pp por volumen >€500k/mes'
                  : monthlyVolume >= 100000 ? '−0,2pp por volumen €100-500k/mes'
                  : monthlyVolume >= 25000 ? '−0,1pp por volumen €25-100k/mes'
                  : '';
  const notasComision = [tierNotas, volNotas].filter(Boolean).join('; ') || 'Tarifa base sin descuentos';

  const sellerEmail = match.lote.vendedor.email;
  const buyerEmail = match.pedido.comprador.email;

  // Build the result.
  return {
    matchId: match.id,
    reference: `CON-${match.createdAt.getFullYear()}-${match.id.slice(-6).toUpperCase()}`,
    fechaGeneracion: new Date(),
    esFinal: opts.esFinal ?? false,
    vendedor: {
      razonSocial: vendedorEmpresa.razonSocial,
      cifNif: vendedorEmpresa.cifNif,
      formaJuridica: vendedorEmpresa.formaJuridica,
      direccionFiscal: vendedorEmpresa.direccionFiscal,
      ciudad: vendedorEmpresa.ciudad,
      codigoPostal: vendedorEmpresa.codigoPostal,
      pais: vendedorEmpresa.pais,
      personaContactoLegal: vendedorEmpresa.personaContactoLegal,
      cargoContactoLegal: vendedorEmpresa.cargoContactoLegal,
      email: sellerEmail,
      telefono: match.lote.vendedor.telefono,
      iban: vendedorEmpresa.iban,
      swiftBic: vendedorEmpresa.swiftBic,
      regimenFiscalCode: vendedorEmpresa.regimenFiscal,
      regimenFiscalLabel: REGIMEN_FISCAL_LABELS[vendedorEmpresa.regimenFiscal] ?? vendedorEmpresa.regimenFiscal,
    },
    comprador: {
      razonSocial: compradorEmpresa.razonSocial,
      cifNif: compradorEmpresa.cifNif,
      formaJuridica: compradorEmpresa.formaJuridica,
      direccionFiscal: compradorEmpresa.direccionFiscal,
      ciudad: compradorEmpresa.ciudad,
      codigoPostal: compradorEmpresa.codigoPostal,
      pais: compradorEmpresa.pais,
      personaContactoLegal: compradorEmpresa.personaContactoLegal,
      cargoContactoLegal: compradorEmpresa.cargoContactoLegal,
      email: buyerEmail,
      telefono: match.pedido.comprador.telefono,
    },
    productoNombre: match.lote.producto?.nombre ?? 'N/D',
    variedadNombre: match.lote.variedad?.nombre ?? match.pedido.variedad?.nombre ?? null,
    calibres,
    cantidadTotalKg,
    precioTotalMercancia,
    incoterm,
    incotermDescripcion: INCOTERM_DESCRIPCIONES[incoterm] ?? incoterm,
    logistica,
    logisticaLabel: LOGISTICA_LABELS[logistica],
    terminoPago,
    terminoPagoLabel: TERMINO_PAGO_LABELS[terminoPago],
    diasVencimiento,
    fechaEntrega,
    origenDireccion: match.lote.direccionRecogida,
    destinoDireccion: match.pedido.destinoFinal,
    comision: {
      base: precioTotalMercancia,
      porcentajeFinal: commissionResult.porcentajeFinal,
      importe: commissionResult.total,
      iva: Number(importeIva.toFixed(2)),
      totalConIva: Number((commissionResult.total + importeIva).toFixed(2)),
      notas: notasComision,
    },
    firmaVendedor: {
      firma: match.transaccion?.firmaVendedor ?? null,
      fecha: match.transaccion?.firmaVendedorFecha ?? null,
    },
    firmaComprador: {
      firma: match.transaccion?.firmaComprador ?? null,
      fecha: match.transaccion?.firmaCompradorFecha ?? null,
    },
    fechaVencimientoPagoVendedor,
  };
}
