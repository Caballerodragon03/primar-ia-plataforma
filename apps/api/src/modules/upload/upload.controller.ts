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
  return env.R2_ACCOUNT_ID !== 'placeholder' && env.R2_ACCESS_KEY_ID !== 'placeholder';
}

/**
 * Sniff the magic bytes of a buffer to confirm the declared mime type.
 * Prevents an attacker from uploading a polyglot file (e.g. a script with
 * a faked image/png Content-Type header).
 */
function detectMimeFromMagic(buf: Buffer): string | null {
  if (buf.length < 4) return null;
  // PDF: %PDF-
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return 'application/pdf';
  // JPEG: FF D8 FF
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 &&
    buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A
  ) return 'image/png';
  return null;
}

function mimeMatches(declared: string, sniffed: string): boolean {
  if (declared === sniffed) return true;
  // image/jpg is a common alias for image/jpeg
  if (declared === 'image/jpg' && sniffed === 'image/jpeg') return true;
  return false;
}

export async function uploadFile(req: Request, res: Response, _next: import('express').NextFunction): Promise<void> {
  const file = req.file;
  if (!file) throw new AppError('No se recibió ningún archivo', 400);
  if (!ALLOWED_MIME.has(file.mimetype)) throw new AppError('Tipo no permitido. Usa PDF, JPG o PNG.', 400);
  if (file.size > MAX_BYTES) throw new AppError('El archivo supera el límite de 10MB', 400);

  // Verify the buffer's magic bytes match the declared mime type.
  const sniffed = detectMimeFromMagic(file.buffer);
  if (!sniffed || !mimeMatches(file.mimetype, sniffed)) {
    throw new AppError('El archivo no coincide con el tipo declarado.', 400);
  }

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
      // Force the browser to never inline-execute uploaded files. Defense
      // in depth against polyglot files that pass the magic-byte check but
      // also carry HTML/script payloads downstream.
      ContentDisposition: 'attachment',
    }));
    const url = `${env.R2_PUBLIC_URL}/${key}`;
    res.json({ success: true, data: { url, key } });
  } else {
    const localDir = path.resolve('uploads', safeFolder);
    await fs.mkdir(localDir, { recursive: true });
    const localPath = path.join(localDir, `${randomUUID()}${ext}`);
    await fs.writeFile(localPath, file.buffer);
    const url = `/local-uploads/${path.relative('uploads', localPath)}`;
    res.json({ success: true, data: { url, key } });
  }
}
