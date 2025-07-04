import { Request, Response, NextFunction } from "express";
import { CategoryRepository } from "./category.repository.js";
import { Category } from "./categoryEntity.js";

const repository = new CategoryRepository();

function sanitizeCategoryInput(req: Request, res: Response, next: NextFunction){

  req.body.sanitizeInput = {
    denomination: req.body.denomination,
    description: req.body.description,
    abbreviation: req.body.abbreviation,
    status: req.body.status,
  };

  Object.keys(req.body.sanitizeInput).forEach((key) => {
    if (req.body.sanitizeInput[key] === undefined) delete req.body.sanitizeInput[key];
  });

  next();
}

async function getAll(req: Request, res: Response) {
  const categories = await repository.findAll();
  if (!categories) {
    res.status(404).json({ message: "No categories found" });
    return;
  }
  res.status(200).json({data: categories});
}

async function getOne(req: Request, res: Response) {
  const category = await repository.findOne({ id: req.params.id });
  if (!category) {
    res.status(404).json({ message: "Category not found" });
    return;
  }
  res.status(200).json({data: category});
}

async function add(req: Request, res: Response) {
  const input = req.body.sanitizeInput;
  const newCategory = new Category( //this assign the id automatically
    input.denomination,
    input.description,
    input.abbreviation,
    input.status,
    input.id
  );
  await repository.add(newCategory);
  res.status(201).json({data: newCategory});
}

async function update(req: Request, res: Response) {
  req.body.sanitizeInput.id = req.params.id;
  const updatedCategory = await repository.update(req.body.sanitizeInput);
  if (!updatedCategory) {
    res.status(404).json({ message: "Category not found" });
    return;
  }
  res.status(200).json({data: updatedCategory});
}

async function remove(req: Request, res: Response) {
  const deletedCategory = await repository.delete({ id: req.params.id });
  if (!deletedCategory) {
    res.status(404).json({ message: "Category not found" });
    return;
  }
  res.status(200).json({message:"Category deleted", data: deletedCategory});
}

export const CategoryController = {
  sanitizeCategoryInput,
  getAll,
  getOne,
  add,
  update,
  remove
};