import { Request, Response } from 'express';
import { chatService } from './chat.service.js';
import { sendMessageSchema, markReadSchema } from './chat.schema.js';

export async function getConversations(req: Request, res: Response): Promise<void> {
  const conversations = await chatService.getConversations(req.user!.sub);
  res.json({ success: true, data: conversations });
}

export async function getMessages(req: Request, res: Response): Promise<void> {
  const transaccionId = req.params['transaccionId'] as string;
  const page = Math.max(1, parseInt(req.query['page'] as string, 10) || 1);
  const mensajes = await chatService.getMessages(transaccionId, req.user!.sub, page);
  res.json({ success: true, data: mensajes });
}

export async function sendMessage(req: Request, res: Response): Promise<void> {
  const transaccionId = req.params['transaccionId'] as string;
  const data = sendMessageSchema.parse(req.body);
  const mensaje = await chatService.sendMessage(transaccionId, req.user!.sub, data);
  res.status(201).json({ success: true, data: mensaje });
}

export async function markRead(req: Request, res: Response): Promise<void> {
  const transaccionId = req.params['transaccionId'] as string;
  const { mensajeIds } = markReadSchema.parse(req.body);
  await chatService.markRead(transaccionId, req.user!.sub, mensajeIds);
  res.json({ success: true });
}
