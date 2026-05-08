import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { certificatesController } from './certificates.controller.js';

export const certificatesRouter = Router();

certificatesRouter.get(
  '/',
  requireAuth,
  requireRole('VENDEDOR'),
  certificatesController.list.bind(certificatesController),
);

certificatesRouter.post(
  '/',
  requireAuth,
  requireRole('VENDEDOR'),
  certificatesController.create.bind(certificatesController),
);

certificatesRouter.delete(
  '/:id',
  requireAuth,
  requireRole('VENDEDOR'),
  certificatesController.remove.bind(certificatesController),
);
