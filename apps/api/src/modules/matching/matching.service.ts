import { prisma } from '@primaria/database';
import type { Lote, Pedido, Match, LoteEstado, TransaccionEstado, MatchEstado } from '@primaria/database';
import { AppError } from '../../middleware/error.middleware.js';
import type { ContributeInput } from './matching.schema.js';
import { sendMatchProposalEmail } from '../../shared/emails/transactional.js';
import { sendPushToUser } from '../push/push.service.js';
import { calcularComision } from '@primaria/shared';
import { PLAN_LIMITS } from '../subscriptions/subscription.constants.js';

// ─── Local types ──────────────────────────────────────────────────────────────

type LoteCalibre = { calibre: string; cantidad_kg: number; precio_min_kg: number };
type PedidoCalibre = { calibre: string; cantidad_kg: number; precio_max_kg: number };
type ContribucionCalibre = { calibre: string; cantidad_kg: number; incoterm?: string };

// Vendedor fields required for scoring (joined via lote.vendedor)
type VendedorScoring = {
  scoreFiabilidad: { toNumber(): number } | null;
  scoreStatus: 'NEW_USER' | 'ACTIVE' | 'RESTRICTED';
  transaccionesOk: number;
  transaccionesIncid: number;
};

export type MatchWithScore = Match & {
  indiceRentabilidad: number;
  pedido: {
    id: string;
    productoId: string;
    variedadId: string | null;
    calibresSolicitados: unknown;
    fechaEntregaDeseada: Date;
    estado: string;
    comprador: {
      id: string;
      nombre: string;
      apellidos: string;
      empresa: { razonSocial: string } | null;
    };
  };
};

// ─── Haversine ────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Scoring helpers ──────────────────────────────────────────────────────────

function toLoteCalibre(raw: unknown): LoteCalibre[] {
  return (raw as LoteCalibre[]) ?? [];
}

function toPedidoCalibre(raw: unknown): PedidoCalibre[] {
  return (raw as PedidoCalibre[]) ?? [];
}

function isUncalibratedLot(loteCalibres: LoteCalibre[]): boolean {
  return loteCalibres.length === 1 && loteCalibres[0]?.calibre === 'UNCALIBRATED';
}

// Phase 14M v3.31 — equivalente para pedidos. Un pedido "sin calibrar" es un
// comprador que acepta cualquier calibre (un solo bucket con sentinel
// UNCALIBRATED). Las reglas de matching tratan asimétricamente lote↔pedido
// sin calibrar (ver meetsHardCriteria).
function isUncalibratedPedido(pedidoCalibres: PedidoCalibre[]): boolean {
  return pedidoCalibres.length === 1 && pedidoCalibres[0]?.calibre === 'UNCALIBRATED';
}

/**
 * Rentabilidad: precio ofrecido por el vendedor vs. precio máximo del comprador.
 * Rango: 0–1. Lotes sin calibrar → 0.5 (neutro, aparecen después de los calibrados).
 */
function scoreRentabilidad(loteCalibres: LoteCalibre[], pedidoCalibres: PedidoCalibre[]): number {
  if (isUncalibratedLot(loteCalibres)) return 0.5;

  const pares: Array<{ ratio: number; pesoKg: number }> = [];

  for (const lc of loteCalibres) {
    const pc = pedidoCalibres.find((p) => p.calibre === lc.calibre);
    if (!pc || pc.precio_max_kg <= 0) continue;
    // precio_min_kg === 0 means no price floor → seller accepts buyer's price → perfect price fit
    const ratio = lc.precio_min_kg === 0 ? 1.0 : Math.min(lc.precio_min_kg / pc.precio_max_kg, 1.0);
    pares.push({ ratio, pesoKg: lc.cantidad_kg });
  }

  if (pares.length === 0) return 0;

  const totalKg = pares.reduce((s, p) => s + p.pesoKg, 0);
  if (totalKg === 0) return 0;

  return pares.reduce((s, p) => s + p.ratio * (p.pesoKg / totalKg), 0);
}

/**
 * Fiabilidad: basada en el scoreStatus y scoreFiabilidad del vendedor.
 * NEW_USER con pocas transacciones → beneficio de duda 0.75.
 */
function scoreFiabilidad(vendedor: VendedorScoring): number {
  if (
    vendedor.scoreStatus === 'NEW_USER' &&
    vendedor.transaccionesOk + vendedor.transaccionesIncid < 5
  ) {
    return 0.75;
  }
  if (vendedor.scoreFiabilidad === null) {
    return 0.75;
  }
  return vendedor.scoreFiabilidad.toNumber() / 100;
}

/**
 * Proximidad: distancia Haversine entre el lote y el destino del pedido.
 * 0 km → 1.0, 800 km+ → 0.0. Sin coordenadas → 0.5 (neutro).
 */
function scoreProximidad(lote: Lote, pedido: Pedido): number {
  if (lote.coordenadasLat == null || lote.coordenadasLng == null) return 0.5;
  const pedidoWithCoords = pedido as Pedido & { destinoLat?: number | null; destinoLng?: number | null };
  if (pedidoWithCoords.destinoLat == null || pedidoWithCoords.destinoLng == null) return 0.5;

  const distKm = haversineKm(
    lote.coordenadasLat,
    lote.coordenadasLng,
    pedidoWithCoords.destinoLat,
    pedidoWithCoords.destinoLng
  );
  return Math.max(0, 1 - distKm / 800);
}

/**
 * Recencia: lotes creados en los últimos 30 días puntúan más alto.
 */
function scoreRecencia(lote: Lote): number {
  const MAX_DAYS = 30;
  const edadDias = (Date.now() - lote.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  if (edadDias >= MAX_DAYS) return 0;
  return 1 - edadDias / MAX_DAYS;
}

/**
 * Cobertura: qué fracción de los kg solicitados cubre el lote (calibres compatibles).
 * Sin cantidades definidas en el pedido → 0.5 (neutro).
 */
function scoreCobertura(loteCalibres: LoteCalibre[], pedidoCalibres: PedidoCalibre[]): number {
  let totalKgDisponible = 0;
  let totalKgSolicitado = 0;

  for (const pc of pedidoCalibres) {
    if (!pc.cantidad_kg || pc.cantidad_kg <= 0) {
      // Si ningún calibre tiene cantidad definida → neutro
      return 0.5;
    }
    const lc = loteCalibres.find((l) => l.calibre === pc.calibre);
    if (lc) {
      totalKgDisponible += lc.cantidad_kg;
    }
    totalKgSolicitado += pc.cantidad_kg;
  }

  if (totalKgSolicitado === 0) return 0.5;
  return Math.min(totalKgDisponible / totalKgSolicitado, 1.0);
}

/**
 * CertMatch: compatibilidad de certificaciones lote vs. pedido.
 * Pedido no tiene campo cert requerido aún → 1.0 (neutro).
 */
function scoreCertMatch(_lote: Lote, _pedido: Pedido): number {
  // Future: compare lote.certificaciones (JSON string[]) vs pedido required certs
  return 1.0;
}

/**
 * Afinidad: historial de transacciones completadas entre este par de usuarios.
 * Async porque necesita queries a la BD.
 */
async function scoreAfinidad(vendedorId: string, compradorId: string): Promise<number> {
  // Check if there's a dispute resolved against the vendor with this buyer
  const disputaContra = await prisma.disputa.findFirst({
    where: {
      resolucion: 'FAVOR_COMPRADOR',
      transaccion: {
        vendedorId,
        compradorId,
      },
    },
    select: { id: true },
  });

  if (disputaContra) return 0.0;

  // Count completed transactions between this pair (no disputes)
  const completadas = await prisma.transaccion.count({
    where: {
      vendedorId,
      compradorId,
      estado: 'COMPLETADO',
      disputas: { none: {} },
    },
  });

  if (completadas >= 3) return 1.0;
  if (completadas >= 1) return 0.7;
  return 0.5;
}

/**
 * Returns the match visibility delay (in ms) for a single user based on their plan.
 * Free-tier users get a 24h delay; paid plans see matches immediately.
 */
async function getUserMatchDelayMs(userId: string): Promise<number> {
  const sub = await prisma.suscripcion.findUnique({
    where: { userId },
    select: { planVendedor: true, planComprador: true, estado: true },
  });
  const isActive = sub && (sub.estado === 'ACTIVA' || sub.estado === 'TRIAL');
  if (!isActive) {
    // Need user role to pick the right free-tier delay
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role === 'VENDEDOR') return PLAN_LIMITS.COSECHA.matchDelay;
    return (PLAN_LIMITS.MERCADO as { matchDelay: number }).matchDelay ?? 0;
  }
  const planKey = (sub.planVendedor ?? sub.planComprador) as keyof typeof PLAN_LIMITS | null;
  if (!planKey) return PLAN_LIMITS.COSECHA.matchDelay;
  return (PLAN_LIMITS[planKey] as { matchDelay?: number }).matchDelay ?? 0;
}

/**
 * Returns the match visibility delay (in ms) for a match based on BOTH seller and buyer plans.
 * Uses the MAX of both — if either side is free-tier, the match is delayed.
 */
async function getMatchDelayMs(vendedorId: string, compradorId: string): Promise<number> {
  const [vDelay, cDelay] = await Promise.all([
    getUserMatchDelayMs(vendedorId),
    getUserMatchDelayMs(compradorId),
  ]);
  return Math.max(vDelay, cDelay);
}

/**
 * Returns capacity-holding match states. These are matches that have already
 * "reserved" inventory and must be subtracted from available stock when
 * proposing new matches.
 */
const CAPACITY_HOLDING_ESTADOS: MatchEstado[] = ['ACEPTADO_VENDEDOR', 'PENDIENTE_PAGO', 'CONFIRMADO'];

/**
 * Run a transaction with retries on serialization conflicts. Postgres raises
 * SQLSTATE 40001 (serialization_failure) under SERIALIZABLE isolation when
 * two transactions conflict; Prisma surfaces this as P2034 (or a wrapped
 * error containing 40001). Without a retry, concurrent matching runs would
 * surface a 500 to the user instead of just succeeding on the second try.
 */
/**
 * Recompute the lot's estado based on its capacity-holding matches AND the
 * underlying transaction state. The semantic contract:
 *
 *   - ACTIVO              : no capacity-holding matches (or only BORRADOR)
 *   - PARCIALMENTE_VENDIDO: at least one capacity-holding match exists, but
 *                           not all of those matches have a COMPLETADO
 *                           transaccion (i.e. delivery + payment isn't done)
 *   - VENDIDO             : ALL capacity-holding matches have a COMPLETADO
 *                           transaccion AND coverage == 100%
 *
 * Idempotent and safe to call from any flow that touches match/transaccion
 * state (contributeToOrder, capturePayment, dispute resolve).
 *
 * Does NOT disturb terminal CANCELADO state — once cancelled, always cancelled.
 */
export async function recomputeLotState(
  loteId: string,
  client: typeof prisma | Parameters<Parameters<typeof prisma.$transaction>[0]>[0] = prisma,
): Promise<void> {
  const lote = await client.lote.findUnique({
    where: { id: loteId },
    select: {
      id: true,
      estado: true,
      calibres: true,
      matches: {
        where: { estado: { in: CAPACITY_HOLDING_ESTADOS } },
        select: {
          cantidadKg: true,
          transaccion: { select: { estado: true } },
        },
      },
    },
  });
  if (!lote) return;
  if (lote.estado === 'CANCELADO') return; // terminal — don't disturb

  const committedKg = lote.matches.reduce((s, m) => s + Number(m.cantidadKg), 0);
  const totalKg = ((lote.calibres as unknown) as Array<{ cantidad_kg?: number }>)
    .reduce((s, c) => s + Number(c.cantidad_kg ?? 0), 0);

  let nuevoEstado: LoteEstado;
  if (committedKg <= 0) {
    // Never overwrite BORRADOR (drafts) — only nudge from ACTIVO / PARCIALMENTE
    nuevoEstado = lote.estado === 'BORRADOR' ? 'BORRADOR' : 'ACTIVO';
  } else {
    const fullyMatched = totalKg > 0 && committedKg >= totalKg;
    // Phase 14M v3.20 — ENTREGADO también cuenta como "entregado" para
    // pasar el lote a VENDIDO. Antes solo COMPLETADO (legacy v1) cerraba
    // el lote; en el flujo v2 la transaccion va a ENTREGADO tras
    // markReceived y nunca llegaba a COMPLETADO, así que el lote se
    // quedaba en PARCIALMENTE_VENDIDO indefinidamente.
    const allDelivered = lote.matches.length > 0 &&
      lote.matches.every((m) =>
        m.transaccion?.estado === 'COMPLETADO'
        || m.transaccion?.estado === 'ENTREGADO',
      );
    nuevoEstado = (fullyMatched && allDelivered) ? 'VENDIDO' : 'PARCIALMENTE_VENDIDO';
  }

  if (nuevoEstado !== lote.estado) {
    await client.lote.update({ where: { id: loteId }, data: { estado: nuevoEstado } });
  }
}

