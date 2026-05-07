import type { Request, Response, NextFunction } from 'express';
import { harvestEstimationService } from './harvest-estimation.service.js';
import { uploadHistorialSchema, calculateEstimationSchema } from './harvest-estimation.schema.js';

class HarvestEstimationController {
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      const data = uploadHistorialSchema.parse(req.body);
      const result = await harvestEstimationService.uploadHistorial(req.user!.sub, data);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getHistorial(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await harvestEstimationService.getHistorial(req.user!.sub);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async calculateEstimation(req: Request, res: Response, next: NextFunction) {
    try {
      const { productoId, variedadId } = calculateEstimationSchema.parse(req.body);
      const result = await harvestEstimationService.calculateEstimation(
        req.user!.sub, productoId, variedadId
      );
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getPredictions(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await harvestEstimationService.getPredictions(req.user!.sub);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async deleteHistorial(req: Request, res: Response, next: NextFunction) {
    try {
      await harvestEstimationService.deleteHistorial(req.params.id as string, req.user!.sub as string);
      res.json({ success: true, message: 'Registro eliminado' });
    } catch (err) {
      next(err);
    }
  }
}

export const harvestEstimationController = new HarvestEstimationController();
