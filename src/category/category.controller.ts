import { Request, Response, NextFunction } from 'express';
import { CategoryService } from './category.service.js';
import { handleControllerError } from '../shared/error.util.js';

function sanitizeCategoryInput(
  req: Request,
  res: Response,
  next: NextFunction
) {
  req.body.sanitizeInput = {
    denomination: req.body.denomination,
    description: req.body.description,
    abbreviation: req.body.abbreviation,
  };

  Object.keys(req.body.sanitizeInput).forEach((key) => {
    if (req.body.sanitizeInput[key] === undefined)
      delete req.body.sanitizeInput[key];
  });

  next();
}

async function getAll(req: Request, res: Response) {
  try {
    const categories = await CategoryService.findAll();
    res
      .status(200)
      .json({ message: 'Find all categories classes', data: categories });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function getOne(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id as string);
    const category = await CategoryService.findOne(id);
    res.status(200).json({ message: 'Category found: ', data: category });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function add(req: Request, res: Response) {
  try {
    const category = await CategoryService.create(req.body);
    res.status(201).json({ message: 'Category class created', data: category });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function update(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id as string);
    const category = await CategoryService.update(
      id,
      req.body.sanitizeInput
    );
    res.status(200).json({ message: 'Category class updated', data: category });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function remove(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id as string);
    const category = await CategoryService.remove(id);
    res.status(200).json({ message: 'Category class deleted', data: category });
  } catch (error) {
    handleControllerError(error, res);
  }
}

export const CategoryController = {
  sanitizeCategoryInput,
  getAll,
  getOne,
  add,
  update,
  remove,
};
