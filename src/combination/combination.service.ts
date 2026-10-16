// BE-22: patrón service replicado de Familia A/B. Conserva los guards de
// BE-19 (intervalo > 0, tope de carreras y batcheo) y el re-fetch con populate
// de las versiones en create/update.
import type { FilterQuery, RequiredEntityData, EntityData } from '@mikro-orm/mysql';
import { orm } from '../shared/orm.js';
import { ValidationError } from '../shared/validation-error.js';
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

// Genera las carreras de [startDate, endDate] (inclusive) por lotes. La
// cantidad e intervalo ya fueron validados/limitados por el llamador, así que
// el rango es acotado y `raceDates` siempre avanza.
async function generateRaces(
  combination: Combination,
  startDate: Date,
  endDate: Date,
) {
  const em = orm.em;
  const dates = raceDates(startDate, endDate, combination.raceIntervalMinutes);

  for (const batch of chunk(dates, RACE_CREATE_BATCH_SIZE)) {
    for (const raceDate of batch) {
      // Calcular la fecha límite de inscripción (15 minutos antes de la carrera)
      const registrationDeadline = new Date(
        raceDate.getTime() - 15 * 60 * 1000,
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

export const CombinationService = {
  async findAll(): Promise<Combination[]> {
    const em = orm.em;
    return em.find(Combination, {}, { populate: POPULATE });
  },

  async findCurrent(now: Date = new Date()): Promise<Combination[]> {
    const em = orm.em;
    const filter: FilterQuery<Combination> = {
      dateFrom: { $lte: now },
      dateTo: { $gte: now },
    };

    return em.find(Combination, filter, { populate: POPULATE });
  },

  async findOne(id: number): Promise<Combination> {
    const em = orm.em;
    return em.findOneOrFail(
      Combination,
      { id },
      { populate: [...POPULATE, 'races'] },
    );
  },

  async create(data: CombinationInput): Promise<Combination> {
    const em = orm.em;
    const idCategoryVersion = Number.parseInt(String(data.categoryVersion));
    const idCircuitVersion = Number.parseInt(String(data.circuitVersion));
    const validDate = validateDate(data as unknown as Combination);

    if (!validDate) {
      throw new ValidationError('dateFrom must be earlier than dateTo.');
    }

    // BE-19: sin esto, raceIntervalMinutes <= 0 produce un bucle infinito en
    // generateRaces. El tope evita cientos de miles de filas en un request.
    const raceIntervalMinutes = Number(data.raceIntervalMinutes);
    if (!validateRaceInterval(raceIntervalMinutes)) {
      throw new ValidationError('raceIntervalMinutes must be greater than 0.');
    }

    const dateFrom = new Date(data.dateFrom);
    const dateTo = new Date(data.dateTo);
    const raceCount = countRaces(dateFrom, dateTo, raceIntervalMinutes);
    if (raceCount > MAX_RACES_PER_COMBINATION) {
      throw new ValidationError(
        `La combinación generaría ${raceCount} carreras; el máximo permitido es ${MAX_RACES_PER_COMBINATION}.`,
      );
    }

    const validSimulator = await validateSameSimulator(
      idCategoryVersion,
      idCircuitVersion,
    );

    if (!validSimulator) {
      throw new ValidationError(
        'CategoryVersion and CircuitVersion must belong to the same Simulator.',
      );
    }

    // El body trae fechas/ids como string: MikroORM los coercea igual que
    // antes (el controller pasaba el sanitizeInput crudo).
    const combination = em.create(
      Combination,
      data as unknown as RequiredEntityData<Combination>,
    );
    await em.flush();

    // Generar las carreras automáticamente
    await generateRaces(combination, dateFrom, dateTo);

    // No hacer populate de 'races' para evitar loop infinito
    return em.findOneOrFail(
      Combination,
      { id: combination.id },
      { populate: POPULATE },
    );
  },

  async update(
    id: number,
    data: Partial<CombinationInput>,
  ): Promise<Combination> {
    const em = orm.em;
    const combination = await em.findOneOrFail(
      Combination,
      { id },
      { populate: ['races'] },
    );
    const oldDateTo = new Date(combination.dateTo);

    // Validar que NO se intente cambiar dateFrom
    if (data.dateFrom) {
      const newDateFrom = new Date(data.dateFrom);
      const oldDateFrom = new Date(combination.dateFrom);

      if (newDateFrom.getTime() !== oldDateFrom.getTime()) {
        throw new ValidationError(
          'No se puede modificar la fecha de inicio (dateFrom) de una combinación existente.',
        );
      }
    }

    if (data.dateFrom && data.dateTo) {
      // Se espera que se envie un formulario modificando ambas fechas
      const validDate = validateDate(data as unknown as Combination);
      if (!validDate) {
        throw new ValidationError('dateFrom must be earlier than dateTo.');
      }
    }

    // BE-19: rechazar intervalos <= 0 también al actualizar.
    if (data.raceIntervalMinutes !== undefined) {
      if (!validateRaceInterval(Number(data.raceIntervalMinutes))) {
        throw new ValidationError(
          'raceIntervalMinutes must be greater than 0.',
        );
      }
    }

    if (data.categoryVersion && data.circuitVersion) {
      const idCategoryVersion = Number.parseInt(String(data.categoryVersion));
      const idCircuitVersion = Number.parseInt(String(data.circuitVersion));
      const validSimulator = await validateSameSimulator(
        idCategoryVersion,
        idCircuitVersion,
      );
      if (!validSimulator) {
        throw new ValidationError(
          'CategoryVersion and CircuitVersion must belong to the same Simulator.',
        );
      }
    }

    // BE-19: validar la extensión (intervalo y tope) ANTES de persistir, para
    // no dejar la combinación extendida sin sus carreras si el rango es inválido.
    const effectiveIntervalMinutes = Number(
      data.raceIntervalMinutes ?? combination.raceIntervalMinutes,
    );
    const effectiveDateTo = data.dateTo
      ? new Date(data.dateTo)
      : new Date(combination.dateTo);
    const extensionStart = new Date(
      oldDateTo.getTime() + effectiveIntervalMinutes * 60 * 1000,
    );
    const isExtending = effectiveDateTo > oldDateTo;

    if (isExtending) {
      const extraCount = countRaces(
        extensionStart,
        effectiveDateTo,
        effectiveIntervalMinutes,
      );
      if (extraCount > MAX_RACES_PER_COMBINATION) {
        throw new ValidationError(
          `La extensión generaría ${extraCount} carreras; el máximo permitido es ${MAX_RACES_PER_COMBINATION}.`,
        );
      }
    }

    // Actualizar la combinación
    em.assign(combination, data as unknown as EntityData<Combination>);
    await em.flush();

    // Si se extendió la fecha, generar carreras para el rango nuevo
    if (isExtending) {
      await generateRaces(combination, extensionStart, effectiveDateTo);
    }

    return em.findOneOrFail(
      Combination,
      { id: combination.id },
      { populate: POPULATE },
    );
  },

  async remove(id: number): Promise<Combination> {
    const em = orm.em;
    const combination = await em.findOneOrFail(Combination, { id });
    await em.removeAndFlush(combination);
    return combination;
  },
};
