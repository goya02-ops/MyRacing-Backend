import { Request, Response, NextFunction } from 'express';
import { CombinationService } from './combination.service.js';
import { handleControllerError } from '../shared/error.util.js';

function sanitizeCombinationInput(
  req: Request,
  res: Response,
  next: NextFunction
) {
  req.body.sanitizeInput = {
    dateFrom: req.body.dateFrom,
    dateTo: req.body.dateTo,
    lapsNumber: req.body.lapsNumber,
    obligatoryStopsQuantity: req.body.obligatoryStopsQuantity,
    userType: req.body.userType,
    raceIntervalMinutes: req.body.raceIntervalMinutes,
    categoryVersion: req.body.categoryVersion,
    circuitVersion: req.body.circuitVersion,
  };

  Object.keys(req.body.sanitizeInput).forEach((key) => {
    if (req.body.sanitizeInput[key] === undefined)
      delete req.body.sanitizeInput[key];
  });

  next();
}

async function getAll(req: Request, res: Response) {
  try {
    const combinations = await CombinationService.findAll();
    res
      .status(200)
      .json({ message: 'Find all combinations', data: combinations });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function getCurrentRaces(req: Request, res: Response) {
  try {
    const combinations = await CombinationService.findCurrent();
    res
      .status(200)
      .json({ message: 'Find current combinations', data: combinations });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function getOne(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id as string);
    const combination = await CombinationService.findOne(id);
    res.status(200).json({ message: 'Combination found', data: combination });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function add(req: Request, res: Response) {
  try {
    const combination = await CombinationService.create(
      req.body.sanitizeInput
    );
    res.status(201).json({
      message: 'Combination created',
      data: combination,
    });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function update(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id as string);
    const combination = await CombinationService.update(
      id,
      req.body.sanitizeInput
    );
    res
      .status(200)
      .json({ message: 'Combination updated', data: combination });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function remove(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id as string);
    const combination = await CombinationService.remove(id);
    res.status(200).json({ message: 'Combination deleted', data: combination });
  } catch (error) {
    handleControllerError(error, res);
  }
}

export const CombinationController = {
  sanitizeCombinationInput,
  getAll,
  getCurrentRaces,
  getOne,
  add,
  update,
  remove,
};
