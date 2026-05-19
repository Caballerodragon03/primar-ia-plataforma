import { Router } from 'express';
import { adminController } from './admin.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { updateEstadoSchema } from './admin.schema.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { listBypassAlerts, resolveBypassAlert } from '../bypass/bypass.controller.js';
import { listSuspiciousCancellations, resolveSuspiciousCancellation } from '../cancellations/cancellations.controller.js';

export const adminRouter = Router();

// All admin routes require authentication and ADMIN role
adminRouter.use(requireAuth, requireRole('ADMIN'));

adminRouter.get('/users', adminController.listUsers.bind(adminController));
adminRouter.get('/users/:id', adminController.getUserDetail.bind(adminController));
adminRouter.patch('/users/:id/estado', validateBody(updateEstadoSchema), adminController.updateUserEstado.bind(adminController));
adminRouter.post('/users/:id/ban', adminController.banUser.bind(adminController));
adminRouter.delete('/users/:id', adminController.deleteUser.bind(adminController));
adminRouter.get('/certificados', adminController.listCertificados.bind(adminController));
adminRouter.post('/certificados/:id/verify', adminController.verifyCertificado.bind(adminController));
adminRouter.get('/stats', adminController.getDashboardStats.bind(adminController));

// Phase 8 — Anti-bypass risk review.
adminRouter.get('/bypass-alerts', asyncHandler(listBypassAlerts));
adminRouter.post('/bypass-alerts/:id/resolve', asyncHandler(resolveBypassAlert));

// Phase 9 — Suspicious cancellation pair review.
adminRouter.get('/cancellations', asyncHandler(listSuspiciousCancellations));
adminRouter.post('/cancellations/:id/resolve', asyncHandler(resolveSuspiciousCancellation));
