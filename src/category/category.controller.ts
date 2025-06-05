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

function getAll(req: Request, res: Response) {
  const categories = repository.findAll();
  if (!categories) {
    res.status(404).json({ message: "No categories found" });
    return;
  }
  res.status(200).json({data: categories});
}

function getOne(req: Request, res: Response) {
  const category = repository.findOne({ id: req.params.id });
  if (!category) {
    res.status(404).json({ message: "Category not found" });
    return;
  }
  res.status(200).json({data: category});
}

function add(req: Request, res: Response) {
  const input = req.body.sanitizeInput;
  const newCategory = new Category( //this assign the id automatically
    input.denomination,
    input.description,
    input.abbreviation,
    input.status,
    input.id
  );
  repository.add(newCategory);
  res.status(201).json({data: newCategory});
}

function update(req: Request, res: Response) {
  req.body.sanitizeInput.id = req.params.id;
  const updatedCategory = repository.update(req.body.sanitizeInput);
  if (!updatedCategory) {
    res.status(404).json({ message: "Category not found" });
    return;
  }
  res.status(200).json({data: updatedCategory});
}

function remove(req: Request, res: Response) {
  const deletedCategory = repository.delete({ id: req.params.id });
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