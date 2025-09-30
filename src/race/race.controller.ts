import { Request, Response, NextFunction } from 'express';
import { Race } from './race.entity.js';
import { validateDates } from '../race/race.logic.js';
import { orm } from '../shared/orm.js';

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

async function getAll(req: Request, res: Response) {
  try {
    const em = orm.em;
    const races = await em.find(Race, {}, { populate: ['combination'] });
    res.status(200).json({ message: 'Find all races', data: races });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function getOne(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const race = await em.findOneOrFail(
      Race,
      { id },
      { populate: ['combination'] }
    );
    res.status(200).json({ message: 'Race found', data: race });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function add(req: Request, res: Response) {
  try {
    const em = orm.em;
    const validDates = validateDates(req.body.sanitizeInput);

    if (!validDates) {
      res.status(400).json({
        message:
          'Invalid dates: registrationDeadline must be before raceDateTime',
      });
      return;
    }

    const race = em.create(Race, req.body.sanitizeInput);
    await em.flush();
    res.status(201).json({ message: 'Race created', data: race });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function update(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const race = await em.findOneOrFail(Race, { id });

    if (
      req.body.sanitizeInput.raceDateTime &&
      req.body.sanitizeInput.registrationDeadline
    ) {
      // Se espera que se envie un formulario modificando ambas fechas
      const validDates = validateDates(req.body.sanitizeInput);
      if (!validDates) {
        res.status(400).json({
          message:
            'Invalid dates: registrationDeadline must be before raceDateTime',
        });
        return;
      }
    }

    em.assign(race, req.body.sanitizeInput);
    await em.flush();
    res.status(200).json({ message: 'Race updated', data: race });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function remove(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const race = await em.findOneOrFail(Race, { id });
    await em.removeAndFlush(race);
    res.status(200).json({ message: 'Race deleted', data: race });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

export const RaceController = {
  sanitizeRaceInput,
  getAll,
  getOne,
  add,
  update,
  remove,
};
