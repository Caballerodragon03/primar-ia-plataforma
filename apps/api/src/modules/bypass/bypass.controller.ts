/**
 * Phase 8 — Admin endpoints for the Risks tab.
 *
 * Lists BypassAlert rows + lets an admin resolve them (AVISADO / BANEADO /
 * DESCARTADO). The resolve action is auditable via accionTomada / adminId /
 * resolvedAt fields already in the schema.
 */
import type { Request, Response } from 'express';
import { prisma, BypassAlertEstado, UserEstado } from '@primaria/database';
import { AppError } from '../../middleware/error.middleware.js';
import { invalidateEstadoCache } from '../../middleware/auth.middleware.js';

const VALID_ESTADOS: ReadonlyArray<BypassAlertEstado> = [
  'PENDIENTE', 'AVISADO', 'BANEADO', 'DESCARTADO',
];

export async function listBypassAlerts(req: Request, res: Response): Promise<void> {
  const estado = (req.query['estado'] as string | undefined) ?? 'PENDIENTE';
  if (!VALID_ESTADOS.includes(estado as BypassAlertEstado)) {
    throw new AppError('Estado inválido', 400);
  }
  const pageSize = 50;
  const page = Math.max(1, parseInt((req.query['page'] as string) ?? '1', 10) || 1);

  // Phase 12 — removed dead "TODOS" branch (it would have been rejected by
  // the earlier validation anyway). If admin needs cross-state browsing,
  // expose a dedicated /admin/bypass-alerts/all endpoint.
  const where = { estado: estado as BypassAlertEstado };

  const [alerts, total] = await Promise.all([
    prisma.bypassAlert.findMany({
      where,
      orderBy: [{ estado: 'asc' }, { score: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.bypassAlert.count({ where }),
  ]);

  // Hydrate with sender info + message context in a second query (avoids
  // an awkward join in the bypass_alerts schema).
  const remitenteIds = [...new Set(alerts.map((a) => a.remitenteId))];
  const mensajeIds = alerts.map((a) => a.mensajeId);
  const [remitentes, mensajes] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: remitenteIds } },
      select: { id: true, nombre: true, apellidos: true, email: true, role: true, estado: true },
    }),
    prisma.mensaje.findMany({
      where: { id: { in: mensajeIds } },
      select: {
        id: true,
        transaccionId: true,
        createdAt: true,
        transaccion: {
          select: {
            match: {
              select: {
                lote: { select: { producto: { select: { nombre: true } } } },
                pedido: { select: { id: true } },
              },
            },
          },
        },
      },
    }),
  ]);
  const remByUser = new Map(remitentes.map((u) => [u.id, u]));
  const msgById = new Map(mensajes.map((m) => [m.id, m]));

  res.json({
    success: true,
    data: alerts.map((a) => {
      const u = remByUser.get(a.remitenteId);
      const m = msgById.get(a.mensajeId);
      return {
        id: a.id,
        mensajeId: a.mensajeId,
        transaccionId: m?.transaccionId ?? null,
        score: a.score,
        patrones: a.patrones,
        extracto: a.extracto,
        estado: a.estado,
        accionTomada: a.accionTomada,
        resolvedAt: a.resolvedAt?.toISOString() ?? null,
        createdAt: a.createdAt.toISOString(),
        mensajeCreatedAt: m?.createdAt?.toISOString() ?? null,
        remitente: u ? {
          id: u.id,
          nombre: `${u.nombre} ${u.apellidos}`.trim(),
          email: u.email,
          rol: u.role,
          estado: u.estado,
        } : null,
        productoNombre: m?.transaccion?.match?.lote?.producto?.nombre ?? null,
      };
    }),
    meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  });
}

export async function resolveBypassAlert(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const { accion, notas } = req.body as { accion?: string; notas?: string };
  if (!accion || !VALID_ESTADOS.includes(accion as BypassAlertEstado) || accion === 'PENDIENTE') {
    throw new AppError('Acción inválida — debe ser AVISADO, BANEADO o DESCARTADO', 400);
  }

  const alert = await prisma.bypassAlert.findUnique({
    where: { id },
    select: { remitenteId: true, estado: true },
  });
  if (!alert) throw new AppError('Alerta no encontrada', 404);
  if (alert.estado !== 'PENDIENTE') {
    throw new AppError('Esta alerta ya está resuelta', 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.bypassAlert.update({
      where: { id },
      data: {
        estado: accion as BypassAlertEstado,
        accionTomada: notas?.slice(0, 500) ?? accion,
        adminId: req.user!.sub,
        resolvedAt: new Date(),
      },
    });
    // BANEADO action escalates: set user.estado=SUSPENDIDO AND revoke all
    // refresh tokens so the JWT-vs-DB drift can't keep the user signed in.
    // The access token still lives up to its 1h expiry, but without a refresh
    // token they can't extend their session. Mitigates the "banned user keeps
    // browsing for 1h" UX/security gap.
    if (accion === 'BANEADO') {
      await tx.user.update({
        where: { id: alert.remitenteId },
        data: { estado: 'SUSPENDIDO' as UserEstado },
      });
      await tx.refreshToken.deleteMany({
        where: { userId: alert.remitenteId },
      });
    }
  });

  // Phase 12 — flush the requireEstado cache so the ban takes effect on
  // the user's NEXT request (not after the 30s TTL elapses).
  if (accion === 'BANEADO') {
    invalidateEstadoCache(alert.remitenteId);
  }

  // Phase 12 — email the banned user with the reason. Fire-and-forget so an
  // email outage doesn't block the admin response.
  if (accion === 'BANEADO') {
    void (async () => {
      try {
        const u = await prisma.user.findUnique({
          where: { id: alert.remitenteId },
          select: { email: true, nombre: true },
        });
        if (!u) return;
        const { sendUserBannedEmail } = await import('../../shared/emails/transactional.js');
        await sendUserBannedEmail(u.email, u.nombre, {
          motivo: 'bypass',
          notasAdmin: notas?.slice(0, 300),
        });
      } catch (err) {
        console.error('[email] sendUserBannedEmail failed', alert.remitenteId, err);
      }
    })();
  }

  res.json({ success: true, data: { id, estado: accion } });
}
