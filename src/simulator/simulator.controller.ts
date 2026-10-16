import { Request, Response, NextFunction } from 'express';
import { SimulatorService } from './simulator.service.js';
import { handleControllerError } from '../shared/error.util.js';

function sanitizeSimulatorInput(
  req: Request,
  res: Response,
  next: NextFunction
) {
  req.body.sanitizeInput = {
    name: req.body.name,
    status: req.body.status,
  };

  Object.keys(req.body.sanitizeInput).forEach((key) => {
    if (req.body.sanitizeInput[key] === undefined)
      delete req.body.sanitizeInput[key];
  });

  next();
}

async function findAll(req: Request, res: Response) {
  try {
    const simulators = await SimulatorService.findAll();
    res
      .status(200)
      .json({ message: 'Find all categories classes', data: simulators });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function findOne(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id as string);
    const simulator = await SimulatorService.findOne(id);
    res.status(200).json({ message: 'Simulator found: ', data: simulator });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function add(req: Request, res: Response) {
  try {
    const simulator = await SimulatorService.create(req.body);
    res.status(201).json({ message: 'Simulator created', data: simulator });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function update(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id as string);
    const simulator = await SimulatorService.update(
      id,
      req.body.sanitizeInput
    );
    res.status(200).json({ message: 'Simulator updated', data: simulator });
  } catch (error) {
    handleControllerError(error, res);
  }
}
async function remove(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id as string);
    const simulator = await SimulatorService.remove(id);
    res.status(200).json({ message: 'Simulator deleted', data: simulator });
  } catch (error) {
    handleControllerError(error, res);
  }
}

export const SimulatorController = {
  sanitizeSimulatorInput,
  findAll,
  findOne,
  add,
  update,
  remove,
};
