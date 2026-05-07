import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { harvestEstimationController } from './harvest-estimation.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

export const harvestEstimationRouter = Router();

harvestEstimationRouter.use(requireAuth, requireRole('VENDEDOR'));

harvestEstimationRouter.get('/template', harvestEstimationController.downloadTemplate);
harvestEstimationRouter.post('/upload-excel', upload.single('file'), harvestEstimationController.uploadExcel);
harvestEstimationRouter.post('/', harvestEstimationController.upload);
harvestEstimationRouter.get('/', harvestEstimationController.getHistorial);
harvestEstimationRouter.get('/predictions', harvestEstimationController.getPredictions);
harvestEstimationRouter.delete('/:id', harvestEstimationController.deleteHistorial);
