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
 * Query param: ?sortBy=precio — sort results by precio asc instead of score desc.
 */
export async function runMatchingForOrder(req: Request, res: Response): Promise<void> {
  const pedidoId = req.params['pedidoId'] as string;
  const compradorId = req.user!.sub;
  const sortBy = req.query['sortBy'] as string | undefined;

  // Verify ownership
  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
  if (!pedido) throw new AppError('Pedido no encontrado', 404);
  if (pedido.compradorId !== compradorId) throw new AppError('Acceso prohibido', 403);

  const matches = await matchingService.runMatchingForOrder(pedidoId, sortBy);
  res.json({ success: true, data: matches, total: matches.length });
}

/**
 * GET /api/v1/matching/seller/matches
 * List all matches for the logged-in seller across all their lots.
 * Query param: ?sortBy=precio — sort by precioKg asc instead of score desc.
 */
export async function listSellerMatches(req: Request, res: Response): Promise<void> {
  const vendedorId = req.user!.sub;
  const sortBy = req.query['sortBy'] as string | undefined;
  const matches = await matchingService.getMatchesForSeller(vendedorId, undefined, sortBy);
  res.json({ success: true, data: matches });
}

/**
 * GET /api/v1/matching/seller/hidden-matches
 * Phase 15 — devuelve cuántos matches del vendedor están ocultos por el
 * retraso de 24h del plan gratuito. Lo usa el banner de upgrade en
 * /seller/matches.
 */
export async function getSellerHiddenMatches(req: Request, res: Response): Promise<void> {
  const vendedorId = req.user!.sub;
  const info = await matchingService.getSellerHiddenMatchesInfo(vendedorId);
  res.json({ success: true, data: info });
}

/**
 * POST /api/v1/matching/preview-potential-counterparties
 * Phase 16 — preview: ¿cuántos potenciales counterparties match el draft
 * del lote/pedido que el usuario está rellenando? Live-count en el form.
 */
export async function previewPotentialCounterparties(req: Request, res: Response): Promise<void> {
  const { role } = req.user!;
  const side: 'BUYER' | 'SELLER' = role === 'COMPRADOR' ? 'BUYER' : 'SELLER';
  const body = (req.body ?? {}) as {
    productoId?: string;
    variedadId?: string | null;
    incoterms?: string[];
    calibres?: Array<{ calibre: string }>;
  };
  const result = await matchingService.previewPotentialCounterparties(side, body);
  res.json({ success: true, data: result });
}

/**
 * GET /api/v1/matching/lots/:loteId/matches
 * List matches for a specific lot (VENDEDOR must own it).
 * Query param: ?sortBy=precio — sort by precioKg asc instead of score desc.
 */
export async function listLotMatches(req: Request, res: Response): Promise<void> {
  const loteId = req.params['loteId'] as string;
  const vendedorId = req.user!.sub;
  const sortBy = req.query['sortBy'] as string | undefined;

  // Verify ownership
  const lote = await prisma.lote.findUnique({ where: { id: loteId } });
  if (!lote) throw new AppError('Lote no encontrado', 404);
  if (lote.vendedorId !== vendedorId) throw new AppError('Acceso prohibido', 403);

  const matches = await matchingService.getMatchesForSeller(vendedorId, loteId, sortBy);
  res.json({ success: true, data: matches });
}

/**
 * GET /api/v1/matching/seller/auto-distribute-preview
 * Returns the greedy-by-revenue allocation preview for all pending matches
 * across the seller's lots. Read-only; the actual accept happens client-side
 * via /matches/:matchId/contribute.
 */
export async function getAutoDistributePreview(req: Request, res: Response): Promise<void> {
  const vendedorId = req.user!.sub;
  const preview = await matchingService.getAutoDistributePreview(vendedorId);
  res.json({ success: true, data: preview });
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

export async function extendOrderDeadline(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orderId = req.params['orderId'] as string;
    const { newDate } = req.body as { newDate: string };
    if (!newDate) throw new AppError('newDate is required', 400);
    const updated = await matchingService.extendOrderDeadline(orderId, req.user!.sub, newDate);
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
}

export async function closeOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orderId = req.params['orderId'] as string;
    const updated = await matchingService.closeOrder(orderId, req.user!.sub);
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
}

export async function extendLotDeadline(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const lotId = req.params['lotId'] as string;
    const { newDate } = req.body as { newDate: string };
    if (!newDate) throw new AppError('newDate is required', 400);
    const updated = await matchingService.extendLotDeadline(lotId, req.user!.sub, newDate);
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
}

export async function closeLot(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const lotId = req.params['lotId'] as string;
    const updated = await matchingService.closeLot(lotId, req.user!.sub);
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
}
