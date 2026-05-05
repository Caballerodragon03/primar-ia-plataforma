import { prisma } from '@primaria/database';
import type { Lote, Pedido, Match, LoteEstado } from '@primaria/database';
import { AppError } from '../../middleware/error.middleware.js';
import type { ContributeInput } from './matching.schema.js';
import { sendMatchProposalEmail } from '../../shared/emails/transactional.js';
import { calcularComision } from '@primaria/shared';

// ─── Local types ──────────────────────────────────────────────────────────────

type LoteCalibre = { calibre: string; cantidad_kg: number; precio_min_kg: number };
type PedidoCalibre = { calibre: string; cantidad_kg: number; precio_max_kg: number };
type ContribucionCalibre = { calibre: string; cantidad_kg: number; incoterm?: string };

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

// ─── Scoring helpers ──────────────────────────────────────────────────────────

function toLoteCalibre(raw: unknown): LoteCalibre[] {
  return (raw as LoteCalibre[]) ?? [];
}

function toPedidoCalibre(raw: unknown): PedidoCalibre[] {
  return (raw as PedidoCalibre[]) ?? [];
}

/**
 * Score de rentabilidad: precio ofrecido por el vendedor vs. precio máximo del comprador.
 * Rango: 0–1. Cuanto más cerca del precio máximo del comprador, mayor puntuación.
 */
function scoreRentabilidad(loteCalibres: LoteCalibre[], pedidoCalibres: PedidoCalibre[]): number {
  const pares: Array<{ ratio: number; pesoKg: number }> = [];

  for (const lc of loteCalibres) {
    const pc = pedidoCalibres.find((p) => p.calibre === lc.calibre);
    if (!pc || pc.precio_max_kg <= 0) continue;
    const ratio = Math.min(lc.precio_min_kg / pc.precio_max_kg, 1.0);
    pares.push({ ratio, pesoKg: lc.cantidad_kg });
  }

  if (pares.length === 0) return 0;

  const totalKg = pares.reduce((s, p) => s + p.pesoKg, 0);
  if (totalKg === 0) return 0;

  return pares.reduce((s, p) => s + p.ratio * (p.pesoKg / totalKg), 0);
}

/**
 * Score de recencia: lotes creados en los últimos 30 días puntúan más alto.
 */
function scoreRecencia(lote: Lote): number {
  const MAX_DAYS = 30;
  const ahora = Date.now();
  const edadMs = ahora - lote.createdAt.getTime();
  const edadDias = edadMs / (1000 * 60 * 60 * 24);
  if (edadDias >= MAX_DAYS) return 0;
  return 1 - edadDias / MAX_DAYS;
}

/**
 * Score de proximidad: Haversine entre lote y pedido (destino final).
 * Si no hay coordenadas, devuelve 0.5 (neutro).
 * 0 km → 1.0, 1000 km+ → 0.0.
 */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function scoreProximidad(lote: Lote, _pedido: Pedido): number {
  // Pedido doesn't carry buyer coordinates in the schema; use neutral score.
  // When buyer coordinates are available they can be added via a join on Empresa.
  if (lote.coordenadasLat == null || lote.coordenadasLng == null) {
    return 0.5;
  }
  // No destination coordinates on Pedido → neutral
  return 0.5;
}

/**
 * Score de historial: placeholder MVP, neutro 0.5.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function scoreHistorial(_vendedorId: string): number {
  return 0.5;
}

/**
 * Score compuesto: 0.4*rentabilidad + 0.2*proximidad + 0.2*recencia + 0.2*historial
 */
function computeScore(
  lote: Lote,
  pedido: Pedido,
  vendedorId: string
): { total: number; detalle: Record<string, number> } {
  const loteCalibres = toLoteCalibre(lote.calibres);
  const pedidoCalibres = toPedidoCalibre(pedido.calibresSolicitados);

  const rentabilidad = scoreRentabilidad(loteCalibres, pedidoCalibres);
  const proximidad = scoreProximidad(lote, pedido);
  const recencia = scoreRecencia(lote);
  const historial = scoreHistorial(vendedorId);

  // Price is the most important signal for sellers; proximity is neutral without coords
  const total = 0.6 * rentabilidad + 0.1 * proximidad + 0.2 * recencia + 0.1 * historial;

  return {
    total,
    detalle: { rentabilidad, proximidad, recencia, historial },
  };
}

