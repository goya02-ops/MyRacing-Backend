import { CircuitController as controller } from './circuit.controller.js';
import { Router } from 'express';
import { authenticateToken, requireAdmin} from '../auth/auth.middleware.js';


export const circuitRouter = Router();
circuitRouter.get('/', authenticateToken, requireAdmin, controller.findAll);
circuitRouter.get('/:id', authenticateToken, requireAdmin, controller.findAll);
circuitRouter.post('/', authenticateToken, requireAdmin, controller.sanitizeCircuitInput, controller.add);
circuitRouter.put('/:id', authenticateToken, requireAdmin, controller.sanitizeCircuitInput, controller.update);
circuitRouter.patch('/:id', authenticateToken, requireAdmin, controller.sanitizeCircuitInput, controller.update);
circuitRouter.delete('/:id', authenticateToken, requireAdmin, controller.remove);
