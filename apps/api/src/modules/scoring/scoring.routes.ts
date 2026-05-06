import { Router } from 'express';
import { scoringController } from './scoring.controller.js';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { penaltySchema, incentivoSchema } from './scoring.schema.js';

export const scoringRouter = Router();

// All scoring admin routes require authentication and ADMIN role
scoringRouter.use(requireAuth, requireRole('ADMIN'));

scoringRouter.get('/:userId/history', scoringController.getHistory.bind(scoringController));
scoringRouter.post('/:userId/penalty', validateBody(penaltySchema), scoringController.applyPenalty.bind(scoringController));
scoringRouter.post('/:userId/incentivo', validateBody(incentivoSchema), scoringController.applyIncentivo.bind(scoringController));
