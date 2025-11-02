import { Race } from './race.entity.js';
import { Combination } from '../combination/combination.entity.js';
import { orm } from '../shared/orm.js';

export async function validateDates(race: Race, idCombination: number) {
  try {
    const em = orm.em;

    const raceDateTime = new Date(race.raceDateTime);
    const registrationDeadline = new Date(race.registrationDeadline);

    const combination = await em.findOneOrFail(Combination, {
      id: idCombination,
    });

    const dateFrom = new Date(combination.dateFrom);
    const dateTo = new Date(combination.dateTo);

    if (
      dateFrom > registrationDeadline ||
      registrationDeadline > dateTo ||
      registrationDeadline >= raceDateTime
    ) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating dates:', error);
    return false;
  }
}
