/**
 * Phase 10 — Shipping event endpoints.
 */
import type { Request, Response } from 'express';
import { shippingService } from './shipping.service.js';

export async function markShippedController(req: Request, res: Response): Promise<void> {
  const matchId = req.params['matchId'] as string;
  const result = await shippingService.markShipped(matchId, req.user!.sub);
  res.json({ success: true, data: result });
}

export async function markReceivedController(req: Request, res: Response): Promise<void> {
  const matchId = req.params['matchId'] as string;
  const result = await shippingService.markReceived(matchId, req.user!.sub);
  res.json({ success: true, data: result });
}