/**
 * Validate and parse a future ISO date string for deadline-extend endpoints.
 * Rejects invalid dates and dates that are not strictly in the future.
 */
function parseFutureDate(raw: string): Date {
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new AppError('Fecha requerida', 400);
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    throw new AppError('Fecha no válida', 400);
  }
  if (d.getTime() <= Date.now()) {
    throw new AppError('La nueva fecha debe ser futura', 400);
  }
  return d;
}

async function txWithRetry<T>(
  fn: (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => Promise<T>,
  opts: { maxRetries?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const maxRetries = opts.maxRetries ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 25;
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await prisma.$transaction(fn, { isolationLevel: 'Serializable' });
    } catch (err: unknown) {
      lastErr = err;
      const e = err as { code?: string; message?: string };
      const retryable =
        e?.code === 'P2034' ||
        (typeof e?.message === 'string' && /40001|could not serialize/i.test(e.message));
      if (!retryable || attempt === maxRetries - 1) throw err;
      await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, attempt) + Math.random() * 25));
    }
  }
  throw lastErr;
}

interface MatchCalibresJsonEntry {
  calibre: string;
  cantidad_kg: number;
  precio_kg?: number;
  precio_min_kg?: number;
}

function sumCommittedPerCalibre(rawMatches: Array<{ calibresJson: unknown }>): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of rawMatches) {
    const arr = (m.calibresJson as MatchCalibresJsonEntry[]) ?? [];
    for (const c of arr) {
      out.set(c.calibre, (out.get(c.calibre) ?? 0) + Number(c.cantidad_kg ?? 0));
    }
  }
  return out;
}

/**
 * Clamps the proposed match calibres to what's actually available on BOTH sides:
 *   matched_kg(calibre) = min(
 *     lote_calibre_kg  - already_committed_from_lote(calibre),
 *     pedido_calibre_kg - already_committed_from_pedido(calibre),
 *   )
 *
 * Returns the clamped list (calibres with 0 kg removed) and the resulting
 * total. Excludes the current (loteId, pedidoId) pair from commitment sums
 * so re-runs don't double-count the match being upserted.
 */
type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function computeClampedMatchCalibres(
  loteId: string,
  loteCalibres: ReturnType<typeof toLoteCalibre>,
  pedidoId: string,
  pedidoCalibres: ReturnType<typeof toPedidoCalibre>,
  client: PrismaTx | typeof prisma = prisma,
): Promise<{ calibres: ReturnType<typeof toLoteCalibre>; total: number }> {
  // What this lote has already promised in other active matches
  const loteCommittedMatches = await client.match.findMany({
    where: {
      loteId,
      pedidoId: { not: pedidoId },
      estado: { in: CAPACITY_HOLDING_ESTADOS },
    },
    select: { calibresJson: true },
  });
  const loteCommitted = sumCommittedPerCalibre(loteCommittedMatches);

  // What this pedido has already covered from other active matches
  const pedidoCommittedMatches = await client.match.findMany({
    where: {
      pedidoId,
      loteId: { not: loteId },
      estado: { in: CAPACITY_HOLDING_ESTADOS },
    },
    select: { calibresJson: true },
  });
  const pedidoCommitted = sumCommittedPerCalibre(pedidoCommittedMatches);

  // Uncalibrated lote (vendedor a granel): tratar el lote como un bucket
  // único contra el pedido (que también debe ser uncalibrated — meetsHardCriteria
  // ya lo garantiza). Clamp por kg totales.
  if (isUncalibratedLot(loteCalibres)) {
    const loteTotal = loteCalibres.reduce((s, c) => s + c.cantidad_kg, 0);
    const loteUsed = Array.from(loteCommitted.values()).reduce((s, v) => s + v, 0);
    const loteRemaining = Math.max(0, loteTotal - loteUsed);

    const pedidoTotal = pedidoCalibres.reduce((s, c) => s + c.cantidad_kg, 0);
    const pedidoUsed = Array.from(pedidoCommitted.values()).reduce((s, v) => s + v, 0);
    const pedidoRemaining = Math.max(0, pedidoTotal - pedidoUsed);

    const matched = Math.min(loteRemaining, pedidoRemaining);
    if (matched <= 0) return { calibres: [], total: 0 };
    const first = loteCalibres[0];
    if (!first) return { calibres: [], total: 0 };
    return {
      calibres: [{ ...first, cantidad_kg: matched }],
      total: matched,
    };
  }

  // Phase 14M v3.31 — pedido uncalibrated + lote calibrado. El comprador
  // acepta cualquier calibre, así que tomamos todos los calibres del lote
  // cuyo precio_min_kg cabe en el precio_max_kg del buyer y sumamos. El
  // resultado se guarda como un único bucket UNCALIBRATED para mantener
  // coherencia en calibresJson del match (sin esto, la factura/contrato
  // tendrían que reagrupar y sería frágil).
  if (isUncalibratedPedido(pedidoCalibres)) {
    const buyerBucket = pedidoCalibres[0];
    if (!buyerBucket) return { calibres: [], total: 0 };
    const buyerMaxPrice = buyerBucket.precio_max_kg;
    const compatibleLoteKg = loteCalibres.reduce((s, lc) => {
      if (lc.precio_min_kg > buyerMaxPrice) return s;
      const rem = Math.max(0, lc.cantidad_kg - (loteCommitted.get(lc.calibre) ?? 0));
      return s + rem;
    }, 0);
    const pedidoUsed = Array.from(pedidoCommitted.values()).reduce((s, v) => s + v, 0);
    const pedidoRemaining = Math.max(0, buyerBucket.cantidad_kg - pedidoUsed);
    const matched = Math.min(compatibleLoteKg, pedidoRemaining);
    if (matched <= 0) return { calibres: [], total: 0 };
    return {
      calibres: [{ calibre: 'UNCALIBRATED', cantidad_kg: matched, precio_min_kg: 0 }],
      total: matched,
    };
  }

  // Calibrated: per-calibre clamping
  const clamped: ReturnType<typeof toLoteCalibre> = [];
  for (const lc of loteCalibres) {
    const pc = pedidoCalibres.find((p) => p.calibre === lc.calibre);
    if (!pc) continue;
    if (lc.precio_min_kg > pc.precio_max_kg) continue; // price doesn't fit

    const loteRem = Math.max(0, lc.cantidad_kg - (loteCommitted.get(lc.calibre) ?? 0));
    const pedidoRem = Math.max(0, pc.cantidad_kg - (pedidoCommitted.get(lc.calibre) ?? 0));
    const matched = Math.min(loteRem, pedidoRem);
    if (matched <= 0) continue;

    clamped.push({ ...lc, cantidad_kg: matched });
  }

  const total = clamped.reduce((s, c) => s + c.cantidad_kg, 0);
  return { calibres: clamped, total };
}

/**
 * Score compuesto con los 7 componentes ponderados.
 */
async function computeScore(
  lote: Lote & { vendedor: VendedorScoring },
  pedido: Pedido,
  compradorId: string
): Promise<{ total: number; detalle: Record<string, number> }> {
  const loteCalibres = toLoteCalibre(lote.calibres);
  const pedidoCalibres = toPedidoCalibre(pedido.calibresSolicitados);

  const rentabilidad = scoreRentabilidad(loteCalibres, pedidoCalibres);
  const fiabilidad = scoreFiabilidad(lote.vendedor);
  const proximidad = scoreProximidad(lote, pedido);
  const recencia = scoreRecencia(lote);
  const cobertura = scoreCobertura(loteCalibres, pedidoCalibres);
  const certMatch = scoreCertMatch(lote, pedido);
  const afinidad = await scoreAfinidad(lote.vendedorId, compradorId);

  const total =
    0.30 * rentabilidad +
    0.25 * fiabilidad +
    0.15 * proximidad +
    0.10 * recencia +
    0.10 * cobertura +
    0.05 * certMatch +
    0.05 * afinidad;

  return {
    total,
    detalle: { rentabilidad, fiabilidad, proximidad, recencia, cobertura, certMatch, afinidad },
  };
}

// ─── Mandatory criteria (hard filters) ────────────────────────────────────────

function meetsHardCriteria(
  lote: Lote & { vendedor: VendedorScoring },
  pedido: Pedido
): boolean {
  // 1. Mismo producto
  if (lote.productoId !== pedido.productoId) return false;

  // 2. Variedad compatible (null = cualquier variedad)
  if (
    lote.variedadId !== null &&
    pedido.variedadId !== null &&
    lote.variedadId !== pedido.variedadId
  ) {
    return false;
  }

  // 3. Calibre y precio compatibles. Phase 14M v3.31 — semántica nueva
  // para "Sin calibrar":
  //
  //   - LOTE sin calibrar = el vendedor no clasifica/calibra → SOLO casa con
  //     pedidos sin calibrar (es decir, con compradores que también aceptan
  //     mezcla). Un comprador que pidió calibre concreto no debe recibir
  //     producto sin clasificar.
  //   - PEDIDO sin calibrar = el comprador acepta cualquier mezcla → casa
  //     con TODOS los lotes (calibrados o no). Se salta el chequeo de
  //     price-fit por calibre porque no hay calibre concreto que cuadrar.
  //   - Ambos calibrados → debe haber al menos un calibre común con precio
  //     compatible (lc.precio_min_kg ≤ pc.precio_max_kg).
  const loteCalibres = toLoteCalibre(lote.calibres);
  const pedidoCalibres = toPedidoCalibre(pedido.calibresSolicitados);
  const loteUncal = isUncalibratedLot(loteCalibres);
  const pedidoUncal = isUncalibratedPedido(pedidoCalibres);
  if (loteUncal && !pedidoUncal) return false; // vendedor "a granel" solo va con compradores "a granel"
  if (!loteUncal && !pedidoUncal) {
    // Caso clásico: ambos calibrados → exigir intersección con price-fit.
    const hasPriceFit = pedidoCalibres.some((pc) => {
      const lc = loteCalibres.find((l) => l.calibre === pc.calibre);
      return lc != null && lc.precio_min_kg <= pc.precio_max_kg;
    });
    if (!hasPriceFit) return false;
  }
  // Si pedido es uncalibrated (con o sin lote uncal) → no comprobamos
  // price-fit por calibre. El precio se negocia/usa al nivel de
  // precio_max_kg del bucket único del pedido.

  // 4. Fecha disponibilidad <= fecha entrega deseada
  if (lote.fechaDisponibilidad > pedido.fechaEntregaDeseada) return false;

  // 5. Vendedor no restringido
  if (lote.vendedor.scoreStatus === 'RESTRICTED') return false;

  // 6. Al menos un calibre con stock (cantidad_kg > 0)
  const hasStock = loteCalibres.some((lc) => lc.cantidad_kg > 0);
  if (!hasStock) return false;

  return true;
}

// ─── Anti-monopolio ────────────────────────────────────────────────────────────

/**
 * Si los top-5 resultados son del mismo vendedor, intercala el primer resultado
 * de otro vendedor en posición 3 (índice 2).
 */
function applyAntiMonopoly(results: ScoredLote[]): ScoredLote[] {
  if (results.length < 6) return results;

  const top5VendedorIds = results.slice(0, 5).map((r) => r.lote.vendedorId);
  const allSameVendor = top5VendedorIds.every((id) => id === top5VendedorIds[0]);

  if (!allSameVendor) return results;

  // Find the first result from a different vendor (position 5+)
  const altIndex = results.findIndex((r) => r.lote.vendedorId !== top5VendedorIds[0]);
  if (altIndex === -1) return results;

  const spliced = results.splice(altIndex, 1);
  const altResult = spliced[0];
  if (!altResult) return results;
  results.splice(2, 0, altResult);
  return results;
}

// ─── Internal type for scored lots ────────────────────────────────────────────

type ScoredLote = {
  lote: Lote & { vendedor: VendedorScoring };
  score: { total: number; detalle: Record<string, number> };
};

// ─── Default calibres/precio helpers ─────────────────────────────────────────

function computePrecioKgFromContribucion(
  pedidoCalibres: PedidoCalibre[],
  contribucion: ContribucionCalibre[]
): number {
  let totalKg = 0;
  let totalPrecio = 0;
  const uncalibratedBucket = isUncalibratedPedido(pedidoCalibres)
    ? pedidoCalibres[0]
    : null;

  for (const contrib of contribucion) {
    const pc = uncalibratedBucket ?? pedidoCalibres.find((p) => p.calibre === contrib.calibre);
    totalKg += contrib.cantidad_kg;
    totalPrecio += (pc?.precio_max_kg ?? 0) * contrib.cantidad_kg;
  }

  if (totalKg === 0) return 0;
  return totalPrecio / totalKg;
}

