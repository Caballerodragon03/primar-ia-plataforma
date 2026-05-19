/**
 * Phase 9 — Match cancellation with suspicious-pattern detection.
 *
 * Either party can cancel a contract that is NOT yet FIRMADO. We record
 * who cancelled, when, and the reason on the Match row, then upsert into
 * CancelacionSospechosa to track pair-level patterns (same vendedor +
 * comprador cancelling repeatedly = likely bypass attempt).
 *
 * Threshold: 3+ cancellations between the same (vendedor, comprador) pair
 * within the last 90 days flags the pair for admin review.
 */
import { prisma, Prisma } from '@primaria/database';
import { AppError } from '../../middleware/error.middleware.js';
import { invalidateEstadoCache } from '../../middleware/auth.middleware.js';

const THRESHOLD_COUNT = 3;
const WINDOW_DAYS = 90;

interface CancelMatchInput {
  motivo: string;
}

export class CancellationsService {
  /**
   * Cancel a match in any pre-FIRMADO state. Sets contratoEstado=CANCELADO
   * on the Match and writes canceladoPor / canceladoEn / motivoCancelacion.
   * Then runs the pair-pattern detector — if the pair (lote.vendedorId,
   * pedido.compradorId) has crossed the threshold, upsert a row in
   * CancelacionSospechosa for admin review.
   */
  async cancelMatch(matchId: string, userId: string, input: CancelMatchInput): Promise<{
    cancelled: true;
    suspiciousFlagged: boolean;
    totalCount: number;
  }> {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        lote: { select: { vendedorId: true } },
        pedido: { select: { compradorId: true } },
      },
    });
    if (!match) throw new AppError('Match no encontrado', 404);
    const isSeller = match.lote.vendedorId === userId;
    const isBuyer = match.pedido.compradorId === userId;
    if (!isSeller && !isBuyer) throw new AppError('No autorizado', 403);

    // Guard the state machine — FIRMADO and existing CANCELADO/CADUCADO are
    // terminal, can't re-cancel.
    if (match.contratoEstado === 'FIRMADO') {
      throw new AppError('No se puede cancelar un contrato ya firmado', 400);
    }
    if (match.contratoEstado === 'CANCELADO' || match.contratoEstado === 'CADUCADO') {
      throw new AppError('Este contrato ya está cerrado', 400);
    }

    const motivo = input.motivo.trim();
    if (motivo.length < 5) throw new AppError('Describe el motivo de la cancelación (≥5 caracteres)', 400);
    if (motivo.length > 500) throw new AppError('Motivo demasiado largo (máx. 500 caracteres)', 400);

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.match.update({
        where: { id: matchId },
        data: {
          contratoEstado: 'CANCELADO',
          canceladoPor: userId,
          canceladoEn: now,
          motivoCancelacion: motivo,
          // Clear the firma-deadline tracking so the hourly cron skips it.
          firmaVendedorDeadline: null,
        },
      });
      // If a transaccion exists, blank out any pending signatures so the
      // pair can re-engage with a fresh match later if they want.
      await tx.transaccion.updateMany({
        where: { matchId },
        data: {
          firmaVendedor: null,
          firmaVendedorFecha: null,
          firmaComprador: null,
          firmaCompradorFecha: null,
          comisionStripeSessionId: null,
        },
      });

      // System message in chat for transparency between the parties.
      const txRow = await tx.transaccion.findUnique({
        where: { matchId },
        select: { id: true },
      });
      if (txRow) {
        const role = isSeller ? 'vendedor' : 'comprador';
        await tx.mensaje.create({
          data: {
            transaccionId: txRow.id,
            remitenteId: userId,
            contenido: `❌ Contrato cancelado por el ${role}. Motivo: ${motivo}`,
            tipo: 'TEXTO',
          },
        });
      }
    }, { isolationLevel: 'Serializable' });

    // Suspicious-pattern detection — done OUTSIDE the cancel transaction
    // (read-heavy, no need to extend the lock window).
    const { suspiciousFlagged, totalCount } = await this.detectAndUpsertPattern(
      match.lote.vendedorId,
      match.pedido.compradorId,
      now,
    );

    return { cancelled: true, suspiciousFlagged, totalCount };
  }

  /**
   * Counts cancellations between this (vendedor, comprador) pair in the
   * last WINDOW_DAYS. If ≥ THRESHOLD_COUNT, upsert a row in
   * CancelacionSospechosa so it shows up in the admin Cancelaciones tab.
   *
   * Idempotent — the upsert uses the @@unique([vendedorId, compradorId])
   * index, so re-counting after the second/third cancel updates the same row.
   */
  private async detectAndUpsertPattern(
    vendedorId: string,
    compradorId: string,
    cancelTime: Date,
  ): Promise<{ suspiciousFlagged: boolean; totalCount: number }> {
    const windowStart = new Date(cancelTime.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const totalCount = await prisma.match.count({
      where: {
        contratoEstado: 'CANCELADO',
        canceladoEn: { gte: windowStart },
        lote: { vendedorId },
        pedido: { compradorId },
      },
    });

    if (totalCount < THRESHOLD_COUNT) {
      return { suspiciousFlagged: false, totalCount };
    }

    // Threshold reached → upsert the alert row. We don't reset estado of an
    // existing row that was already INVESTIGADA / AVISADO / SUSPENDIDO —
    // those decisions stick. Only refresh ultimaCancelacionAt + totalCancelaciones.
    await prisma.cancelacionSospechosa.upsert({
      where: {
        vendedorId_compradorId: { vendedorId, compradorId },
      },
      create: {
        vendedorId,
        compradorId,
        totalCancelaciones: totalCount,
        ultimaCancelacionAt: cancelTime,
        estado: 'PENDIENTE',
      },
      update: {
        totalCancelaciones: totalCount,
        ultimaCancelacionAt: cancelTime,
      },
    });

    return { suspiciousFlagged: true, totalCount };
  }

  // ─── Admin operations ──────────────────────────────────────────────────────

  async listSuspiciousCancellations(estado?: string, page = 1) {
    const pageSize = 50;
    const where = estado ? { estado: estado as Prisma.EnumCancelacionEstadoFilter } : {};

    const [rows, total] = await Promise.all([
      prisma.cancelacionSospechosa.findMany({
        where,
        orderBy: [{ estado: 'asc' }, { totalCancelaciones: 'desc' }, { ultimaCancelacionAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.cancelacionSospechosa.count({ where }),
    ]);

    // Hydrate vendedor + comprador
    const userIds = [...new Set(rows.flatMap((r) => [r.vendedorId, r.compradorId]))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        email: true,
        estado: true,
        empresa: { select: { razonSocial: true } },
      },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    return {
      data: rows.map((r) => {
        const v = byId.get(r.vendedorId);
        const c = byId.get(r.compradorId);
        return {
          id: r.id,
          vendedor: v ? {
            id: v.id,
            nombre: `${v.nombre} ${v.apellidos}`.trim(),
            email: v.email,
            estado: v.estado,
            empresa: v.empresa?.razonSocial ?? null,
          } : null,
          comprador: c ? {
            id: c.id,
            nombre: `${c.nombre} ${c.apellidos}`.trim(),
            email: c.email,
            estado: c.estado,
            empresa: c.empresa?.razonSocial ?? null,
          } : null,
          totalCancelaciones: r.totalCancelaciones,
          ultimaCancelacionAt: r.ultimaCancelacionAt.toISOString(),
          estado: r.estado,
          accionTomada: r.accionTomada,
          notas: r.notas,
          createdAt: r.createdAt.toISOString(),
        };
      }),
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async resolveSuspiciousCancellation(
    id: string,
    adminId: string,
    accion: 'INVESTIGADA' | 'AVISADO' | 'SUSPENDIDO',
    notas?: string,
  ) {
    const row = await prisma.cancelacionSospechosa.findUnique({
      where: { id },
      select: { vendedorId: true, compradorId: true, estado: true },
    });
    if (!row) throw new AppError('Caso no encontrado', 404);
    if (row.estado !== 'PENDIENTE' && row.estado !== 'INVESTIGADA') {
      throw new AppError('Este caso ya está resuelto', 400);
    }

    await prisma.$transaction(async (tx) => {
      await tx.cancelacionSospechosa.update({
        where: { id },
        data: {
          estado: accion,
          accionTomada: accion,
          notas: notas?.slice(0, 1000) ?? null,
          adminId,
        },
      });
      // SUSPENDIDO escalates: both users get user.estado=SUSPENDIDO + revoke
      // refresh tokens. Same belt-and-suspenders pattern as the bypass tab.
      if (accion === 'SUSPENDIDO') {
        await tx.user.updateMany({
          where: { id: { in: [row.vendedorId, row.compradorId] } },
          data: { estado: 'SUSPENDIDO' },
        });
        await tx.refreshToken.deleteMany({
          where: { userId: { in: [row.vendedorId, row.compradorId] } },
        });
      }
    });

    // Phase 12 — flush estado cache for both banned users so the ban hits
    // their next request.
    if (accion === 'SUSPENDIDO') {
      invalidateEstadoCache(row.vendedorId);
      invalidateEstadoCache(row.compradorId);
    }

    // Phase 12 — email both banned users with the reason. Fire-and-forget.
    if (accion === 'SUSPENDIDO') {
      void (async () => {
        try {
          const users = await prisma.user.findMany({
            where: { id: { in: [row.vendedorId, row.compradorId] } },
            select: { email: true, nombre: true },
          });
          const { sendUserBannedEmail } = await import('../../shared/emails/transactional.js');
          await Promise.allSettled(users.map((u) =>
            sendUserBannedEmail(u.email, u.nombre, {
              motivo: 'cancelaciones',
              notasAdmin: notas?.slice(0, 300),
            }),
          ));
        } catch (err) {
          console.error('[email] sendUserBannedEmail (cancelaciones) failed', err);
        }
      })();
    }

    return { id, estado: accion };
  }
}

export const cancellationsService = new CancellationsService();
