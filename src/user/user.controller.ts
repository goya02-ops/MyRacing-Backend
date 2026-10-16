import { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../auth/auth.middleware.js';
import { UserService } from './user.service.js';
import { validateIdParam } from '../utils/validations.js';
import { handleControllerError } from '../shared/error.util.js';

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
    const users = await UserService.findAll();
    res.status(200).json({ message: 'Find all users', data: users });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function getOne(req: Request, res: Response) {
  try {
    if (!validateIdParam(req.params.id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const id = Number.parseInt(req.params.id as string);
    const user = await UserService.findOne(id);
    res.status(200).json({ message: 'User found', data: user });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function add(req: Request, res: Response) {
  try {
    const user = await UserService.create(req.body);
    res.status(201).json({ message: 'User created', data: user });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function update(req: Request, res: Response) {
  try {
    if (!validateIdParam(req.params.id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const id = Number.parseInt(req.params.id as string);
    const user = await UserService.update(id, req.body.sanitizeInput);
    res.status(200).json({ message: 'User updated', data: user });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function remove(req: Request, res: Response) {
  try {
    if (!validateIdParam(req.params.id)) {
      res.status(400).json({ message: 'ID inválido' });
      return;
    }

    const id = Number.parseInt(req.params.id as string);
    const user = await UserService.remove(id);
    res.status(200).json({ message: 'User deleted', data: user });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function getMe(req: AuthenticatedRequest, res: Response) {
  try {
    const user = await UserService.findProfile(req.user?.id);
    const userWithoutPassword: Record<string, unknown> = { ...user };
    delete userWithoutPassword.password;

    res
      .status(200)
      .json({ message: 'Usuario encontrado', data: userWithoutPassword });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function updateMe(req: AuthenticatedRequest, res: Response) {
  try {
    const user = await UserService.updateProfile(
      req.user?.id,
      req.body.sanitizeInput,
    );

    const userWithoutPassword: Record<string, unknown> = { ...user };
    delete userWithoutPassword.password;
    res
      .status(200)
      .json({ message: 'Perfil actualizado', data: userWithoutPassword });
  } catch (error) {
    handleControllerError(error, res);
  }
}

export const UserController = {
  sanitizeUserInput,
  getAll,
  getOne,
  add,
  update,
  remove,
  getMe,
  updateMe,
};
