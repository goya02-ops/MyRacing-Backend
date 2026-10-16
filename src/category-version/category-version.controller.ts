import { Request, Response, NextFunction } from 'express';
import { CategoryVersionService } from './category-version.service.js';
import { handleControllerError } from '../shared/error.util.js';

function sanitizeCategoryVersionInput(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const simulatorId = req.body.simulator?.id ?? req.body.simulator;
  const categoryId = req.body.category?.id ?? req.body.category;

  req.body.sanitizeInput = {
    status: req.body.status,
    simulator: simulatorId,
    category: categoryId,
  };

  Object.keys(req.body.sanitizeInput).forEach((key) => {
    if (req.body.sanitizeInput[key] === undefined)
      delete req.body.sanitizeInput[key];
  });

  next();
}

async function getAll(req: Request, res: Response) {
  //Obtiene todas las versiones de categoria
  try {
    const categoryVersions = await CategoryVersionService.findAll();
    //Basicamente traemos los registros de CategoryVersion y ademas los obj completos de sim y cat
    res
      .status(200)
      .json({ message: 'Find all Categories Version', data: categoryVersions });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function getOne(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id as string);
    const categoryVersion = await CategoryVersionService.findOne(id);
    res
      .status(200)
      .json({ message: 'Category Version found', data: categoryVersion });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function add(req: Request, res: Response) {
  try {
    const categoryVersion = await CategoryVersionService.create(
      req.body.sanitizeInput
    );
    res.status(201).json({
      message: 'Category Version created',
      data: categoryVersion,
    });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function update(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id as string);
    const categoryVersion = await CategoryVersionService.update(
      id,
      req.body.sanitizeInput
    );
    res.status(200).json({
      message: 'Category Version updated',
      data: categoryVersion,
    });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function remove(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id as string);
    const categoryVersion = await CategoryVersionService.remove(id);
    res
      .status(200)
      .json({ message: 'Category Version deleted', data: categoryVersion });
  } catch (error) {
    handleControllerError(error, res);
  }
}

export const CategoryVersionController = {
  sanitizeCategoryVersionInput,
  getAll,
  getOne,
  add,
  update,
  remove,
};
