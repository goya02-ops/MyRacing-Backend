import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { User } from './user.entity.js';
import { orm } from '../shared/orm.js';
import { validateIdParam, validateRequired, validateIsString, isValidEmail } from '../utils/validations.js';
import { handleControllerError } from '../shared/error.util.js';
import { AUTH_CONFIG } from '../auth/auth.constants.js';

export function sanitizeUser(user: User): Omit<User, 'password'> {
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

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
    res.status(200).json({ message: 'Find all users', data: users.map(sanitizeUser) });
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

    const em = orm.em;
    const id = Number.parseInt(req.params.id as string);
    const user = await em.findOneOrFail(User, { id });
    res.status(200).json({ message: 'User found', data: sanitizeUser(user) });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function add(req: Request, res: Response) {
  try {
    const userInput = req.body.sanitizeInput || req.body;
    const { userName, realName, email, password, type } = userInput;

    const validationError = validateRequired(userInput, ['userName', 'realName', 'email', 'password']);
    if (validationError) {
      res.status(400).json({ message: validationError });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ message: 'El formato del email es inválido' });
      return;
    }

    if (!userName || userName.length < 3) {
      res.status(400).json({ message: 'userName debe tener al menos 3 caracteres' });
      return;
    }

    if (!password || password.length < 6) {
      res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    const em = orm.em;

    const existingUser = await em.findOne(User, {
      $or: [{ email }, { userName }],
    });

    if (existingUser) {
      res.status(400).json({ message: 'El email o nombre de usuario ya está registrado' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, AUTH_CONFIG.BCRYPT_ROUNDS);

    const user = em.create(User, {
      ...userInput,
      password: hashedPassword,
    });
    await em.flush();
    res.status(201).json({ message: 'User created', data: sanitizeUser(user) });
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

    const em = orm.em;
    const id = Number.parseInt(req.params.id as string);
    const user = await em.findOneOrFail(User, { id });

    if (req.body.sanitizeInput?.email && !isValidEmail(req.body.sanitizeInput.email)) {
      res.status(400).json({ message: 'El formato del email es inválido' });
      return;
    }

    if (req.body.sanitizeInput?.password) {
      if (req.body.sanitizeInput.password.length < 6) {
        res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
        return;
      }
      req.body.sanitizeInput.password = await bcrypt.hash(
        req.body.sanitizeInput.password,
        AUTH_CONFIG.BCRYPT_ROUNDS
      );
    }

    em.assign(user, req.body.sanitizeInput);
    await em.flush();
    res.status(200).json({ message: 'User updated', data: sanitizeUser(user) });
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

    const em = orm.em;
    const id = Number.parseInt(req.params.id as string);
    const user = await em.findOneOrFail(User, { id });
    await em.removeAndFlush(user);
    res.status(200).json({ message: 'User deleted', data: sanitizeUser(user) });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function getMe(req: Request, res: Response) {
  try {
    const em = orm.em;
    const userId = req.user?.id;
    
    const user = await em.findOneOrFail(User, { id: userId });
    res.status(200).json({ message: 'Usuario encontrado', data: sanitizeUser(user) });
  } catch (error) {
    handleControllerError(error, res);
  }
}

async function updateMe(req: Request, res: Response) {
  try {
    const em = orm.em;
    const userId = req.user?.id;
    
    const user = await em.findOneOrFail(User, { id: userId });
    
    if (req.body.sanitizeInput?.email && !isValidEmail(req.body.sanitizeInput.email)) {
      res.status(400).json({ message: 'El formato del email es inválido' });
      return;
    }
    
    const { type, ...sanitizedInput } = req.body.sanitizeInput;

    if (sanitizedInput.password) {
      if (sanitizedInput.password.length < 6) {
        res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
        return;
      }
      sanitizedInput.password = await bcrypt.hash(
        sanitizedInput.password,
        AUTH_CONFIG.BCRYPT_ROUNDS
      );
    }
    
    em.assign(user, sanitizedInput);
    await em.flush();
    
    res.status(200).json({ message: 'Perfil actualizado', data: sanitizeUser(user) });
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