import { Router } from 'express';
import { requireAuth, requireRole, requireEstado } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { contributeSchema } from './matching.schema.js';
import {
  runMatchingForLot,
  runMatchingForOrder,
  listSellerMatches,
  listLotMatches,
  getSellerHiddenMatches,
  contributeToOrder,
  getAutoDistributePreview,
  getNotificationsSummary,
  getPendingTasksList,
  extendOrderDeadline,
  closeOrder,
  extendLotDeadline,
  closeLot,
} from './matching.controller.js';
import { asyncHandler } from '../../shared/async-handler.js';

export const matchingRouter = Router();

// All matching routes require an authenticated, verified user
matchingRouter.use(requireAuth, requireEstado('VERIFICADO_ACTIVO'));

// ── Vendor routes ─────────────────────────────────────────────────────────────
// Trigger matching for a lot the vendor owns
matchingRouter.post(
  '/lots/:loteId/run',
  requireRole('VENDEDOR'),
  asyncHandler(runMatchingForLot)
);

// List all matches for the logged-in seller (across all lots)
matchingRouter.get(
  '/seller/matches',
  requireRole('VENDEDOR'),
  asyncHandler(listSellerMatches)
);

// Count of matches hidden by the 24h free-tier delay (Phase 15)
matchingRouter.get(
  '/seller/hidden-matches',
  requireRole('VENDEDOR'),
  asyncHandler(getSellerHiddenMatches)
);

// Auto-distribute preview (greedy by revenue, per-calibre capacity-aware)
matchingRouter.get(
  '/seller/auto-distribute-preview',
  requireRole('VENDEDOR'),
  asyncHandler(getAutoDistributePreview)
);

// Phase 7 — "Ofertas similares" — pedidos del mismo producto que no están
// matcheados con los lotes del vendedor, con diffs computados.
matchingRouter.get(
  '/seller/similar-offers',
  requireRole('VENDEDOR'),
  asyncHandler(async (req, res) => {
    const { matchingService } = await import('./matching.service.js');
    const data = await matchingService.getSimilarOffersForSeller(req.user!.sub);
    res.json({ success: true, data });
  }),
);

// Market demand: calibres buyers are currently requesting for products the seller has lots for
matchingRouter.get(
  '/seller/market-demand',
  requireRole('VENDEDOR'),
  asyncHandler(async (req, res) => {
    const { prisma } = await import('@primaria/database');
    const vendedorId = req.user!.sub;

    const sellerProductIds = await prisma.lote.findMany({
      where: { vendedorId, estado: { in: ['ACTIVO', 'PARCIALMENTE_VENDIDO'] } },
      select: { productoId: true },
      distinct: ['productoId'],
    });
    const productIds = sellerProductIds.map((l: { productoId: string }) => l.productoId);

    if (productIds.length === 0) {
      res.json({ success: true, data: [] });
      return;
    }

    const orders = await prisma.pedido.findMany({
      where: { productoId: { in: productIds }, estado: 'ACTIVO' },
      select: {
        productoId: true,
        calibresSolicitados: true,
        producto: { select: { nombre: true } },
      },
    });

    type CalEntry = { productoId: string; productoNombre: string; calibre: string; totalKg: number; orderCount: number };
    const map = new Map<string, CalEntry>();
    for (const order of orders) {
      const calibres = (order.calibresSolicitados as { calibre: string; cantidad_kg: number }[]) ?? [];
      for (const c of calibres) {
        const key = `${order.productoId}:${c.calibre}`;
        const existing = map.get(key);
        if (existing) {
          existing.totalKg += c.cantidad_kg;
          existing.orderCount += 1;
        } else {
          map.set(key, {
            productoId: order.productoId,
            productoNombre: order.producto.nombre,
            calibre: c.calibre,
            totalKg: c.cantidad_kg,
            orderCount: 1,
          });
        }
      }
    }

    res.json({ success: true, data: Array.from(map.values()).sort((a, b) => b.totalKg - a.totalKg) });
  })
);

// List matches for a specific lot
matchingRouter.get(
  '/lots/:loteId/matches',
  requireRole('VENDEDOR'),
  asyncHandler(listLotMatches)
);

// Vendor contributes calibres to a match
matchingRouter.post(
  '/matches/:matchId/contribute',
  requireRole('VENDEDOR'),
  validateBody(contributeSchema),
  asyncHandler(contributeToOrder)
);

// ── Shared routes ─────────────────────────────────────────────────────────────
// Notification summary for both buyers and sellers
matchingRouter.get('/notifications/summary', asyncHandler(getNotificationsSummary));
matchingRouter.get('/notifications/tasks', asyncHandler(getPendingTasksList));

// ── Expiry extend/close routes ───────────────────────────────────────────────
matchingRouter.post('/orders/:orderId/extend', requireRole('COMPRADOR'), asyncHandler(extendOrderDeadline));
matchingRouter.post('/orders/:orderId/close', requireRole('COMPRADOR'), asyncHandler(closeOrder));
matchingRouter.post('/lots/:lotId/extend', requireRole('VENDEDOR'), asyncHandler(extendLotDeadline));
matchingRouter.post('/lots/:lotId/close', requireRole('VENDEDOR'), asyncHandler(closeLot));

// ── Buyer routes ──────────────────────────────────────────────────────────────
// Trigger matching for an order the buyer owns
matchingRouter.post(
  '/orders/:pedidoId/run',
  requireRole('COMPRADOR'),
  asyncHandler(runMatchingForOrder)
);
