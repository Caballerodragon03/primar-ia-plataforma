import { Router } from 'express';
import { authController } from './auth.controller.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { authRateLimiter } from '../../middleware/rateLimiter.middleware.js';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.schema.js';

export const authRouter = Router();

authRouter.post('/register', authRateLimiter, validateBody(registerSchema), (req, res, next) => authController.register(req, res, next));
authRouter.post('/login', authRateLimiter, validateBody(loginSchema), (req, res, next) => authController.login(req, res, next));
authRouter.get('/verify-email/:token', (req, res, next) => authController.verifyEmail(req, res, next));
authRouter.post('/forgot-password', authRateLimiter, validateBody(forgotPasswordSchema), (req, res, next) => authController.forgotPassword(req, res, next));
authRouter.post('/reset-password', authRateLimiter, validateBody(resetPasswordSchema), (req, res, next) => authController.resetPassword(req, res, next));
authRouter.post('/refresh', authRateLimiter, (req, res, next) => authController.refresh(req, res, next));
authRouter.post('/logout', (req, res, next) => authController.logout(req, res, next));
