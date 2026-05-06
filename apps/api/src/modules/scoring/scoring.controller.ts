import { Request, Response, NextFunction } from 'express';
import { scoringService } from './scoring.service.js';
import type { PenaltyInput, IncentivoInput } from './scoring.schema.js';

export class ScoringController {
  // GET /api/v1/scoring/:userId/history
  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params['userId'] as string;
      const history = await scoringService.getScoreHistory(userId);
      res.json({ success: true, data: history });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/v1/scoring/:userId/penalty
  async applyPenalty(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params['userId'] as string;
      const adminId = req.user!.sub;
      const { delta, motivo } = req.body as PenaltyInput;
      const event = await scoringService.adminApplyPenalty(userId, delta, adminId, motivo);
      res.json({ success: true, data: event });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/v1/scoring/:userId/incentivo
  async applyIncentivo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.params['userId'] as string;
      const adminId = req.user!.sub;
      const { delta, motivo } = req.body as IncentivoInput;
      const event = await scoringService.adminApplyIncentivo(userId, delta, adminId, motivo);
      res.json({ success: true, data: event });
    } catch (err) {
      next(err);
    }
  }
}

export const scoringController = new ScoringController();
