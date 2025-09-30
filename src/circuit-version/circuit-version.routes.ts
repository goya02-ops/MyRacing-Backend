import { CircuitVersionController as controller } from './circuit-version.controller.js';
import { Router } from 'express';

export const circuitVersionRouter = Router();
circuitVersionRouter.get('/', controller.findAll);
circuitVersionRouter.get('/:id', controller.findOne);
circuitVersionRouter.post(
  '/',
  controller.sanitizeCircuitVersionInput,
  controller.add
);
circuitVersionRouter.put(
  '/:id',
  controller.sanitizeCircuitVersionInput,
  controller.update
);
circuitVersionRouter.patch(
  '/:id',
  controller.sanitizeCircuitVersionInput,
  controller.update
);
circuitVersionRouter.delete('/:id', controller.remove);
