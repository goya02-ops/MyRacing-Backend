import { UserController as controller } from './user.controller.js';
import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../auth/auth.middleware.js';

export const userRouter = Router();

// Rutas para cualq usuario
userRouter.get('/me', authenticateToken, controller.getMe);
userRouter.put('/me', authenticateToken, controller.sanitizeUserInput, controller.updateMe);
userRouter.patch('/me', authenticateToken, controller.sanitizeUserInput, controller.updateMe);

// (solo admin)
userRouter.get('/', authenticateToken, requireAdmin, controller.getAll);
userRouter.get('/:id', authenticateToken, requireAdmin, controller.getOne);
userRouter.post('/', authenticateToken, requireAdmin, controller.sanitizeUserInput, controller.add);
userRouter.put('/:id', authenticateToken, requireAdmin, controller.sanitizeUserInput, controller.update);
userRouter.patch('/:id', authenticateToken, requireAdmin, controller.sanitizeUserInput, controller.update);
userRouter.delete('/:id', authenticateToken, requireAdmin, controller.remove);