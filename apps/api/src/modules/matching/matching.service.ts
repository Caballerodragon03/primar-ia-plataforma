import { prisma } from '@primaria/database';
import type { Lote, Pedido, Match, LoteEstado, TransaccionEstado, MatchEstado } from '@primaria/database';
import { AppError } from '../../middleware/error.middleware.js';
import type { ContributeInput } from './matching.schema.js';
import { sendMatchProposalEmail } from '../../shared/emails/transactional.js';
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

  // Uncalibrated: treat the lot as a single bucket, clamp to total buyer
  // remaining capacity across all calibres.
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

  // 3. Calibre y precio compatibles (lotes sin calibrar se saltan esta comprobación)
  const loteCalibres = toLoteCalibre(lote.calibres);
  const pedidoCalibres = toPedidoCalibre(pedido.calibresSolicitados);
  if (!isUncalibratedLot(loteCalibres)) {
    const hasPriceFit = pedidoCalibres.some((pc) => {
      const lc = loteCalibres.find((l) => l.calibre === pc.calibre);
      return lc != null && lc.precio_min_kg <= pc.precio_max_kg;
    });
    if (!hasPriceFit) return false;
  }

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

  for (const contrib of contribucion) {
    const pc = pedidoCalibres.find((p) => p.calibre === contrib.calibre);
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
      // accepted (estado past PROPUESTO/ENVIADO_VENDEDOR).
      const delay = await getMatchDelayMs(lote.vendedorId, pedido.compradorId);
      const visibleDesde = new Date(Date.now() + delay);

      const match = await prisma.$transaction(async (tx) => {
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
      }, { isolationLevel: 'Serializable' });

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
      scored.sort((a, b) => {
        const aUncal = isUncalibratedLot(toLoteCalibre(a.lote.calibres)) ? 1 : 0;
        const bUncal = isUncalibratedLot(toLoteCalibre(b.lote.calibres)) ? 1 : 0;
        if (aUncal !== bUncal) return aUncal - bUncal;
        const precioA = Math.min(...toLoteCalibre(a.lote.calibres).map((c) => c.precio_min_kg));
        const precioB = Math.min(...toLoteCalibre(b.lote.calibres).map((c) => c.precio_min_kg));
        return precioA - precioB;
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

      const delay = await getMatchDelayMs(lote.vendedorId, pedido.compradorId);
      const visibleDesde = new Date(Date.now() + delay);

      // Capacity clamp + upsert inside a transaction (see runMatchingForLot
      // for rationale). Also guard against overwriting accepted matches.
      const match = await prisma.$transaction(async (tx) => {
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
      }, { isolationLevel: 'Serializable' });

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
        lote: { vendedorId, estado: { not: 'VENDIDO' } },
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
                empresa: {
                  select: { razonSocial: true },
                },
              },
            },
          },
        },
      },
      orderBy:
        sortBy === 'precio'
          ? { precioKg: 'asc' }
          : { scoreMatching: 'desc' },
    });

    return matches.map((m) => ({
      ...m,
      indiceRentabilidad: Math.round((m.scoreMatching ?? 0) * 100),
    })) as MatchWithScore[];
  }

  /**
   * El vendedor acepta contribuir a un pedido con calibres específicos.
   */
  async contributeToOrder(
    vendedorId: string,
    matchId: string,
    calibresContribucion: ContributeInput['calibresContribucion']
  ): Promise<Match> {
    const updatedMatch = await prisma.$transaction(
      async (tx) => {
        const match = await tx.match.findUnique({
          where: { id: matchId },
          include: {
            lote: true,
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
        if (!['PROPUESTO', 'ENVIADO_VENDEDOR'].includes(match.estado)) {
          throw new AppError('El match no está en un estado aceptable para contribuir', 400);
        }

        const loteCalibres = toLoteCalibre(match.lote.calibres);

        for (const contrib of calibresContribucion) {
          const lc = loteCalibres.find((l) => l.calibre === contrib.calibre);
          if (!lc) {
            throw new AppError(`Calibre "${contrib.calibre}" no existe en el lote`, 400);
          }
          if (contrib.cantidad_kg > lc.cantidad_kg) {
            throw new AppError(
              `Calibre "${contrib.calibre}": cantidad solicitada (${contrib.cantidad_kg} kg) supera la disponible (${lc.cantidad_kg} kg)`,
              400
            );
          }
        }

        const pedidoCalibres = toPedidoCalibre(match.pedido.calibresSolicitados);
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

        const loteMatchesAgg = await tx.match.aggregate({
          where: {
            loteId: match.loteId,
            estado: { in: ['ACEPTADO_VENDEDOR', 'PENDIENTE_PAGO', 'CONFIRMADO'] },
            id: { not: matchId },
          },
          _sum: { cantidadKg: true },
        });
        const loteOtherKg = Number(loteMatchesAgg._sum.cantidadKg ?? 0);
        const loteTotalCommittedKg = loteOtherKg + cantidadKg;
        const loteTotalKg = loteCalibres.reduce((s, c) => s + c.cantidad_kg, 0);
        const loteCoverage = loteTotalKg > 0 ? loteTotalCommittedKg / loteTotalKg : 0;

        const nuevaLoteEstado: LoteEstado =
          loteCoverage >= 1
            ? 'VENDIDO'
            : loteCoverage > 0
              ? 'PARCIALMENTE_VENDIDO'
              : (match.lote.estado as LoteEstado);

        if (nuevaLoteEstado !== match.lote.estado) {
          await tx.lote.update({
            where: { id: match.loteId },
            data: { estado: nuevaLoteEstado },
          });
        }

        const existingTx = await tx.transaccion.findUnique({ where: { matchId } });
        if (!existingTx) {
          const precioTotal = cantidadKg * precioKg;
          const commission = calcularComision(precioTotal, 'card');
          await tx.transaccion.create({
            data: {
              matchId,
              vendedorId: match.lote.vendedorId,
              compradorId: match.pedido.compradorId,
              cantidadKg,
              precioTotal,
              comisionPlataforma: commission.total,
              comisionPorcentaje: commission.porcentaje,
              estado: 'PENDIENTE_PAGO',
            },
          });
        }

        return result;
      },
      { isolationLevel: 'Serializable' }
    );

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
    expiredOrders: number;
    expiredLots: number;
    firstPendingOfferOrderId?: string;
    firstPendingContractOrderId?: string;
    firstPendingContractTxId?: string;
    firstPendingDeliveryOrderId?: string;
    firstPendingDeliveryTxId?: string;
    firstPendingContractLotId?: string;
    firstPendingContractSellerTxId?: string;
    firstPendingPhotosLotId?: string;
    firstPendingPhotosTxId?: string;
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

      const [firstOffer, firstContract, firstDelivery] = await Promise.all([
        prisma.match.findFirst({
          where: unauthorizedOfferWhere,
          select: { pedidoId: true },
        }),
        prisma.transaccion.findFirst({
          where: {
            compradorId: userId,
            firmaComprador: null,
            estado: { in: ['PENDIENTE_PAGO', 'PAGO_CAPTURADO', 'EN_TRANSITO'] },
          },
          select: { id: true, match: { select: { pedidoId: true } } },
        }),
        prisma.transaccion.findFirst({
          where: {
            compradorId: userId,
            qrToken: { not: null },
            qrUsado: false,
            firmaVendedor: { not: null },
          },
          select: { id: true, match: { select: { pedidoId: true } } },
        }),
      ]);

      const now = new Date();
      const [pendingOffers, pendingContracts, pendingDeliveries, expiredOrders] = await Promise.all([
        prisma.match.count({ where: unauthorizedOfferWhere }),
        prisma.transaccion.count({
          where: {
            compradorId: userId,
            firmaComprador: null,
            estado: { in: ['PENDIENTE_PAGO', 'PAGO_CAPTURADO', 'EN_TRANSITO'] },
          },
        }),
        prisma.transaccion.count({
          where: {
            compradorId: userId,
            qrToken: { not: null },
            qrUsado: false,
            firmaVendedor: { not: null },
          },
        }),
        prisma.pedido.count({
          where: {
            compradorId: userId,
            estado: { in: ['ACTIVO', 'PARCIALMENTE_CUBIERTO', 'TOTALMENTE_CUBIERTO'] },
            fechaEntregaDeseada: { lt: now },
          },
        }),
      ]);

      return {
        pendingOffers,
        pendingMatches: 0,
        unreadMessages,
        pendingContracts,
        pendingPhotos: 0,
        pendingDeliveries,
        expiredOrders,
        expiredLots: 0,
        firstPendingOfferOrderId: firstOffer?.pedidoId,
        firstPendingContractOrderId: firstContract?.match?.pedidoId,
        firstPendingContractTxId: firstContract?.id,
        firstPendingDeliveryOrderId: firstDelivery?.match?.pedidoId,
        firstPendingDeliveryTxId: firstDelivery?.id,
      };
    }

    // VENDEDOR
    const [firstContract, signedTxsWithPhotos, pendingMatches] = await Promise.all([
      prisma.transaccion.findFirst({
        where: {
          vendedorId: userId,
          firmaComprador: { not: null },
          firmaVendedor: null,
        },
        select: { id: true, match: { select: { loteId: true } } },
      }),
      prisma.transaccion.findMany({
        where: {
          vendedorId: userId,
          firmaVendedor: { not: null },
          firmaComprador: { not: null },
          qrToken: { not: null },
          qrUsado: false,
        },
        select: { id: true, fotosLoteUrls: true, match: { select: { loteId: true } } },
      }),
      prisma.match.count({
        where: {
          lote: { vendedorId: userId, estado: { not: 'VENDIDO' } },
          estado: { in: ['PROPUESTO', 'ENVIADO_VENDEDOR'] },
        },
      }),
    ]);

    const now = new Date();
    const [pendingContracts, expiredLots] = await Promise.all([
      prisma.transaccion.count({
        where: {
          vendedorId: userId,
          firmaComprador: { not: null },
          firmaVendedor: null,
        },
      }),
      prisma.lote.count({
        where: {
          vendedorId: userId,
          estado: { in: ['ACTIVO', 'PARCIALMENTE_VENDIDO'] },
          fechaFinDisponibilidad: { not: null, lt: now },
        },
      }),
    ]);

    const pendingPhotosTxs = signedTxsWithPhotos.filter((tx) => {
      const urls = tx.fotosLoteUrls as string[] | null;
      return !urls || (urls as string[]).length === 0;
    });
    const pendingPhotos = pendingPhotosTxs.length;
    const firstPhotoPending = pendingPhotosTxs[0];

    return {
      pendingOffers: 0,
      pendingMatches,
      unreadMessages,
      pendingContracts,
      pendingPhotos,
      pendingDeliveries: 0,
      expiredOrders: 0,
      expiredLots,
      firstPendingContractLotId: firstContract?.match?.loteId,
      firstPendingContractSellerTxId: firstContract?.id,
      firstPendingPhotosLotId: firstPhotoPending?.match?.loteId,
      firstPendingPhotosTxId: firstPhotoPending?.id,
    };
  }

  async getPendingTasksList(
    userId: string,
    role: string
  ): Promise<{
    contracts: Array<{
      txId: string;
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
    console.log(`[getPendingTasksList] userId=${userId} role=${role}`);
    const now = new Date();

    if (role === 'COMPRADOR') {
      const [pendingContracts, pendingOffers, pendingDeliveries, expiredOrdersRaw] = await Promise.all([
        prisma.transaccion.findMany({
          where: {
            compradorId: userId,
            firmaComprador: null,
            estado: { in: ['PENDIENTE_PAGO', 'PAGO_CAPTURADO', 'EN_TRANSITO'] },
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
        prisma.transaccion.findMany({
          where: {
            compradorId: userId,
            qrToken: { not: null },
            qrUsado: false,
            firmaVendedor: { not: null },
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

      console.log(
        `[getPendingTasksList] COMPRADOR: ${pendingContracts.length} contracts, ${pendingOffers.length} offers, ${pendingDeliveries.length} deliveries, ${expiredOrdersRaw.length} expired orders`
      );

      type CalibreItem = { calibre: string; cantidad_kg: number };
      const computeCov = (calibres: unknown, committedKg: number) => {
        const items = (calibres as CalibreItem[]) ?? [];
        const totalKg = items.reduce((s, c) => s + (c.cantidad_kg ?? 0), 0);
        return { totalKg, coverage: totalKg > 0 ? Math.round((committedKg / totalKg) * 100) : 0 };
      };

      return {
        contracts: pendingContracts.map((tx) => ({
          txId: tx.id,
          orderId: tx.match?.pedido?.id ?? '',
          lotId: tx.match?.loteId ?? '',
          producto: tx.match?.lote?.producto?.nombre ?? 'N/D',
          counterpart: `${tx.vendedor?.nombre ?? ''} ${tx.vendedor?.apellidos ?? ''}`.trim(),
          cantidadKg: Number(tx.cantidadKg),
        })),
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
      prisma.transaccion.findMany({
        where: {
          vendedorId: userId,
          firmaComprador: { not: null },
          firmaVendedor: null,
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
      prisma.transaccion.findMany({
        where: {
          vendedorId: userId,
          firmaVendedor: { not: null },
          firmaComprador: { not: null },
          qrToken: { not: null },
          qrUsado: false,
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
      prisma.match.findMany({
        where: {
          lote: { vendedorId: userId },
          estado: { in: ['PROPUESTO', 'ENVIADO_VENDEDOR'] },
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

    const photoPending = pendingPhotos.filter((tx) => {
      const urls = tx.fotosLoteUrls as string[] | null;
      return !urls || urls.length === 0;
    });

    type CalibreItem = { calibre: string; cantidad_kg: number };
    const computeCov = (calibres: unknown, committedKg: number) => {
      const items = (calibres as CalibreItem[]) ?? [];
      const totalKg = items.reduce((s, c) => s + (c.cantidad_kg ?? 0), 0);
      return { totalKg, coverage: totalKg > 0 ? Math.round((committedKg / totalKg) * 100) : 0 };
    };

    return {
      contracts: pendingContracts.map((tx) => ({
        txId: tx.id,
        orderId: tx.match?.pedido?.id ?? '',
        lotId: tx.match?.loteId ?? '',
        producto: tx.match?.lote?.producto?.nombre ?? 'N/D',
        counterpart: `${tx.comprador?.nombre ?? ''} ${tx.comprador?.apellidos ?? ''}`.trim(),
        cantidadKg: Number(tx.cantidadKg),
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
    return prisma.pedido.update({
      where: { id: orderId },
      data: { fechaEntregaDeseada: new Date(newDate) },
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
    return prisma.lote.update({
      where: { id: lotId },
      data: { fechaFinDisponibilidad: new Date(newDate) },
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
}

export const matchingService = new MatchingService();
