import { Request, Response, NextFunction } from 'express';

// File type whitelist validator (used by upload routes)
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// Sanitize path to prevent directory traversal
export function sanitizePath(filePath: string): string {
  return filePath.replace(/\.\./g, '').replace(/\/+/g, '/').replace(/^\//, '');
}

// Request ID middleware (adds X-Request-ID header for tracing)
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = req.headers['x-request-id'] as string ?? crypto.randomUUID();
  req.headers['x-request-id'] = id;
  res.setHeader('X-Request-ID', id);
  next();
}

// Prevent response caching for API routes
export function noCache(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  next();
}
