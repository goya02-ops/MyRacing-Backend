import { CombinationController as controller } from './combination.controller.js';
import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../auth/auth.middleware.js';

export const combinationRouter = Router();
combinationRouter.get('/', authenticateToken, requireAdmin,controller.getAll);
combinationRouter.get('/races', controller.getCurrentRaces);
combinationRouter.get('/:id',  authenticateToken, requireAdmin, controller.getOne);
combinationRouter.post(
  '/',  authenticateToken, requireAdmin,
  controller.sanitizeCombinationInput,
  controller.add
);
combinationRouter.put(
  '/:id',  authenticateToken, requireAdmin,
  controller.sanitizeCombinationInput,
  controller.update
);
combinationRouter.patch(
  '/:id',  authenticateToken, requireAdmin,
  controller.sanitizeCombinationInput,
  controller.update
);
combinationRouter.delete('/:id',  authenticateToken, requireAdmin, controller.remove);