// ─── MatchingService ──────────────────────────────────────────────────────────

export class MatchingService {
  /**
   * Encuentra todos los pedidos ACTIVOS compatibles con el lote y crea/actualiza
   * registros Match en estado PROPUESTO.
   */
  async runMatchingForLot(loteId: string): Promise<Match[]> {
    const lote = await prisma.lote.findUnique({
      where: { id: loteId },
      include: {
        vendedor: {
          select: {
            scoreFiabilidad: true,
            scoreStatus: true,
            transaccionesOk: true,
            transaccionesIncid: true,
          },
        },
      },
    });
    if (!lote) throw new AppError('Lote no encontrado', 404);
    if (!['ACTIVO', 'PARCIALMENTE_VENDIDO'].includes(lote.estado)) {
      throw new AppError('El lote debe estar ACTIVO o PARCIALMENTE_VENDIDO para ejecutar matching', 400);
    }

    const pedidos = await prisma.pedido.findMany({
      where: { estado: { in: ['ACTIVO', 'PARCIALMENTE_CUBIERTO'] } },
    });

    const matches: Match[] = [];

    for (const pedido of pedidos) {
      if (!meetsHardCriteria(lote, pedido)) continue;

      const { total, detalle } = await computeScore(lote, pedido, pedido.compradorId);

      const loteCalibres = toLoteCalibre(lote.calibres);
      const pedidoCalibres = toPedidoCalibre(pedido.calibresSolicitados);

      // Capacity clamping + upsert inside a single transaction so concurrent
      // match runs cannot read the same "remaining" and double-allocate.
      // Also guards against overwriting a match the seller has already
      // accepted (estado past PROPUESTO/ENVIADO_VENDEDOR). visibleDesde is
      // computed inside the callback so retries recompute it freshly.

      const match = await txWithRetry(async (tx) => {
        const delay = await getMatchDelayMs(lote.vendedorId, pedido.compradorId);
        const visibleDesde = new Date(Date.now() + delay);

        // Skip entirely if an existing match has already been accepted
        const existing = await tx.match.findUnique({
          where: { loteId_pedidoId: { loteId, pedidoId: pedido.id } },
          select: { id: true, estado: true },
        });
        if (existing && !['PROPUESTO', 'ENVIADO_VENDEDOR'].includes(existing.estado)) {
          return null; // seller already acted on this — leave it alone
        }

        const clamped = await computeClampedMatchCalibres(
          loteId,
          loteCalibres,
          pedido.id,
          pedidoCalibres,
          tx,
        );
        if (clamped.total <= 0) return null;

        // Use buyer's offered price (precio_max_kg) as the match price
        let precioKg = 0;
        if (isUncalibratedLot(loteCalibres)) {
          const totalBuyerKg = pedidoCalibres.reduce((s, pc) => s + pc.cantidad_kg, 0);
          precioKg = totalBuyerKg > 0
            ? pedidoCalibres.reduce((s, pc) => s + pc.precio_max_kg * pc.cantidad_kg, 0) / totalBuyerKg
            : 0;
        } else {
          precioKg = clamped.calibres.reduce((s, c) => {
            const pc = pedidoCalibres.find((p) => p.calibre === c.calibre);
            return s + (pc?.precio_max_kg ?? 0) * c.cantidad_kg;
          }, 0) / clamped.total;
        }

        return tx.match.upsert({
          where: { loteId_pedidoId: { loteId, pedidoId: pedido.id } },
          create: {
            loteId,
            pedidoId: pedido.id,
            cantidadKg: clamped.total,
            precioKg,
            calibresJson: clamped.calibres,
            estado: 'PROPUESTO',
            scoreMatching: total,
            scoreDetalle: detalle,
            visibleDesde,
          },
          update: {
            cantidadKg: clamped.total,
            precioKg,
            calibresJson: clamped.calibres,
            scoreMatching: total,
            scoreDetalle: detalle,
            estado: 'PROPUESTO',
            visibleDesde,
          },
        });
      });

      if (!match) continue;

      const cantidadKg = Number(match.cantidadKg);
      const precioKg = Number(match.precioKg);

      // Notify vendedor of the new match proposal (non-blocking)
      if (lote.vendedorId) {
        void (async () => {
          try {
            const vendedor = await prisma.user.findUnique({
              where: { id: lote.vendedorId },
              select: { email: true, nombre: true },
            });
            const compradorEmpresa = pedido.compradorId
              ? (
                  await prisma.empresa.findUnique({
                    where: { userId: pedido.compradorId },
                    select: { razonSocial: true },
                  })
                )?.razonSocial ?? 'Comprador'
              : 'Comprador';
            if (vendedor?.email) {
              const producto = await prisma.producto.findUnique({
                where: { id: lote.productoId },
                select: { nombre: true },
              });
              await sendMatchProposalEmail(vendedor.email, vendedor.nombre, {
                pedidoId: pedido.id,
                productoNombre: producto?.nombre ?? lote.productoId,
                cantidadKg: Number(cantidadKg),
                precioMaxKg: Number(precioKg),
                compradorEmpresa,
              });
            }
          } catch (emailErr) {
            console.error('[Matching] Failed to send match proposal email:', emailErr);
          }
          // Phase 18 — push al vendedor del nuevo match.
          try {
            const [producto, empresa] = await Promise.all([
              prisma.producto.findUnique({
                where: { id: lote.productoId },
                select: { nombre: true },
              }),
              pedido.compradorId
                ? prisma.empresa.findUnique({
                    where: { userId: pedido.compradorId },
                    select: { razonSocial: true },
                  })
                : Promise.resolve(null),
            ]);
            const compradorName = empresa?.razonSocial ?? 'Un comprador';
            await sendPushToUser(lote.vendedorId, {
              title: 'Nuevo match disponible',
              body: `${compradorName} busca ${Number(cantidadKg).toLocaleString('es-ES')} kg de ${producto?.nombre ?? 'tu producto'}`,
              url: '/seller/matches',
              tag: `match-new-${lote.id}`,
            });
          } catch (pushErr) {
            console.warn('[Matching] push match notify failed:', pushErr);
          }
        })();
      }

      matches.push(match);
    }

    return matches;
  }

  /**
   * Encuentra todos los lotes ACTIVOS compatibles con el pedido y crea/actualiza
   * registros Match en estado PROPUESTO. Aplica anti-monopolio y ordena por score.
   */
  async runMatchingForOrder(pedidoId: string, sortBy?: string): Promise<Match[]> {
    const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
    if (!pedido) throw new AppError('Pedido no encontrado', 404);
    if (!['ACTIVO', 'PARCIALMENTE_CUBIERTO'].includes(pedido.estado)) {
      throw new AppError('El pedido debe estar ACTIVO o PARCIALMENTE_CUBIERTO para ejecutar matching', 400);
    }

    const lotes = await prisma.lote.findMany({
      where: { estado: { in: ['ACTIVO', 'PARCIALMENTE_VENDIDO'] } },
      include: {
        vendedor: {
          select: {
            scoreFiabilidad: true,
            scoreStatus: true,
            transaccionesOk: true,
            transaccionesIncid: true,
          },
        },
      },
    });

    // Score all passing lots
    const scored: ScoredLote[] = [];
    for (const lote of lotes) {
      if (!meetsHardCriteria(lote, pedido)) continue;
      const score = await computeScore(lote, pedido, pedido.compradorId);
      scored.push({ lote, score });
    }

    // Sort: calibrated lots always before uncalibrated, then by score or price
    if (sortBy === 'precio') {
      // Guard against empty arrays — Math.min() with no args returns Infinity
      // which would silently push the lot to the top instead of the bottom.
      const minPrice = (cals: ReturnType<typeof toLoteCalibre>): number => {
        if (cals.length === 0) return Number.POSITIVE_INFINITY;
        return cals.reduce((m, c) => Math.min(m, c.precio_min_kg), Number.POSITIVE_INFINITY);
      };
      scored.sort((a, b) => {
        const aUncal = isUncalibratedLot(toLoteCalibre(a.lote.calibres)) ? 1 : 0;
        const bUncal = isUncalibratedLot(toLoteCalibre(b.lote.calibres)) ? 1 : 0;
        if (aUncal !== bUncal) return aUncal - bUncal;
        return minPrice(toLoteCalibre(a.lote.calibres)) - minPrice(toLoteCalibre(b.lote.calibres));
      });
    } else {
      scored.sort((a, b) => {
        const aUncal = isUncalibratedLot(toLoteCalibre(a.lote.calibres)) ? 1 : 0;
        const bUncal = isUncalibratedLot(toLoteCalibre(b.lote.calibres)) ? 1 : 0;
        if (aUncal !== bUncal) return aUncal - bUncal;
        return b.score.total - a.score.total;
      });
      applyAntiMonopoly(scored);
    }

    const matches: Match[] = [];

    for (const { lote, score } of scored) {
      const { total, detalle } = score;
      const loteCalibres = toLoteCalibre(lote.calibres);
      const pedidoCalibres = toPedidoCalibre(pedido.calibresSolicitados);

      // Capacity clamp + upsert inside a transaction (see runMatchingForLot
      // for rationale). Also guard against overwriting accepted matches.
      // visibleDesde computed inside so retries see a fresh timestamp.
      const match = await txWithRetry(async (tx) => {
        const delay = await getMatchDelayMs(lote.vendedorId, pedido.compradorId);
        const visibleDesde = new Date(Date.now() + delay);

        const existing = await tx.match.findUnique({
          where: { loteId_pedidoId: { loteId: lote.id, pedidoId } },
          select: { id: true, estado: true },
        });
        if (existing && !['PROPUESTO', 'ENVIADO_VENDEDOR'].includes(existing.estado)) {
          return null;
        }

        const clamped = await computeClampedMatchCalibres(
          lote.id,
          loteCalibres,
          pedidoId,
          pedidoCalibres,
          tx,
        );
        if (clamped.total <= 0) return null;

        let precioKg = 0;
        if (isUncalibratedLot(loteCalibres)) {
          const totalBuyerKg = pedidoCalibres.reduce((s, pc) => s + pc.cantidad_kg, 0);
          precioKg = totalBuyerKg > 0
            ? pedidoCalibres.reduce((s, pc) => s + pc.precio_max_kg * pc.cantidad_kg, 0) / totalBuyerKg
            : 0;
        } else {
          precioKg = clamped.calibres.reduce((s, c) => {
            const pc = pedidoCalibres.find((p) => p.calibre === c.calibre);
            return s + (pc?.precio_max_kg ?? 0) * c.cantidad_kg;
          }, 0) / clamped.total;
        }

        return tx.match.upsert({
          where: { loteId_pedidoId: { loteId: lote.id, pedidoId } },
          create: {
            loteId: lote.id,
            pedidoId,
            cantidadKg: clamped.total,
            precioKg,
            calibresJson: clamped.calibres,
            estado: 'PROPUESTO',
            scoreMatching: total,
            scoreDetalle: detalle,
            visibleDesde,
          },
          update: {
            cantidadKg: clamped.total,
            precioKg,
            calibresJson: clamped.calibres,
            scoreMatching: total,
            scoreDetalle: detalle,
            estado: 'PROPUESTO',
            visibleDesde,
          },
        });
      });

      if (match) matches.push(match);
    }

    return matches;
  }

