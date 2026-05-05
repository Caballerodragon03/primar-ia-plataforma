import { Router } from 'express';
import { authController } from './auth.controller.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { authRateLimiter } from '../../middleware/rateLimiter.middleware.js';
import { registerSchema, loginSchema } from './auth.schema.js';

export const authRouter = Router();

authRouter.post('/register', authRateLimiter, validateBody(registerSchema), (req, res, next) => authController.register(req, res, next));
authRouter.post('/login', authRateLimiter, validateBody(loginSchema), (req, res, next) => authController.login(req, res, next));
authRouter.get('/verify-email/:token', (req, res, next) => authController.verifyEmail(req, res, next));
authRouter.post('/refresh', authRateLimiter, (req, res, next) => authController.refresh(req, res, next));
authRouter.post('/logout', (req, res, next) => authController.logout(req, res, next));
