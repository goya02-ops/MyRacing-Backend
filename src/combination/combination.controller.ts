import { Request, Response, NextFunction } from 'express';
import type { FilterQuery } from '@mikro-orm/mysql';
import { Combination } from './combination.entity.js';
import { Race } from '../race/race.entity.js';
import {
  validateSameSimulator,
  validateDate,
  validateRaceInterval,
  countRaces,
  raceDates,
  chunk,
  MAX_RACES_PER_COMBINATION,
  RACE_CREATE_BATCH_SIZE,
} from './combination.logic.js';
import { orm } from '../shared/orm.js';
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

// Genera las carreras de [startDate, endDate] (inclusive) por lotes. La
// cantidad e intervalo ya fueron validados/limitados por el llamador, así que
// el rango es acotado y `raceDates` siempre avanza.
async function generateRaces(
  combination: Combination,
  startDate: Date,
  endDate: Date
) {
  const em = orm.em;
  const dates = raceDates(startDate, endDate, combination.raceIntervalMinutes);

  for (const batch of chunk(dates, RACE_CREATE_BATCH_SIZE)) {
    for (const raceDate of batch) {
      // Calcular la fecha límite de inscripción (15 minutos antes de la carrera)
      const registrationDeadline = new Date(
        raceDate.getTime() - 15 * 60 * 1000
      );

      em.create(Race, {
        raceDateTime: raceDate,
        registrationDeadline: registrationDeadline,
        combination: combination,
      });
    }

    await em.flush();
  }
}

