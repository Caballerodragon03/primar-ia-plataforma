import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '@primaria/database';
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

/**
 * Phase 12 — Live DB check.
 *
 * Originally requireEstado read solely from the JWT, which produced up to
 * ≤1h of drift after admin actions (e.g. banning a user via /admin/risks
 * marked them SUSPENDIDO in DB but their existing access token still passed
 * VERIFICADO_ACTIVO until expiry).
 *
 * Now we additionally verify the live `estado` from DB. Cached in-memory for
 * USER_ESTADO_CACHE_MS to limit the per-request cost — short enough to make
 * a ban effective within seconds, long enough to absorb burst traffic from
 * the same user without N queries per minute.
 */
const USER_ESTADO_CACHE_MS = 30_000; // 30s
const estadoCache = new Map<string, { estado: string; expiresAt: number }>();

async function getLiveEstado(userId: string): Promise<string | null> {
  const cached = estadoCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.estado;
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { estado: true },
  });
  if (!u) {
    estadoCache.delete(userId);
    return null;
  }
  estadoCache.set(userId, { estado: u.estado, expiresAt: Date.now() + USER_ESTADO_CACHE_MS });
  return u.estado;
}

export function requireEstado(...estados: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) return next(new AppError('No autorizado', 401));
    // First cheap-check against the JWT to short-circuit obvious wrongs.
    if (!estados.includes(req.user.estado)) {
      return next(new AppError('Tu cuenta no esta en el estado requerido para esta accion', 403));
    }
    // Then live DB verification — catches the case where the user was banned
    // since the JWT was issued. 30s cache keeps the cost negligible.
    try {
      const liveEstado = await getLiveEstado(req.user.sub);
      if (!liveEstado || !estados.includes(liveEstado)) {
        return next(new AppError('Tu cuenta no esta en el estado requerido para esta accion', 403));
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Invalidate the cached estado for a user (call after admin actions that flip estado). */
export function invalidateEstadoCache(userId: string): void {
  estadoCache.delete(userId);
}
