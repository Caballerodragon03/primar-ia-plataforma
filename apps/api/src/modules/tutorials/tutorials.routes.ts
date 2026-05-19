import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../shared/async-handler.js';
import { markCompleted, resetTutorial } from './tutorials.controller.js';

export const tutorialsRouter = Router();

tutorialsRouter.use(requireAuth);
tutorialsRouter.post('/:id/complete', asyncHandler(markCompleted));
tutorialsRouter.post('/:id/reset', asyncHandler(resetTutorial));
