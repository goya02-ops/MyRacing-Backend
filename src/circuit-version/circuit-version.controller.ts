import { Request, Response, NextFunction } from 'express';
import { CircuitVersionService } from './circuit-version.service.js';
import { handleControllerError } from '../shared/error.util.js';

function sanitizeCircuitVersionInput(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const circuitId = req.body.circuit?.id ?? req.body.circuit;
  const simulatorId = req.body.simulator?.id ?? req.body.simulator;

  req.body.sanitizeInput = {
    status: req.body.status,
    circuit: circuitId,
    simulator: simulatorId,
  };

  Object.keys(req.body.sanitizeInput).forEach((key) => {
    if (req.body.sanitizeInput[key] === undefined)
      delete req.body.sanitizeInput[key];
  });

  next();
}

async function findAll(req: Request, res: Response) {
  try {
    const circuitVersions = await CircuitVersionService.findAll();
    res.status(200).json({
      message: 'Find all circuit_versions classes',
      data: circuitVersions,
    });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function findOne(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id as string);
    const circuitVersion = await CircuitVersionService.findOne(id);
    res
      .status(200)
      .json({ message: 'Circuit_Version found: ', data: circuitVersion });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function add(req: Request, res: Response) {
  try {
    const circuitVersion = await CircuitVersionService.create(
      req.body.sanitizeInput
    );
    res.status(201).json({
      message: 'CircuitVersion class created',
      data: circuitVersion,
    });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function update(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id as string);
    const circuitVersion = await CircuitVersionService.update(
      id,
      req.body.sanitizeInput
    );
    res
      .status(200)
      .json({ message: 'Circuit_Version updated', data: circuitVersion });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function remove(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id as string);
    const circuitVersion = await CircuitVersionService.remove(id);
    res
      .status(200)
      .json({ message: 'CircuitVersion class deleted', data: circuitVersion });
  } catch (error) {
    handleControllerError(error, res);
  }
}

export const CircuitVersionController = {
  sanitizeCircuitVersionInput,
  findAll,
  findOne,
  add,
  update,
  remove,
};
