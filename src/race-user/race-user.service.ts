/**
 * Servicio de lógica de negocio para RaceUser.
 */

import { orm } from '../shared/orm.js';
import { RaceUser } from './race-user.entity.js';
import { User } from '../user/user.entity.js';
import { Race } from '../race/race.entity.js';
import type { RaceUserAddRequest, RaceUserUpdateRequest, RaceUserResponse } from './race-user.types.js';
import { logger } from '../shared/logger.js';

export async function getAllRaceUsers(): Promise<RaceUserResponse[]> {
  const em = orm.em;
  const raceUsers = await em.find(RaceUser, {}, { populate: ['race', 'user'] });
  return raceUsers.map(mapToResponse);
}

export async function getOneRaceUser(id: number): Promise<RaceUserResponse | null> {
  const em = orm.em;
  const raceUser = await em.findOne(RaceUser, { id }, { populate: ['race', 'user'] });
  return raceUser ? mapToResponse(raceUser) : null;
}

export async function addRaceUser(data: RaceUserAddRequest): Promise<{ success: boolean; data?: RaceUserResponse; error?: string }> {
  const em = orm.em;
  const userId = Number(data.userId);
  const raceId = Number(data.raceId);

  if (isNaN(userId) || isNaN(raceId)) {
    return { success: false, error: 'User ID and Race ID are required' };
  }

  const user = await em.findOne(User, { id: userId });
  if (!user) {
    return { success: false, error: 'User not found' };
  }

  const race = await em.findOne(Race, { id: raceId });
  if (!race) {
    return { success: false, error: 'Race not found' };
  }

  const existing = await em.findOne(RaceUser, { user: userId, race: raceId });
  if (existing) {
    logger.warn('User already registered for this race', { userId, raceId });
    return { success: false, error: 'User already registered for this race' };
  }

  const raceUser = em.create(RaceUser, {
    user,
    race,
    registrationDateTime: new Date(),
  });

  await em.flush();
  logger.info('Race user created', { raceUserId: raceUser.id, userId, raceId });

  return { success: true };
}

export async function updateRaceUser(id: number, data: RaceUserUpdateRequest): Promise<{ success: boolean; error?: string }> {
  const em = orm.em;
  const raceUser = await em.findOne(RaceUser, { id });
  
  if (!raceUser) {
    return { success: false, error: 'RaceUser not found' };
  }

  em.assign(raceUser, data);
  await em.flush();
  logger.info('Race user updated', { raceUserId: id });

  return { success: true };
}

export async function removeRaceUser(id: number, requestingUserId: number, isAdmin: boolean): Promise<{ success: boolean; error?: string }> {
  const em = orm.em;
  const raceUser = await em.findOne(RaceUser, { id }, { populate: ['user'] });

  if (!raceUser) {
    return { success: false, error: 'RaceUser not found' };
  }

  if (!isAdmin && raceUser.user.id !== requestingUserId) {
    logger.warn('Unauthorized delete attempt', { requestingUserId, raceUserId: id });
    return { success: false, error: 'Unauthorized to delete this race user' };
  }

  await em.removeAndFlush(raceUser);
  logger.info('Race user deleted', { raceUserId: id });

  return { success: true };
}

export async function getRaceUsersByUser(userId: number): Promise<RaceUserResponse[]> {
  const em = orm.em;
  const raceUsers = await em.find(RaceUser, { user: userId }, { populate: ['race', 'user'] });
  return raceUsers.map(mapToResponse);
}

function mapToResponse(raceUser: RaceUser): RaceUserResponse {
  return {
    id: raceUser.id!,
    startPosition: raceUser.startPosition,
    finishPosition: raceUser.finishPosition,
    registrationDateTime: raceUser.registrationDateTime,
    user: {
      id: raceUser.user.id!,
      userName: raceUser.user.userName,
      realName: raceUser.user.realName,
      email: raceUser.user.email,
      password: raceUser.user.password,
      type: raceUser.user.type as string,
    },
    race: {
      id: raceUser.race.id!,
      raceDateTime: raceUser.race.raceDateTime,
      registrationDeadline: raceUser.race.registrationDeadline,
      combination: raceUser.race.combination as any as number,
    },
  };
}