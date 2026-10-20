import { Request, Response, NextFunction } from 'express';
import { RaceService } from './race.service.js';
import { handleControllerError } from '../shared/error.util.js';

function sanitizeRaceInput(req: Request, res: Response, next: NextFunction) {
  req.body.sanitizeInput = {
    raceDateTime: req.body.raceDateTime,
    description: req.body.description,
    registrationDeadline: req.body.registrationDeadline,
    combination: req.body.combination,
  };
  Object.keys(req.body.sanitizeInput).forEach((key) => {
    if (req.body.sanitizeInput[key] === undefined)
      delete req.body.sanitizeInput[key];
  });
  next();
}

async function getCurrentByCombination(req: Request, res: Response) {
  try {
    const { previousLimit, nextLimit, combination } = req.params;
    const data = await RaceService.findCurrentByCombination(
      previousLimit as string,
      nextLimit as string,
      combination as string
    );

    res.status(200).json({ message: 'Races found', data });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function getOne(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id as string);
    const race = await RaceService.findOne(id);
    res.status(200).json({ message: 'Race found', data: race });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function add(req: Request, res: Response) {
  try {
    const race = await RaceService.create(req.body.sanitizeInput);
    res.status(201).json({ message: 'Race created', data: race });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function update(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id as string);
    const race = await RaceService.update(id, req.body.sanitizeInput);
    res.status(200).json({ message: 'Race updated', data: race });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function remove(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id as string);
    const race = await RaceService.remove(id);
    res.status(200).json({ message: 'Race deleted', data: race });
  } catch (error) {
    handleControllerError(error, res);
  }
}

export const RaceController = {
  sanitizeRaceInput,
  getCurrentByCombination,
  getOne,
  add,
  update,
  remove,
};