// ─── Mandatory criteria ───────────────────────────────────────────────────────

function meetsHardCriteria(lote: Lote, pedido: Pedido): boolean {
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

  // 3. Al menos un calibre en común
  const loteCalibres = toLoteCalibre(lote.calibres);
  const pedidoCalibres = toPedidoCalibre(pedido.calibresSolicitados);
  const loteSet = new Set(loteCalibres.map((c) => c.calibre));
  const hasOverlap = pedidoCalibres.some((pc) => loteSet.has(pc.calibre));
  if (!hasOverlap) return false;

  // 4. Fecha disponibilidad <= fecha entrega deseada
  if (lote.fechaDisponibilidad > pedido.fechaEntregaDeseada) return false;

  // 5. Precio: al menos un calibre en común donde lote precio_min_kg <= pedido precio_max_kg
  const hasPriceFit = pedidoCalibres.some((pc) => {
    const lc = loteCalibres.find((l) => l.calibre === pc.calibre);
    return lc != null && lc.precio_min_kg <= pc.precio_max_kg;
  });
  if (!hasPriceFit) return false;

  return true;
}

// ─── Default calibres/precio helpers ─────────────────────────────────────────

/** Precio medio ponderado de los calibres del lote para los calibres solapados. */
function computePrecioKgFromContribucion(
  loteCalibres: LoteCalibre[],
  contribucion: ContribucionCalibre[]
): number {
  let totalKg = 0;
  let totalPrecio = 0;

  for (const contrib of contribucion) {
    const lc = loteCalibres.find((l) => l.calibre === contrib.calibre);
    if (!lc) continue;
    totalKg += contrib.cantidad_kg;
    totalPrecio += lc.precio_min_kg * contrib.cantidad_kg;
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
    const lote = await prisma.lote.findUnique({ where: { id: loteId } });
    if (!lote) throw new AppError('Lote no encontrado', 404);
    if (lote.estado !== 'ACTIVO') throw new AppError('El lote debe estar ACTIVO para ejecutar matching', 400);

    const pedidos = await prisma.pedido.findMany({
      where: { estado: 'ACTIVO' },
    });

    const matches: Match[] = [];

    for (const pedido of pedidos) {
      if (!meetsHardCriteria(lote, pedido)) continue;

      const { total, detalle } = computeScore(lote, pedido, lote.vendedorId);

      // Valores por defecto — se actualizan cuando el vendedor acepta
      const loteCalibres = toLoteCalibre(lote.calibres);
      const pedidoCalibres = toPedidoCalibre(pedido.calibresSolicitados);

      // Calibres solapados para la propuesta inicial
      const calibresIniciales = loteCalibres.filter((lc) =>
        pedidoCalibres.some((pc) => pc.calibre === lc.calibre && lc.precio_min_kg <= pc.precio_max_kg)
      );
      const cantidadKg = calibresIniciales.reduce((s, c) => s + c.cantidad_kg, 0);
      const precioKg = cantidadKg > 0
        ? calibresIniciales.reduce((s, c) => s + c.precio_min_kg * c.cantidad_kg, 0) / cantidadKg
        : 0;

      const match = await prisma.match.upsert({
        where: { loteId_pedidoId: { loteId, pedidoId: pedido.id } },
        create: {
          loteId,
          pedidoId: pedido.id,
          cantidadKg,
          precioKg,
          calibresJson: calibresIniciales,
          estado: 'PROPUESTO',
          scoreMatching: total,
          scoreDetalle: detalle,
        },
        update: {
          scoreMatching: total,
          scoreDetalle: detalle,
          estado: 'PROPUESTO',
        },
      });

      // Notify vendedor of the new match proposal (non-blocking)
      if (lote.vendedorId) {
        void (async () => {
          try {
            const vendedor = await prisma.user.findUnique({
              where: { id: lote.vendedorId },
              select: { email: true, nombre: true },
            });
            const compradorEmpresa = pedido.compradorId
              ? (await prisma.empresa.findUnique({
                  where: { userId: pedido.compradorId },
                  select: { razonSocial: true },
                }))?.razonSocial ?? 'Comprador'
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
                precioKg: Number(precioKg),
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
   * registros Match en estado PROPUESTO.
   */
  async runMatchingForOrder(pedidoId: string): Promise<Match[]> {
    const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
    if (!pedido) throw new AppError('Pedido no encontrado', 404);
    if (pedido.estado !== 'ACTIVO') throw new AppError('El pedido debe estar ACTIVO para ejecutar matching', 400);

    const lotes = await prisma.lote.findMany({
      where: { estado: 'ACTIVO' },
    });

    const matches: Match[] = [];

    for (const lote of lotes) {
      if (!meetsHardCriteria(lote, pedido)) continue;

      const { total, detalle } = computeScore(lote, pedido, lote.vendedorId);

      const loteCalibres = toLoteCalibre(lote.calibres);
      const pedidoCalibres = toPedidoCalibre(pedido.calibresSolicitados);

      const calibresIniciales = loteCalibres.filter((lc) =>
        pedidoCalibres.some((pc) => pc.calibre === lc.calibre && lc.precio_min_kg <= pc.precio_max_kg)
      );
      const cantidadKg = calibresIniciales.reduce((s, c) => s + c.cantidad_kg, 0);
      const precioKg = cantidadKg > 0
        ? calibresIniciales.reduce((s, c) => s + c.precio_min_kg * c.cantidad_kg, 0) / cantidadKg
        : 0;

      const match = await prisma.match.upsert({
        where: { loteId_pedidoId: { loteId: lote.id, pedidoId } },
        create: {
          loteId: lote.id,
          pedidoId,
          cantidadKg,
          precioKg,
          calibresJson: calibresIniciales,
          estado: 'PROPUESTO',
          scoreMatching: total,
          scoreDetalle: detalle,
        },
        update: {
          scoreMatching: total,
          scoreDetalle: detalle,
          estado: 'PROPUESTO',
        },
      });

      matches.push(match);
    }

    return matches;
  }

  /**
   * Devuelve los matches de los lotes de un vendedor con índice de rentabilidad.
   */
  async getMatchesForSeller(vendedorId: string, loteId?: string): Promise<MatchWithScore[]> {
    const matches = await prisma.match.findMany({
      where: {
        lote: { vendedorId, estado: { not: 'VENDIDO' } },
        pedido: { estado: { notIn: ['TOTALMENTE_CUBIERTO', 'CANCELADO', 'CERRADO'] } },
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
      orderBy: { createdAt: 'desc' },
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
    const match = await prisma.match.findUnique({
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

    // Fix: filter by ID not object identity
    const otrosCommittedKg = match.pedido.matches
      .filter((om) => om.id !== matchId)
      .reduce((s, om) => s + Number(om.cantidadKg), 0);

    // Cap total contribution so coverage doesn't exceed 100%
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
    const precioKg = computePrecioKgFromContribucion(loteCalibres, adjustedCalibres);

    const totalCoveredKg = otrosCommittedKg + cantidadKg;
    const coverage = totalPedidoKg > 0 ? totalCoveredKg / totalPedidoKg : 0;

    // Actualizar match
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        estado: 'ACEPTADO_VENDEDOR',
        calibresJson: adjustedCalibres,
        cantidadKg,
        precioKg,
      },
    });

    // Actualizar estado del pedido (fix: TOTALMENTE_CUBIERTO when 100%)
    const nuevoPedidoEstado =
      coverage >= 1 ? 'TOTALMENTE_CUBIERTO' :
      coverage > 0 ? 'PARCIALMENTE_CUBIERTO' :
      match.pedido.estado;
    if (nuevoPedidoEstado !== match.pedido.estado) {
      await prisma.pedido.update({
        where: { id: match.pedidoId },
        data: { estado: nuevoPedidoEstado as 'TOTALMENTE_CUBIERTO' | 'PARCIALMENTE_CUBIERTO' },
      });
    }

    // Actualizar estado del lote según kg comprometidos
    const loteMatchesAgg = await prisma.match.aggregate({
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
      loteCoverage >= 1 ? 'VENDIDO' :
      loteCoverage > 0 ? 'PARCIALMENTE_VENDIDO' :
      match.lote.estado as LoteEstado;

    if (nuevaLoteEstado !== match.lote.estado) {
      await prisma.lote.update({
        where: { id: match.loteId },
        data: { estado: nuevaLoteEstado },
      });
    }

    // Crear Transaccion si no existe (habilita el chat entre las partes)
    const existingTx = await prisma.transaccion.findUnique({ where: { matchId } });
    if (!existingTx) {
      const precioTotal = cantidadKg * precioKg;
      const commission = calcularComision(precioTotal, 'card');
      await prisma.transaccion.create({
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
    // First-item IDs for direct deep-links from the dashboard
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
    // Unread messages: count messages sent by others that haven't been read
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
              estado: { notIn: ['COMPLETADO', 'ENTREGADO', 'CANCELADO', 'REEMBOLSADO', 'EN_DISPUTA'] as const },
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

      const [pendingOffers, pendingContracts, pendingDeliveries] = await Promise.all([
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
      ]);

      return {
        pendingOffers,
        pendingMatches: 0,
        unreadMessages,
        pendingContracts,
        pendingPhotos: 0,
        pendingDeliveries,
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

    const pendingContracts = await prisma.transaccion.count({
      where: {
        vendedorId: userId,
        firmaComprador: { not: null },
        firmaVendedor: null,
      },
    });

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
    contracts: Array<{ txId: string; orderId: string; lotId: string; producto: string; counterpart: string; cantidadKg: number }>;
    offers: Array<{ matchId: string; orderId: string; producto: string; seller: string; cantidadKg: number; precioKg: number }>;
    deliveries: Array<{ txId: string; orderId: string; producto: string; seller: string; cantidadKg: number }>;
    photos: Array<{ txId: string; lotId: string; producto: string; buyer: string; cantidadKg: number }>;
    matches: Array<{ matchId: string; lotId: string; producto: string; buyer: string; cantidadKg: number; precioKg: number }>;
  }> {
    console.log(`[getPendingTasksList] userId=${userId} role=${role}`);
    if (role === 'COMPRADOR') {
      const [pendingContracts, pendingOffers, pendingDeliveries] = await Promise.all([
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
        // Only show offers where payment has NOT yet been authorized (no PI, not in terminal state)
        prisma.match.findMany({
          where: {
            pedido: { compradorId: userId },
            estado: 'ACEPTADO_VENDEDOR',
            OR: [
              { transaccion: { is: null } },
              {
                transaccion: {
                  stripePaymentIntentId: null,
                  estado: { notIn: ['COMPLETADO', 'ENTREGADO', 'CANCELADO', 'REEMBOLSADO', 'EN_DISPUTA'] as const },
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
      ]);

      console.log(`[getPendingTasksList] COMPRADOR: ${pendingContracts.length} contracts, ${pendingOffers.length} offers, ${pendingDeliveries.length} deliveries`);
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
          const loteVendedor = (m.lote as unknown as { vendedor?: { nombre: string; apellidos: string } }).vendedor;
          return {
            matchId: m.id,
            orderId: m.pedido?.id ?? '',
            producto: m.lote?.producto?.nombre ?? 'N/D',
            seller: loteVendedor ? `${loteVendedor.nombre} ${loteVendedor.apellidos}`.trim() : 'N/D',
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
      };
    }

    // VENDEDOR
    const [pendingContracts, pendingPhotos, pendingMatchOffers] = await Promise.all([
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
      // Pending match offers: buyer-matched lots the seller hasn't accepted yet
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
    ]);

    const photoPending = pendingPhotos.filter((tx) => {
      const urls = tx.fotosLoteUrls as string[] | null;
      return !urls || urls.length === 0;
    });

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
        buyer: `${m.pedido?.comprador?.nombre ?? ''} ${m.pedido?.comprador?.apellidos ?? ''}`.trim(),
        cantidadKg: Number(m.cantidadKg),
        precioKg: Number(m.precioKg),
      })),
    };
  }
}

export const matchingService = new MatchingService();
