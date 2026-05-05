import { Request, Response, NextFunction } from 'express';
import { matchingService } from './matching.service.js';
import { contributeSchema } from './matching.schema.js';
import { AppError } from '../../middleware/error.middleware.js';
import { prisma } from '@primaria/database';

/**
 * POST /api/v1/matching/lots/:loteId/run
 * Trigger matching for a specific lot (VENDEDOR must own the lot).
 */
export async function runMatchingForLot(req: Request, res: Response): Promise<void> {
  const loteId = req.params['loteId'] as string;
  const vendedorId = req.user!.sub;

  // Verify ownership
  const lote = await prisma.lote.findUnique({ where: { id: loteId } });
  if (!lote) throw new AppError('Lote no encontrado', 404);
  if (lote.vendedorId !== vendedorId) throw new AppError('Acceso prohibido', 403);

  const matches = await matchingService.runMatchingForLot(loteId);
  res.json({ success: true, data: matches, total: matches.length });
}

/**
 * POST /api/v1/matching/orders/:pedidoId/run
 * Trigger matching for a specific order (COMPRADOR must own the order).
 */
export async function runMatchingForOrder(req: Request, res: Response): Promise<void> {
  const pedidoId = req.params['pedidoId'] as string;
  const compradorId = req.user!.sub;

  // Verify ownership
  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
  if (!pedido) throw new AppError('Pedido no encontrado', 404);
  if (pedido.compradorId !== compradorId) throw new AppError('Acceso prohibido', 403);

  const matches = await matchingService.runMatchingForOrder(pedidoId);
  res.json({ success: true, data: matches, total: matches.length });
}

/**
 * GET /api/v1/matching/seller/matches
 * List all matches for the logged-in seller across all their lots.
 */
export async function listSellerMatches(req: Request, res: Response): Promise<void> {
  const vendedorId = req.user!.sub;
  const matches = await matchingService.getMatchesForSeller(vendedorId);
  res.json({ success: true, data: matches });
}

/**
 * GET /api/v1/matching/lots/:loteId/matches
 * List matches for a specific lot (VENDEDOR must own it).
 */
export async function listLotMatches(req: Request, res: Response): Promise<void> {
  const loteId = req.params['loteId'] as string;
  const vendedorId = req.user!.sub;

  // Verify ownership
  const lote = await prisma.lote.findUnique({ where: { id: loteId } });
  if (!lote) throw new AppError('Lote no encontrado', 404);
  if (lote.vendedorId !== vendedorId) throw new AppError('Acceso prohibido', 403);

  const matches = await matchingService.getMatchesForSeller(vendedorId, loteId);
  res.json({ success: true, data: matches });
}

/**
 * GET /api/v1/matching/notifications/summary
 * Returns notification counts for the logged-in user (buyer or seller).
 */
export async function getNotificationsSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sub, role } = req.user!;
    const data = await matchingService.getNotificationsSummary(sub, role);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/v1/matching/notifications/tasks
 * Returns detailed list of all pending tasks for the logged-in user.
 */
export async function getPendingTasksList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sub, role } = req.user!;
    const data = await matchingService.getPendingTasksList(sub, role);
    res.json({ success: true, data });
  } catch (e) {
    console.error('[getPendingTasksList] error:', e);
    next(e);
  }
}

/**
 * POST /api/v1/matching/matches/:matchId/contribute
 * Seller contributes specific calibres to fulfil a match.
 */
export async function contributeToOrder(req: Request, res: Response): Promise<void> {
  const matchId = req.params['matchId'] as string;
  const vendedorId = req.user!.sub;
  const { calibresContribucion } = contributeSchema.parse(req.body);

  const match = await matchingService.contributeToOrder(vendedorId, matchId, calibresContribucion);
  res.json({ success: true, data: match });
}
