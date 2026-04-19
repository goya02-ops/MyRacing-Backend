import { Request, Response, NextFunction } from 'express';
import { Race } from './race.entity.js';
import { validateDates } from '../race/race.logic.js';
import { orm } from '../shared/orm.js';
import { validateIdParam, validateRequired } from '../utils/validations.js';
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

    if (!validateIdParam(combination)) {
      res.status(400).json({ message: 'ID de combinación inválido' });
      return;
    }

    const em = orm.em;
    const limitPrev = Number.parseInt(previousLimit) || 5;
    const limitNext = Number.parseInt(nextLimit) || 5;
    const idCombination = Number.parseInt(combination);
    const currentDate = new Date();

    const [previousRaces, nextRaces] = await Promise.all([
      em.find(
        Race,
        {
          $and: [
            { combination: idCombination },
            { raceDateTime: { $lt: currentDate } },
          ],
        },
        {
          populate: ['raceUsers'],
          orderBy: { raceDateTime: 'DESC' },
          limit: limitPrev,
        }
      ),
      em.find(
        Race,
        {
          $and: [
            { combination: idCombination },
            { raceDateTime: { $gt: currentDate } },
          ],
        },
        {
          populate: ['raceUsers'],
          orderBy: { raceDateTime: 'ASC' },
          limit: limitNext,
        }
      ),
    ]);

    res.status(200).json({
      message: 'Races found',
      data: {
        limitNext,
        limitPrev,
        previousRaces,
        nextRaces,
      },
    });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function getOne(req: Request, res: Response) {
  try {
    if (!validateIdParam(req.params.id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const race = await em.findOneOrFail(
      Race,
      { id },
      { populate: ['combination', 'raceUsers'] }
    );
    res.status(200).json({ message: 'Race found', data: race });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function add(req: Request, res: Response) {
  try {
    const validationError = validateRequired(req.body.sanitizeInput, ['raceDateTime', 'registrationDeadline', 'combination']);
    if (validationError) {
      res.status(400).json({ message: validationError });
      return;
    }

    const idCombination = Number.parseInt(req.body.sanitizeInput.combination);
    
    if (!validateIdParam(idCombination)) {
      res.status(400).json({ message: 'ID de combinación inválido' });
      return;
    }

    const validDates = await validateDates(req.body.sanitizeInput, idCombination);

    if (!validDates) {
      res.status(400).json({
        message: 'registrationDeadline debe ser anterior a raceDateTime',
      });
      return;
    }

    const em = orm.em;
    const race = em.create(Race, req.body.sanitizeInput);
    await em.flush();
    const populatedRace = await em.findOneOrFail(
      Race,
      { id: race.id },
      { populate: ['combination'] }
    );
    res.status(201).json({ message: 'Race created', data: populatedRace });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function update(req: Request, res: Response) {
  try {
    if (!validateIdParam(req.params.id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const race = await em.findOneOrFail(Race, { id });

    if (req.body.sanitizeInput?.combination) {
      const idCombination = Number.parseInt(req.body.sanitizeInput.combination);
      
      if (!validateIdParam(idCombination)) {
        res.status(400).json({ message: 'ID de combinación inválido' });
        return;
      }
    }

    if (
      req.body.sanitizeInput.raceDateTime &&
      req.body.sanitizeInput.registrationDeadline
    ) {
      const combinationIdFromBody = req.body.sanitizeInput.combination;
      const combinationId = combinationIdFromBody 
        ? Number.parseInt(combinationIdFromBody as string) 
        : race.combination?.id;
      
      if (!combinationId) {
        res.status(400).json({ message: 'ID de combinación requerido' });
        return;
      }

      const validDates = validateDates(req.body.sanitizeInput, combinationId);
      if (!validDates) {
        res.status(400).json({
          message: 'registrationDeadline debe ser anterior a raceDateTime',
        });
        return;
      }
    }

    em.assign(race, req.body.sanitizeInput);
    await em.flush();
    const populatedRace = await em.findOneOrFail(
      Race,
      { id: race.id },
      { populate: ['combination'] }
    );
    res.status(200).json({ message: 'Race updated', data: populatedRace });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function remove(req: Request, res: Response) {
  try {
    if (!validateIdParam(req.params.id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const race = await em.findOneOrFail(Race, { id });
    await em.removeAndFlush(race);
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