import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { uploadRouter } from './modules/upload/upload.routes.js';
import { stripeRouter } from './modules/stripe/stripe.routes.js';
import { lotsRouter } from './modules/lots/lots.routes.js';
import { ordersRouter } from './modules/orders/orders.routes.js';
import { productsRouter } from './modules/products/products.routes.js';
import { matchingRouter } from './modules/matching/matching.routes.js';
import { contractsRouter } from './modules/contracts/contracts.routes.js';
import { chatRouter } from './modules/chat/chat.routes.js';
import { disputesRouter } from './modules/disputes/disputes.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { scoringRouter } from './modules/scoring/scoring.routes.js';
import { valoracionesRouter } from './modules/valoraciones/valoraciones.routes.js';
import { negotiationsRouter } from './modules/negotiations/negotiations.routes.js';
import { subscriptionRouter } from './modules/subscriptions/subscription.routes.js';
import { certificatesRouter } from './modules/certificates/certificates.routes.js';
import { harvestEstimationRouter } from './modules/harvest-estimation/harvest-estimation.routes.js';
import { invoiceRouter } from './modules/invoices/invoice.routes.js';
import { marketPublicRouter, marketPremiumRouter, marketAdminRouter } from './modules/market/market.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { apiRateLimiter } from './middleware/rateLimiter.middleware.js';
import { requestId, noCache } from './middleware/security.middleware.js';

export const app = express();

// Trust the first proxy (Railway / reverse proxy) so express-rate-limit
// reads the real client IP from X-Forwarded-For instead of throwing.
app.set('trust proxy', 1);

// Security
app.use(helmet());
app.use(requestId);
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));
app.use(compression());

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Stripe webhook needs raw body — must come BEFORE express.json()
app.use('/api/v1/stripe/webhook', express.raw({ type: 'application/json' }));

// Parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Global rate limiting
app.use('/api', apiRateLimiter);
app.use('/api', noCache);

// Serve local uploads in dev (when R2 is not configured)
if (env.R2_ACCOUNT_ID === 'placeholder') {
  app.use('/local-uploads', express.static('uploads'));
}

// Health check
app.get('/health', async (_req, res) => {
  try {
    const { prisma } = await import('@primaria/database');
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', timestamp: new Date().toISOString() });
  }
});

// Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/upload', uploadRouter);
app.use('/api/v1/stripe', stripeRouter);
app.use('/api/v1/lots', lotsRouter);
app.use('/api/v1/orders', ordersRouter);
app.use('/api/v1/products', productsRouter);
app.use('/api/v1/matching', matchingRouter);
app.use('/api/v1/contracts', contractsRouter);
app.use('/api/v1/chat', chatRouter);
app.use('/api/v1/disputes', disputesRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/scoring', scoringRouter);
app.use('/api/v1/valoraciones', valoracionesRouter);
app.use('/api/v1/chat/:transaccionId/offers', negotiationsRouter);
app.use('/api/v1/subscriptions', subscriptionRouter);
app.use('/api/v1/certificates', certificatesRouter);
app.use('/api/v1/harvest-estimation', harvestEstimationRouter);
app.use('/api/v1/invoices', invoiceRouter);
app.use('/api/v1/market', marketPublicRouter);
app.use('/api/v1/market/premium', marketPremiumRouter);
app.use('/api/v1/admin/market', marketAdminRouter);

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Ruta no encontrada' });
});

// Error handler
app.use(errorHandler);
