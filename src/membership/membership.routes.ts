import { MembershipController as controller } from './membership.controller.js';
import { Router } from 'express';

export const membershipRouter = Router();

membershipRouter.get('/', controller.getAll);
membershipRouter.get('/current_membership', controller.getCurrentMembership);
membershipRouter.get('/:id', controller.getOne);
membershipRouter.post('/', controller.sanitizeMembresiaInput, controller.add);
membershipRouter.put(
  '/:id',
  controller.sanitizeMembresiaInput,
  controller.update
);
membershipRouter.patch(
  '/:id',
  controller.sanitizeMembresiaInput,
  controller.update
);
membershipRouter.delete('/:id', controller.remove);
