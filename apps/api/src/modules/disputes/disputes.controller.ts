import { Request, Response } from 'express';
import { disputasService } from './disputes.service.js';
import {
  createDisputaSchema,
  respuestaVendedorSchema,
  resolverDisputaSchema,
  resolverDisputaAdminSchema,
  sendDisputaMensajeSchema,
} from './disputes.schema.js';

export async function createDisputa(req: Request, res: Response): Promise<void> {
  const transaccionId = req.body.transaccionId as string;
  const data = createDisputaSchema.parse(req.body);
  console.log('[Disputes] Creating dispute:', { transaccionId, tipoProblema: data.tipoProblema, userId: req.user!.sub });
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

export async function resolverDisputaAdmin(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const data = resolverDisputaAdminSchema.parse(req.body);
  const disputa = await disputasService.resolverDisputaAdmin(id, req.user!.sub, data);
  res.json({ success: true, data: disputa });
}

export async function sendDisputaMensaje(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const data = sendDisputaMensajeSchema.parse(req.body);
  const mensaje = await disputasService.sendDisputaMensaje(id, req.user!.sub, data);
  res.status(201).json({ success: true, data: mensaje });
}

export async function getDisputaMensajes(req: Request, res: Response): Promise<void> {
  const id = req.params['id'] as string;
  const mensajes = await disputasService.getDisputaMensajes(id, req.user!.sub);
  res.json({ success: true, data: mensajes });
}
