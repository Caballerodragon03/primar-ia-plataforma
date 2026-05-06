import { prisma, type PedidoEstado, type MatchEstado } from '@primaria/database';
import { AppError } from '../../middleware/error.middleware.js';
import type { CreateOrderInput, UpdateOrderInput } from './orders.schema.js';
import { matchingService } from '../matching/matching.service.js';
import { geocodePedidoAsync } from '../matching/geocoding.service.js';

type CalibreSolicitado = { calibre: string; cantidad_kg: number; precio_max_kg: number };

function computeOrderCoverage(
  calibresSolicitados: unknown,
  committedKg: number
): { totalKg: number; coverage: number } {
  const items = (calibresSolicitados as CalibreSolicitado[]) ?? [];
  const totalKg = items.reduce((s, c) => s + (c.cantidad_kg ?? 0), 0);
  const coverage = totalKg > 0 ? Math.round((committedKg / totalKg) * 100) : 0;
  return { totalKg, coverage };
}

const ACTIVE_MATCH_ESTADOS: MatchEstado[] = ['ACEPTADO_VENDEDOR', 'PENDIENTE_PAGO', 'CONFIRMADO'];

export class OrdersService {
  async create(compradorId: string, data: CreateOrderInput) {
    const pedido = await prisma.pedido.create({
      data: {
        compradorId,
        productoId: data.productoId,
        variedadId: data.variedadId,
        calibresSolicitados: data.calibresSolicitados,
        incoterm: data.incoterm,
        destinoFinal: data.destinoFinal,
        frecuencia: data.frecuencia,
        transporte: data.transporte,
        costoLogisticaEstimado: data.costoLogisticaEstimado,
        fechaEntregaDeseada: new Date(data.fechaEntregaDeseada),
        notasAdicionales: data.notasAdicionales,
        estado: data.publicar ? 'ACTIVO' : 'BORRADOR',
      },
      include: { producto: true, variedad: true },
    });

    // Geocode destinoFinal async (fire-and-forget, does not block response)
    if (data.destinoFinal) {
      geocodePedidoAsync(pedido.id, data.destinoFinal);
    }

    // Auto-run matching when order is published
    if (pedido.estado === 'ACTIVO') {
      void matchingService.runMatchingForOrder(pedido.id).catch((err: unknown) =>
        console.error('[Matching] Auto-run failed for order', pedido.id, err)
      );
    }

    return pedido;
  }

