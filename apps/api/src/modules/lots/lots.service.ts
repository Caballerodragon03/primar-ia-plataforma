import { prisma, type LoteEstado, type MatchEstado } from '@primaria/database';
import { AppError } from '../../middleware/error.middleware.js';
import type { CreateLotInput, UpdateLotInput } from './lots.schema.js';
import { matchingService } from '../matching/matching.service.js';
import { geocodeLoteAsync } from '../matching/geocoding.service.js';
import { SubscriptionService } from '../subscriptions/subscription.service.js';

const subscriptionService = new SubscriptionService();

type CalibreItem = { calibre: string; cantidad_kg: number; precio_min_kg: number };

function computeCoverage(
  calibres: unknown,
  committedKg: number
): { totalKg: number; coverage: number } {
  const items = (calibres as CalibreItem[]) ?? [];
  const totalKg = items.reduce((s, c) => s + (c.cantidad_kg ?? 0), 0);
  const coverage = totalKg > 0 ? Math.round((committedKg / totalKg) * 100) : 0;
  return { totalKg, coverage };
}

const ACTIVE_MATCH_ESTADOS: MatchEstado[] = ['ACEPTADO_VENDEDOR', 'PENDIENTE_PAGO', 'CONFIRMADO'];

export class LotsService {
  async create(vendedorId: string, data: CreateLotInput) {
    if (data.publicar) {
      await subscriptionService.checkCanCreateLot(vendedorId);
    }

    const lote = await prisma.lote.create({
      data: {
        vendedorId,
        productoId: data.productoId,
        variedadId: data.variedadId,
        tipo: data.tipo,
        calibres: data.calibres,
        datosHistoricos: data.datosHistoricos,
        direccionRecogida: data.direccionRecogida,
        coordenadasLat: data.coordenadasLat,
        coordenadasLng: data.coordenadasLng,
        fechaDisponibilidad: new Date(data.fechaDisponibilidad),
        ...(data.fechaFinDisponibilidad && { fechaFinDisponibilidad: new Date(data.fechaFinDisponibilidad) }),
        certificaciones: data.certificaciones ?? [],
        fotosUrls: data.fotosUrls ?? [],
        comentariosAdicionales: data.comentariosAdicionales,
        estado: data.publicar ? 'ACTIVO' : 'BORRADOR',
        // Phase 2 — logistica + multi-select preferences
        logistica: data.logistica,
        incotermsAceptados: data.incotermsAceptados,
        terminosPagoAceptados: data.terminosPagoAceptados,
      },
      include: { producto: true, variedad: true },
    });

    // Geocode pickup address (fire-and-forget)
    geocodeLoteAsync(lote.id, data.direccionRecogida);

    // Auto-run matching when lot is published
    if (lote.estado === 'ACTIVO') {
      void matchingService.runMatchingForLot(lote.id).catch((err: unknown) =>
        console.error('[Matching] Auto-run failed for lot', lote.id, err)
      );
    }

    return lote;
  }

