import type { Request, Response, NextFunction } from 'express';
import { bugReportsService } from './bug-reports.service.js';

export class BugReportsController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.sub;
      const report = await bugReportsService.create(userId, req.body);
      res.status(201).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  async listForAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const estado = typeof req.query['estado'] === 'string' ? req.query['estado'] : undefined;
      const [reports, counts] = await Promise.all([
        bugReportsService.listForAdmin(estado),
        bugReportsService.getCountsByEstado(),
      ]);
      res.json({ success: true, data: { reports, counts } });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params['id'] as string;
      const report = await bugReportsService.getById(id);
      res.json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params['id'] as string;
      const report = await bugReportsService.update(id, req.body);
      res.json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }
}

export const bugReportsController = new BugReportsController();
