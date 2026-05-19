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
          // Phase 8 — surface contratoEstado so the chat UI can hide the
          // pre-contract privacy reminder once both parties have signed.
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

    if (transacciones.length === 0) return [];

    // Get unread counts for all conversations in a single grouped query
    // (was previously N+1: one count() per transaccion).
    const unreadCounts = await prisma.mensaje.groupBy({
      by: ['transaccionId'],
      where: {
        transaccionId: { in: transacciones.map((t) => t.id) },
        remitenteId: { not: userId },
        leido: false,
      },
      _count: { _all: true },
    });
    const unreadByTx = new Map<string, number>();
    for (const row of unreadCounts) {
      unreadByTx.set(row.transaccionId, row._count._all);
    }

    return transacciones.map((tx) => {
      const isVendedor = tx.vendedorId === userId;
      const counterpart = isVendedor ? tx.comprador : tx.vendedor;
      const lastMessage = tx.mensajes[0] ?? null;
      const productoNombre = tx.match?.lote?.producto?.nombre ?? 'Producto';
      const orderId = tx.match?.pedido?.id?.slice(-5).toUpperCase() ?? '';

      return {
        transaccionId: tx.id,
        counterpartName: `${counterpart.nombre} ${counterpart.apellidos}`.trim(),
        orderId,
        product: productoNombre,
        lastMessage: lastMessage?.contenido ?? '',
        lastMessageAt: lastMessage?.createdAt?.toISOString() ?? tx.createdAt.toISOString(),
        unreadCount: unreadByTx.get(tx.id) ?? 0,
        estado: tx.estado,
        // Drives the chat privacy-reminder banner (hidden once FIRMADO).
        contratoEstado: tx.match?.contratoEstado ?? null,
      };
    });
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
            logistica: true,
            terminoPago: true,
            calibresJson: true,
            iniciadorId: true,
            parentId: true,
          },
        },
      },
    });

    // Get current effective terms for reference in offer cards. Use v2 final
    // fields if present (Phase 4) and fall back to the legacy fields.
    const tx = await prisma.transaccion.findUnique({
      where: { id: transaccionId },
      select: {
        match: {
          select: {
            precioKg: true,
            precioKgFinal: true,
            incotermFinal: true,
            logisticaFinal: true,
            terminoPagoFinal: true,
            calibresJson: true,
            pedido: { select: { incoterm: true } },
          },
        },
      },
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
            logistica: m.negociacion.logistica,
            terminoPago: m.negociacion.terminoPago,
            calibres: m.negociacion.calibresJson ?? null,
            iniciadorId: m.negociacion.iniciadorId,
            parentId: m.negociacion.parentId,
            // Current effective terms — prefer v2 final fields.
            currentPrecioKg: (() => {
              const final = match?.precioKgFinal;
              if (final != null) return Number(final);
              return match?.precioKg != null ? Number(match.precioKg) : null;
            })(),
            currentIncoterm: match?.incotermFinal ?? match?.pedido?.incoterm ?? null,
            currentLogistica: match?.logisticaFinal ?? null,
            currentTerminoPago: match?.terminoPagoFinal ?? null,
            currentCalibres: match?.calibresJson ?? null,
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
