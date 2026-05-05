import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { uploadFile } from './upload.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const uploadRouter = Router();

uploadRouter.post('/', requireAuth, upload.single('file'), uploadFile);
