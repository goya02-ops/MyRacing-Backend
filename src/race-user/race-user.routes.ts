import { RaceUserController as controller } from './race-user.controller.js';
import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../auth/auth.middleware.js';

export const raceUserRouter = Router();

// Rutas para cualq usuario
raceUserRouter.get('/my-races', authenticateToken, controller.getMyRaces);

// (solo admin)
raceUserRouter.get('/', authenticateToken, requireAdmin, controller.getAll);
raceUserRouter.get('/by-user', authenticateToken, requireAdmin, controller.getByUser);
raceUserRouter.get('/:id', authenticateToken, requireAdmin, controller.getOne);
raceUserRouter.post('/', authenticateToken, requireAdmin, controller.sanitizeRaceUserInput, controller.add);
raceUserRouter.put('/:id', authenticateToken, requireAdmin, controller.sanitizeRaceUserInput, controller.update);
raceUserRouter.patch('/:id', authenticateToken, requireAdmin, controller.sanitizeRaceUserInput, controller.update);
raceUserRouter.delete('/:id', authenticateToken, requireAdmin, controller.remove);