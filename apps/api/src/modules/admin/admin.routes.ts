import { Router } from 'express';
import { adminController } from './admin.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';

export const adminRouter = Router();

// All admin routes require authentication and ADMIN role
adminRouter.use(requireAuth, requireRole('ADMIN'));

adminRouter.get('/users', adminController.listUsers.bind(adminController));
adminRouter.get('/users/:id', adminController.getUserDetail.bind(adminController));
adminRouter.patch('/users/:id/estado', adminController.updateUserEstado.bind(adminController));
adminRouter.get('/certificados', adminController.listCertificados.bind(adminController));
adminRouter.post('/certificados/:id/verify', adminController.verifyCertificado.bind(adminController));
adminRouter.get('/stats', adminController.getDashboardStats.bind(adminController));
