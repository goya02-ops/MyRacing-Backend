import { CircuitController as controller } from './circuit.controller.js';
import { Router } from 'express';

export const circuitRouter = Router();
circuitRouter.get('/', controller.findAll);
circuitRouter.get('/:id', controller.findAll);
circuitRouter.post('/', controller.sanitizeCircuitInput, controller.add);
circuitRouter.put('/:id', controller.sanitizeCircuitInput, controller.update);
circuitRouter.patch('/:id', controller.sanitizeCircuitInput, controller.update);
circuitRouter.delete('/:id', controller.remove);