  /**
   * Devuelve los matches de los lotes de un vendedor con índice de rentabilidad.
   * Soporta sortBy='precio' para ordenar por precioKg asc.
   */
  async getMatchesForSeller(
    vendedorId: string,
    loteId?: string,
    sortBy?: string
  ): Promise<MatchWithScore[]> {
    const matches = await prisma.match.findMany({
      where: {
        lote: { vendedorId, estado: { in: ['ACTIVO', 'PARCIALMENTE_VENDIDO'] } },
        pedido: { estado: { notIn: ['TOTALMENTE_CUBIERTO', 'CANCELADO', 'CERRADO'] } },
        visibleDesde: { lte: new Date() },
        ...(loteId ? { loteId } : {}),
      },
      include: {
        lote: {
          select: {
            id: true,
            calibres: true,
            direccionRecogida: true,
            coordenadasLat: true,
            coordenadasLng: true,
            // Phase 14J — para descartar lotes 100% comprometidos y para
            // poder calcular kg restantes por calibre en el lote.
            matches: {
              where: { estado: { in: CAPACITY_HOLDING_ESTADOS } },
              select: { id: true, cantidadKg: true, calibresJson: true },
            },
          },
        },
        pedido: {
          include: {
            producto: { select: { nombre: true } },
            variedad: { select: { nombre: true } },
            comprador: {
              select: {
                id: true,
                nombre: true,
                apellidos: true,
                // Phase 14M v3.16 — score para el ScoreBadge en MatchCard.
                scoreFiabilidad: true,
                scoreStatus: true,
                empresa: {
                  select: { razonSocial: true },
                },
              },
            },
            // Phase 14J — kg comprometidos en el pedido por OTROS matches
            // para mostrar al vendedor cuánto queda por cubrir por calibre.
            matches: {
              where: { estado: { in: CAPACITY_HOLDING_ESTADOS } },
              select: { id: true, cantidadKg: true, calibresJson: true },
            },
          },
        },
      },
      orderBy:
        sortBy === 'precio'
          ? { precioKg: 'asc' }
          : { scoreMatching: 'desc' },
    });

    // Phase 14J — filtra matches cuyo lote ya está 100% cubierto por matches
    // capacity-holding. El estado del lote sigue siendo PARCIALMENTE_VENDIDO
    // hasta que se complete la entrega, pero al vendedor ya no le quedan kg
    // libres que ofrecer.
    const filtered = matches.filter((m) => {
      const totalKg = ((m.lote.calibres as unknown) as Array<{ cantidad_kg?: number }>)
        .reduce((s, c) => s + Number(c.cantidad_kg ?? 0), 0);
      const committedKg = (m.lote.matches ?? []).reduce(
        (s, mm) => s + Number(mm.cantidadKg ?? 0),
        0,
      );
      // Si el lote no tiene kg definidos, no podemos juzgar — lo dejamos.
      if (totalKg <= 0) return true;
      return committedKg < totalKg;
    });

    return filtered.map((m) => {
      // Phase 14J — kg restantes por calibre, tanto del lote del vendedor
      // como del pedido del comprador. Permite al modal de contribución
      // mostrar el máximo real disponible (sin que el vendedor proponga
      // más kg de los que le quedan ni que excedan lo que falta por
      // cubrir del pedido).
      const sumCalibres = (
        ms: Array<{ id: string; calibresJson: unknown }>,
        excludeId?: string,
      ): Record<string, number> => {
        const out: Record<string, number> = {};
        for (const mm of ms) {
          if (excludeId && mm.id === excludeId) continue;
          const items = Array.isArray(mm.calibresJson)
            ? (mm.calibresJson as Array<{ calibre?: string; cantidad_kg?: number }>)
            : [];
          for (const it of items) {
            if (!it?.calibre) continue;
            out[it.calibre] = (out[it.calibre] ?? 0) + Number(it.cantidad_kg ?? 0);
          }
        }
        return out;
      };

      const loteCommittedPorCalibre = sumCalibres(m.lote.matches ?? [], m.id);
      const pedidoCommittedPorCalibre = sumCalibres(
        ((m.pedido as unknown) as { matches?: Array<{ id: string; calibresJson: unknown }> }).matches ?? [],
        m.id,
      );

      const loteCalibres = ((m.lote.calibres as unknown) as Array<{ calibre?: string; cantidad_kg?: number }>) ?? [];
      const pedidoCalibres = ((m.pedido.calibresSolicitados as unknown) as Array<{ calibre?: string; cantidad_kg?: number }>) ?? [];

      const loteRestantePorCalibre: Record<string, number> = {};
      for (const c of loteCalibres) {
        if (!c.calibre) continue;
        const total = Number(c.cantidad_kg ?? 0);
        const used = loteCommittedPorCalibre[c.calibre] ?? 0;
        loteRestantePorCalibre[c.calibre] = Math.max(0, total - used);
      }

      const pedidoRestantePorCalibre: Record<string, number> = {};
      for (const c of pedidoCalibres) {
        if (!c.calibre) continue;
        const total = Number(c.cantidad_kg ?? 0);
        const used = pedidoCommittedPorCalibre[c.calibre] ?? 0;
        pedidoRestantePorCalibre[c.calibre] = Math.max(0, total - used);
      }

      // No exponemos la lista interna de matches al cliente.
      const { matches: _loteMatches, ...loteRest } = m.lote;
      void _loteMatches;
      const pedidoFull = m.pedido as unknown as { matches?: unknown };
      const { matches: _pedidoMatches, ...pedidoRest } = pedidoFull as { matches: unknown };
      void _pedidoMatches;

      return {
        ...m,
        lote: loteRest,
        pedido: pedidoRest as typeof m.pedido,
        indiceRentabilidad: Math.round((m.scoreMatching ?? 0) * 100),
        loteRestantePorCalibre,
        pedidoRestantePorCalibre,
      };
    }) as MatchWithScore[];
  }

  /**
   * Phase 15 — devuelve cuántos matches del vendedor están aún ocultos por
   * el retraso de 24h del plan gratuito (visibleDesde > now). Lo usa el
   * banner "Tienes X matches, espera 24h o upgradea" en /seller/matches.
   *
   * También devuelve isFreeTier para que el frontend solo muestre el
   * banner cuando aplica.
   */
  async getSellerHiddenMatchesInfo(vendedorId: string): Promise<{
    hiddenByDelay: number;
    isFreeTier: boolean;
    nextVisibleAt: Date | null;
  }> {
    // ¿El vendedor está en plan gratuito?
    const sub = await prisma.suscripcion.findUnique({
      where: { userId: vendedorId },
      select: { planVendedor: true, estado: true },
    });
    const isActiveSub = !!sub && (sub.estado === 'ACTIVA' || sub.estado === 'TRIAL');
    const planKey = isActiveSub ? (sub.planVendedor as keyof typeof PLAN_LIMITS | null) : null;
    const isFreeTier = !planKey || planKey === 'COSECHA';

    if (!isFreeTier) {
      return { hiddenByDelay: 0, isFreeTier: false, nextVisibleAt: null };
    }

    const now = new Date();
    const hidden = await prisma.match.findMany({
      where: {
        lote: { vendedorId, estado: { in: ['ACTIVO', 'PARCIALMENTE_VENDIDO'] } },
        pedido: { estado: { notIn: ['TOTALMENTE_CUBIERTO', 'CANCELADO', 'CERRADO'] } },
        visibleDesde: { gt: now },
      },
      select: { id: true, visibleDesde: true },
      orderBy: { visibleDesde: 'asc' },
    });

    return {
      hiddenByDelay: hidden.length,
      isFreeTier: true,
      nextVisibleAt: hidden.length > 0 ? hidden[0]!.visibleDesde : null,
    };
  }

  /**
   * Phase 16 — Cuenta cuántos potenciales counterparties (lotes ACTIVOS si
   * el caller es comprador, pedidos ACTIVOS si el caller es vendedor)
   * podrían matchear con el draft que el usuario está rellenando en
   * /seller/lots/new o /buyer/orders/new. Es una estimación en vivo —
   * NO crea matches, solo cuenta candidates que cumplen criterios duros:
   *
   *   - Mismo producto.
   *   - Variedad compatible (null = wildcard de cualquier lado).
   *   - Incoterm aceptado (intersección con incotermsAceptados del otro).
   *   - Calibres compatibles (si caller especifica calibres concretos, el
   *     otro debe haberlos pedido/ofrecido también).
   *
   * Cumple lo que el matching real considera "hard filters" en
   * meetsHardCriteria sin el resto del scoring. El número se refresca
   * con debounce de 500ms en el frontend.
   */
  async previewPotentialCounterparties(
    side: 'BUYER' | 'SELLER',
    draft: {
      productoId?: string;
      variedadId?: string | null;
      incoterms?: string[]; // incotermsAceptados (lo que el usuario marca)
      calibres?: Array<{ calibre: string }>; // solo el código de calibre
    },
  ): Promise<{ count: number }> {
    if (!draft.productoId) return { count: 0 };

    // El comprador busca lotes; el vendedor busca pedidos.
    if (side === 'BUYER') {
      const lotes = await prisma.lote.findMany({
        where: {
          productoId: draft.productoId,
          estado: { in: ['ACTIVO', 'PARCIALMENTE_VENDIDO'] },
          ...(draft.variedadId && draft.variedadId.length > 0
            ? { OR: [{ variedadId: draft.variedadId }, { variedadId: null }] }
            : {}),
        },
        select: { vendedorId: true, calibres: true, incotermsAceptados: true },
      });
      const counterparties = new Set<string>();
      for (const l of lotes) {
        // Filtro incoterm: si comprador marcó incoterms, alguno tiene que
        // estar en los aceptados por el vendedor; si no marcó nada, pasa.
        if (draft.incoterms && draft.incoterms.length > 0) {
          const lotInco = Array.isArray(l.incotermsAceptados) ? (l.incotermsAceptados as string[]) : [];
          if (lotInco.length > 0 && !draft.incoterms.some((it) => lotInco.includes(it))) continue;
        }
        // Filtro calibres: si comprador especificó calibres, alguno debe
        // existir entre los del lote.
        if (draft.calibres && draft.calibres.length > 0) {
          const lotCals = Array.isArray(l.calibres)
            ? ((l.calibres as unknown) as Array<{ calibre?: string }>).map((c) => String(c.calibre ?? ''))
            : [];
          if (!draft.calibres.some((c) => lotCals.includes(c.calibre))) continue;
        }
        counterparties.add(l.vendedorId);
      }
      return { count: counterparties.size };
    }

    // SELLER busca pedidos.
    const pedidos = await prisma.pedido.findMany({
      where: {
        productoId: draft.productoId,
        estado: { in: ['ACTIVO', 'PARCIALMENTE_CUBIERTO'] },
        ...(draft.variedadId && draft.variedadId.length > 0
          ? { OR: [{ variedadId: draft.variedadId }, { variedadId: null }] }
          : {}),
      },
      select: { compradorId: true, calibresSolicitados: true, incotermsAceptados: true },
    });
    const counterparties = new Set<string>();
    for (const p of pedidos) {
      if (draft.incoterms && draft.incoterms.length > 0) {
        const pedInco = Array.isArray(p.incotermsAceptados) ? (p.incotermsAceptados as string[]) : [];
        if (pedInco.length > 0 && !draft.incoterms.some((it) => pedInco.includes(it))) continue;
      }
      if (draft.calibres && draft.calibres.length > 0) {
        const pedCals = Array.isArray(p.calibresSolicitados)
          ? ((p.calibresSolicitados as unknown) as Array<{ calibre?: string }>).map((c) => String(c.calibre ?? ''))
          : [];
        if (!draft.calibres.some((c) => pedCals.includes(c.calibre))) continue;
      }
      counterparties.add(p.compradorId);
    }
    return { count: counterparties.size };
  }

