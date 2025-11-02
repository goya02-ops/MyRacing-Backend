import { RaceUserController as controller } from './race-user.controller.js';
import { Router } from 'express';

export const raceUserRouter = Router();

raceUserRouter.get('/', controller.getAll);
raceUserRouter.get('/by-user', controller.getByUser);
raceUserRouter.get('/:id', controller.getOne);
raceUserRouter.post('/', controller.sanitizeRaceUserInput, controller.add);
raceUserRouter.put('/:id', controller.sanitizeRaceUserInput, controller.update);
raceUserRouter.patch(
  '/:id',
  controller.sanitizeRaceUserInput,
  controller.update
);
raceUserRouter.delete('/:id', controller.remove);
