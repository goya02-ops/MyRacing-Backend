import { Request, Response, NextFunction } from 'express';
import { RaceUser } from './race-user.entity.js';
import { orm } from '../shared/orm.js';
import { User } from '../user/user.entity.js';
import { Race } from '../race/race.entity.js';

function sanitizeRaceUserInput(
  req: Request,
  res: Response,
  next: NextFunction
) {
  req.body.sanitizeInput = {
    startPosition: req.body.startPosition,
    finishPosition: req.body.finishPosition,
    raceId: req.body.raceId,
    userId: req.body.userId,
  };
  Object.keys(req.body.sanitizeInput).forEach((key) => {
    if (req.body.sanitizeInput[key] === undefined)
      delete req.body.sanitizeInput[key];
  });
  next();
}


async function getAll(req: Request, res: Response) {
  try {
    const em = orm.em;
    const raceUsers = await em.find(
      RaceUser,
      {},
      { populate: ['race', 'user'] }
    );
    res.status(200).json({ message: 'Find all race users', data: raceUsers });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function getOne(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const raceUser = await em.findOneOrFail(
      RaceUser,
      { id },
      { populate: ['race', 'user'] }
    );
    res.status(200).json({ message: 'Race user found', data: raceUser });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function add(req: Request, res: Response) {
  try {
    const em = orm.em;

    const userId = Number.parseInt(req.body.sanitizeInput.userId);
    const raceId = Number.parseInt(req.body.sanitizeInput.raceId);

    const user = await em.findOneOrFail(User, userId);
    const race = await em.findOneOrFail(Race, raceId);

    if (isNaN(userId) || isNaN(raceId)) {
      return res.status(400).json({ message: 'user y race son requeridos' });
    }

    const raceUser = em.create(RaceUser, {
      user,
      race,
      registrationDateTime: new Date(),
    });

    await em.flush();

    const populatedRaceUser = await em.findOneOrFail(
      RaceUser,
      { id: raceUser.id },
      { populate: ['race', 'user'] }
    );

    res
      .status(201)
      .json({ message: 'Race user created', data: populatedRaceUser });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function update(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const raceUser = await em.findOneOrFail(RaceUser, { id });
    em.assign(raceUser, req.body.sanitizeInput);
    await em.flush();
    const populatedRaceUser = await em.findOneOrFail(
      RaceUser,
      { id: raceUser.id },
      { populate: ['race', 'user'] }
    );
    res
      .status(200)
      .json({ message: 'Race user updated', data: populatedRaceUser });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function remove(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const raceUser = await em.findOneOrFail(RaceUser, { id });
    await em.removeAndFlush(raceUser);
    res.status(200).json({ message: 'Race user deleted', data: raceUser });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function getByUser(req: Request, res: Response) {
  try {
    const em = orm.em;
    const userId = Number.parseInt(req.query.userId as string);

    const raceUsers = await em.find(
      RaceUser,
      { user: userId },
      { populate: ['race', 'user'] }
    );

    res.status(200).json({ message: 'Race users found', data: raceUsers });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function getMyRaces(req: Request, res: Response) {
  try {
    const em = orm.em;
    const userId = req.user?.id; // ID del token (el usuario autenticado)
    
    const raceUsers = await em.find(
      RaceUser,
      { user: userId },
      { populate: ['race', 'user'] }
    );
    
    res.status(200).json({ message: 'Race users found', data: raceUsers });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

export const RaceUserController = {
  sanitizeRaceUserInput,
  getAll,
  getOne,
  add,
  update,
  remove,
  getByUser,
  getMyRaces
};
