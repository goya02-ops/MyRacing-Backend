import { CategoryController as controller } from './category.controller.js';
import { Router } from 'express';
import { authenticateToken, requireAdmin} from '../auth/auth.middleware.js';

export const categoryRouter = Router();
categoryRouter.get('/', authenticateToken, requireAdmin, controller.getAll);
categoryRouter.get('/:id', authenticateToken, requireAdmin, controller.getOne);
categoryRouter.post('/', authenticateToken, requireAdmin, controller.sanitizeCategoryInput, controller.add);
categoryRouter.put('/:id', authenticateToken, requireAdmin, controller.sanitizeCategoryInput, controller.update);
categoryRouter.patch(
  '/:id',
  authenticateToken,
  requireAdmin,
  controller.sanitizeCategoryInput,
  controller.update
);
categoryRouter.delete('/:id', authenticateToken, requireAdmin, controller.remove);
