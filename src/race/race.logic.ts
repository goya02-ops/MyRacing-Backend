import { Race } from './race.entity.js';

export function validateDates(race: Race) {
  const raceDateTime = new Date(race.raceDateTime);
  const registrationDeadline = new Date(race.registrationDeadline);

  if (registrationDeadline >= raceDateTime) {
    return false;
  }
  return true;
}
