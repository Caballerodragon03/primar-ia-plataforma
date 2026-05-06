import { prisma } from '@primaria/database';
import { AppError } from '../../middleware/error.middleware.js';
import type { CreateValoracionInput } from './valoraciones.schema.js';
import { scoringService } from '../scoring/scoring.service.js';

export class ValoracionesService {
  async create(autorId: string, input: CreateValoracionInput): Promise<object> {
    const tx = await prisma.transaccion.findUnique({
      where: { id: input.transaccionId },
      select: { vendedorId: true, compradorId: true, qrUsado: true, estado: true },
    });
    if (!tx) throw new AppError('Transacción no encontrada', 404);

    const isVendedor = tx.vendedorId === autorId;
    const isComprador = tx.compradorId === autorId;
    if (!isVendedor && !isComprador) throw new AppError('No autorizado', 403);

    if (!tx.qrUsado) {
      throw new AppError('Solo puedes valorar una vez que la entrega ha sido confirmada', 400);
    }

    const expectedTipo = isVendedor ? 'VENDEDOR_A_COMPRADOR' : 'COMPRADOR_A_VENDEDOR';
    if (input.tipo !== expectedTipo) {
      throw new AppError('Tipo de valoración incorrecto para tu rol', 400);
    }

    const expectedDestinatario = isVendedor ? tx.compradorId : tx.vendedorId;
    if (input.destinatarioId !== expectedDestinatario) {
      throw new AppError('Destinatario incorrecto', 400);
    }

    const existing = await prisma.valoracion.findUnique({
      where: { transaccionId_autorId: { transaccionId: input.transaccionId, autorId } },
    });
    if (existing) throw new AppError('Ya has valorado esta transacción', 409);

    const valoracion = await prisma.valoracion.create({
      data: {
        transaccionId: input.transaccionId,
        autorId,
        destinatarioId: input.destinatarioId,
        tipo: input.tipo,
        calidad: input.calidad ?? null,
        puntualidad: input.puntualidad,
        comunicacion: input.comunicacion,
        profesionalidad: input.profesionalidad,
        empaquetado: input.empaquetado ?? null,
        comentario: input.comentario ?? null,
      },
    });

    void scoringService
      .onRatingRecibido(input.destinatarioId, valoracion.id)
      .catch((err: unknown) => console.error('[Valoraciones] score update failed:', err));

    return valoracion;
  }

  async getPending(userId: string, role: string): Promise<{
    transaccionId: string;
    lotId: string;
    orderId: string;
    destinatarioId: string;
    tipo: 'VENDEDOR_A_COMPRADOR' | 'COMPRADOR_A_VENDEDOR';
  } | null> {
    const isVendedor = role === 'VENDEDOR';

    const tx = await prisma.transaccion.findFirst({
      where: {
        ...(isVendedor ? { vendedorId: userId } : { compradorId: userId }),
        qrUsado: true,
        valoraciones: { none: { autorId: userId } },
      },
      select: {
        id: true,
        vendedorId: true,
        compradorId: true,
        match: { select: { loteId: true, pedidoId: true } },
      },
    });

    if (!tx) return null;

    return {
      transaccionId: tx.id,
      lotId: tx.match.loteId,
      orderId: tx.match.pedidoId,
      destinatarioId: isVendedor ? tx.compradorId : tx.vendedorId,
      tipo: isVendedor ? 'VENDEDOR_A_COMPRADOR' : 'COMPRADOR_A_VENDEDOR',
    };
  }
}

export const valoracionesService = new ValoracionesService();
