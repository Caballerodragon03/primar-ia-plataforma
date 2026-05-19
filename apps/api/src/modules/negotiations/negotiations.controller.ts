import type { Request, Response } from 'express';
import { negotiationsService } from './negotiations.service.js';
import type { CreateOfertaInput } from './negotiations.schema.js';

export class NegotiationsController {
  async create(req: Request, res: Response): Promise<void> {
    const transaccionId = req.params['transaccionId'] as string;
    const result = await negotiationsService.createOffer(
      transaccionId,
      req.user!.sub,
      req.body as CreateOfertaInput
    );
    res.status(201).json({ data: result });
  }

  async accept(req: Request, res: Response): Promise<void> {
    const transaccionId = req.params['transaccionId'] as string;
    const negociacionId = req.params['negociacionId'] as string;
    const result = await negotiationsService.acceptOffer(
      transaccionId,
      req.user!.sub,
      negociacionId
    );
    res.json({ data: result });
  }

  async reject(req: Request, res: Response): Promise<void> {
    const transaccionId = req.params['transaccionId'] as string;
    const negociacionId = req.params['negociacionId'] as string;
    const result = await negotiationsService.rejectOffer(
      transaccionId,
      req.user!.sub,
      negociacionId
    );
    res.json({ data: result });
  }

  // Devuelve los calibres negociables (intersección lote↔pedido) con sus
  // máximos por parte. Usado por el modal de propuesta para limitar el
  // dropdown y el input de kg.
  async context(req: Request, res: Response): Promise<void> {
    const transaccionId = req.params['transaccionId'] as string;
    const result = await negotiationsService.getNegotiationContext(
      transaccionId,
      req.user!.sub,
    );
    res.json({ data: result });
  }
}

export const negotiationsController = new NegotiationsController();
