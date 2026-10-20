import { Race } from './race.entity.js';
import { Combination } from '../combination/combination.entity.js';
import { orm } from '../shared/orm.js';
import { validateIdParam } from '../utils/validations.js';

// Valida el id de combinación y las fechas juntas con await.
// Compartido por `add` y `update`: devuelve el mensaje de error o null si todo está bien.
export async function validateCombinationAndDates(
  raceLike: Pick<Race, 'raceDateTime' | 'registrationDeadline'>,
  idCombination: number | undefined
): Promise<string | null> {
  if (!idCombination || !validateIdParam(idCombination)) {
    return 'ID de combinación inválido';
  }
  const validDates = await validateDates(raceLike as Race, idCombination);
  if (!validDates) {
    return 'registrationDeadline debe ser anterior a raceDateTime';
  }
  return null;
}

export async function validateDates(race: Race, idCombination: number): Promise<boolean> {
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
