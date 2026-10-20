import { Request, Response, NextFunction } from 'express';
import { handleControllerError } from '../shared/error.util.js';
import { CircuitService } from './circuit.service.js';

function sanitizeCircuitInput(req: Request, res: Response, next: NextFunction) {
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

async function findAll(req: Request, res: Response) {
  try {
    const circuits = await CircuitService.findAll();
    res
      .status(200)
      .json({ message: 'Find all circuits classes', data: circuits });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function findOne(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id as string);
    const circuit = await CircuitService.findOne(id);
    res.status(200).json({ message: 'Circuit found: ', data: circuit });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function add(req: Request, res: Response) {
  try {
    const circuit = await CircuitService.create(req.body);
    res.status(201).json({ message: 'Circuit class created', data: circuit });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function update(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id as string);
    const circuit = await CircuitService.update(id, req.body.sanitizeInput);
    res.status(200).json({ message: 'Circuit class updated', data: circuit });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function remove(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id as string);
    const circuit = await CircuitService.remove(id);
    res.status(200).json({ message: 'Circuit class deleted', data: circuit });
  } catch (error) {
    handleControllerError(error, res);
  }
}

export const CircuitController = {
  sanitizeCircuitInput,
  findAll,
  findOne,
  add,
  update,
  remove,
};
