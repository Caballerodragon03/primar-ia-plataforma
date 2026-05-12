import { prisma } from '@primaria/database';
import { detectarBypass, sanitizarMensaje } from '@primaria/shared';
import { AppError } from '../../middleware/error.middleware.js';
import type { SendMessageInput } from './chat.schema.js';

const PAGE_SIZE = 50;

export class ChatService {
  /**
   * Returns all transacciones where user is vendedor or comprador,
   * with the last message preview, unread count, counterpart name, and product name.
   */
  async getConversations(userId: string) {
    const transacciones = await prisma.transaccion.findMany({
      where: {
        OR: [
          { vendedorId: userId },
          { compradorId: userId },
        ],
      },
      include: {
        vendedor: { select: { id: true, nombre: true, apellidos: true } },
        comprador: { select: { id: true, nombre: true, apellidos: true } },
        match: {
          include: {
            lote: {
              include: {
                producto: { select: { nombre: true } },
              },
            },
            pedido: { select: { id: true } },
          },
        },
        mensajes: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            contenido: true,
            tipo: true,
            remitenteId: true,
            leido: true,
            createdAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // For each transaccion, get unread count (messages from the other party that are unread)
    const results = await Promise.all(
      transacciones.map(async (tx) => {
        const unreadCount = await prisma.mensaje.count({
          where: {
            transaccionId: tx.id,
            remitenteId: { not: userId },
            leido: false,
          },
        });

        const isVendedor = tx.vendedorId === userId;
        const counterpart = isVendedor ? tx.comprador : tx.vendedor;
        const lastMessage = tx.mensajes[0] ?? null;
        const productoNombre = tx.match?.lote?.producto?.nombre ?? 'Producto';
        const orderId = tx.match?.pedido?.id?.slice(-5).toUpperCase() ?? '';

        // Return in the format expected by ChatView
        return {
          transaccionId: tx.id,
          counterpartName: `${counterpart.nombre} ${counterpart.apellidos}`.trim(),
          orderId,
          product: productoNombre,
          lastMessage: lastMessage?.contenido ?? '',
          lastMessageAt: lastMessage?.createdAt?.toISOString() ?? tx.createdAt.toISOString(),
          unreadCount,
          estado: tx.estado,
        };
      })
    );

    return results;
  }

  /**
   * Returns paginated messages for a transaccion (50 per page, newest first).
   * Marks fetched messages as leido=true where remitenteId != userId.
   */
  async getMessages(transaccionId: string, userId: string, page = 1) {
    await this.verifyParticipant(transaccionId, userId);

    const skip = (page - 1) * PAGE_SIZE;

    const mensajes = await prisma.mensaje.findMany({
      where: { transaccionId },
      orderBy: { createdAt: 'asc' },
      skip,
      take: PAGE_SIZE,
      include: {
        negociacion: {
          select: {
            id: true,
            estado: true,
            precioKg: true,
            incoterm: true,
            iniciadorId: true,
            parentId: true,
          },
        },
      },
    });

    // Get current terms for reference in offer cards
    const tx = await prisma.transaccion.findUnique({
      where: { id: transaccionId },
      select: { match: { select: { precioKg: true, pedido: { select: { incoterm: true } } } } },
    });
    const match = tx?.match ?? null;

    // Mark messages from the other party as read
    const unreadIds = mensajes
      .filter((m) => m.remitenteId !== userId && !m.leido)
      .map((m) => m.id);

    if (unreadIds.length > 0) {
      await prisma.mensaje.updateMany({
        where: { id: { in: unreadIds } },
        data: { leido: true },
      });
    }

    return mensajes.map((m) => ({
      id: m.id,
      senderId: m.remitenteId,
      content: m.contenido,
      tipo: m.tipo,
      sentAt: m.createdAt.toISOString(),
      intentoBypass: m.intentoBypass,
      negociacion: m.negociacion
        ? {
            id: m.negociacion.id,
            estado: m.negociacion.estado,
            precioKg: m.negociacion.precioKg !== null ? Number(m.negociacion.precioKg) : null,
            incoterm: m.negociacion.incoterm,
            iniciadorId: m.negociacion.iniciadorId,
            parentId: m.negociacion.parentId,
            currentPrecioKg: match?.precioKg != null ? Number(match.precioKg) : null,
            currentIncoterm: match?.pedido?.incoterm ?? null,
          }
        : null,
    }));
  }

  /**
   * Sends a message to a transaccion.
   * Runs bypass detection and sanitizes content if bypass is found.
   */
  async sendMessage(
    transaccionId: string,
    remitenteId: string,
    data: SendMessageInput
  ) {
    await this.verifyParticipant(transaccionId, remitenteId);

    const transaccion = await prisma.transaccion.findUnique({
      where: { id: transaccionId },
      select: { estado: true },
    });

    if (!transaccion) throw new AppError('Transaccion no encontrada', 404);
    if (['CANCELADO', 'COMPLETADO'].includes(transaccion.estado)) {
      throw new AppError('No se puede enviar mensajes en una transaccion cancelada o completada', 400);
    }

    const bypass = detectarBypass(data.contenido);
    const { sanitized } = sanitizarMensaje(data.contenido);

    return prisma.mensaje.create({
      data: {
        transaccionId,
        remitenteId,
        contenido: bypass ? sanitized : data.contenido,
        tipo: data.tipo,
        archivoUrl: data.archivoUrl,
        intentoBypass: bypass,
      },
    });
  }

  /**
   * Marks specific messages as read.
   * Only marks messages that belong to the transaccion and were sent by someone else.
   */
  async markRead(transaccionId: string, userId: string, mensajeIds: string[]) {
    await this.verifyParticipant(transaccionId, userId);

    await prisma.mensaje.updateMany({
      where: {
        id: { in: mensajeIds },
        transaccionId,
        remitenteId: { not: userId },
      },
      data: { leido: true },
    });
  }

  private async verifyParticipant(transaccionId: string, userId: string) {
    const tx = await prisma.transaccion.findUnique({
      where: { id: transaccionId },
      select: { vendedorId: true, compradorId: true },
    });
    if (!tx) throw new AppError('Transaccion no encontrada', 404);
    if (tx.vendedorId !== userId && tx.compradorId !== userId) {
      throw new AppError('No eres participante de esta transaccion', 403);
    }
  }
}

export const chatService = new ChatService();
