import { CategoryVersionController as controller } from './category-version.controller.js';
import { Router } from 'express';
import { authenticateToken, requireAdmin} from '../auth/auth.middleware.js';


export const categoryVersionRouter = Router();

categoryVersionRouter.get('/', authenticateToken, requireAdmin, controller.getAll);
categoryVersionRouter.get('/:id', authenticateToken, requireAdmin, controller.getOne);
categoryVersionRouter.post(
  '/', authenticateToken, requireAdmin,
  controller.sanitizeCategoryVersionInput,
  controller.add
);
categoryVersionRouter.put(
  '/:id', authenticateToken, requireAdmin,
  controller.sanitizeCategoryVersionInput,
  controller.update
);
categoryVersionRouter.patch(
  '/:id', authenticateToken, requireAdmin,
  controller.sanitizeCategoryVersionInput,
  controller.update
);
categoryVersionRouter.delete('/:id', authenticateToken, requireAdmin, controller.remove);


