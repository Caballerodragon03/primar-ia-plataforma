import { Request, Response, NextFunction } from 'express';
import { certificatesService } from './certificates.service.js';

export class CertificatesController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const certs = await certificatesService.listByUser(req.user!.sub);
      const mapped = certs.map((c) => ({
        id: c.id,
        tipo: c.numeroCertificado,
        estado: c.estado,
        fechaExpiracion: c.fechaCaducidad?.toISOString() ?? null,
        archivoUrl: c.archivoUrl,
        createdAt: c.createdAt.toISOString(),
      }));
      res.json({ success: true, data: mapped });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { tipo, archivoUrl } = req.body;
      if (!tipo || !archivoUrl) {
        res.status(400).json({ success: false, message: 'tipo and archivoUrl are required' });
        return;
      }
      const cert = await certificatesService.create(req.user!.sub, { tipo, archivoUrl });
      res.status(201).json({ success: true, data: cert });
    } catch (err) {
      next(err);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await certificatesService.delete(req.user!.sub, req.params.id as string);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
}

export const certificatesController = new CertificatesController();
