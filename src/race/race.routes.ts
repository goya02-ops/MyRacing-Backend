import { RaceController as controller } from './race.controller.js';
import { Router } from 'express';
import { authenticateToken, requireAdmin} from '../auth/auth.middleware.js';

export const raceRouter = Router();

raceRouter.get(
  '/by-combination/:combination/:previousLimit/:nextLimit',
  controller.getCurrentByCombination
);
// BE-13: limites por query param (?previousLimit=&nextLimit=) con clamp.
raceRouter.get(
  '/by-combination/:combination',
  controller.getCurrentByCombination
);
raceRouter.get('/:id', authenticateToken, requireAdmin, controller.getOne);
raceRouter.post('/', authenticateToken, requireAdmin, controller.sanitizeRaceInput, controller.add);
raceRouter.put('/:id', authenticateToken, requireAdmin, controller.sanitizeRaceInput, controller.update);
raceRouter.patch('/:id', authenticateToken, requireAdmin, controller.sanitizeRaceInput, controller.update);
raceRouter.delete('/:id', authenticateToken, requireAdmin, controller.remove);
