import { orm } from '../shared/orm.js';
import { ValidationError } from '../shared/validation-error.js';
import { Combination } from './combination.entity.js';
import { Race } from '../race/race.entity.js';
import { validateRequired } from '../utils/validations.js';
import {
  validateSameSimulator,
  validateDate,
  validateRaceInterval,
} from './combination.logic.js';

export interface CombinationInput {
  dateFrom: string | Date;
  dateTo: string | Date;
  lapsNumber: number;
  obligatoryStopsQuantity: number;
  userType: string;
  raceIntervalMinutes: number | string;
  categoryVersion: number | string;
  circuitVersion: number | string;
}

const POPULATE = [
  'categoryVersion.category',
  'categoryVersion.simulator',
  'circuitVersion.circuit',
  'circuitVersion.simulator',
] as const;

async function generateRaces(combination: Combination) {
  const em = orm.em;
  const startDate = new Date(combination.dateFrom);
  const endDate = new Date(combination.dateTo);
  const intervalMs = Number(combination.raceIntervalMinutes) * 60 * 1000;

  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const registrationDeadline = new Date(
      currentDate.getTime() - 15 * 60 * 1000
    );

    em.create(Race, {
      raceDateTime: currentDate,
      registrationDeadline: registrationDeadline,
      combination: combination,
    });

    currentDate = new Date(currentDate.getTime() + intervalMs);
  }

  await em.flush();
}

export const CombinationService = {
  async findAll(): Promise<Combination[]> {
    const em = orm.em;
    return em.find(Combination, {}, { populate: POPULATE });
  },

  async findCurrent(now: Date = new Date()): Promise<Combination[]> {
    const em = orm.em;
    return em.find(
      Combination,
      {
        dateFrom: { $lte: now },
        dateTo: { $gte: now },
      },
      { populate: POPULATE }
    );
  },

  async findOne(id: number): Promise<Combination> {
    const em = orm.em;
    return em.findOneOrFail(
      Combination,
      { id },
      { populate: [...POPULATE, 'races'] }
    );
  },

  async create(data: CombinationInput): Promise<Combination> {
    const requiredFields = [
      'dateFrom',
      'dateTo',
      'lapsNumber',
      'obligatoryStopsQuantity',
      'userType',
      'raceIntervalMinutes',
      'categoryVersion',
      'circuitVersion',
    ];
    const validationError = validateRequired(
      data as unknown as Record<string, unknown>,
      requiredFields
    );
    if (validationError) {
      throw new ValidationError(validationError);
    }

    const validDate = validateDate(data);
    if (!validDate) {
      throw new ValidationError('dateFrom must be earlier than dateTo.');
    }

    const raceIntervalMinutes = Number(data.raceIntervalMinutes);
    if (!validateRaceInterval(raceIntervalMinutes)) {
      throw new ValidationError('raceIntervalMinutes must be greater than 0.');
    }

    const idCategoryVersion = Number.parseInt(String(data.categoryVersion));
    const idCircuitVersion = Number.parseInt(String(data.circuitVersion));
    const validSimulator = await validateSameSimulator(
      idCategoryVersion,
      idCircuitVersion
    );

    if (!validSimulator) {
      throw new ValidationError(
        'CategoryVersion and CircuitVersion must belong to the same Simulator.'
      );
    }

    const em = orm.em;
    const combination = em.create(Combination, data as any);
    await em.flush();

    await generateRaces(combination);

    return em.findOneOrFail(
      Combination,
      { id: combination.id },
      { populate: POPULATE }
    );
  },

  async update(
    id: number,
    data: Partial<CombinationInput>
  ): Promise<Combination> {
    const em = orm.em;
    const combination = await em.findOneOrFail(
      Combination,
      { id },
      { populate: ['races'] }
    );
    const oldDateTo = new Date(combination.dateTo);

    if (data.dateFrom) {
      const newDateFrom = new Date(data.dateFrom);
      const oldDateFrom = new Date(combination.dateFrom);

      if (newDateFrom.getTime() !== oldDateFrom.getTime()) {
        throw new ValidationError(
          'No se puede modificar la fecha de inicio (dateFrom) de una combinación existente.'
        );
      }
    }

    if (data.dateFrom && data.dateTo) {
      const validDate = validateDate({
        dateFrom: data.dateFrom,
        dateTo: data.dateTo,
      });
      if (!validDate) {
        throw new ValidationError('dateFrom must be earlier than dateTo.');
      }
    }

    if (data.raceIntervalMinutes !== undefined) {
      if (!validateRaceInterval(Number(data.raceIntervalMinutes))) {
        throw new ValidationError(
          'raceIntervalMinutes must be greater than 0.'
        );
      }
    }

    if (data.categoryVersion && data.circuitVersion) {
      const idCategoryVersion = Number.parseInt(String(data.categoryVersion));
      const idCircuitVersion = Number.parseInt(String(data.circuitVersion));
      const validSimulator = await validateSameSimulator(
        idCategoryVersion,
        idCircuitVersion
      );
      if (!validSimulator) {
        throw new ValidationError(
          'CategoryVersion and CircuitVersion must belong to the same Simulator.'
        );
      }
    }

    em.assign(combination, data as any);
    await em.flush();

    const newDateTo = new Date(combination.dateTo);
    if (newDateTo > oldDateTo) {
      const intervalMs = Number(combination.raceIntervalMinutes) * 60 * 1000;
      let currentDate = new Date(oldDateTo.getTime() + intervalMs);

      while (currentDate <= newDateTo) {
        const registrationDeadline = new Date(
          currentDate.getTime() - 15 * 60 * 1000
        );

        em.create(Race, {
          raceDateTime: currentDate,
          registrationDeadline: registrationDeadline,
          combination: combination,
        });

        currentDate = new Date(currentDate.getTime() + intervalMs);
      }

      await em.flush();
    }

    return em.findOneOrFail(
      Combination,
      { id: combination.id },
      { populate: POPULATE }
    );
  },

  async remove(id: number): Promise<Combination> {
    const em = orm.em;
    const combination = await em.findOneOrFail(Combination, { id });
    await em.removeAndFlush(combination);
    return combination;
  },
};
