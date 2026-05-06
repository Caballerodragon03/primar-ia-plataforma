import { prisma, Prisma } from '@primaria/database';
import { AppError } from '../../middleware/error.middleware.js';
import type { CreateOfertaInput } from './negotiations.schema.js';

export class NegotiationsService {
  private async verifyParticipant(transaccionId: string, userId: string) {
    const tx = await prisma.transaccion.findUnique({
      where: { id: transaccionId },
      select: { vendedorId: true, compradorId: true, estado: true, qrUsado: true },
    });
    if (!tx) throw new AppError('Transacción no encontrada', 404);
    if (tx.vendedorId !== userId && tx.compradorId !== userId) {
      throw new AppError('No eres participante de esta transacción', 403);
    }
    if (tx.qrUsado) {
      throw new AppError('No se puede negociar después de confirmar la entrega', 400);
    }
    if (['CANCELADO', 'COMPLETADO', 'ENTREGADO'].includes(tx.estado)) {
      throw new AppError('No se puede negociar en esta transacción', 400);
    }
    return tx;
  }

  async createOffer(transaccionId: string, iniciadorId: string, input: CreateOfertaInput) {
    const tx = await this.verifyParticipant(transaccionId, iniciadorId);

    // If counter-offer, mark parent as SUPERADA
    if (input.parentId) {
      const parent = await prisma.negociacion.findUnique({
        where: { id: input.parentId },
        select: { transaccionId: true, estado: true },
      });
      if (!parent || parent.transaccionId !== transaccionId) {
        throw new AppError('Oferta padre no encontrada', 404);
      }
      if (parent.estado !== 'PENDIENTE') {
        throw new AppError('Esta oferta ya no está pendiente', 400);
      }
      await prisma.negociacion.update({
        where: { id: input.parentId },
        data: { estado: 'SUPERADA' },
      });
    }

    const precioKgDecimal = input.precioKg !== undefined
      ? new Prisma.Decimal(input.precioKg)
      : null;

    const negociacion = await prisma.negociacion.create({
      data: {
        transaccionId,
        iniciadorId,
        precioKg: precioKgDecimal,
        incoterm: input.incoterm ?? null,
        parentId: input.parentId ?? null,
      },
    });

    // Build a preview for the message content
    const parts: string[] = [];
    if (input.precioKg !== undefined) parts.push(`Precio: €${input.precioKg.toFixed(4)}/kg`);
    if (input.incoterm) parts.push(`Incoterm: ${input.incoterm}`);
    const contenido = `💬 Propuesta de negociación — ${parts.join(' · ')}`;

    const mensaje = await prisma.mensaje.create({
      data: {
        transaccionId,
        remitenteId: iniciadorId,
        contenido,
        tipo: 'OFERTA',
        negociacionId: negociacion.id,
      },
    });

    return { negociacion, mensaje };
  }

  async acceptOffer(transaccionId: string, userId: string, negociacionId: string) {
    await this.verifyParticipant(transaccionId, userId);

    const neg = await prisma.negociacion.findUnique({
      where: { id: negociacionId },
      select: {
        transaccionId: true,
        iniciadorId: true,
        precioKg: true,
        incoterm: true,
        estado: true,
      },
    });
    if (!neg || neg.transaccionId !== transaccionId) {
      throw new AppError('Oferta no encontrada', 404);
    }
    if (neg.estado !== 'PENDIENTE') {
      throw new AppError('Esta oferta ya no está pendiente', 400);
    }
    if (neg.iniciadorId === userId) {
      throw new AppError('No puedes aceptar tu propia oferta', 400);
    }

    // Apply changes
    const txForMatch = await prisma.transaccion.findUnique({
      where: { id: transaccionId },
      select: { match: { select: { id: true, pedidoId: true, cantidadKg: true } } },
    });
    const match = txForMatch?.match ?? null;
    if (!match) throw new AppError('Match no encontrado', 404);

    await prisma.$transaction(async (tx) => {
      // Mark offer accepted
      await tx.negociacion.update({
        where: { id: negociacionId },
        data: { estado: 'ACEPTADA' },
      });

      // Update match price if changed
      if (neg.precioKg !== null) {
        const cantidadKg = match.cantidadKg ?? 0;
        const newPrecioTotal = Number(neg.precioKg) * Number(cantidadKg);
        await tx.match.update({
          where: { id: match.id },
          data: { precioKg: neg.precioKg },
        });
        await tx.transaccion.update({
          where: { id: transaccionId },
          data: { precioTotal: newPrecioTotal },
        });
      }

      // Update incoterm if changed
      if (neg.incoterm !== null) {
        await tx.pedido.update({
          where: { id: match.pedidoId },
          data: { incoterm: neg.incoterm },
        });
      }
    });

    // Post a system message confirming acceptance
    const partes: string[] = [];
    if (neg.precioKg !== null) partes.push(`Precio: €${Number(neg.precioKg).toFixed(4)}/kg`);
    if (neg.incoterm) partes.push(`Incoterm: ${neg.incoterm}`);
    await prisma.mensaje.create({
      data: {
        transaccionId,
        remitenteId: userId,
        contenido: `✅ Propuesta aceptada — ${partes.join(' · ')}`,
        tipo: 'TEXTO',
      },
    });

    return { accepted: true };
  }

  async rejectOffer(transaccionId: string, userId: string, negociacionId: string) {
    await this.verifyParticipant(transaccionId, userId);

    const neg = await prisma.negociacion.findUnique({
      where: { id: negociacionId },
      select: { transaccionId: true, iniciadorId: true, estado: true },
    });
    if (!neg || neg.transaccionId !== transaccionId) {
      throw new AppError('Oferta no encontrada', 404);
    }
    if (neg.estado !== 'PENDIENTE') {
      throw new AppError('Esta oferta ya no está pendiente', 400);
    }
    if (neg.iniciadorId === userId) {
      throw new AppError('No puedes rechazar tu propia oferta', 400);
    }

    await prisma.negociacion.update({
      where: { id: negociacionId },
      data: { estado: 'RECHAZADA' },
    });

    await prisma.mensaje.create({
      data: {
        transaccionId,
        remitenteId: userId,
        contenido: '❌ Propuesta rechazada.',
        tipo: 'TEXTO',
      },
    });

    return { rejected: true };
  }
}

export const negotiationsService = new NegotiationsService();