  /**
   * El vendedor acepta contribuir a un pedido con calibres específicos.
   */
  async contributeToOrder(
    vendedorId: string,
    matchId: string,
    calibresContribucion: ContributeInput['calibresContribucion']
  ): Promise<Match> {
    const updatedMatch = await txWithRetry(
      async (tx) => {
        const match = await tx.match.findUnique({
          where: { id: matchId },
          include: {
            lote: {
              include: {
                matches: {
                  where: { estado: { in: CAPACITY_HOLDING_ESTADOS } },
                  select: { id: true, calibresJson: true },
                },
              },
            },
            pedido: {
              include: {
                matches: {
                  where: { estado: { in: ['ACEPTADO_VENDEDOR', 'PENDIENTE_PAGO', 'CONFIRMADO'] } },
                  select: { id: true, cantidadKg: true },
                },
              },
            },
          },
        });

        if (!match) throw new AppError('Match no encontrado', 404);
        if (match.lote.vendedorId !== vendedorId) throw new AppError('Acceso prohibido', 403);
        if (!['ACTIVO', 'PARCIALMENTE_VENDIDO'].includes(match.lote.estado)) {
          throw new AppError('El lote ya no está activo y no permite contribuciones', 400);
        }
        if (!['PROPUESTO', 'ENVIADO_VENDEDOR'].includes(match.estado)) {
          throw new AppError('El match no está en un estado aceptable para contribuir', 400);
        }

        const loteCalibres = toLoteCalibre(match.lote.calibres);
        const pedidoCalibres = toPedidoCalibre(match.pedido.calibresSolicitados);
        const pedidoUncalibrated = isUncalibratedPedido(pedidoCalibres);
        const buyerBucket = pedidoUncalibrated ? pedidoCalibres[0] : null;
        const loteCommitted = sumCommittedPerCalibre(
          (match.lote.matches ?? []).filter((lm) => lm.id !== matchId)
        );

        for (const contrib of calibresContribucion) {
          const lc = loteCalibres.find((l) => l.calibre === contrib.calibre);
          if (!lc) {
            throw new AppError(`Calibre "${contrib.calibre}" no existe en el lote`, 400);
          }
          const loteDisponible = Math.max(0, lc.cantidad_kg - (loteCommitted.get(lc.calibre) ?? 0));
          if (contrib.cantidad_kg > loteDisponible) {
            throw new AppError(
              `Calibre "${contrib.calibre}": cantidad solicitada (${contrib.cantidad_kg} kg) supera la disponible (${loteDisponible} kg)`,
              400
            );
          }
          if (pedidoUncalibrated) {
            if (!buyerBucket) {
              throw new AppError('Pedido sin calibrar inválido', 400);
            }
            if (lc.precio_min_kg > buyerBucket.precio_max_kg) {
              throw new AppError(
                `Calibre "${contrib.calibre}": precio mínimo (${lc.precio_min_kg} €/kg) supera el máximo del pedido (${buyerBucket.precio_max_kg} €/kg)`,
                400
              );
            }
          } else {
            const pc = pedidoCalibres.find((p) => p.calibre === contrib.calibre);
            if (!pc) {
              throw new AppError(`Calibre "${contrib.calibre}" no está solicitado en el pedido`, 400);
            }
            if (lc.precio_min_kg > pc.precio_max_kg) {
              throw new AppError(
                `Calibre "${contrib.calibre}": precio mínimo (${lc.precio_min_kg} €/kg) supera el máximo del pedido (${pc.precio_max_kg} €/kg)`,
                400
              );
            }
          }
        }

        const totalPedidoKg = pedidoCalibres.reduce((s, c) => s + c.cantidad_kg, 0);

        const otrosCommittedKg = match.pedido.matches
          .filter((om) => om.id !== matchId)
          .reduce((s, om) => s + Number(om.cantidadKg), 0);

        const remainingOrderKg = Math.max(0, totalPedidoKg - otrosCommittedKg);
        if (remainingOrderKg === 0) {
          throw new AppError('Este pedido ya está completamente cubierto', 400);
        }
        const requestedTotalKg = calibresContribucion.reduce((s, c) => s + c.cantidad_kg, 0);
        let adjustedCalibres = calibresContribucion;
        if (requestedTotalKg > remainingOrderKg) {
          const ratio = remainingOrderKg / requestedTotalKg;
          adjustedCalibres = calibresContribucion
            .map((c) => ({
              ...c,
              cantidad_kg: Math.floor(c.cantidad_kg * ratio * 1000) / 1000,
            }))
            .filter((c) => c.cantidad_kg > 0);
        }

        const cantidadKg = adjustedCalibres.reduce((s, c) => s + c.cantidad_kg, 0);
        const precioKg = computePrecioKgFromContribucion(pedidoCalibres, adjustedCalibres);

        const totalCoveredKg = otrosCommittedKg + cantidadKg;
        const coverage = totalPedidoKg > 0 ? totalCoveredKg / totalPedidoKg : 0;

        const result = await tx.match.update({
          where: { id: matchId },
          data: {
            estado: 'ACEPTADO_VENDEDOR',
            calibresJson: adjustedCalibres,
            cantidadKg,
            precioKg,
          },
        });

        const nuevoPedidoEstado =
          coverage >= 1
            ? 'TOTALMENTE_CUBIERTO'
            : coverage > 0
              ? 'PARCIALMENTE_CUBIERTO'
              : match.pedido.estado;
        if (nuevoPedidoEstado !== match.pedido.estado) {
          await tx.pedido.update({
            where: { id: match.pedidoId },
            data: {
              estado: nuevoPedidoEstado as 'TOTALMENTE_CUBIERTO' | 'PARCIALMENTE_CUBIERTO',
            },
          });
        }

        // Recompute the lot's estado from the source of truth (matches +
        // their transactions). Will NEVER flip to VENDIDO at this point
        // because the transaction was just created with PENDIENTE_PAGO —
        // VENDIDO requires every transaction to be COMPLETADO.
        // capturePayment + dispute resolution call recomputeLotState too,
        // so the lot eventually transitions when fulfillment is real.
        await recomputeLotState(match.loteId, tx);

        const existingTx = await tx.transaccion.findUnique({ where: { matchId } });
        if (!existingTx) {
          const precioTotal = cantidadKg * precioKg;
          // Commission is now snapshot-only at this point — the real charge
          // happens later when the buyer pays it before signing the contract.
          // We still record the estimate so analytics + previews work.
          const commission = calcularComision(precioTotal);
          await tx.transaccion.create({
            data: {
              matchId,
              vendedorId: match.lote.vendedorId,
              compradorId: match.pedido.compradorId,
              cantidadKg,
              precioTotal,
              comisionPlataforma: commission.total,
              comisionPorcentaje: commission.porcentajeFinal,
              estado: 'PENDIENTE_PAGO',
            },
          });
        }

        return result;
      }
    );

    // Phase 3 — auto-generate the contract DRAFT after seller acceptance.
    // Best-effort: if PDF/R2 fails we don't roll back the match acceptance,
    // we just log and let the user retry via the dedicated endpoint.
    void (async () => {
      try {
        const { contractsService } = await import('../contracts/contracts.service.js');
        await contractsService.generateContractDraft(matchId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[contracts] auto-draft after contributeToOrder failed:', msg);
      }
    })();

    return updatedMatch;
  }

  async getNotificationsSummary(
    userId: string,
    role: string
  ): Promise<{
    pendingOffers: number;
    pendingMatches: number;
    unreadMessages: number;
    pendingContracts: number;
    pendingPhotos: number;
    pendingDeliveries: number;
    /** Phase 14M v3.20 — transacciones entregadas sin valorar por el user. */
    pendingRatings?: number;
    expiredOrders: number;
    expiredLots: number;
    firstPendingOfferOrderId?: string;
    firstPendingContractOrderId?: string;
    /** Phase 4 match id — replaces the legacy txId pointer */
    firstPendingContractMatchId?: string;
    firstPendingDeliveryOrderId?: string;
    firstPendingDeliveryTxId?: string;
    firstPendingDeliveryMatchId?: string;
    firstPendingContractLotId?: string;
    firstPendingPhotosLotId?: string;
    firstPendingPhotosTxId?: string;
    firstPendingPhotosMatchId?: string;
    firstPendingRatingMatchId?: string;
  }> {
    const unreadMessages = await prisma.mensaje.count({
      where: {
        remitenteId: { not: userId },
        leido: false,
        transaccion: {
          OR: [{ vendedorId: userId }, { compradorId: userId }],
          estado: { not: 'CANCELADO' },
        },
      },
    });

    if (role === 'COMPRADOR') {
      const unauthorizedOfferWhere = {
        pedido: { compradorId: userId },
        estado: 'ACEPTADO_VENDEDOR' as const,
        OR: [
          { transaccion: { is: null } },
          {
            transaccion: {
              stripePaymentIntentId: null,
              estado: {
                notIn: [
                  'COMPLETADO',
                  'ENTREGADO',
                  'CANCELADO',
                  'REEMBOLSADO',
                  'EN_DISPUTA',
                ] as TransaccionEstado[],
              },
            },
          },
        ],
      };

      // Phase 4 — buyer pending contracts: the seller has signed and the
      // buyer must pay + sign within 48 business hours. Use match.contratoEstado
      // as the source of truth, not transaccion.firmaComprador (legacy flow).
      const buyerPendingContractWhere = {
        pedido: { compradorId: userId },
        contratoEstado: 'PENDIENTE_PAGO_COMPRADOR' as const,
      };

      const [firstOffer, firstContract, firstDelivery] = await Promise.all([
        prisma.match.findFirst({
          where: unauthorizedOfferWhere,
          select: { pedidoId: true },
        }),
        prisma.match.findFirst({
          where: buyerPendingContractWhere,
          select: { id: true, pedidoId: true },
        }),
        // Phase 14M v3.20 — flujo v2: comprador confirma recepción
        // cuando el vendedor ha marcado enviado.
        prisma.transaccion.findFirst({
          where: {
            compradorId: userId,
            enviadoEn: { not: null },
            recibidoEn: null,
            match: { contratoEstado: 'FIRMADO' },
          },
          select: { id: true, match: { select: { id: true, pedidoId: true } } },
        }),
      ]);

      const now = new Date();
      const [pendingOffers, pendingContracts, pendingDeliveries, expiredOrders, pendingRatings] = await Promise.all([
        prisma.match.count({ where: unauthorizedOfferWhere }),
        prisma.match.count({ where: buyerPendingContractWhere }),
        // Phase 14M v3.20 — flujo v2: contador "confirmar recepción".
        prisma.transaccion.count({
          where: {
            compradorId: userId,
            enviadoEn: { not: null },
            recibidoEn: null,
            match: { contratoEstado: 'FIRMADO' },
          },
        }),
        prisma.pedido.count({
          where: {
            compradorId: userId,
            estado: { in: ['ACTIVO', 'PARCIALMENTE_CUBIERTO', 'TOTALMENTE_CUBIERTO'] },
            fechaEntregaDeseada: { lt: now },
          },
        }),
        // Phase 14M v3.20 — transacciones entregadas que el comprador
        // todavía no ha valorado al vendedor.
        prisma.transaccion.count({
          where: {
            compradorId: userId,
            recibidoEn: { not: null },
            valoraciones: { none: { autorId: userId } },
          },
        }),
      ]);

      const firstRating = pendingRatings > 0
        ? await prisma.transaccion.findFirst({
            where: {
              compradorId: userId,
              recibidoEn: { not: null },
              valoraciones: { none: { autorId: userId } },
            },
            select: { id: true, match: { select: { id: true } } },
          })
        : null;

      return {
        pendingOffers,
        pendingMatches: 0,
        unreadMessages,
        pendingContracts,
        pendingPhotos: 0,
        pendingDeliveries,
        pendingRatings,
        expiredOrders,
        expiredLots: 0,
        firstPendingOfferOrderId: firstOffer?.pedidoId,
        firstPendingContractOrderId: firstContract?.pedidoId,
        firstPendingContractMatchId: firstContract?.id,
        firstPendingDeliveryOrderId: firstDelivery?.match?.pedidoId,
        firstPendingDeliveryTxId: firstDelivery?.id,
        firstPendingDeliveryMatchId: firstDelivery?.match?.id,
        firstPendingRatingMatchId: firstRating?.match?.id,
      };
    }

    // VENDEDOR
    // Phase 14M v3.30 — además del v3.27 (solo PENDIENTE_FIRMA_VENDEDOR),
    // excluimos pedidos ya cubiertos al 100 % o cerrados. Caso real: el
    // motor genera matches sobrantes cuando el pedido del comprador ya
    // está TOTALMENTE_CUBIERTO por otros matches firmados y pagados — el
    // vendedor no tiene nada que firmar ahí, sería un contrato muerto.
    const sellerPendingContractWhere = {
      lote: { vendedorId: userId },
      contratoEstado: { in: ['PENDIENTE_FIRMA_VENDEDOR'] as Array<'PENDIENTE_FIRMA_VENDEDOR'> },
      pedido: { estado: { in: ['ACTIVO', 'PARCIALMENTE_CUBIERTO'] as Array<'ACTIVO' | 'PARCIALMENTE_CUBIERTO'> } },
    };

    const [firstContract, signedTxsWithPhotos, pendingMatches] = await Promise.all([
      prisma.match.findFirst({
        where: sellerPendingContractWhere,
        select: { id: true, loteId: true },
      }),
      // Phase 14M v3.19 — contador "envíos pendientes" para el dashboard.
      // Antes filtraba por qrToken (legacy v1 escrow). Ahora flujo v2:
      // contrato FIRMADO + transaccion.enviadoEn null.
      prisma.transaccion.findMany({
        where: {
          vendedorId: userId,
          enviadoEn: null,
          match: { contratoEstado: 'FIRMADO' },
        },
        select: { id: true, match: { select: { id: true, loteId: true } } },
      }),
      // Phase 14M v3.27 — antes contaba matches con pedidos ya cubiertos /
      // cerrados / cancelados, mostrando notifs fantasma "1 match to review"
      // cuando el comprador ya tenía el pedido cubierto al 100 %. Excluimos
      // también matches escondidos por el delay de plan free (visibleDesde
      // > now) para que el contador refleje solo matches en los que el
      // vendedor PUEDE actuar ahora mismo.
      prisma.match.count({
        where: {
          lote: { vendedorId: userId, estado: { in: ['ACTIVO', 'PARCIALMENTE_VENDIDO'] } },
          estado: { in: ['PROPUESTO', 'ENVIADO_VENDEDOR'] },
          visibleDesde: { lte: new Date() },
          pedido: { estado: { in: ['ACTIVO', 'PARCIALMENTE_CUBIERTO'] } },
        },
      }),
    ]);

    const now = new Date();
    const [pendingContracts, expiredLots, pendingRatings, firstRatingTx] = await Promise.all([
      prisma.match.count({ where: sellerPendingContractWhere }),
      prisma.lote.count({
        where: {
          vendedorId: userId,
          estado: { in: ['ACTIVO', 'PARCIALMENTE_VENDIDO'] },
          fechaFinDisponibilidad: { not: null, lt: now },
        },
      }),
      // Phase 14M v3.20 — operaciones entregadas que el vendedor todavía
      // no ha valorado al comprador.
      prisma.transaccion.count({
        where: {
          vendedorId: userId,
          recibidoEn: { not: null },
          valoraciones: { none: { autorId: userId } },
        },
      }),
      prisma.transaccion.findFirst({
        where: {
          vendedorId: userId,
          recibidoEn: { not: null },
          valoraciones: { none: { autorId: userId } },
        },
        select: { id: true, match: { select: { id: true } } },
      }),
    ]);

    // Phase 14M v3.19 — flujo v2: cada signedTxsWithPhotos es un envío
    // pendiente; ya no necesitamos filtrar por fotosLoteUrls.
    const pendingPhotosTxs = signedTxsWithPhotos;
    const pendingPhotos = pendingPhotosTxs.length;
    const firstPhotoPending = pendingPhotosTxs[0];

    return {
      pendingOffers: 0,
      pendingMatches,
      unreadMessages,
      pendingContracts,
      pendingPhotos,
      pendingDeliveries: 0,
      pendingRatings,
      expiredOrders: 0,
      expiredLots,
      firstPendingContractLotId: firstContract?.loteId,
      firstPendingContractMatchId: firstContract?.id,
      firstPendingPhotosLotId: firstPhotoPending?.match?.loteId,
      firstPendingPhotosTxId: firstPhotoPending?.id,
      firstPendingPhotosMatchId: firstPhotoPending?.match?.id,
      firstPendingRatingMatchId: firstRatingTx?.match?.id,
    };
  }

  async getPendingTasksList(
    userId: string,
    role: string
  ): Promise<{
    contracts: Array<{
      matchId: string;
      orderId: string;
      lotId: string;
      producto: string;
      counterpart: string;
      cantidadKg: number;
    }>;
    offers: Array<{
      matchId: string;
      orderId: string;
      producto: string;
      seller: string;
      cantidadKg: number;
      precioKg: number;
    }>;
    deliveries: Array<{
      txId: string;
      orderId: string;
      producto: string;
      seller: string;
      cantidadKg: number;
    }>;
    photos: Array<{
      txId: string;
      lotId: string;
      producto: string;
      buyer: string;
      cantidadKg: number;
    }>;
    matches: Array<{
      matchId: string;
      lotId: string;
      producto: string;
      buyer: string;
      cantidadKg: number;
      precioKg: number;
    }>;
    expiredOrders: Array<{
      orderId: string;
      producto: string;
      fechaEntrega: string;
      coverage: number;
      totalKg: number;
    }>;
    expiredLots: Array<{
      lotId: string;
      producto: string;
      fechaFin: string;
      coverage: number;
      totalKg: number;
    }>;
  }> {
    const now = new Date();

    if (role === 'COMPRADOR') {
      const [pendingContracts, pendingOffers, pendingDeliveries, expiredOrdersRaw] = await Promise.all([
        // Phase 4 — seller signed, buyer must pay+sign
        prisma.match.findMany({
          where: {
            pedido: { compradorId: userId },
            contratoEstado: 'PENDIENTE_PAGO_COMPRADOR',
          },
          include: {
            lote: {
              include: {
                producto: true,
                vendedor: { select: { nombre: true, apellidos: true } },
              },
            },
            pedido: { select: { id: true } },
          },
        }),
        prisma.match.findMany({
          where: {
            pedido: { compradorId: userId },
            estado: 'ACEPTADO_VENDEDOR',
            OR: [
              { transaccion: { is: null } },
              {
                transaccion: {
                  stripePaymentIntentId: null,
                  estado: {
                    notIn: [
                      'COMPLETADO',
                      'ENTREGADO',
                      'CANCELADO',
                      'REEMBOLSADO',
                      'EN_DISPUTA',
                    ] as TransaccionEstado[],
                  },
                },
              },
            ],
          },
          include: {
            lote: {
              include: {
                producto: true,
                vendedor: { select: { nombre: true, apellidos: true } },
              },
            },
            pedido: { select: { id: true } },
          },
        }),
        // Phase 14M v3.18 — flujo v2: tarea "confirmar entrega" para
        // comprador. Antes filtraba por qrToken (legacy v1). Ahora la
        // condición correcta: contrato FIRMADO + enviadoEn ya marcado
        // por el vendedor + recibidoEn aún null.
        prisma.transaccion.findMany({
          where: {
            compradorId: userId,
            enviadoEn: { not: null },
            recibidoEn: null,
            match: { contratoEstado: 'FIRMADO' },
          },
          include: {
            match: {
              include: {
                lote: { include: { producto: true } },
                pedido: { select: { id: true } },
              },
            },
            vendedor: { select: { nombre: true, apellidos: true } },
          },
        }),
        prisma.pedido.findMany({
          where: {
            compradorId: userId,
            estado: { in: ['ACTIVO', 'PARCIALMENTE_CUBIERTO', 'TOTALMENTE_CUBIERTO'] },
            fechaEntregaDeseada: { lt: now },
          },
          include: {
            producto: { select: { nombre: true } },
            matches: {
              where: { estado: { in: ['ACEPTADO_VENDEDOR', 'PENDIENTE_PAGO', 'CONFIRMADO'] } },
              select: { cantidadKg: true },
            },
          },
        }),
      ]);

      type CalibreItem = { calibre: string; cantidad_kg: number };
      const computeCov = (calibres: unknown, committedKg: number) => {
        const items = (calibres as CalibreItem[]) ?? [];
        const totalKg = items.reduce((s, c) => s + (c.cantidad_kg ?? 0), 0);
        return { totalKg, coverage: totalKg > 0 ? Math.round((committedKg / totalKg) * 100) : 0 };
      };

      return {
        contracts: pendingContracts.map((m) => {
          const vendedor = (m.lote as unknown as { vendedor?: { nombre: string; apellidos: string } }).vendedor;
          return {
            matchId: m.id,
            orderId: m.pedido?.id ?? '',
            lotId: m.loteId,
            producto: m.lote?.producto?.nombre ?? 'N/D',
            counterpart: vendedor ? `${vendedor.nombre} ${vendedor.apellidos}`.trim() : 'N/D',
            cantidadKg: Number(m.cantidadKg),
          };
        }),
        offers: pendingOffers.map((m) => {
          const loteVendedor = (
            m.lote as unknown as { vendedor?: { nombre: string; apellidos: string } }
          ).vendedor;
          return {
            matchId: m.id,
            orderId: m.pedido?.id ?? '',
            producto: m.lote?.producto?.nombre ?? 'N/D',
            seller: loteVendedor
              ? `${loteVendedor.nombre} ${loteVendedor.apellidos}`.trim()
              : 'N/D',
            cantidadKg: Number(m.cantidadKg),
            precioKg: Number(m.precioKg),
          };
        }),
        deliveries: pendingDeliveries.map((tx) => ({
          txId: tx.id,
          orderId: tx.match?.pedido?.id ?? '',
          producto: tx.match?.lote?.producto?.nombre ?? 'N/D',
          seller: `${tx.vendedor?.nombre ?? ''} ${tx.vendedor?.apellidos ?? ''}`.trim(),
          cantidadKg: Number(tx.cantidadKg),
        })),
        photos: [],
        matches: [],
        expiredOrders: expiredOrdersRaw.map((o) => {
          const committedKg = o.matches.reduce((s, m) => s + Number(m.cantidadKg), 0);
          const { totalKg, coverage } = computeCov(o.calibresSolicitados, committedKg);
          return {
            orderId: o.id,
            producto: o.producto?.nombre ?? 'N/D',
            fechaEntrega: o.fechaEntregaDeseada.toISOString(),
            coverage,
            totalKg,
          };
        }),
        expiredLots: [],
      };
    }

    // VENDEDOR
    const [pendingContracts, pendingPhotos, pendingMatchOffers, expiredLotsRaw] = await Promise.all([
      // Phase 14M v3.30 — solo PENDIENTE_FIRMA_VENDEDOR Y pedido no cubierto.
      // Si el pedido ya está al 100 % por otros matches firmados+pagados, el
      // motor a veces deja sobrantes en estado PENDIENTE_FIRMA_VENDEDOR. No
      // tiene sentido pedir al vendedor que firme un contrato sobrante: la
      // cobertura del comprador ya está completa.
      prisma.match.findMany({
        where: {
          lote: { vendedorId: userId },
          contratoEstado: { in: ['PENDIENTE_FIRMA_VENDEDOR'] },
          pedido: { estado: { in: ['ACTIVO', 'PARCIALMENTE_CUBIERTO'] } },
        },
        include: {
          lote: { include: { producto: true } },
          pedido: {
            include: {
              comprador: { select: { nombre: true, apellidos: true } },
            },
          },
        },
      }),
      // Phase 14M v3.18 — flujo v2: tarea "marcar enviado" para vendedor.
      // Antes filtraba por qrToken (legacy v1 escrow) y nunca aparecía
      // ninguna tarea de envío en el flujo de comisión solo. Ahora la
      // condición correcta: contrato FIRMADO + transaccion.enviadoEn null.
      prisma.transaccion.findMany({
        where: {
          vendedorId: userId,
          enviadoEn: null,
          match: { contratoEstado: 'FIRMADO' },
        },
        include: {
          match: {
            include: {
              lote: { include: { producto: true } },
              pedido: { select: { id: true } },
            },
          },
          comprador: { select: { nombre: true, apellidos: true } },
        },
      }),
      // Phase 14M v3.27 — match offers a revisar: excluimos pedidos
      // cubiertos/cerrados/cancelados y matches escondidos por delay free.
      // Antes mostraba "1 match to review" del pedido ya cubierto al 100%.
      prisma.match.findMany({
        where: {
          lote: { vendedorId: userId },
          estado: { in: ['PROPUESTO', 'ENVIADO_VENDEDOR'] },
          visibleDesde: { lte: now },
          pedido: { estado: { in: ['ACTIVO', 'PARCIALMENTE_CUBIERTO'] } },
        },
        include: {
          lote: { include: { producto: true } },
          pedido: {
            include: {
              comprador: { select: { nombre: true, apellidos: true } },
            },
          },
        },
      }),
      prisma.lote.findMany({
        where: {
          vendedorId: userId,
          estado: { in: ['ACTIVO', 'PARCIALMENTE_VENDIDO'] },
          fechaFinDisponibilidad: { not: null, lt: now },
        },
        include: {
          producto: { select: { nombre: true } },
          matches: {
            where: { estado: { in: ['ACEPTADO_VENDEDOR', 'PENDIENTE_PAGO', 'CONFIRMADO'] } },
            select: { cantidadKg: true },
          },
        },
      }),
    ]);

    // Phase 14M v3.18 — pendingPhotos ahora es la lista de transacciones a
    // marcar como enviadas (flujo v2). Antes filtraba por fotosLoteUrls
    // vacío (legacy v1, fotos del lote en R2). Mantenemos el nombre del
    // bucket "photos" en la API para no romper el front pero su
    // semántica cambió: ahora son "marcar enviado".
    const photoPending = pendingPhotos;

    type CalibreItem = { calibre: string; cantidad_kg: number };
    const computeCov = (calibres: unknown, committedKg: number) => {
      const items = (calibres as CalibreItem[]) ?? [];
      const totalKg = items.reduce((s, c) => s + (c.cantidad_kg ?? 0), 0);
      return { totalKg, coverage: totalKg > 0 ? Math.round((committedKg / totalKg) * 100) : 0 };
    };

    return {
      contracts: pendingContracts.map((m) => ({
        matchId: m.id,
        orderId: m.pedido?.id ?? '',
        lotId: m.loteId,
        producto: m.lote?.producto?.nombre ?? 'N/D',
        counterpart: `${m.pedido?.comprador?.nombre ?? ''} ${m.pedido?.comprador?.apellidos ?? ''}`.trim(),
        cantidadKg: Number(m.cantidadKg),
      })),
      offers: [],
      deliveries: [],
      photos: photoPending.map((tx) => ({
        txId: tx.id,
        lotId: tx.match?.loteId ?? '',
        producto: tx.match?.lote?.producto?.nombre ?? 'N/D',
        buyer: `${tx.comprador?.nombre ?? ''} ${tx.comprador?.apellidos ?? ''}`.trim(),
        cantidadKg: Number(tx.cantidadKg),
      })),
      matches: pendingMatchOffers.map((m) => ({
        matchId: m.id,
        lotId: m.loteId,
        producto: m.lote?.producto?.nombre ?? 'N/D',
        buyer:
          `${m.pedido?.comprador?.nombre ?? ''} ${m.pedido?.comprador?.apellidos ?? ''}`.trim(),
        cantidadKg: Number(m.cantidadKg),
        precioKg: Number(m.precioKg),
      })),
      expiredOrders: [],
      expiredLots: expiredLotsRaw.map((l) => {
        const committedKg = l.matches.reduce((s, m) => s + Number(m.cantidadKg), 0);
        const { totalKg, coverage } = computeCov(l.calibres, committedKg);
        return {
          lotId: l.id,
          producto: l.producto?.nombre ?? 'N/D',
          fechaFin: l.fechaFinDisponibilidad!.toISOString(),
          coverage,
          totalKg,
        };
      }),
    };
  }

  async extendOrderDeadline(orderId: string, userId: string, newDate: string) {
    const order = await prisma.pedido.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError('Pedido no encontrado', 404);
    if (order.compradorId !== userId) throw new AppError('No autorizado', 403);
    const parsed = parseFutureDate(newDate);
    return prisma.pedido.update({
      where: { id: orderId },
      data: { fechaEntregaDeseada: parsed },
    });
  }

  async closeOrder(orderId: string, userId: string) {
    const order = await prisma.pedido.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError('Pedido no encontrado', 404);
    if (order.compradorId !== userId) throw new AppError('No autorizado', 403);
    return prisma.pedido.update({
      where: { id: orderId },
      data: { estado: 'CANCELADO' },
    });
  }

  async extendLotDeadline(lotId: string, userId: string, newDate: string) {
    const lot = await prisma.lote.findUnique({ where: { id: lotId } });
    if (!lot) throw new AppError('Lote no encontrado', 404);
    if (lot.vendedorId !== userId) throw new AppError('No autorizado', 403);
    const parsed = parseFutureDate(newDate);
    return prisma.lote.update({
      where: { id: lotId },
      data: { fechaFinDisponibilidad: parsed },
    });
  }

  async closeLot(lotId: string, userId: string) {
    const lot = await prisma.lote.findUnique({ where: { id: lotId } });
    if (!lot) throw new AppError('Lote no encontrado', 404);
    if (lot.vendedorId !== userId) throw new AppError('No autorizado', 403);
    return prisma.lote.update({
      where: { id: lotId },
      data: { estado: 'CANCELADO' },
    });
  }

  /**
   * Recomputes `visibleDesde` for every active match where the user is either
   * the seller (lote.vendedorId) or the buyer (pedido.compradorId).
   *
   * Called after a subscription estado/plan change so that:
   *   - Free → Paid: matches that were delayed 24h become visible immediately
   *     IF the counterparty is also paid (max-of-both rule still applies).
   *   - Paid → Free: existing matches keep their original visibleDesde (we
   *     don't retro-delay matches that were already shown — that would be
   *     a worse UX than instantly hiding them).
   *
   * Idempotent: only writes when the new visibleDesde differs from the
   * stored one.
   */
  async recomputeMatchVisibilityForUser(userId: string): Promise<{ updated: number }> {
    // Pull all active matches touching this user, in both directions.
    const matches = await prisma.match.findMany({
      where: {
        estado: { in: ['PROPUESTO', 'ENVIADO_VENDEDOR', 'ACEPTADO_VENDEDOR'] },
        OR: [
          { lote: { vendedorId: userId } },
          { pedido: { compradorId: userId } },
        ],
      },
      select: {
        id: true,
        createdAt: true,
        visibleDesde: true,
        lote: { select: { vendedorId: true } },
        pedido: { select: { compradorId: true } },
      },
    });

    if (matches.length === 0) return { updated: 0 };

    // Group by (vendedorId, compradorId) so we minimize delay lookups
    // (one delay calc per unique pair, not per match).
    const delayCache = new Map<string, number>();
    let updated = 0;

    for (const m of matches) {
      const key = `${m.lote.vendedorId}|${m.pedido.compradorId}`;
      let delay = delayCache.get(key);
      if (delay === undefined) {
        delay = await getMatchDelayMs(m.lote.vendedorId, m.pedido.compradorId);
        delayCache.set(key, delay);
      }

      const newVisibleDesde = new Date(m.createdAt.getTime() + delay);

      // Only retro-update if the new visibility is EARLIER than the stored one.
      // (We never retro-hide a match that was already visible.)
      if (newVisibleDesde.getTime() < m.visibleDesde.getTime()) {
        await prisma.match.update({
          where: { id: m.id },
          data: { visibleDesde: newVisibleDesde },
        });
        updated++;
      }
    }

    if (updated > 0) {
      console.log(`[matching] Recomputed visibility for user ${userId}: ${updated} match(es) now visible earlier`);
    }
    return { updated };
  }

  /**
   * Auto-distribute preview for a seller.
   *
   * Returns a per-lot greedy allocation of pending PROPUESTO/ENVIADO_VENDEDOR
   * matches, ranked by total order revenue (highest first), respecting:
   *   - Remaining lot capacity per calibre (subtracts existing ACEPTADO/
   *     PENDIENTE/CONFIRMADO matches that already hold inventory)
   *   - Each order's remaining demand per calibre (subtracts what the
   *     order has already covered from other matches)
   *   - Price fit (lote.precio_min_kg <= pedido.precio_max_kg)
   *
   * The frontend renders this as an editable preview. On confirm, the
   * client fires individual /contribute calls — this endpoint only
   * computes; it doesn't mutate.
   */
  async getAutoDistributePreview(vendedorId: string): Promise<{
    lots: Array<{
      loteId: string;
      productoNombre: string;
      totalLoteKg: number;
      remainingKg: number;
      allocations: Array<{
        matchId: string;
        pedidoId: string;
        pedidoIdShort: string;
        compradorNombre: string;
        compradorEmpresa: string | null;
        calibres: Array<{ calibre: string; cantidad_kg: number; precio_kg: number; max_kg: number }>;
        totalKg: number;
        totalRevenue: number;
        avgPrecioKg: number;
      }>;
    }>;
  }> {
    // 1) Pull all pending matches for this seller's lots
    const pending = await prisma.match.findMany({
      where: {
        lote: { vendedorId, estado: { not: 'VENDIDO' } },
        pedido: { estado: { notIn: ['TOTALMENTE_CUBIERTO', 'CANCELADO', 'CERRADO'] } },
        estado: { in: ['PROPUESTO', 'ENVIADO_VENDEDOR'] },
        visibleDesde: { lte: new Date() },
      },
      include: {
        lote: {
          select: {
            id: true,
            calibres: true,
            producto: { select: { nombre: true } },
          },
        },
        pedido: {
          select: {
            id: true,
            calibresSolicitados: true,
            comprador: {
              select: {
                nombre: true,
                apellidos: true,
                empresa: { select: { razonSocial: true } },
              },
            },
          },
        },
      },
    });

    if (pending.length === 0) return { lots: [] };

    // 2) Pre-compute per-lot committed (other active matches not in the pending set)
    //    and per-pedido covered, so we know remaining capacity.
    const loteIds = [...new Set(pending.map((m) => m.lote.id))];
    const pedidoIds = [...new Set(pending.map((m) => m.pedido.id))];

    const lotCommitments = await prisma.match.findMany({
      where: {
        loteId: { in: loteIds },
        estado: { in: CAPACITY_HOLDING_ESTADOS },
      },
      select: { loteId: true, calibresJson: true },
    });
    const lotCommittedByCalibre = new Map<string, Map<string, number>>();
    for (const m of lotCommitments) {
      const map = lotCommittedByCalibre.get(m.loteId) ?? new Map<string, number>();
      const arr = (m.calibresJson as unknown as MatchCalibresJsonEntry[]) ?? [];
      for (const c of arr) {
        map.set(c.calibre, (map.get(c.calibre) ?? 0) + Number(c.cantidad_kg ?? 0));
      }
      lotCommittedByCalibre.set(m.loteId, map);
    }

    const pedidoCommitments = await prisma.match.findMany({
      where: {
        pedidoId: { in: pedidoIds },
        estado: { in: CAPACITY_HOLDING_ESTADOS },
      },
      select: { pedidoId: true, calibresJson: true },
    });
    const pedidoCommittedByCalibre = new Map<string, Map<string, number>>();
    for (const m of pedidoCommitments) {
      const map = pedidoCommittedByCalibre.get(m.pedidoId) ?? new Map<string, number>();
      const arr = (m.calibresJson as unknown as MatchCalibresJsonEntry[]) ?? [];
      for (const c of arr) {
        map.set(c.calibre, (map.get(c.calibre) ?? 0) + Number(c.cantidad_kg ?? 0));
      }
      pedidoCommittedByCalibre.set(m.pedidoId, map);
    }

    // 3) Group pending matches by lote
    const byLote = new Map<string, typeof pending>();
    for (const m of pending) {
      const arr = byLote.get(m.lote.id) ?? [];
      arr.push(m);
      byLote.set(m.lote.id, arr);
    }

    const result: Awaited<ReturnType<MatchingService['getAutoDistributePreview']>>['lots'] = [];

    for (const [loteId, lotMatches] of byLote) {
      const firstMatch = lotMatches[0];
      if (!firstMatch) continue;
      const loteCalibres = toLoteCalibre(firstMatch.lote.calibres);
      const loteCommitted = lotCommittedByCalibre.get(loteId) ?? new Map();
      const remainingByCalibre = new Map<string, number>();
      let totalLoteKg = 0;
      for (const lc of loteCalibres) {
        totalLoteKg += lc.cantidad_kg;
        remainingByCalibre.set(lc.calibre, Math.max(0, lc.cantidad_kg - (loteCommitted.get(lc.calibre) ?? 0)));
      }

      // 4) Score each candidate match by its potential revenue
      const candidates = lotMatches.map((m) => {
        const pedidoCalibres = toPedidoCalibre(m.pedido.calibresSolicitados);
        const pedidoCommitted = pedidoCommittedByCalibre.get(m.pedido.id) ?? new Map();
        // For each compatible calibre, what kg COULD this match take and what's the revenue?
        const lines: Array<{ calibre: string; max_kg: number; precio_kg: number }> = [];
        let potentialRevenue = 0;
        for (const lc of loteCalibres) {
          const pc = pedidoCalibres.find((p) => p.calibre === lc.calibre);
          if (!pc) continue;
          if (lc.precio_min_kg > pc.precio_max_kg) continue; // price doesn't fit
          const lotRem = remainingByCalibre.get(lc.calibre) ?? 0;
          const pedidoRem = Math.max(0, pc.cantidad_kg - (pedidoCommitted.get(lc.calibre) ?? 0));
          const max_kg = Math.min(lotRem, pedidoRem);
          if (max_kg <= 0) continue;
          lines.push({ calibre: lc.calibre, max_kg, precio_kg: pc.precio_max_kg });
          potentialRevenue += max_kg * pc.precio_max_kg;
        }
        return { match: m, lines, potentialRevenue };
      })
      .filter((c) => c.lines.length > 0)
      .sort((a, b) => b.potentialRevenue - a.potentialRevenue);

      // 5) Greedy allocate top-down, decrementing remainingByCalibre as we go
      const allocations: Array<{
        matchId: string;
        pedidoId: string;
        pedidoIdShort: string;
        compradorNombre: string;
        compradorEmpresa: string | null;
        calibres: Array<{ calibre: string; cantidad_kg: number; precio_kg: number; max_kg: number }>;
        totalKg: number;
        totalRevenue: number;
        avgPrecioKg: number;
      }> = [];

      for (const c of candidates) {
        const allocCalibres: Array<{ calibre: string; cantidad_kg: number; precio_kg: number; max_kg: number }> = [];
        let allocTotalKg = 0;
        let allocRevenue = 0;
        for (const line of c.lines) {
          const lotRem = remainingByCalibre.get(line.calibre) ?? 0;
          if (lotRem <= 0) continue;
          const take = Math.min(line.max_kg, lotRem);
          if (take <= 0) continue;
          allocCalibres.push({
            calibre: line.calibre,
            cantidad_kg: Math.round(take * 100) / 100,
            precio_kg: line.precio_kg,
            max_kg: line.max_kg,
          });
          allocTotalKg += take;
          allocRevenue += take * line.precio_kg;
          remainingByCalibre.set(line.calibre, lotRem - take);
        }
        if (allocCalibres.length === 0) continue;

        const comp = c.match.pedido.comprador;
        allocations.push({
          matchId: c.match.id,
          pedidoId: c.match.pedido.id,
          pedidoIdShort: c.match.pedido.id.slice(-5).toUpperCase(),
          compradorNombre: `${comp.nombre} ${comp.apellidos}`.trim(),
          compradorEmpresa: comp.empresa?.razonSocial ?? null,
          calibres: allocCalibres,
          totalKg: Math.round(allocTotalKg * 100) / 100,
          totalRevenue: Math.round(allocRevenue * 100) / 100,
          avgPrecioKg: allocTotalKg > 0 ? Math.round((allocRevenue / allocTotalKg) * 1000) / 1000 : 0,
        });
      }

      if (allocations.length === 0) continue;

      const remainingKg = Array.from(remainingByCalibre.values()).reduce((s, v) => s + v, 0);

      result.push({
        loteId,
        productoNombre: firstMatch.lote.producto?.nombre ?? '—',
        totalLoteKg: Math.round(totalLoteKg * 100) / 100,
        remainingKg: Math.round(remainingKg * 100) / 100,
        allocations,
      });
    }

    return { lots: result };
  }

  // ─── Phase 7 — "Ofertas similares" (solo vendedor) ──────────────────────────
  //
  // For each active lote of the seller, find pedidos in the SAME producto that
  // are NOT already matched to one of the seller's lotes. For each candidate,
  // compute a structured diff vs the seller's best-matching lote so the UI can
  // show chips like "Incoterm: DAP → necesita FCA" or "Calibre 5 falta".
  //
  // The buyer side intentionally has NO equivalent endpoint — buyers don't
  // browse the marketplace; they only see offers vendors send them.

  async getSimilarOffersForSeller(vendedorId: string): Promise<SimilarOfferDTO[]> {
    // 1) Load the seller's active lotes with the fields needed for diffing.
    const lotes = await prisma.lote.findMany({
      where: {
        vendedorId,
        estado: { in: ['ACTIVO', 'PARCIALMENTE_VENDIDO'] },
      },
      select: {
        id: true,
        productoId: true,
        variedadId: true,
        calibres: true,
        logistica: true,
        incotermsAceptados: true,
        terminosPagoAceptados: true,
        coordenadasLat: true,
        coordenadasLng: true,
      },
    });
    if (lotes.length === 0) return [];
    const productIds = [...new Set(lotes.map((l) => l.productoId))];

    // 2) Exclude pedidos already actively matched to ANY of the seller's
    //    lotes — but ALLOW pedidos previously refused/cancelled, so the
    //    vendedor can revisit if they changed their mind. Phase 12 fix:
    //    previously we excluded ALL matches regardless of estado, which
    //    suppressed valid re-engagement opportunities.
    const matchedPedidos = await prisma.match.findMany({
      where: {
        lote: { vendedorId },
        estado: {
          notIn: [
            // Re-show pedidos whose match was rejected — seller may want to
            // reconsider with updated lot terms.
            'RECHAZADO_VENDEDOR',
            'CANCELADO',
          ],
        },
      },
      select: { pedidoId: true },
    });
    const excludeIds = new Set(matchedPedidos.map((m) => m.pedidoId));

    // 3) Find active pedidos for those products.
    const pedidos = await prisma.pedido.findMany({
      where: {
        productoId: { in: productIds },
        estado: { in: ['ACTIVO', 'PARCIALMENTE_CUBIERTO'] },
        ...(excludeIds.size > 0 ? { id: { notIn: [...excludeIds] } } : {}),
        // Exclude obviously expired pedidos so we don't waste seller attention.
        fechaEntregaDeseada: { gte: new Date() },
      },
      include: {
        producto: { select: { nombre: true } },
        variedad: { select: { nombre: true } },
        comprador: {
          select: {
            nombre: true,
            apellidos: true,
            empresa: { select: { razonSocial: true } },
          },
        },
      },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    // 4) For each pedido, find the seller's best lote candidate (same producto,
    //    preferring same variedad) and compute the diff.
    const out: SimilarOfferDTO[] = [];
    for (const ped of pedidos) {
      const sameProductLotes = lotes.filter((l) => l.productoId === ped.productoId);
      if (sameProductLotes.length === 0) continue;
      // Prefer a lote that also matches variedad (when buyer specified one),
      // else fall back to the first lote of the same producto.
      const lote = ped.variedadId
        ? (sameProductLotes.find((l) => l.variedadId === ped.variedadId) ?? sameProductLotes[0]!)
        : sameProductLotes[0]!;

      const diff = computeSimilarDiff(lote, ped);
      if (diff.changes.length === 0) continue; // Would be perfect — skip.

      const empresa = ped.comprador?.empresa?.razonSocial ?? null;
      const compradorNombre = `${ped.comprador?.nombre ?? ''} ${ped.comprador?.apellidos ?? ''}`.trim();

      out.push({
        pedidoId: ped.id,
        loteId: lote.id,
        productoNombre: ped.producto?.nombre ?? '',
        variedadNombre: ped.variedad?.nombre ?? null,
        compradorEmpresa: empresa,
        compradorNombre: compradorNombre || 'N/D',
        destinoFinal: ped.destinoFinal,
        fechaEntregaDeseada: ped.fechaEntregaDeseada.toISOString(),
        diff,
      });
    }

    // 5) Rank: severity asc (so "easy" wins surface first), then most recent.
    const severityOrder = { minor: 0, moderate: 1, major: 2 } as const;
    out.sort((a, b) => severityOrder[a.diff.severity] - severityOrder[b.diff.severity]);
    return out;
  }
}

// ─── Phase 7 helpers (module-level so they're not class methods) ─────────────

interface DiffChange {
  field: 'calibre' | 'incoterm' | 'logistica' | 'precio' | 'terminoPago';
  /** Short label for the chip, e.g. "Incoterm: DAP → FCA". */
  label: string;
  /** Short hint for the seller on what to do, e.g. "Acepta DAP en tu lote". */
  hint: string;
}

interface SimilarDiff {
  changes: DiffChange[];
  severity: 'minor' | 'moderate' | 'major';
}

interface SimilarOfferDTO {
  pedidoId: string;
  loteId: string;
  productoNombre: string;
  variedadNombre: string | null;
  compradorEmpresa: string | null;
  compradorNombre: string;
  destinoFinal: string | null;
  fechaEntregaDeseada: string;
  diff: SimilarDiff;
}

interface LoteSlim {
  id: string;
  calibres: unknown;
  logistica: 'YO_ENVIO' | 'OTRO_RECOGE' | 'INDIFERENTE';
  incotermsAceptados: unknown;
  terminosPagoAceptados: unknown;
}

interface PedidoSlim {
  incoterm: string;
  calibresSolicitados: unknown;
  logistica: 'YO_ENVIO' | 'OTRO_RECOGE' | 'INDIFERENTE';
  incotermsAceptados: unknown;
  terminosPagoAceptados: unknown;
}

function toArr<T>(json: unknown): T[] {
  return Array.isArray(json) ? (json as T[]) : [];
}

/**
 * Computes the structured diff between a seller's lote and a buyer's pedido
 * that already share producto. Used to surface "ofertas similares" to the
 * seller with actionable chips ("change incoterm" / "add calibre X").
 */
function computeSimilarDiff(lote: LoteSlim, pedido: PedidoSlim): SimilarDiff {
  const changes: DiffChange[] = [];

  // ── Incoterm: is the buyer's main incoterm acceptable to the seller? ──────
  const sellerAcceptedIncoterms = toArr<string>(lote.incotermsAceptados);
  const buyerAcceptedIncoterms = toArr<string>(pedido.incotermsAceptados);
  // If the seller's accepted list is empty, treat as "accepts all" (legacy).
  const sellerAcceptsAll = sellerAcceptedIncoterms.length === 0;
  const intersect = sellerAcceptsAll
    ? [pedido.incoterm, ...buyerAcceptedIncoterms]
    : sellerAcceptedIncoterms.filter((i) =>
        i === pedido.incoterm || buyerAcceptedIncoterms.includes(i),
      );
  if (intersect.length === 0) {
    changes.push({
      field: 'incoterm',
      label: `Incoterm: pide ${pedido.incoterm}, no lo aceptas`,
      hint: `Acepta ${pedido.incoterm} en tu lote para encajar.`,
    });
  }

  // ── Logística: YO_ENVIO vs OTRO_RECOGE → fuerte; INDIFERENTE en cualquiera ok
  if (
    lote.logistica !== 'INDIFERENTE'
    && pedido.logistica !== 'INDIFERENTE'
    && lote.logistica !== pedido.logistica
  ) {
    changes.push({
      field: 'logistica',
      label: `Logística: ${lote.logistica} vs ${pedido.logistica}`,
      hint: `Cambia tu logística a INDIFERENTE o ${pedido.logistica}.`,
    });
  }

  // ── Términos de pago: intersección. Si vacía, conflicto. ─────────────────
  const sellerPagos = toArr<string>(lote.terminosPagoAceptados);
  const buyerPagos = toArr<string>(pedido.terminosPagoAceptados);
  if (sellerPagos.length > 0 && buyerPagos.length > 0) {
    const inter = sellerPagos.filter((t) => buyerPagos.includes(t));
    if (inter.length === 0) {
      changes.push({
        field: 'terminoPago',
        label: `Pago: tú aceptas [${sellerPagos.join(', ')}], pide [${buyerPagos.join(', ')}]`,
        hint: `Amplía los términos de pago aceptados para incluir ${buyerPagos[0]}.`,
      });
    }
  }

  // ── Calibres: cuáles del pedido no están en el lote, y diff de precio ────
  const loteCalibres = toArr<LoteCalibre>(lote.calibres);
  const pedidoCalibres = toArr<PedidoCalibre>(pedido.calibresSolicitados);
  const loteCalNames = new Set(loteCalibres.map((c) => c.calibre));

  const missing = pedidoCalibres.filter((p) => !loteCalNames.has(p.calibre));
  if (missing.length > 0) {
    changes.push({
      field: 'calibre',
      label: `Faltan calibres: ${missing.map((c) => c.calibre).join(', ')}`,
      hint: `Añade estos calibres a tu lote para que encaje.`,
    });
  }

  // Phase 12 — Diff de cantidad agregada. Si el pedido pide mucho más que lo
  // disponible en el lote, marca la brecha para que el vendedor sepa que
  // tendría que ampliar el lote o cubrir parcialmente.
  const loteKgTotal = loteCalibres.reduce((s, c) => s + Number(c.cantidad_kg ?? 0), 0);
  const pedidoKgTotal = pedidoCalibres.reduce((s, c) => s + Number(c.cantidad_kg ?? 0), 0);
  if (loteKgTotal > 0 && pedidoKgTotal > 0) {
    const ratio = pedidoKgTotal / loteKgTotal;
    if (ratio > 1.5) {
      const deficit = pedidoKgTotal - loteKgTotal;
      changes.push({
        field: 'calibre', // reuse field; UI groups everything calibre-side
        label: `Pide ${pedidoKgTotal.toLocaleString('es-ES')} kg, tu lote tiene ${loteKgTotal.toLocaleString('es-ES')} kg`,
        hint: `Faltarían ${deficit.toLocaleString('es-ES')} kg en tu lote — sólo podrías cubrir parte.`,
      });
    }
  }

  // Precio: para los calibres que SÍ coinciden, hay gap si el max del comprador
  // < el min del vendedor.
  const matched = pedidoCalibres
    .map((p) => ({ p, l: loteCalibres.find((l) => l.calibre === p.calibre) }))
    .filter((x): x is { p: PedidoCalibre; l: LoteCalibre } => x.l != null);

  const priceGaps: string[] = [];
  for (const { p, l } of matched) {
    if (l.precio_min_kg > p.precio_max_kg) {
      const gap = l.precio_min_kg - p.precio_max_kg;
      priceGaps.push(`cal.${p.calibre}: +€${gap.toFixed(2)}/kg`);
    }
  }
  if (priceGaps.length > 0) {
    changes.push({
      field: 'precio',
      label: `Precio: pide menos del que ofreces (${priceGaps.join(', ')})`,
      hint: 'Considera bajar el precio mínimo o negociar en chat.',
    });
  }

  // ── Severity heuristic ───────────────────────────────────────────────────
  // - minor: 1 change, no calibre missing, no logística conflict
  // - moderate: 2 changes total OR 1 with calibre missing
  // - major: ≥3 changes OR price gap + logística conflict
  const fields = new Set(changes.map((c) => c.field));
  const hasMajor = fields.has('logistica') && (fields.has('precio') || fields.has('calibre'));
  let severity: SimilarDiff['severity'];
  if (changes.length === 0) severity = 'minor';
  else if (changes.length >= 3 || hasMajor) severity = 'major';
  else if (changes.length === 2 || fields.has('calibre')) severity = 'moderate';
  else severity = 'minor';

  return { changes, severity };
}

export const matchingService = new MatchingService();
