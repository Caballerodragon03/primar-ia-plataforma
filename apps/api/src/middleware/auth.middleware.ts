import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './error.middleware.js';
import type { JWTPayload, UserRole } from '@primaria/shared';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('No autorizado', 401);
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    req.user = payload;
    next();
  } catch {
    throw new AppError('Token invalido o expirado', 401);
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new AppError('No autorizado', 401);
    if (!roles.includes(req.user.role)) {
      throw new AppError('Acceso prohibido', 403);
    }
    next();
  };
}

export function requireEstado(...estados: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new AppError('No autorizado', 401);
    if (!estados.includes(req.user.estado)) {
      throw new AppError('Tu cuenta no esta en el estado requerido para esta accion', 403);
    }
    next();
  };
}
