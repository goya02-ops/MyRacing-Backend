import { SimulatorController as controller } from './simulator.controller.js';
import { Router } from 'express';
import { authenticateToken, requireAdmin} from '../auth/auth.middleware.js';

export const simulatorRouter = Router();
simulatorRouter.get('/', authenticateToken, requireAdmin, controller.findAll);
simulatorRouter.get('/:id', authenticateToken, requireAdmin, controller.findOne);
simulatorRouter.post('/', authenticateToken, requireAdmin, controller.sanitizeSimulatorInput, controller.add);
simulatorRouter.put(
  '/:id',
  authenticateToken, requireAdmin,
  controller.sanitizeSimulatorInput,
  controller.update
);
simulatorRouter.patch(
  '/:id',
  authenticateToken, requireAdmin,
  controller.sanitizeSimulatorInput,
  controller.update
);
simulatorRouter.delete('/:id', authenticateToken, requireAdmin, controller.remove);
