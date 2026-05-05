import { Router } from 'express';
import { requireAuth, requireEstado } from '../../middleware/auth.middleware.js';
import { validateBody } from '../../middleware/validate.middleware.js';
import { sendMessageSchema, markReadSchema } from './chat.schema.js';
import { getConversations, getMessages, sendMessage, markRead } from './chat.controller.js';
import { asyncHandler } from '../../shared/async-handler.js';

export const chatRouter = Router();

chatRouter.use(requireAuth, requireEstado('VERIFICADO_ACTIVO'));

chatRouter.get('/conversations', asyncHandler(getConversations));
chatRouter.get('/:transaccionId/messages', asyncHandler(getMessages));
chatRouter.post('/:transaccionId/messages', validateBody(sendMessageSchema), asyncHandler(sendMessage));
chatRouter.put('/:transaccionId/read', validateBody(markReadSchema), asyncHandler(markRead));
