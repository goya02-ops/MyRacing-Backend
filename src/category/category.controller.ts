import { Request, Response, NextFunction } from 'express';
import { Category } from './category.entity.js';
import { orm } from '../shared/orm.js';

function sanitizeCategoryInput(
  req: Request,
  res: Response,
  next: NextFunction
) {
  req.body.sanitizeInput = {
    denomination: req.body.denomination,
    description: req.body.description,
    abbreviation: req.body.abbreviation,
    status: req.body.status,
  };

  Object.keys(req.body.sanitizeInput).forEach((key) => {
    if (req.body.sanitizeInput[key] === undefined)
      delete req.body.sanitizeInput[key];
  });

  next();
}

async function getAll(req: Request, res: Response) {
  try {
    const em = orm.em;
    const categories = await em.find(Category, {});
    res
      .status(200)
      .json({ message: 'Find all categories classes', data: categories });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function getOne(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const category = await em.findOneOrFail(Category, { id });
    res.status(200).json({ message: 'Category found: ', data: category });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function add(req: Request, res: Response) {
  try {
    const em = orm.em;
    const category = em.create(Category, req.body);
    await em.flush();
    res.status(201).json({ message: 'Category class created', data: category });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function update(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const category = await em.findOneOrFail(Category, { id });
    em.assign(category, req.body.sanitizeInput);
    await em.flush();
    res.status(200).json({ message: 'Category class updated', data: category });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function remove(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const category = await em.findOneOrFail(Category, { id });
    await em.removeAndFlush(category);
    res.status(200).json({ message: 'Category class deleted', data: category });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
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
