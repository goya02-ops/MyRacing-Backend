/**
 * Utilidades para el módulo RaceUser.
 */

import type { Request } from 'express';
import type { RaceUserAddRequest, RaceUserUpdateRequest } from './race-user.types.js';

/**
 * Sanitiza los datos de entrada del request.
 */
export function sanitizeRaceUserInput(req: Request): RaceUserAddRequest | RaceUserUpdateRequest {
  const body = req.body;
  
  return {
    userId: body.userId ? Number(body.userId) : undefined,
    raceId: body.raceId ? Number(body.raceId) : undefined,
    startPosition: body.startPosition ? Number(body.startPosition) : undefined,
    finishPosition: body.finishPosition ? Number(body.finishPosition) : undefined,
  };
}

/**
 * Convierte los valores del body a números para el sanitized input.
 */
export function parseSanitizedInput(input: any): { userId: number; raceId: number } {
  return {
    userId: Number(input.userId),
    raceId: Number(input.raceId),
  };
}