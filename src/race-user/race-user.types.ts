/**
 * Tipos e interfaces para el módulo RaceUser.
 */

export interface RaceUserAddRequest {
  userId: number;
  raceId: number;
  startPosition?: number;
  finishPosition?: number;
}

export interface RaceUserUpdateRequest {
  startPosition?: number;
  finishPosition?: number;
  raceId?: number;
  userId?: number;
}

export interface RaceUserResponse {
  id: number;
  startPosition?: number;
  finishPosition?: number;
  registrationDateTime: Date;
  user: {
    id: number;
    userName: string;
    realName: string;
    email: string;
    password: string;
    type: string;
  };
  race: {
    id: number;
    raceDateTime: Date;
    registrationDeadline: Date;
    combination: number;
  };
}