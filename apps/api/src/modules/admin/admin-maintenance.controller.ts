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
 * Force-run the daily bypass scan on demand. Useful for dev/forensics or
 * when you want immediate review of recent chat traffic.
 */
export async function runBypassScanController(req: Request, res: Response): Promise<void> {
  console.log(`[admin-maintenance] manual bypass scan triggered by admin=${req.user!.sub}`);
  const { runBypassScan } = await import('../bypass/bypass-scanner.service.js');
  const result = await runBypassScan();
  res.json({ success: true, data: result });
}