  async listByVendedor(vendedorId: string, tab?: string) {
    const estadoMap: Record<string, string> = {
      open: 'ACTIVO',
      inprogress: 'PARCIALMENTE_VENDIDO',
      full: 'VENDIDO',
      cancelled: 'CANCELADO',
      draft: 'BORRADOR',
    };
    const mappedEstado = tab && tab !== 'all' ? (estadoMap[tab.toLowerCase()] as LoteEstado | undefined) : undefined;
    const where = { vendedorId, ...(mappedEstado ? { estado: mappedEstado } : {}) };

    const lots = await prisma.lote.findMany({
      where,
      include: {
        producto: true,
        variedad: true,
        matches: {
          where: { estado: { in: ACTIVE_MATCH_ESTADOS } },
          select: { cantidadKg: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return lots.map((lote) => {
      const committedKg = lote.matches.reduce((s, m) => s + Number(m.cantidadKg), 0);
      const { totalKg, coverage } = computeCoverage(lote.calibres, committedKg);
      const { matches: _, ...rest } = lote;
      return { ...rest, totalKg, coverage };
    });
  }

  /**
   * Phase 14M v3.33 — devuelve los lotes del vendedor que tienen el mismo
   * producto + variedad y siguen activos (ACTIVO o PARCIALMENTE_VENDIDO).
   * Lo usa el formulario "Nuevo lote" para sugerir editar uno existente
   * en lugar de crear un duplicado.
   *
   * variedadId null = se interpreta como "cualquier variedad" — match cuando
   * el lote tampoco tiene variedad o cuando coincide exactamente.
   */
  async listExistingByProduct(vendedorId: string, productoId: string, variedadId: string | null) {
    const lots = await prisma.lote.findMany({
      where: {
        vendedorId,
        productoId,
        estado: { in: ['ACTIVO', 'PARCIALMENTE_VENDIDO'] },
        ...(variedadId
          ? { OR: [{ variedadId }, { variedadId: null }] }
          : {}),
      },
      include: {
        producto: { select: { nombre: true } },
        variedad: { select: { nombre: true } },
        matches: {
          where: { estado: { in: ACTIVE_MATCH_ESTADOS } },
          select: { cantidadKg: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return lots.map((lote) => {
      const committedKg = lote.matches.reduce((s, m) => s + Number(m.cantidadKg), 0);
      const { totalKg, coverage } = computeCoverage(lote.calibres, committedKg);
      return {
        id: lote.id,
        producto: lote.producto.nombre,
        variedad: lote.variedad?.nombre ?? null,
        estado: lote.estado,
        totalKg,
        coverage,
        fechaDisponibilidad: lote.fechaDisponibilidad,
      };
    });
  }

  async getById(id: string, vendedorId: string) {
    const now = new Date();
    // Phase 14M v3.25 — surface delayed (free-tier) matches the seller
    // can't see yet, so we can show a "suscríbete para verlos ya" CTA.
    const hiddenMatchesCount = await prisma.match.count({
      where: {
        loteId: id,
        estado: { in: ['PROPUESTO', 'ENVIADO_VENDEDOR', ...ACTIVE_MATCH_ESTADOS] },
        visibleDesde: { gt: now },
      },
    });
    const lote = await prisma.lote.findUnique({
      where: { id },
      include: {
        producto: true,
        variedad: true,
        matches: {
          where: { estado: { in: ACTIVE_MATCH_ESTADOS } },
          include: {
            pedido: {
              include: {
                // Phase 14M v3.19 — añadir score para ScoreBadge en la
                // lista de matches activos del lote (lado vendedor).
                comprador: {
                  select: {
                    id: true,
                    nombre: true,
                    apellidos: true,
                    scoreFiabilidad: true,
                    scoreStatus: true,
                  },
                },
              },
            },
            transaccion: { select: { id: true } },
          },
        },
      },
    });
    if (!lote) throw new AppError('Lote no encontrado', 404);
    if (lote.vendedorId !== vendedorId) throw new AppError('Acceso prohibido', 403);

    const committedKg = lote.matches.reduce((s, m) => s + Number(m.cantidadKg), 0);
    const { totalKg, coverage } = computeCoverage(lote.calibres, committedKg);
    return { ...lote, totalKg, coverage, hiddenMatchesCount };
  }

  async update(id: string, vendedorId: string, data: UpdateLotInput) {
    const lote = await prisma.lote.findUnique({
      where: { id },
      include: {
        matches: {
          where: { estado: { in: ACTIVE_MATCH_ESTADOS } },
          select: { cantidadKg: true },
        },
      },
    });
    if (!lote) throw new AppError('Lote no encontrado', 404);
    if (lote.vendedorId !== vendedorId) throw new AppError('Acceso prohibido', 403);
    if (!['BORRADOR', 'ACTIVO', 'PARCIALMENTE_VENDIDO'].includes(lote.estado)) {
      throw new AppError('No se puede editar un lote en este estado', 400);
    }

    // Validate: new total kg must be >= already committed kg
    if (data.calibres) {
      const newTotalKg = (data.calibres as CalibreItem[]).reduce((s, c) => s + c.cantidad_kg, 0);
      const committedKg = lote.matches.reduce((s, m) => s + Number(m.cantidadKg), 0);
      if (newTotalKg < committedKg) {
        throw new AppError(
          `No puedes reducir el lote por debajo de los ${committedKg} kg ya comprometidos`,
          400
        );
      }
    }

    const wasActive = lote.estado === 'ACTIVO';
    const becomingActive = !wasActive && data.publicar === true;
    if (becomingActive) {
      await subscriptionService.checkCanCreateLot(vendedorId);
    }

    const updated = await prisma.lote.update({
      where: { id },
      data: {
        ...(data.productoId && { productoId: data.productoId }),
        ...(data.variedadId !== undefined && { variedadId: data.variedadId }),
        ...(data.tipo && { tipo: data.tipo }),
        ...(data.calibres && { calibres: data.calibres }),
        ...(data.direccionRecogida && { direccionRecogida: data.direccionRecogida }),
        ...(data.coordenadasLat !== undefined && { coordenadasLat: data.coordenadasLat }),
        ...(data.coordenadasLng !== undefined && { coordenadasLng: data.coordenadasLng }),
        ...(data.fechaDisponibilidad && { fechaDisponibilidad: new Date(data.fechaDisponibilidad) }),
        ...(data.fechaFinDisponibilidad !== undefined && { fechaFinDisponibilidad: data.fechaFinDisponibilidad ? new Date(data.fechaFinDisponibilidad) : null }),
        ...(data.certificaciones && { certificaciones: data.certificaciones }),
        ...(data.fotosUrls && { fotosUrls: data.fotosUrls }),
        ...(data.comentariosAdicionales !== undefined && { comentariosAdicionales: data.comentariosAdicionales }),
        ...(data.publicar !== undefined && { estado: data.publicar ? 'ACTIVO' : 'BORRADOR' }),
        ...(data.logistica !== undefined && { logistica: data.logistica }),
        ...(data.incotermsAceptados !== undefined && { incotermsAceptados: data.incotermsAceptados }),
        ...(data.terminosPagoAceptados !== undefined && { terminosPagoAceptados: data.terminosPagoAceptados }),
      },
      include: { producto: true, variedad: true },
    });

    // Geocode if address changed or coordinates are missing
    const addressChanged = data.direccionRecogida && data.direccionRecogida !== lote.direccionRecogida;
    const missingCoords = !updated.coordenadasLat || !updated.coordenadasLng;
    if ((addressChanged || missingCoords) && updated.direccionRecogida) {
      geocodeLoteAsync(updated.id, updated.direccionRecogida);
    }

    // Auto-run matching whenever lot is ACTIVO or PARCIALMENTE_VENDIDO
    const isNowActive = updated.estado === 'ACTIVO' || updated.estado === 'PARCIALMENTE_VENDIDO';
    if (isNowActive) {
      void matchingService.runMatchingForLot(updated.id).catch((err: unknown) =>
        console.error('[Matching] Auto-run failed for lot', updated.id, err)
      );
    }

    return updated;
  }

  async cancel(id: string, vendedorId: string): Promise<{ lote: unknown; partialCancel: boolean; cancelledMatches: number }> {
    const lote = await prisma.lote.findUnique({
      where: { id },
      include: {
        matches: {
          select: { id: true, estado: true, cantidadKg: true },
        },
      },
    });
    if (!lote) throw new AppError('Lote no encontrado', 404);
    if (lote.vendedorId !== vendedorId) throw new AppError('Acceso prohibido', 403);
    if (lote.estado === 'CANCELADO') throw new AppError('El lote ya está cancelado', 400);
    if (lote.estado === 'VENDIDO') throw new AppError('El lote ya está completamente vendido', 400);

    const confirmedMatches = lote.matches.filter((m) =>
      ['ACEPTADO_VENDEDOR', 'PENDIENTE_PAGO', 'CONFIRMADO'].includes(m.estado)
    );
    const uncommittedMatches = lote.matches.filter((m) =>
      ['PROPUESTO', 'ENVIADO_VENDEDOR'].includes(m.estado)
    );

    // Cancel all uncommitted matches
    if (uncommittedMatches.length > 0) {
      await prisma.match.updateMany({
        where: { id: { in: uncommittedMatches.map((m) => m.id) } },
        data: { estado: 'CANCELADO' },
      });
    }

    if (confirmedMatches.length > 0) {
      // Partial cancel: keep committed part, mark lot as VENDIDO (completed with what was committed)
      const committedKg = confirmedMatches.reduce((s, m) => s + Number(m.cantidadKg), 0);
      const items = (lote.calibres as CalibreItem[]) ?? [];
      const totalKg = items.reduce((s, c) => s + c.cantidad_kg, 0);
      const updated = await prisma.lote.update({
        where: { id },
        data: { estado: 'VENDIDO' },
        include: { producto: true, variedad: true },
      });
      return {
        lote: { ...updated, totalKg, committedKg, coverage: totalKg > 0 ? Math.round((committedKg / totalKg) * 100) : 0 },
        partialCancel: true,
        cancelledMatches: uncommittedMatches.length,
      };
    }

    // No committed matches — full cancel
    const updated = await prisma.lote.update({
      where: { id },
      data: { estado: 'CANCELADO' },
      include: { producto: true, variedad: true },
    });
    return { lote: updated, partialCancel: false, cancelledMatches: uncommittedMatches.length };
  }
}

export const lotsService = new LotsService();
