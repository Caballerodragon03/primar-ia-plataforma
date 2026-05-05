import { Request, Response } from 'express';
import { disputasService } from './disputes.service.js';
import { createDisputaSchema, respuestaVendedorSchema, resolverDisputaSchema } from './disputes.schema.js';

export async function createDisputa(req: Request, res: Response): Promise<void> {
  const transaccionId = req.body.transaccionId as string;
  const data = createDisputaSchema.parse(req.body);
  const disputa = await disputasService.createDisputa(req.user!.sub, transaccionId, data);
  res.status(201).json({ success: true, data: disputa });
}

export async function listDisputas(req: Request, res: Response): Promise<void> {
  const disputas = await disputasService.listDisputas(req.user!.sub, req.user!.role);
  res.json({ success: true, data: disputas });
}

export async function getDisputa(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const disputa = await disputasService.getDisputa(id, req.user!.sub);
  res.json({ success: true, data: disputa });
}

export async function responderDisputa(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const data = respuestaVendedorSchema.parse(req.body);
  const disputa = await disputasService.responderDisputa(id, req.user!.sub, data);
  res.json({ success: true, data: disputa });
}

export async function resolverDisputa(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const data = resolverDisputaSchema.parse(req.body);
  const disputa = await disputasService.resolverDisputa(id, req.user!.sub, data);
  res.json({ success: true, data: disputa });
}
