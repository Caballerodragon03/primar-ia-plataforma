/**
 * Phase 11 — Admin maintenance endpoints.
 *
 * Manual triggers for async jobs that occasionally fail or that need
 * forensic re-runs. Locked behind admin role + audit logged.
 */
import type { Request, Response } from 'express';
import { prisma } from '@primaria/database';
import { AppError } from '../../middleware/error.middleware.js';

/**
 * Force-regenerate the 3 v2 invoice PDFs for a match. Useful when the
 * fire-and-forget call in `signMatchContractAsBuyerAfterPayment` fails
 * (R2 outage, Gemini timeout, etc.) and one or more URLs are null.
 *
 * Requires contratoEstado=FIRMADO. Idempotent — invoiceV2Service short-
 * circuits if all 3 URLs already exist.
 */
export async function regenerateInvoicesController(req: Request, res: Response): Promise<void> {
  const matchId = req.params['matchId'] as string;
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { contratoEstado: true },
  });
  if (!match) throw new AppError('Match no encontrado', 404);
  if (match.contratoEstado !== 'FIRMADO') {
    throw new AppError('Solo se pueden regenerar facturas para contratos FIRMADOS', 400);
  }
  const { invoiceV2Service } = await import('../invoices/invoice-v2.service.js');
  const result = await invoiceV2Service.generateAllForMatch(matchId);
  console.log(`[admin-maintenance] regenerated invoices for match ${matchId} (admin=${req.user!.sub})`);
  res.json({ success: true, data: result });
}

/**
 * Phase 13 — Health overview of all cron jobs. Last run timestamp + status
 * + result payload per job. Lets admin spot silent failures.
 */
export async function cronStatusController(_req: Request, res: Response): Promise<void> {
  const runs = await prisma.cronRun.findMany({
    orderBy: { jobName: 'asc' },
  });
  res.json({
    success: true,
    data: runs.map((r) => ({
      jobName: r.jobName,
      status: r.status,
      result: r.result,
      startedAt: r.startedAt.toISOString(),
      finishedAt: r.finishedAt.toISOString(),
      durationMs: r.finishedAt.getTime() - r.startedAt.getTime(),
    })),
  });
}

/**
 * Phase 14A — Lista la cola de PendingRefund que el webhook crea cuando un
 * pago llega para un contrato ya no válido (CADUCADO, CANCELADO, revert).
 * Admin debe procesar cada uno manualmente (refund via Stripe dashboard) y
 * luego marcar resuelto vía resolvePendingRefundController.
 */
export async function listPendingRefundsController(req: Request, res: Response): Promise<void> {
  const filter = (req.query['estado'] as string | undefined) ?? 'pendientes';
  const where = filter === 'resueltos'
    ? { resolvedAt: { not: null } }
    : { resolvedAt: null };
  const refunds = await prisma.pendingRefund.findMany({
    where,
    orderBy: [{ resolvedAt: 'asc' }, { createdAt: 'desc' }],
    take: 200,
  });
  res.json({
    success: true,
    data: refunds.map((r) => ({
      id: r.id,
      matchId: r.matchId,
      stripeChargeId: r.stripeChargeId,
      motivo: r.motivo,
      compradorEmail: r.compradorEmail,
      compradorNombre: r.compradorNombre,
      importeEur: Number(r.importeEur),
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
      resolvedBy: r.resolvedBy,
      notas: r.notas,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

/**
 * Marca un PendingRefund como resuelto tras que el admin haya hecho el refund
 * manualmente en Stripe dashboard. Almacena adminId + notas para auditoría.
 */
export async function resolvePendingRefundController(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const { notas } = req.body as { notas?: string };
  const existing = await prisma.pendingRefund.findUnique({ where: { id } });
  if (!existing) throw new AppError('Refund no encontrado', 404);
  if (existing.resolvedAt) {
    throw new AppError('Este refund ya está marcado como resuelto', 400);
  }
  await prisma.pendingRefund.update({
    where: { id },
    data: {
      resolvedAt: new Date(),
      resolvedBy: req.user!.sub,
      notas: notas?.slice(0, 1000) ?? null,
    },
  });
  res.json({ success: true, data: { id, resolved: true } });
}

/**
 * Force-run the daily bypass scan on demand. Useful for dev/forensics or
 * when you want immediate review of recent chat traffic.
 */
export async function runBypassScanController(req: Request, res: Response): Promise<void> {
  console.log(`[admin-maintenance] manual bypass scan triggered by admin=${req.user!.sub}`);
  const { runBypassScan } = await import('../bypass/bypass-scanner.service.js');
  const result = await runBypassScan();
  res.json({ success: true, data: result });
}
