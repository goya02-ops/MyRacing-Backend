import { Request, Response, NextFunction } from 'express';
import { CategoryVersion } from './category-version.entity.js';
import { orm } from '../shared/orm.js';

function sanitizeCategoryVersionInput(
  req: Request,
  res: Response,
  next: NextFunction
) {
  //Esto lo que hace es limpiar los datos que llegan
  req.body.sanitizeInput = {
    status: req.body.status,
    simulator: req.body.simulator,
    category: req.body.category,
  };
  //Toma los datos de arriba del body de la peticion

  Object.keys(req.body.sanitizeInput).forEach((key) => {
    if (req.body.sanitizeInput[key] === undefined)
      delete req.body.sanitizeInput[key];
  });

  next();
}

async function getAll(req: Request, res: Response) {
  //Obtiene todas las versiones de categoria
  try {
    const em = orm.em;
    const categoryVersions = await em.find(
      CategoryVersion,
      {},
      { populate: ['simulator', 'category'] }
    );
    //Basicamente traemos los registros de CategoryVersion y ademas los obj completos de sim y cat
    res
      .status(200)
      .json({ message: 'Find all Categories Version', data: categoryVersions });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function getOne(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const categoryVersion = await em.findOneOrFail(
      CategoryVersion,
      { id },
      { populate: ['simulator', 'category'] }
    );
    res
      .status(200)
      .json({ message: 'Category Version found', data: categoryVersion });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function add(req: Request, res: Response) {
  try {
    const em = orm.em;
    const categoryVersion = em.create(CategoryVersion, req.body);
    await em.flush(); //El em.create la crea en memoria y em.flush realiza el insert
    const populatedCategoryVersion = await em.findOneOrFail(
      CategoryVersion,
      { id: categoryVersion.id },
      { populate: ['category', 'simulator'] }
    );
    res.status(201).json({
      message: 'Category Version created',
      data: populatedCategoryVersion,
    });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function update(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const categoryVersion = await em.findOneOrFail(CategoryVersion, { id });
    em.assign(categoryVersion, req.body.sanitizeInput); // Se realizó un cambio para normalizar
    await em.flush();
    const populatedCategoryVersion = await em.findOneOrFail(
      CategoryVersion,
      { id: categoryVersion.id },
      { populate: ['category', 'simulator'] }
    );
    res.status(200).json({
      message: 'Category Version updated',
      data: populatedCategoryVersion,
    });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function remove(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const categoryVersion = await em.findOneOrFail(CategoryVersion, { id });
    await em.removeAndFlush(categoryVersion);
    res
      .status(200)
      .json({ message: 'Category Version deleted', data: categoryVersion });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
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
