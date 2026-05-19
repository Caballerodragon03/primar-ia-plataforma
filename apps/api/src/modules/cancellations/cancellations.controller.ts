/**
 * Phase 9 — Cancellation controllers.
 *
 * - cancelMatch: user-facing (seller or buyer) endpoint to cancel a contract.
 * - listSuspicious / resolveSuspicious: admin-only endpoints for the
 *   Cancelaciones tab.
 */
import type { Request, Response } from 'express';
import { cancellationsService } from './cancellations.service.js';
import { AppError } from '../../middleware/error.middleware.js';

export async function cancelMatchContract(req: Request, res: Response): Promise<void> {
  const matchId = req.params['matchId'] as string;
  // Zod (validateBody en contracts.routes) garantiza motivo string 5-500 chars.
  const { motivo } = req.body as { motivo: string };
  const result = await cancellationsService.cancelMatch(matchId, req.user!.sub, { motivo });
  res.json({ success: true, data: result });
}

const VALID_CANCEL_ESTADOS = ['PENDIENTE', 'INVESTIGADA', 'AVISADO', 'SUSPENDIDO'] as const;

export async function listSuspiciousCancellations(req: Request, res: Response): Promise<void> {
  const estado = req.query['estado'] as string | undefined;
  // Phase 14A — validar estado contra whitelist (antes pasaba cualquier query
  // string al filtro de Prisma → silenciosamente devolvía lista vacía).
  if (estado && !VALID_CANCEL_ESTADOS.includes(estado as typeof VALID_CANCEL_ESTADOS[number])) {
    throw new AppError(`Estado inválido. Valores aceptados: ${VALID_CANCEL_ESTADOS.join(', ')}`, 400);
  }
  const page = Math.max(1, parseInt((req.query['page'] as string) ?? '1', 10) || 1);
  const result = await cancellationsService.listSuspiciousCancellations(estado, page);
  res.json({ success: true, data: result.data, meta: result.meta });
}

export async function resolveSuspiciousCancellation(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const { accion, notas } = req.body as { accion?: string; notas?: string };
  if (!accion || !['INVESTIGADA', 'AVISADO', 'SUSPENDIDO'].includes(accion)) {
    throw new AppError('Acción inválida — debe ser INVESTIGADA, AVISADO o SUSPENDIDO', 400);
  }
  const result = await cancellationsService.resolveSuspiciousCancellation(
    id,
    req.user!.sub,
    accion as 'INVESTIGADA' | 'AVISADO' | 'SUSPENDIDO',
    notas,
  );
  res.json({ success: true, data: result });
}
