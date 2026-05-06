import type { Request, Response } from 'express';
import { valoracionesService } from './valoraciones.service.js';
import type { CreateValoracionInput } from './valoraciones.schema.js';

export class ValoracionesController {
  async create(req: Request, res: Response): Promise<void> {
    const autorId = req.user!.sub;
    const valoracion = await valoracionesService.create(autorId, req.body as CreateValoracionInput);
    res.status(201).json({ data: valoracion });
  }

  async getPending(req: Request, res: Response): Promise<void> {
    const pending = await valoracionesService.getPending(req.user!.sub, req.user!.role);
    res.json({ data: pending });
  }
}

export const valoracionesController = new ValoracionesController();
