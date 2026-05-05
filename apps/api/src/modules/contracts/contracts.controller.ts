import { Request, Response } from 'express';
import { contractsService } from './contracts.service.js';

export async function downloadContract(req: Request, res: Response): Promise<void> {
  const { transaccionId } = req.params as { transaccionId: string };
  const userId = req.user!.sub;
  const { buffer, filename } = await contractsService.getContractStream(transaccionId, userId);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  res.send(buffer);
}

export async function getContractInfo(req: Request, res: Response): Promise<void> {
  const { transaccionId } = req.params as { transaccionId: string };
  const info = await contractsService.getContractInfo(transaccionId, req.user!.sub);
  res.json({ success: true, data: info });
}

export async function signContract(req: Request, res: Response): Promise<void> {
  const { transaccionId } = req.params as { transaccionId: string };
  const { signatureData } = req.body as { signatureData: string };
  if (!signatureData) {
    res.status(400).json({ success: false, error: 'signatureData is required' });
    return;
  }
  const result = await contractsService.signContract(transaccionId, req.user!.sub, signatureData);
  res.json({ success: true, data: result });
}

export async function uploadLotPhotos(req: Request, res: Response): Promise<void> {
  const { transaccionId } = req.params as { transaccionId: string };
  const { photoUrls } = req.body as { photoUrls: string[] };
  const result = await contractsService.uploadLotPhotos(transaccionId, req.user!.sub, photoUrls ?? []);
  res.json({ success: true, data: result });
}

export async function confirmDelivery(req: Request, res: Response): Promise<void> {
  const { transaccionId } = req.params as { transaccionId: string };
  const { qrToken } = req.body as { qrToken: string };
  if (!qrToken) {
    res.status(400).json({ success: false, error: 'qrToken is required' });
    return;
  }
  const result = await contractsService.confirmDelivery(transaccionId, req.user!.sub, qrToken);
  res.json({ success: true, data: result });
}
