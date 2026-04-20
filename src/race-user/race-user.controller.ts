
import type { Request, Response } from 'express';
import { handleControllerError } from '../shared/error.util.js';
import {
  addRaceUser,
  getAllRaceUsers,
  getOneRaceUser,
  updateRaceUser,
  removeRaceUser,
  getRaceUsersByUser,
} from './race-user.service.js';
import { sanitizeRaceUserInput, parseSanitizedInput } from './race-user.utils.js';

export async function getAll(req: Request, res: Response): Promise<void> {
  try {
    const data = await getAllRaceUsers();
    res.status(200).json({ message: 'Find all race users', data });
  } catch (error) {
    handleControllerError(error, res);
  }
}

export async function getOne(req: Request, res: Response): Promise<void> {
  try {
    const id = Number.parseInt(req.params.id);
    const data = await getOneRaceUser(id);
    
    if (!data) {
      res.status(404).json({ message: 'Race user not found' });
      return;
    }
    
    res.status(200).json({ message: 'Race user found', data });
  } catch (error) {
    handleControllerError(error, res);
  }
}

export async function add(req: Request, res: Response): Promise<void> {
  try {
    const input = sanitizeRaceUserInput(req);
    const { userId, raceId } = parseSanitizedInput(input);
    
    const result = await addRaceUser({ userId, raceId });
    
    if (!result.success) {
      if (result.error === 'User already registered for this race') {
        res.status(409).json({ message: result.error });
        return;
      }
      res.status(400).json({ message: result.error });
      return;
    }

    res.status(201).json({ message: 'Race user created', data: result.data });
  } catch (error) {
    handleControllerError(error, res);
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const id = Number.parseInt(req.params.id);
    const input = sanitizeRaceUserInput(req);
    
    const result = await updateRaceUser(id, input);
    
    if (!result.success) {
      res.status(404).json({ message: result.error });
      return;
    }

    res.status(200).json({ message: 'Race user updated' });
  } catch (error) {
    handleControllerError(error, res);
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    const id = Number.parseInt(req.params.id);
    const userPayload = req.user as any;
    const isAdmin = userPayload?.type === 'admin';
    
    const result = await removeRaceUser(id, userPayload?.id, isAdmin);
    
    if (!result.success) {
      if (result.error === 'RaceUser not found') {
        res.status(404).json({ message: result.error });
        return;
      }
      res.status(403).json({ message: result.error });
      return;
    }

    res.status(200).json({ message: 'Race user deleted' });
  } catch (error) {
    handleControllerError(error, res);
  }
}

export async function getByUser(req: Request, res: Response): Promise<void> {
  try {
    const userId = Number(req.query.userId);
    const data = await getRaceUsersByUser(userId);
    res.status(200).json({ message: 'Race users found', data });
  } catch (error) {
    handleControllerError(error, res);
  }
}

export async function getMyRaces(req: Request, res: Response): Promise<void> {
  try {
    const userPayload = req.user as any;
    const data = await getRaceUsersByUser(userPayload?.id);
    res.status(200).json({ message: 'My races found', data });
  } catch (error) {
    handleControllerError(error, res);
  }
}

export async function removeSelf(req: Request, res: Response): Promise<void> {
  try {
    const raceId = Number.parseInt(req.params.raceId);
    const userPayload = req.user as any;
    const userId = userPayload?.id;
    
    const myRaces = await getRaceUsersByUser(userId);
    const raceUser = myRaces.find(ru => ru.race.id === raceId);
    
    if (!raceUser) {
      res.status(404).json({ message: 'Not registered for this race' });
      return;
    }
    
    const result = await removeRaceUser(raceUser.id, userId, false);
    
    if (!result.success) {
      res.status(400).json({ message: result.error });
      return;
    }

    res.status(200).json({ message: 'Unregistered successfully' });
  } catch (error) {
    handleControllerError(error, res);
  }
}

export const RaceUserController = {
  getAll,
  getOne,
  add,
  update,
  remove,
  getByUser,
  getMyRaces,
  removeSelf,
};