import { Combination } from './combination.entity.js';
import { CategoryVersion } from '../category-version/category-version.entity.js';
import { CircuitVersion } from '../circuit-version/circuit-version.entity.js';
import { orm } from '../shared/orm.js';

export async function validateSameSimulator(
  idCategoryVersion: number,
  idCircuitVersion: number
): Promise<boolean> {
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
      categoryVersion.simulator?.id === circuitVersion.simulator?.id
    ) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error validating same simulator:', error);
    return false;
  }
}

export function validateDate(combination: { dateFrom: Date | string; dateTo: Date | string }): boolean {
  if (!combination.dateFrom || !combination.dateTo) {
    return false;
  }
  const dateFrom = new Date(combination.dateFrom);
  const dateTo = new Date(combination.dateTo);

  if (isNaN(dateFrom.getTime()) || isNaN(dateTo.getTime())) {
    return false;
  }

  if (dateFrom >= dateTo) {
    return false;
  }
  return true;
}

export function validateRaceInterval(intervalMinutes: unknown): boolean {
  const value =
    typeof intervalMinutes === 'number'
      ? intervalMinutes
      : Number(intervalMinutes);
  return Number.isFinite(value) && value > 0;
}
