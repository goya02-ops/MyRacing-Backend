import { CircuitVersionController as controller } from './circuit-version.controller.js';
import { Router } from 'express';
import { authenticateToken, requireAdmin} from '../auth/auth.middleware.js';


export const circuitVersionRouter = Router();
circuitVersionRouter.get('/', authenticateToken, requireAdmin, controller.findAll);
circuitVersionRouter.get('/:id', authenticateToken, requireAdmin, controller.findOne);
circuitVersionRouter.post(
  '/',authenticateToken, requireAdmin,
  controller.sanitizeCircuitVersionInput,
  controller.add
);
circuitVersionRouter.put(
  '/:id',authenticateToken, requireAdmin,
  controller.sanitizeCircuitVersionInput,
  controller.update
);
circuitVersionRouter.patch(
  '/:id',authenticateToken, requireAdmin,
  controller.sanitizeCircuitVersionInput,
  controller.update
);
circuitVersionRouter.delete('/:id',authenticateToken, requireAdmin, controller.remove);
