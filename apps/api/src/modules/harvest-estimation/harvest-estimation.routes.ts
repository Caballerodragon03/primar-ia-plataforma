import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { harvestEstimationController } from './harvest-estimation.controller.js';

export const harvestEstimationRouter = Router();

harvestEstimationRouter.use(requireAuth, requireRole('VENDEDOR'));

harvestEstimationRouter.post('/', harvestEstimationController.upload);
harvestEstimationRouter.get('/', harvestEstimationController.getHistorial);
harvestEstimationRouter.post('/calculate', harvestEstimationController.calculateEstimation);
harvestEstimationRouter.get('/predictions', harvestEstimationController.getPredictions);
harvestEstimationRouter.delete('/:id', harvestEstimationController.deleteHistorial);
