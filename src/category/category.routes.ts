import { CategoryController as controller } from './category.controller.js';
import { Router } from 'express';

export const categoryRouter = Router();
categoryRouter.get('/', controller.getAll);
categoryRouter.get('/:id', controller.getOne);
categoryRouter.post('/', controller.sanitizeCategoryInput, controller.add);
categoryRouter.put('/:id', controller.sanitizeCategoryInput, controller.update);
categoryRouter.patch(
  '/:id',
  controller.sanitizeCategoryInput,
  controller.update
);
categoryRouter.delete('/:id', controller.remove);
