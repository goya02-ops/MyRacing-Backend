import { RaceController as controller } from './race.controller.js';
import { Router } from 'express';

export const raceRouter = Router();

raceRouter.get('/', controller.getAll);
raceRouter.get('/:id', controller.getOne);
raceRouter.post('/', controller.sanitizeRaceInput, controller.add);
raceRouter.put('/:id', controller.sanitizeRaceInput, controller.update);
raceRouter.patch('/:id', controller.sanitizeRaceInput, controller.update);
raceRouter.delete('/:id', controller.remove);