  async listByComprador(compradorId: string, tab?: string) {
    const estadoMap: Record<string, string> = {
      open: 'ACTIVO',
      inprogress: 'PARCIALMENTE_CUBIERTO',
      full: 'TOTALMENTE_CUBIERTO',
      cancelled: 'CANCELADO',
      draft: 'BORRADOR',
      closed: 'CERRADO',
    };
    const mappedEstado = tab && tab !== 'all' ? (estadoMap[tab.toLowerCase()] as PedidoEstado | undefined) : undefined;
    // "All" excludes closed/archived orders — they live in the "Closed" tab only
    const where = {
      compradorId,
      ...(mappedEstado
        ? { estado: mappedEstado }
        : { estado: { not: 'CERRADO' as PedidoEstado } }),
    };

    const orders = await prisma.pedido.findMany({
      where,
      include: {
        producto: true,
        variedad: true,
        matches: {
          where: { estado: { in: ACTIVE_MATCH_ESTADOS } },
          select: { cantidadKg: true, precioKg: true, estado: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => {
      const committedKg = order.matches.reduce((s, m) => s + Number(m.cantidadKg), 0);
      const { totalKg, coverage } = computeOrderCoverage(order.calibresSolicitados, committedKg);
      const matchStates = order.matches.map((m) => ({ estado: m.estado, cantidadKg: m.cantidadKg, precioKg: m.precioKg }));
      const { matches: _, ...rest } = order;
      return { ...rest, totalKg, coverage, matches: matchStates };
    });
  }

  async getById(id: string, compradorId: string) {
    const order = await prisma.pedido.findUnique({
      where: { id },
      include: {
        producto: true,
        variedad: true,
        matches: {
          where: {
            estado: {
              in: ['PROPUESTO', 'ENVIADO_VENDEDOR', ...ACTIVE_MATCH_ESTADOS],
            },
          },
          include: {
            lote: {
              include: { vendedor: { select: { id: true, nombre: true, apellidos: true } } },
            },
            transaccion: { select: { id: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!order) throw new AppError('Pedido no encontrado', 404);
    if (order.compradorId !== compradorId) throw new AppError('Acceso prohibido', 403);

    const committedKg = order.matches
      .filter((m) => ACTIVE_MATCH_ESTADOS.includes(m.estado as MatchEstado))
      .reduce((s, m) => s + Number(m.cantidadKg), 0);
    const { totalKg, coverage } = computeOrderCoverage(order.calibresSolicitados, committedKg);
    return { ...order, totalKg, coverage };
  }

  async update(id: string, compradorId: string, data: UpdateOrderInput) {
    const order = await prisma.pedido.findUnique({
      where: { id },
      include: {
        matches: {
          where: { estado: { in: ACTIVE_MATCH_ESTADOS } },
          select: { cantidadKg: true },
        },
      },
    });
    if (!order) throw new AppError('Pedido no encontrado', 404);
    if (order.compradorId !== compradorId) throw new AppError('Acceso prohibido', 403);
    if (!['BORRADOR', 'ACTIVO', 'PARCIALMENTE_CUBIERTO'].includes(order.estado)) {
      throw new AppError('No se puede editar un pedido en este estado', 400);
    }

    // Validate: new total kg must be >= committed kg from active matches
    if (data.calibresSolicitados) {
      type CalibreSol = { calibre: string; cantidad_kg: number; precio_max_kg: number };
      const newTotalKg = (data.calibresSolicitados as CalibreSol[]).reduce((s, c) => s + c.cantidad_kg, 0);
      const committedKg = order.matches.reduce((s, m) => s + Number(m.cantidadKg), 0);
      if (newTotalKg < committedKg) {
        throw new AppError(
          `No puedes reducir el pedido por debajo de los ${committedKg} kg ya comprometidos por vendedores`,
          400
        );
      }
    }

    const wasActive = order.estado === 'ACTIVO';
    const updated = await prisma.pedido.update({
      where: { id },
      data: {
        ...(data.productoId && { productoId: data.productoId }),
        ...(data.variedadId !== undefined && { variedadId: data.variedadId }),
        ...(data.calibresSolicitados && { calibresSolicitados: data.calibresSolicitados }),
        ...(data.incoterm && { incoterm: data.incoterm }),
        ...(data.destinoFinal !== undefined && { destinoFinal: data.destinoFinal }),
        ...(data.frecuencia !== undefined && { frecuencia: data.frecuencia }),
        ...(data.transporte !== undefined && { transporte: data.transporte }),
        ...(data.costoLogisticaEstimado !== undefined && { costoLogisticaEstimado: data.costoLogisticaEstimado }),
        ...(data.fechaEntregaDeseada && { fechaEntregaDeseada: new Date(data.fechaEntregaDeseada) }),
        ...(data.notasAdicionales !== undefined && { notasAdicionales: data.notasAdicionales }),
        ...(data.publicar !== undefined && { estado: data.publicar ? 'ACTIVO' : 'BORRADOR' }),
      },
      include: { producto: true, variedad: true },
    });

    // Auto-run matching whenever order is ACTIVO (on create, publish, or any edit)
    const isNowActive = updated.estado === 'ACTIVO';
    if (isNowActive) {
      void matchingService.runMatchingForOrder(updated.id).catch((err: unknown) =>
        console.error('[Matching] Auto-run failed for order', updated.id, err)
      );
    }

    return updated;
  }

  async cancel(id: string, compradorId: string): Promise<{ order: unknown; partialCancel: boolean; cancelledMatches: number }> {
    const order = await prisma.pedido.findUnique({
      where: { id },
      include: {
        matches: {
          select: { id: true, estado: true, cantidadKg: true },
        },
      },
    });
    if (!order) throw new AppError('Pedido no encontrado', 404);
    if (order.compradorId !== compradorId) throw new AppError('Acceso prohibido', 403);
    if (order.estado === 'CANCELADO') throw new AppError('El pedido ya está cancelado', 400);
    if (order.estado === 'CERRADO') throw new AppError('El pedido ya está cerrado', 400);

    const confirmedMatches = order.matches.filter((m) =>
      ['ACEPTADO_VENDEDOR', 'PENDIENTE_PAGO', 'CONFIRMADO'].includes(m.estado)
    );
    const uncommittedMatches = order.matches.filter((m) =>
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
      // Partial cancel: keep committed part, mark order as CERRADO (completed with committed quantity)
      const committedKg = confirmedMatches.reduce((s, m) => s + Number(m.cantidadKg), 0);
      const items = (order.calibresSolicitados as CalibreSolicitado[]) ?? [];
      const totalKg = items.reduce((s, c) => s + c.cantidad_kg, 0);
      const updated = await prisma.pedido.update({
        where: { id },
        data: { estado: 'CERRADO' },
        include: { producto: true, variedad: true },
      });
      return {
        order: { ...updated, totalKg, committedKg, coverage: totalKg > 0 ? Math.round((committedKg / totalKg) * 100) : 0 },
        partialCancel: true,
        cancelledMatches: uncommittedMatches.length,
      };
    }

    // No committed matches — full cancel
    const updated = await prisma.pedido.update({
      where: { id },
      data: { estado: 'CANCELADO' },
      include: { producto: true, variedad: true },
    });
    return { order: updated, partialCancel: false, cancelledMatches: uncommittedMatches.length };
  }
}

export const ordersService = new OrdersService();
