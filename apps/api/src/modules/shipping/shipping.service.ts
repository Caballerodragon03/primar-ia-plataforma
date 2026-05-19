/**
 * Phase 10 — Shipping event tracking for v2 contracts.
 *
 * After both parties sign + comisión paid (contratoEstado=FIRMADO), the
 * seller marks the goods as shipped, and the buyer marks them as received.
 * Each event unlocks the corresponding party's ability to rate the
 * counterpart (using the existing rating system unchanged — we just
 * provide a new gate alongside the legacy qrUsado one).
 *
 * Both events post a system message in chat for transparency.
 */
import { prisma } from '@primaria/database';
import { AppError } from '../../middleware/error.middleware.js';

export class ShippingService {
  /**
   * Seller marks the goods as shipped. Requires contratoEstado=FIRMADO
   * and that the seller hasn't already marked it. Sets transaccion.enviadoEn.
   */
  async markShipped(matchId: string, userId: string): Promise<{ enviadoEn: string }> {
    // 1) Authorisation + state guards (cheap reads).
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        lote: { select: { vendedorId: true } },
        transaccion: { select: { id: true } },
      },
    });
    if (!match) throw new AppError('Match no encontrado', 404);
    if (match.lote.vendedorId !== userId) throw new AppError('Solo el vendedor puede marcar el envío', 403);
    if (match.contratoEstado !== 'FIRMADO') {
      throw new AppError('El contrato debe estar firmado y pagado para marcar el envío', 400);
    }
    if (!match.transaccion) throw new AppError('No existe transacción para este match', 500);

    // 2) Atomic write — updateMany with `enviadoEn: null` guard ensures only
    //    the FIRST concurrent click succeeds. Two parallel requests both pass
    //    the read-guard above, but only one updateMany returns count=1.
    const enviadoEn = new Date();
    const result = await prisma.transaccion.updateMany({
      where: { id: match.transaccion.id, enviadoEn: null },
      data: { enviadoEn, estado: 'EN_TRANSITO' },
    });
    if (result.count === 0) {
      throw new AppError('El envío ya está marcado', 400);
    }

    // 3) System message in chat — outside the atomic gate so duplicates would
    //    fail at the `count=0` check above, never reaching this point.
    await prisma.mensaje.create({
      data: {
        transaccionId: match.transaccion.id,
        remitenteId: userId,
        contenido: '🚚 Mercancía enviada. El comprador puede ahora confirmar la recepción.',
        tipo: 'TEXTO',
      },
    });

    return { enviadoEn: enviadoEn.toISOString() };
  }

  /**
   * Buyer marks the goods as received. Requires enviadoEn to be set first
   * (seller must mark shipped before buyer confirms). Sets recibidoEn AND
   * transitions transaccion.estado to ENTREGADO so the legacy paths work too.
   */
  async markReceived(matchId: string, userId: string): Promise<{ recibidoEn: string }> {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        pedido: { select: { compradorId: true } },
        transaccion: { select: { id: true, enviadoEn: true } },
      },
    });
    if (!match) throw new AppError('Match no encontrado', 404);
    if (match.pedido.compradorId !== userId) {
      throw new AppError('Solo el comprador puede confirmar la recepción', 403);
    }
    if (!match.transaccion) throw new AppError('No existe transacción para este match', 500);
    if (!match.transaccion.enviadoEn) {
      throw new AppError('El vendedor debe marcar el envío antes de confirmar la recepción', 400);
    }

    // Atomic — see markShipped for rationale. updateMany with recibidoEn:null
    // guard makes parallel clicks safe.
    const recibidoEn = new Date();
    const result = await prisma.transaccion.updateMany({
      where: { id: match.transaccion.id, recibidoEn: null },
      data: { recibidoEn, estado: 'ENTREGADO' },
    });
    if (result.count === 0) {
      throw new AppError('Ya confirmaste la recepción', 400);
    }

    await prisma.mensaje.create({
      data: {
        transaccionId: match.transaccion.id,
        remitenteId: userId,
        contenido: '✅ Recepción confirmada. Ahora ambas partes podéis valorar al otro.',
        tipo: 'TEXTO',
      },
    });

    return { recibidoEn: recibidoEn.toISOString() };
  }
}

export const shippingService = new ShippingService();
