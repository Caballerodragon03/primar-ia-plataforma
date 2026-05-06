import { Request, Response, NextFunction } from 'express';
import { adminService } from './admin.service.js';
import type { UserEstado } from '@primaria/shared';

export class AdminController {
  // GET /api/v1/admin/users
  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const role = typeof req.query['role'] === 'string' ? req.query['role'] : undefined;
      const estado = typeof req.query['estado'] === 'string' ? req.query['estado'] : undefined;
      const pageRaw = typeof req.query['page'] === 'string' ? req.query['page'] : undefined;
      const result = await adminService.listUsers({
        role,
        estado,
        page: pageRaw ? parseInt(pageRaw, 10) : undefined,
      });
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/v1/admin/users/:id
  async getUserDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await adminService.getUserDetail(req.params['id'] as string);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/v1/admin/users/:id/estado
  async updateUserEstado(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { estado, notasAdmin } = req.body as { estado: UserEstado; notasAdmin?: string };
      const user = await adminService.updateUserEstado(req.params['id'] as string, estado, notasAdmin);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/v1/admin/certificados
  async listCertificados(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const estado = typeof req.query['estado'] === 'string' ? req.query['estado'] : undefined;
      const userId = typeof req.query['userId'] === 'string' ? req.query['userId'] : undefined;
      const certs = await adminService.listCertificados({ estado, userId });
      res.json({ success: true, data: certs });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/v1/admin/certificados/:id/verify
  async verifyCertificado(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.sub;
      const { action, notas } = req.body as {
        action: 'VERIFICADO' | 'RECHAZADO';
        notas?: string;
      };
      const cert = await adminService.verifyCertificado(req.params['id'] as string, adminId, action, notas);
      res.json({ success: true, data: cert });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/v1/admin/users/:id/ban
  async banUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.sub;
      const { reason } = req.body as { reason?: string };
      await adminService.banUser(req.params['id'] as string, adminId, reason);
      res.json({ success: true, message: 'Usuario baneado y cuenta eliminada' });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/v1/admin/users/:id
  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await adminService.deleteUser(req.params['id'] as string);
      res.json({ success: true, message: 'Cuenta eliminada' });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/v1/admin/stats
  async getDashboardStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await adminService.getDashboardStats();
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  }
}

export const adminController = new AdminController();
