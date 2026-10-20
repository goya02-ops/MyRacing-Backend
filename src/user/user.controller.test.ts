import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '@mikro-orm/mysql';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';
import { ValidationError } from '../shared/validation-error.js';

vi.mock('./user.service.js', () => ({
  UserService: {
    findAll: vi.fn(),
    findOne: vi.fn(),
    findProfile: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateProfile: vi.fn(),
    remove: vi.fn(),
  },
}));

function mockRequest(params = {}, body = {}, user?: { id: number; type: string }): Request {
  return {
    params,
    body,
    user,
  } as unknown as Request;
}

function mockResponse(): Response {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe('UserController Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const fakeUser = {
    id: 1,
    userName: 'johndoe',
    realName: 'John Doe',
    email: 'john@example.com',
    password: 'hashed_password',
  };

  describe('sanitizeUserInput middleware', () => {
    it('debe estructurar req.body.sanitizeInput y eliminar propiedades undefined', () => {
      const req = mockRequest({}, {
        userName: 'johndoe',
        realName: 'John',
        email: 'john@example.com',
        type: 'common',
        unexpectedProp: 'discarded',
        password: undefined,
      });
      const res = mockResponse();
      const next: NextFunction = vi.fn();

      UserController.sanitizeUserInput(req, res, next);

      expect(req.body.sanitizeInput).toEqual({
        userName: 'johndoe',
        realName: 'John',
        email: 'john@example.com',
        type: 'common',
      });
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('add (POST /)', () => {
    it('debe responder 201 con el usuario creado cuando los datos son válidos', async () => {
      vi.mocked(UserService.create).mockResolvedValue(fakeUser as any);

      const req = mockRequest({}, fakeUser);
      const res = mockResponse();

      await UserController.add(req, res);

      expect(UserService.create).toHaveBeenCalledWith(fakeUser);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User created',
        data: fakeUser,
      });
    });

    it('debe responder 400 ante ValidationError (email duplicado o password corta)', async () => {
      vi.mocked(UserService.create).mockRejectedValue(
        new ValidationError('El email o nombre de usuario ya está registrado')
      );

      const req = mockRequest({}, fakeUser);
      const res = mockResponse();

      await UserController.add(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'El email o nombre de usuario ya está registrado',
      });
    });

    it('debe responder 500 ante un error inesperado', async () => {
      vi.mocked(UserService.create).mockRejectedValue(new Error('Unexpected DB Error'));

      const req = mockRequest({}, fakeUser);
      const res = mockResponse();

      await UserController.add(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error interno del servidor',
      });
    });
  });

  describe('update (PUT / PATCH /:id)', () => {
    it('debe responder 200 con el usuario actualizado', async () => {
      const updated = { ...fakeUser, realName: 'Updated' };
      vi.mocked(UserService.update).mockResolvedValue(updated as any);

      const req = mockRequest({ id: '1' }, { sanitizeInput: { realName: 'Updated' } });
      const res = mockResponse();

      await UserController.update(req, res);

      expect(UserService.update).toHaveBeenCalledWith(1, { realName: 'Updated' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User updated',
        data: updated,
      });
    });

    it('debe responder 400 si el parámetro ID es inválido', async () => {
      const req = mockRequest({ id: 'abc' });
      const res = mockResponse();

      await UserController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'ID inválido' });
      expect(UserService.update).not.toHaveBeenCalled();
    });

    it('debe responder 400 si el servicio arroja ValidationError en update', async () => {
      vi.mocked(UserService.update).mockRejectedValue(
        new ValidationError('La contraseña debe tener al menos 6 caracteres')
      );

      const req = mockRequest({ id: '1' }, { sanitizeInput: { password: '123' } });
      const res = mockResponse();

      await UserController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'La contraseña debe tener al menos 6 caracteres',
      });
    });

    it('debe responder 404 si el usuario no existe', async () => {
      vi.mocked(UserService.update).mockRejectedValue(new NotFoundError('User not found'));

      const req = mockRequest({ id: '999' }, { sanitizeInput: { realName: 'X' } });
      const res = mockResponse();

      await UserController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Recurso no encontrado',
      });
    });
  });

  describe('getAll (GET /)', () => {
    it('debe responder 200 con el listado de usuarios', async () => {
      vi.mocked(UserService.findAll).mockResolvedValue([fakeUser as any]);

      const req = mockRequest();
      const res = mockResponse();

      await UserController.getAll(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Find all users',
        data: [fakeUser],
      });
    });
  });

  describe('getOne (GET /:id)', () => {
    it('debe responder 200 con el usuario si existe', async () => {
      vi.mocked(UserService.findOne).mockResolvedValue(fakeUser as any);

      const req = mockRequest({ id: '1' });
      const res = mockResponse();

      await UserController.getOne(req, res);

      expect(UserService.findOne).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User found',
        data: fakeUser,
      });
    });

    it('debe responder 404 si el usuario no existe', async () => {
      vi.mocked(UserService.findOne).mockRejectedValue(new NotFoundError('User not found'));

      const req = mockRequest({ id: '999' });
      const res = mockResponse();

      await UserController.getOne(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Recurso no encontrado',
      });
    });

    it('debe responder 400 si el ID es inválido', async () => {
      const req = mockRequest({ id: 'invalido' });
      const res = mockResponse();

      await UserController.getOne(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'ID inválido' });
    });
  });

  describe('remove (DELETE /:id)', () => {
    it('debe responder 200 con el usuario eliminado', async () => {
      vi.mocked(UserService.remove).mockResolvedValue(fakeUser as any);

      const req = mockRequest({ id: '1' });
      const res = mockResponse();

      await UserController.remove(req, res);

      expect(UserService.remove).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User deleted',
        data: fakeUser,
      });
    });

    it('debe responder 404 si el usuario a eliminar no existe', async () => {
      vi.mocked(UserService.remove).mockRejectedValue(new NotFoundError('User not found'));

      const req = mockRequest({ id: '999' });
      const res = mockResponse();

      await UserController.remove(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Recurso no encontrado',
      });
    });
  });

  describe('getMe y updateMe', () => {
    it('getMe debe devolver el perfil del usuario autenticado sin password', async () => {
      vi.mocked(UserService.findProfile).mockResolvedValue(fakeUser as any);

      const req = mockRequest({}, {}, { id: 1, type: 'common' });
      const res = mockResponse();

      await UserController.getMe(req as any, res);

      expect(UserService.findProfile).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Usuario encontrado',
        data: expect.not.objectContaining({ password: expect.anything() }),
      });
    });

    it('updateMe debe devolver el perfil actualizado sin password', async () => {
      const updated = { ...fakeUser, realName: 'Updated Me' };
      vi.mocked(UserService.updateProfile).mockResolvedValue(updated as any);

      const req = mockRequest({}, { sanitizeInput: { realName: 'Updated Me' } }, { id: 1, type: 'common' });
      const res = mockResponse();

      await UserController.updateMe(req as any, res);

      expect(UserService.updateProfile).toHaveBeenCalledWith(1, { realName: 'Updated Me' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Perfil actualizado',
        data: expect.not.objectContaining({ password: expect.anything() }),
      });
    });
  });
});
