import type { Request, Response, NextFunction } from 'express';
import { harvestEstimationService, generateTemplateBuffer } from './harvest-estimation.service.js';
import { uploadHistorialSchema, excelUploadSchema } from './harvest-estimation.schema.js';

class HarvestEstimationController {
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      const data = uploadHistorialSchema.parse(req.body);
      const result = await harvestEstimationService.uploadHistorial(req.user!.sub as string, data);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async downloadTemplate(_req: Request, res: Response, next: NextFunction) {
    try {
      const buffer = generateTemplateBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="plantilla_cosecha_primaria.xlsx"');
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }

  async uploadExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ success: false, error: 'No se ha enviado ningún archivo' });
        return;
      }

      const { productoId, variedadId } = excelUploadSchema.parse(req.body);
      const result = await harvestEstimationService.uploadFromExcel(
        req.user!.sub as string,
        productoId,
        variedadId,
        file.buffer,
      );
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getHistorial(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await harvestEstimationService.getHistorial(req.user!.sub as string);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getPredictions(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await harvestEstimationService.getPredictions(req.user!.sub as string);
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
