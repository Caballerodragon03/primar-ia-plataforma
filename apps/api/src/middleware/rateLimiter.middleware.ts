import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, error: 'Demasiados intentos. Espera 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { success: false, error: 'Demasiadas peticiones.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Phase 12 — anti-abuse limiter for contract cancellations.
 *
 * Without this, a malicious user could spam `POST /contracts/match/:id/cancel`
 * against the same partner to inflate `CancelacionSospechosa.totalCancelaciones`
 * past the threshold and trigger an admin-suspend on the contraparte (social
 * attack). 5 cancellations per 10 minutes per user is generous for legit use
 * but kills the abuse vector.
 */
export const cancelRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.user?.sub ?? req.ip ?? 'anon',
  message: { success: false, error: 'Has cancelado demasiados contratos en poco tiempo. Espera unos minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
