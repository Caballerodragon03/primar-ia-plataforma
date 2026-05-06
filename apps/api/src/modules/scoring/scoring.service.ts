import { prisma } from '@primaria/database';
import type { ScoreEvent, ScoreEventTipo, ScoreStatus } from '@primaria/database';
import { AppError } from '../../middleware/error.middleware.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApplyEventOpts {
  motivo?: string;
  referenciaTipo?: string;
  referenciaId?: string;
  adminId?: string;
}

interface DisputaResueltaOptions {
  penalizacionComprador?: number;
  penalizacionVendedor?: number;
  incentivoComprador?: number;
  incentivoVendedor?: number;
  adminId: string;
  compradorId: string;
  vendedorId: string;
  abiertaPorRole: 'COMPRADOR' | 'VENDEDOR';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function resolveStatus(score: number): ScoreStatus {
  return score < 40 ? 'RESTRICTED' : 'ACTIVE';
}

// ─── ScoringService ───────────────────────────────────────────────────────────

export class ScoringService {
  /**
   * Central method: applies a delta to the user's score, creates a ScoreEvent,
   * and updates User.scoreFiabilidad + scoreStatus in an atomic Prisma transaction.
   */
  async applyEvent(
    userId: string,
    tipo: ScoreEventTipo,
    delta: number,
    opts: ApplyEventOpts = {},
  ): Promise<ScoreEvent> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { scoreFiabilidad: true, scoreStatus: true },
    });

    if (!user) throw new AppError('Usuario no encontrado', 404);

    const scoreAntes = user.scoreFiabilidad !== null
      ? Number(user.scoreFiabilidad)
      : null;

    const baseScore = scoreAntes ?? 0;
    const scoreDespues = clamp(baseScore + delta);
    const newStatus: ScoreStatus = resolveStatus(scoreDespues);

    return prisma.$transaction(async (tx) => {
      const event = await tx.scoreEvent.create({
        data: {
          userId,
          tipo,
          delta,
          scoreAntes: scoreAntes !== null ? scoreAntes : undefined,
          scoreDespues,
          motivo: opts.motivo ?? null,
          referenciaTipo: opts.referenciaTipo ?? null,
          referenciaId: opts.referenciaId ?? null,
          adminId: opts.adminId ?? null,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          scoreFiabilidad: scoreDespues,
          scoreStatus: newStatus,
        },
      });

      return event;
    });
  }

  /**
   * Called when a Transaccion transitions to COMPLETADA.
   * First-ever completed transaction: PRIMERA_TRANSACCION, score = 100.
   * Subsequent: TRANSACCION_OK (delta=0), only increments transaccionesOk counter.
   */
  async onTransaccionCompletada(transaccionId: string): Promise<void> {
    const transaccion = await prisma.transaccion.findUnique({
      where: { id: transaccionId },
      select: { vendedorId: true, compradorId: true },
    });

    if (!transaccion) throw new AppError('Transaccion no encontrada', 404);

    await Promise.all([
      this._processUserTransaccionCompletada(transaccion.vendedorId, transaccionId),
      this._processUserTransaccionCompletada(transaccion.compradorId, transaccionId),
    ]);
  }

  private async _processUserTransaccionCompletada(
    userId: string,
    transaccionId: string,
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        scoreFiabilidad: true,
        transaccionesOk: true,
      },
    });

    if (!user) return;

    const isFirst = user.transaccionesOk === 0 && user.scoreFiabilidad === null;

    if (isFirst) {
      await prisma.$transaction(async (tx) => {
        await tx.scoreEvent.create({
          data: {
            userId,
            tipo: 'PRIMERA_TRANSACCION',
            delta: 100,
            scoreAntes: undefined,
            scoreDespues: 100,
            referenciaTipo: 'Transaccion',
            referenciaId: transaccionId,
            motivo: 'Primera transaccion completada sin incidencia',
          },
        });

        await tx.user.update({
          where: { id: userId },
          data: {
            scoreFiabilidad: 100,
            scoreStatus: 'ACTIVE',
            transaccionesOk: { increment: 1 },
          },
        });
      });
    } else {
      const currentScore = Number(user.scoreFiabilidad ?? 0);

      await prisma.$transaction(async (tx) => {
        await tx.scoreEvent.create({
          data: {
            userId,
            tipo: 'TRANSACCION_OK',
            delta: 0,
            scoreAntes: currentScore,
            scoreDespues: currentScore,
            referenciaTipo: 'Transaccion',
            referenciaId: transaccionId,
            motivo: 'Transaccion completada',
          },
        });

        await tx.user.update({
          where: { id: userId },
          data: { transaccionesOk: { increment: 1 } },
        });
      });
    }
  }

  /**
   * Called when a Disputa is opened. Applies -2 provisional penalty to
   * the accused party (userId). Increments transaccionesIncid counter.
   */
  async onIncidenciaAbierta(disputaId: string, userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { transaccionesIncid: { increment: 1 } },
    });

    await this.applyEvent(userId, 'INCIDENCIA_ABIERTA', -2, {
      referenciaTipo: 'Disputa',
      referenciaId: disputaId,
      motivo: 'Disputa abierta contra el usuario',
    });
  }

  /**
   * Called when a Disputa is resolved by admin.
   * Applies penalties/incentivos per resolution, and reverts the -2
   * provisional if the accused user is resolved in their favor.
   */
  async onDisputaResuelta(
    disputaId: string,
    options: DisputaResueltaOptions,
  ): Promise<void> {
    const {
      penalizacionComprador,
      penalizacionVendedor,
      incentivoComprador,
      incentivoVendedor,
      adminId,
      compradorId,
      vendedorId,
      abiertaPorRole,
    } = options;

    const acusadoId = abiertaPorRole === 'COMPRADOR' ? vendedorId : compradorId;

    const tasks: Array<Promise<unknown>> = [];

    if (penalizacionComprador !== undefined && penalizacionComprador < 0) {
      tasks.push(
        this.applyEvent(compradorId, 'DISPUTA_RESUELTA_CONTRA', penalizacionComprador, {
          referenciaTipo: 'Disputa',
          referenciaId: disputaId,
          adminId,
          motivo: 'Disputa resuelta en contra del comprador',
        }),
      );
    }

    if (penalizacionVendedor !== undefined && penalizacionVendedor < 0) {
      tasks.push(
        this.applyEvent(vendedorId, 'DISPUTA_RESUELTA_CONTRA', penalizacionVendedor, {
          referenciaTipo: 'Disputa',
          referenciaId: disputaId,
          adminId,
          motivo: 'Disputa resuelta en contra del vendedor',
        }),
      );
    }

    if (incentivoComprador !== undefined && incentivoComprador > 0) {
      tasks.push(
        this.applyEvent(compradorId, 'DISPUTA_RESUELTA_FAVOR', incentivoComprador, {
          referenciaTipo: 'Disputa',
          referenciaId: disputaId,
          adminId,
          motivo: 'Disputa resuelta a favor del comprador',
        }),
      );
    }

    if (incentivoVendedor !== undefined && incentivoVendedor > 0) {
      tasks.push(
        this.applyEvent(vendedorId, 'DISPUTA_RESUELTA_FAVOR', incentivoVendedor, {
          referenciaTipo: 'Disputa',
          referenciaId: disputaId,
          adminId,
          motivo: 'Disputa resuelta a favor del vendedor',
        }),
      );
    }

    // Revert provisional -2 for the accused if resolved in their favor
    const acusadoFavorado =
      (acusadoId === compradorId && incentivoComprador !== undefined && incentivoComprador > 0) ||
      (acusadoId === vendedorId && incentivoVendedor !== undefined && incentivoVendedor > 0);

    if (acusadoFavorado) {
      tasks.push(
        this.applyEvent(acusadoId, 'DISPUTA_RESUELTA_FAVOR', 2, {
          referenciaTipo: 'Disputa',
          referenciaId: disputaId,
          adminId,
          motivo: 'Reversion de penalizacion provisional por disputa resuelta a su favor',
        }),
      );
    }

    await Promise.all(tasks);
  }

  /**
   * Called when a Valoracion is created for a destinatario.
   * Recalculates ratingMedio from all PUBLICADA valoraciones.
   * Applies RATING_RECIBIDO event only when numValoraciones >= 3.
   */
  async onRatingRecibido(destinatarioId: string, valoracionId: string): Promise<void> {
    const valoraciones = await prisma.valoracion.findMany({
      where: {
        destinatarioId,
        estado: 'PUBLICADA',
      },
      select: {
        calidad: true,
        puntualidad: true,
        comunicacion: true,
        empaquetado: true,
        profesionalidad: true,
      },
    });

    const count = valoraciones.length;
    if (count === 0) return;

    const avg =
      valoraciones.reduce((sum, v) => {
        const fields: number[] = [v.puntualidad, v.comunicacion];
        if (v.calidad !== null) fields.push(v.calidad);
        if (v.empaquetado !== null) fields.push(v.empaquetado);
        if (v.profesionalidad !== null) fields.push(v.profesionalidad);
        const fieldAvg = fields.reduce((a, b) => a + b, 0) / fields.length;
        return sum + fieldAvg;
      }, 0) / count;

    await prisma.user.update({
      where: { id: destinatarioId },
      data: {
        ratingMedio: avg,
        numValoraciones: count,
      },
    });

    if (count >= 3) {
      const delta = (avg - 4) * 2;
      await this.applyEvent(destinatarioId, 'RATING_RECIBIDO', delta, {
        referenciaTipo: 'Valoracion',
        referenciaId: valoracionId,
        motivo: `Rating medio: ${avg.toFixed(2)} (${count} valoraciones)`,
      });
    }
  }

  /**
   * Admin applies a negative penalty. delta must be in [-50, 0].
   */
  async adminApplyPenalty(
    targetUserId: string,
    delta: number,
    adminId: string,
    motivo: string,
  ): Promise<ScoreEvent> {
    if (delta > 0 || delta < -50) {
      throw new AppError('La penalizacion debe estar entre -50 y 0', 400);
    }

    return this.applyEvent(targetUserId, 'ADMIN_PENALIZACION', delta, {
      adminId,
      motivo,
    });
  }

  /**
   * Admin applies a positive incentive. delta must be in [0, 25].
   */
  async adminApplyIncentivo(
    targetUserId: string,
    delta: number,
    adminId: string,
    motivo: string,
  ): Promise<ScoreEvent> {
    if (delta < 0 || delta > 25) {
      throw new AppError('El incentivo debe estar entre 0 y 25', 400);
    }

    return this.applyEvent(targetUserId, 'ADMIN_INCENTIVO', delta, {
      adminId,
      motivo,
    });
  }

  /**
   * Returns the full score history for a user, most recent first.
   */
  async getScoreHistory(userId: string): Promise<ScoreEvent[]> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    return prisma.scoreEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Converts a raw score + status string to a star count for the frontend.
   * Returns 0 for NEW_USER (badge especial), 1-5 otherwise.
   */
  scoreToStars(score: number | null, status: string): number {
    if (status === 'NEW_USER' || score === null) return 0;
    if (score >= 90) return 5;
    if (score >= 75) return 4;
    if (score >= 60) return 3;
    if (score >= 40) return 2;
    return 1;
  }
}

export const scoringService = new ScoringService();
