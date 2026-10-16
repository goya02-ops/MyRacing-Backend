import { Combination } from './combination.entity';
import { CategoryVersion } from '../category-version/category-version.entity.js';
import { CircuitVersion } from '../circuit-version/circuit-version.entity.js';
import { orm } from '../shared/orm.js';

export async function validateSameSimulator(
  idCategoryVersion: number,
  idCircuitVersion: number
) {
  try {
    const em = orm.em;
    const categoryVersion = await em.findOne(
      CategoryVersion,
      { id: idCategoryVersion },
      { populate: ['simulator'] }
    );
    const circuitVersion = await em.findOne(
      CircuitVersion,
      { id: idCircuitVersion },
      { populate: ['simulator'] }
    );

    if (
      categoryVersion &&
      circuitVersion &&
      categoryVersion.simulator.id === circuitVersion.simulator.id
    ) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error validating same simulator:', error);
    return false;
  }
}

export function validateDate(combination: Combination) {
  const dateFrom = new Date(combination.dateFrom);
  const dateTo = new Date(combination.dateTo);

  if (dateFrom >= dateTo) {
    return false;
  }
  return true;
}

// BE-19: tope de carreras por combinación. Un intervalo de 1 minuto en un rango
// anual genera cientos de miles de filas (auditoría Cloudflare): se rechaza en
// vez de llenar la DB en un solo request.
export const MAX_RACES_PER_COMBINATION = 10000;

// BE-19: las carreras se insertan por lotes para no acumular miles de entidades
// en memoria ni hacer un único flush gigantesco.
export const RACE_CREATE_BATCH_SIZE = 1000;

// `raceIntervalMinutes` debe ser un número finito > 0. Con 0 o negativo el
// generador no avanza (bucle infinito). Acepta strings numéricos del body.
export function validateRaceInterval(intervalMinutes: unknown): boolean {
  const value =
    typeof intervalMinutes === 'number'
      ? intervalMinutes
      : Number(intervalMinutes);
  return Number.isFinite(value) && value > 0;
}

// Cantidad de carreras en [startDate, endDate] inclusive, con paso
// intervalMinutes. Devuelve Infinity si el intervalo es inválido para que el
// llamador lo trate como fuera de rango.
export function countRaces(
  startDate: Date,
  endDate: Date,
  intervalMinutes: number
): number {
  const intervalMs = intervalMinutes * 60 * 1000;
  if (!(intervalMs > 0)) {
    return Number.POSITIVE_INFINITY;
  }
  const span = endDate.getTime() - startDate.getTime();
  if (span < 0) {
    return 0;
  }
  return Math.floor(span / intervalMs) + 1;
}

// Genera perezosamente las fechas de carrera (no materializa rangos enormes).
export function* raceDates(
  startDate: Date,
  endDate: Date,
  intervalMinutes: number
): Generator<Date> {
  const intervalMs = intervalMinutes * 60 * 1000;
  for (let t = startDate.getTime(); t <= endDate.getTime(); t += intervalMs) {
    yield new Date(t);
  }
}

// Agrupa cualquier iterable en lotes de a `size` (el último puede ser parcial).
export function* chunk<T>(items: Iterable<T>, size: number): Generator<T[]> {
  let batch: T[] = [];
  for (const item of items) {
    batch.push(item);
    if (batch.length >= size) {
      yield batch;
      batch = [];
    }
  }
  if (batch.length > 0) {
    yield batch;
  }
}
