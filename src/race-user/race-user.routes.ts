import { Router } from 'express';
import {
  getAll,
  getOne,
  add,
  update,
  remove,
  getByUser,
  getMyRaces,
  removeSelf,
} from './race-user.controller.js';
import { authenticateToken, requireAdmin } from '../auth/auth.middleware.js';

export const raceUserRouter = Router();

// Cualquier usuario autenticado
raceUserRouter.get('/my-races', authenticateToken, getMyRaces);
raceUserRouter.delete('/self/:raceId', authenticateToken, removeSelf);

// Solo admin
raceUserRouter.get('/', authenticateToken, requireAdmin, getAll);
raceUserRouter.get('/by-user', authenticateToken, requireAdmin, getByUser);
raceUserRouter.get('/:id', authenticateToken, requireAdmin, getOne);
raceUserRouter.post('/', authenticateToken, requireAdmin, add);
raceUserRouter.put('/:id', authenticateToken, requireAdmin, update);
raceUserRouter.patch('/:id', authenticateToken, requireAdmin, update);
raceUserRouter.delete('/:id', authenticateToken, requireAdmin, remove);