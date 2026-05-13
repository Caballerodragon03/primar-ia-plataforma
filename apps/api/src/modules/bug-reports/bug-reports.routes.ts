import { Router } from 'express';
import { bugReportsController } from './bug-reports.controller.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { createBugReportSchema, updateBugReportSchema } from './bug-reports.schema.js';

// Public-ish endpoint: any authenticated user can submit a bug report
export const bugReportsRouter = Router();
bugReportsRouter.use(requireAuth);
bugReportsRouter.post(
  '/',
  validateBody(createBugReportSchema),
  (req, res, next) => bugReportsController.create(req, res, next),
);

// Admin: list, view, update
export const bugReportsAdminRouter = Router();
bugReportsAdminRouter.use(requireAuth, requireRole('ADMIN'));
bugReportsAdminRouter.get('/', (req, res, next) => bugReportsController.listForAdmin(req, res, next));
bugReportsAdminRouter.get('/:id', (req, res, next) => bugReportsController.getById(req, res, next));
bugReportsAdminRouter.patch(
  '/:id',
  validateBody(updateBugReportSchema),
  (req, res, next) => bugReportsController.update(req, res, next),
);
