import { CategoryVersionController as controller } from './category-version.controller.js';
import { Router } from 'express';

export const categoryVersionRouter = Router();

categoryVersionRouter.get('/', controller.getAll);
categoryVersionRouter.get('/:id', controller.getOne);
categoryVersionRouter.post(
  '/',
  controller.sanitizeCategoryVersionInput,
  controller.add
);
categoryVersionRouter.put(
  '/:id',
  controller.sanitizeCategoryVersionInput,
  controller.update
);
categoryVersionRouter.patch(
  '/:id',
  controller.sanitizeCategoryVersionInput,
  controller.update
);
categoryVersionRouter.delete('/:id', controller.remove);

//Estos son los endpoints
