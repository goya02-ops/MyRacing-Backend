// BE-22: patrón service replicado de Familia A/B. Conserva las reglas de
// BE-17 (validar SIEMPRE la entidad fusionada en update) y el re-fetch con
// populate de combination en create/update.
import type { RequiredEntityData, EntityData } from '@mikro-orm/mysql';
import { orm } from '../shared/orm.js';
import { ValidationError } from '../shared/validation-error.js';
import { Race } from './race.entity.js';
import { validateCombinationAndDates } from './race.logic.js';
import { validateIdParam, validateRequired } from '../utils/validations.js';

export interface RaceInput {
  raceDateTime: string | Date;
  registrationDeadline: string | Date;
  combination: number | string;
  description?: string;
}

export interface CurrentRacesResult {
  limitNext: number;
  limitPrev: number;
  previousRaces: Race[];
  nextRaces: Race[];
}

export const RaceService = {
  async findCurrentByCombination(
    previousLimit: string | number,
    nextLimit: string | number,
    combination: string | number,
  ): Promise<CurrentRacesResult> {
    if (!validateIdParam(combination)) {
      throw new ValidationError('ID de combinación inválido');
    }

    const em = orm.em;
    const limitPrev = Number.parseInt(String(previousLimit)) || 5;
    const limitNext = Number.parseInt(String(nextLimit)) || 5;
    const idCombination = Number.parseInt(String(combination));
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
        },
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
        },
      ),
    ]);

    return { limitNext, limitPrev, previousRaces, nextRaces };
  },

  async findOne(id: number): Promise<Race> {
    if (!validateIdParam(id)) {
      throw new ValidationError('ID inválido');
    }

    const em = orm.em;
    return em.findOneOrFail(Race, { id }, { populate: ['combination', 'raceUsers'] });
  },

  async create(data: RaceInput): Promise<Race> {
    const validationError = validateRequired(
      data as unknown as Record<string, unknown>,
      ['raceDateTime', 'registrationDeadline', 'combination'],
    );
    if (validationError) {
      throw new ValidationError(validationError);
    }

    const idCombination = Number.parseInt(String(data.combination));
    const combinationError = await validateCombinationAndDates(
      data as unknown as Pick<Race, 'raceDateTime' | 'registrationDeadline'>,
      idCombination,
    );
    if (combinationError) {
      throw new ValidationError(combinationError);
    }

    const em = orm.em;
    // El body trae fechas como string e id de combinación como PK: MikroORM
    // los coercea igual que antes (el controller pasaba el sanitizeInput crudo).
    const race = em.create(Race, data as unknown as RequiredEntityData<Race>);
    await em.flush();
    return em.findOneOrFail(
      Race,
      { id: race.id },
      { populate: ['combination'] },
    );
  },

  async update(id: number, data: Partial<RaceInput>): Promise<Race> {
    if (!validateIdParam(id)) {
      throw new ValidationError('ID inválido');
    }

    const em = orm.em;
    const race = await em.findOneOrFail(Race, { id });

    // BE-17: validar SIEMPRE la entidad fusionada (patch sobre la existente),
    // no solo cuando el body trae ambas fechas. La combinacion sale del body o,
    // si no viene, de la entidad.
    const combinationId = data.combination
      ? Number.parseInt(String(data.combination))
      : race.combination?.id;

    const combinationError = await validateCombinationAndDates(
      {
        raceDateTime: data.raceDateTime ?? race.raceDateTime,
        registrationDeadline:
          data.registrationDeadline ?? race.registrationDeadline,
      } as unknown as Pick<Race, 'raceDateTime' | 'registrationDeadline'>,
      combinationId,
    );
    if (combinationError) {
      throw new ValidationError(combinationError);
    }

    em.assign(race, data as unknown as EntityData<Race>);
    await em.flush();
    return em.findOneOrFail(
      Race,
      { id: race.id },
      { populate: ['combination'] },
    );
  },

  async remove(id: number): Promise<Race> {
    if (!validateIdParam(id)) {
      throw new ValidationError('ID inválido');
    }

    const em = orm.em;
    const race = await em.findOneOrFail(Race, { id });
    await em.removeAndFlush(race);
    return race;
  },
};