async function getAll(req: Request, res: Response) {
  try {
    const em = orm.em;
    const combinations = await em.find(
      Combination,
      {},
      {
        populate: [
          'categoryVersion.category',
          'categoryVersion.simulator',
          'circuitVersion.circuit',
          'circuitVersion.simulator',
        ],
      }
    );
    res
      .status(200)
      .json({ message: 'Find all combinations', data: combinations });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function getCurrentRaces(req: Request, res: Response) {
  try {
    const em = orm.em;
    const now = new Date();
    const filter: FilterQuery<Combination> = {
      dateFrom: { $lte: now },
      dateTo: { $gte: now },
    };

    const combinations = await em.find(Combination, filter, {
      populate: [
        'categoryVersion.category',
        'categoryVersion.simulator',
        'circuitVersion.circuit',
        'circuitVersion.simulator',
      ],
    });
    res
      .status(200)
      .json({ message: 'Find current combinations', data: combinations });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function getOne(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id as string);
    const combination = await em.findOneOrFail(
      Combination,
      { id },
      {
        populate: [
          'categoryVersion.category',
          'categoryVersion.simulator',
          'circuitVersion.circuit',
          'circuitVersion.simulator',
          'races',
        ],
      }
    );
    res.status(200).json({ message: 'Combination found', data: combination });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function add(req: Request, res: Response) {
  try {
    const em = orm.em;
    const idCategoryVersion = Number.parseInt(
      req.body.sanitizeInput.categoryVersion
    );
    const idCircuitVersion = Number.parseInt(
      req.body.sanitizeInput.circuitVersion
    );
    const validDate = validateDate(req.body.sanitizeInput);

    if (!validDate) {
      res
        .status(400)
        .json({ message: 'dateFrom must be earlier than dateTo.' });
      return;
    }

    // BE-19: sin esto, raceIntervalMinutes <= 0 produce un bucle infinito en
    // generateRaces. El tope evita cientos de miles de filas en un request.
    const raceIntervalMinutes = Number(
      req.body.sanitizeInput.raceIntervalMinutes
    );
    if (!validateRaceInterval(raceIntervalMinutes)) {
      res.status(400).json({
        message: 'raceIntervalMinutes must be greater than 0.',
      });
      return;
    }

    const dateFrom = new Date(req.body.sanitizeInput.dateFrom);
    const dateTo = new Date(req.body.sanitizeInput.dateTo);
    const raceCount = countRaces(dateFrom, dateTo, raceIntervalMinutes);
    if (raceCount > MAX_RACES_PER_COMBINATION) {
      res.status(400).json({
        message: `La combinación generaría ${raceCount} carreras; el máximo permitido es ${MAX_RACES_PER_COMBINATION}.`,
      });
      return;
    }

    const validSimulator = await validateSameSimulator(
      idCategoryVersion,
      idCircuitVersion
    );

    if (!validSimulator) {
      res.status(400).json({
        message:
          'CategoryVersion and CircuitVersion must belong to the same Simulator.',
      });
      return;
    }

    const combination = em.create(Combination, req.body.sanitizeInput);
    await em.flush();

    // Generar las carreras automáticamente
    await generateRaces(combination, dateFrom, dateTo);

    // No hacer populate de 'races' para evitar loop infinito
    const populatedCombination = await em.findOneOrFail(
      Combination,
      { id: combination.id },
      {
        populate: [
          'categoryVersion.category',
          'categoryVersion.simulator',
          'circuitVersion.circuit',
          'circuitVersion.simulator',
        ],
      }
    );

    res.status(201).json({
      message: 'Combination created',
      data: populatedCombination,
    });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function update(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id as string);
    const combination = await em.findOneOrFail(Combination, { id }, { populate: ['races'] });
    const oldDateTo = new Date(combination.dateTo);

    // Validar que NO se intente cambiar dateFrom
    if (req.body.sanitizeInput.dateFrom) {
      const newDateFrom = new Date(req.body.sanitizeInput.dateFrom);
      const oldDateFrom = new Date(combination.dateFrom);
      
      if (newDateFrom.getTime() !== oldDateFrom.getTime()) {
        res.status(400).json({ 
          message: 'No se puede modificar la fecha de inicio (dateFrom) de una combinación existente.' 
        });
        return;
      }
    }

    if (req.body.sanitizeInput.dateFrom && req.body.sanitizeInput.dateTo) {
      // Se espera que se envie un formulario modificando ambas fechas
      const validDate = validateDate(req.body.sanitizeInput);
      if (!validDate) {
        res
          .status(400)
          .json({ message: 'dateFrom must be earlier than dateTo.' });
        return;
      }
    }

    // BE-19: rechazar intervalos <= 0 también al actualizar.
    if (req.body.sanitizeInput.raceIntervalMinutes !== undefined) {
      if (
        !validateRaceInterval(
          Number(req.body.sanitizeInput.raceIntervalMinutes)
        )
      ) {
        res.status(400).json({
          message: 'raceIntervalMinutes must be greater than 0.',
        });
        return;
      }
    }

    if (
      req.body.sanitizeInput.categoryVersion &&
      req.body.sanitizeInput.circuitVersion
    ) {
      const idCategoryVersion = Number.parseInt(
        req.body.sanitizeInput.categoryVersion
      );
      const idCircuitVersion = Number.parseInt(
        req.body.sanitizeInput.circuitVersion
      );
      const validSimulator = await validateSameSimulator(
        idCategoryVersion,
        idCircuitVersion
      );
      if (!validSimulator) {
        res.status(400).json({
          message:
            'CategoryVersion and CircuitVersion must belong to the same Simulator.',
        });
        return;
      }
    }

    // BE-19: validar la extensión (intervalo y tope) ANTES de persistir, para
    // no dejar la combinación extendida sin sus carreras si el rango es inválido.
    const effectiveIntervalMinutes = Number(
      req.body.sanitizeInput.raceIntervalMinutes ??
        combination.raceIntervalMinutes
    );
    const effectiveDateTo = req.body.sanitizeInput.dateTo
      ? new Date(req.body.sanitizeInput.dateTo)
      : new Date(combination.dateTo);
    const extensionStart = new Date(
      oldDateTo.getTime() + effectiveIntervalMinutes * 60 * 1000
    );
    const isExtending = effectiveDateTo > oldDateTo;

    if (isExtending) {
      const extraCount = countRaces(
        extensionStart,
        effectiveDateTo,
        effectiveIntervalMinutes
      );
      if (extraCount > MAX_RACES_PER_COMBINATION) {
        res.status(400).json({
          message: `La extensión generaría ${extraCount} carreras; el máximo permitido es ${MAX_RACES_PER_COMBINATION}.`,
        });
        return;
      }
    }

    // Actualizar la combinación
    em.assign(combination, req.body.sanitizeInput);
    await em.flush();

    // Si se extendió la fecha, generar carreras para el rango nuevo
    if (isExtending) {
      await generateRaces(combination, extensionStart, effectiveDateTo);
    }

    const populatedCombination = await em.findOneOrFail(
      Combination,
      { id: combination.id },
      {
        populate: [
          'categoryVersion.category',
          'categoryVersion.simulator',
          'circuitVersion.circuit',
          'circuitVersion.simulator',
        ],
      }
    );
    
    res
      .status(200)
      .json({ message: 'Combination updated', data: populatedCombination });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function remove(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id as string);
    const combination = await em.findOneOrFail(Combination, { id });
    await em.removeAndFlush(combination);
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
