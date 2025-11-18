import { MembershipController as controller } from './membership.controller.js';
import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../auth/auth.middleware.js';

export const membershipRouter = Router();

membershipRouter.get('/', authenticateToken, requireAdmin, controller.getAll);
membershipRouter.get(
  '/current_membership',
  authenticateToken,
  controller.getCurrentMembership
);
membershipRouter.get(
  '/:id',
  authenticateToken,
  requireAdmin,
  controller.getOne
);
membershipRouter.post(
  '/',
  authenticateToken,
  requireAdmin,
  controller.sanitizeMembresiaInput,
  controller.add
);
membershipRouter.put(
  '/:id',
  authenticateToken,
  requireAdmin,
  controller.sanitizeMembresiaInput,
  controller.update
);
membershipRouter.patch(
  '/:id',
  authenticateToken,
  requireAdmin,
  controller.sanitizeMembresiaInput,
  controller.update
);
membershipRouter.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  controller.remove
);
