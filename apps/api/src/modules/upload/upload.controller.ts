import { Request, Response } from 'express';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { getR2 } from '../../shared/r2.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/error.middleware.js';

const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']);
const MAX_BYTES = 10 * 1024 * 1024;

function isR2Configured(): boolean {
  return (
    !!env.R2_ACCOUNT_ID &&
    env.R2_ACCOUNT_ID !== 'placeholder' &&
    env.R2_ACCOUNT_ID !== '...' &&
    !!env.R2_ACCESS_KEY_ID &&
    env.R2_ACCESS_KEY_ID !== 'placeholder' &&
    env.R2_ACCESS_KEY_ID !== '...'
  );
}

export async function uploadFile(req: Request, res: Response, _next: import('express').NextFunction): Promise<void> {
  const file = req.file;
  if (!file) throw new AppError('No se recibió ningún archivo', 400);
  if (!ALLOWED_MIME.has(file.mimetype)) throw new AppError('Tipo no permitido. Usa PDF, JPG o PNG.', 400);
  if (file.size > MAX_BYTES) throw new AppError('El archivo supera el límite de 10MB', 400);

  const folder = (req.body.folder as string) ?? 'uploads';
  const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '');
  const ext = path.extname(file.originalname).toLowerCase();
  const key = `${safeFolder}/${randomUUID()}${ext}`;

  if (isR2Configured()) {
    await getR2().send(new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));
    const url = `${env.R2_PUBLIC_URL}/${key}`;
    res.json({ success: true, data: { url, key } });
  } else {
    const localDir = path.resolve('uploads', safeFolder);
    await fs.mkdir(localDir, { recursive: true });
    const localPath = path.join(localDir, `${randomUUID()}${ext}`);
    await fs.writeFile(localPath, file.buffer);
    const relativePath = path.relative('uploads', localPath);
    // Build absolute URL so it works from any frontend domain
    const protocol = req.protocol;
    const host = req.get('host') ?? 'localhost:3001';
    const url = `${protocol}://${host}/local-uploads/${relativePath}`;
    res.json({ success: true, data: { url, key } });
  }
}
