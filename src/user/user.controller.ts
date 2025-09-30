import { Request, Response, NextFunction } from 'express';
import { User } from './user.entity.js';
import { orm } from '../shared/orm.js';

function sanitizeUserInput(req: Request, res: Response, next: NextFunction) {
  req.body.sanitizeInput = {
    userName: req.body.userName,
    realName: req.body.realName,
    email: req.body.email,
    password: req.body.password,
    type: req.body.type,
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
    const users = await em.find(User, {});
    res.status(200).json({ message: 'Find all users', data: users });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function getOne(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const user = await em.findOneOrFail(User, { id });
    res.status(200).json({ message: 'User found: ', data: user });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function add(req: Request, res: Response) {
  try {
    const em = orm.em;
    const user = em.create(User, req.body);
    await em.flush();
    res.status(201).json({ message: 'User created', data: user });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function update(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const user = await em.findOneOrFail(User, { id });
    em.assign(user, req.body.sanitizeInput);
    await em.flush();
    res.status(200).json({ message: 'User updated', data: user });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

async function remove(req: Request, res: Response) {
  try {
    const em = orm.em;
    const id = Number.parseInt(req.params.id);
    const user = await em.findOneOrFail(User, { id });
    await em.removeAndFlush(user);
    res.status(200).json({ message: 'User deleted', data: user });
  } catch (error: any) {
    res.status(500).json({ data: error.message });
  }
}

export const UserController = {
  sanitizeUserInput,
  getAll,
  getOne,
  add,
  update,
  remove,
};
