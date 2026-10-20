import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import {
  add,
  getAll,
  getOne,
  update,
  remove,
  getByUser,
  getMyRaces,
  removeSelf,
} from './race-user.controller.js';
import * as raceUserService from './race-user.service.js';

vi.mock('./race-user.service.js', () => ({
  addRaceUser: vi.fn(),
  getAllRaceUsers: vi.fn(),
  getOneRaceUser: vi.fn(),
  updateRaceUser: vi.fn(),
  removeRaceUser: vi.fn(),
  getRaceUsersByUser: vi.fn(),
}));

function mockRequest(params = {}, body = {}, query = {}, user?: { id: number; type: string }): Request {
  return {
    params,
    body,
    query,
    user,
  } as unknown as Request;
}

function mockResponse(): Response {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe('RaceUserController Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const fakeRaceUser = {
    id: 100,
    startPosition: 1,
    finishPosition: 1,
    registrationDateTime: new Date(),
    user: { id: 1, userName: 'jdoe' },
    race: { id: 10, raceDateTime: new Date() },
  };

  describe('add (auto-inscripción, 409 y 403)', () => {
    it('debe permitir auto-inscripción (usuario común logueado se anota a sí mismo en una carrera) respondiendo 201', async () => {
      vi.mocked(raceUserService.addRaceUser).mockResolvedValue({
        success: true,
        data: fakeRaceUser as any,
      });

      const req = mockRequest({}, { raceId: 10, userId: 1 }, {}, { id: 1, type: 'common' });
      const res = mockResponse();

      await add(req, res);

      expect(raceUserService.addRaceUser).toHaveBeenCalledWith(
        { userId: 1, raceId: 10 },
        1,
        false
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Race user created',
        data: fakeRaceUser,
      });
    });

    it('debe devolver HTTP 409 si el usuario ya está inscripto en esa carrera', async () => {
      vi.mocked(raceUserService.addRaceUser).mockResolvedValue({
        success: false,
        error: 'User already registered for this race',
      });

      const req = mockRequest({}, { raceId: 10, userId: 1 }, {}, { id: 1, type: 'common' });
      const res = mockResponse();

      await add(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User already registered for this race',
      });
    });

    it('debe devolver HTTP 403 si un usuario común intenta inscribir a otro ID de usuario', async () => {
      // Usuario autenticado id: 1 (common) intenta enviar userId: 2
      const req = mockRequest({}, { raceId: 10, userId: 2 }, {}, { id: 1, type: 'common' });
      const res = mockResponse();

      await add(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Unauthorized to enroll another user',
      });
      expect(raceUserService.addRaceUser).not.toHaveBeenCalled();
    });

    it('debe devolver HTTP 403 si el servicio rechaza la inscripción por falta de autorización', async () => {
      vi.mocked(raceUserService.addRaceUser).mockResolvedValue({
        success: false,
        error: 'Unauthorized to enroll another user',
      });

      const req = mockRequest({}, { raceId: 10, userId: 1 }, {}, { id: 1, type: 'common' });
      const res = mockResponse();

      await add(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Unauthorized to enroll another user',
      });
    });

    it('debe permitir que un usuario con rol admin inscriba a otro ID de usuario respondiendo 201', async () => {
      vi.mocked(raceUserService.addRaceUser).mockResolvedValue({
        success: true,
        data: { ...fakeRaceUser, user: { id: 2 } } as any,
      });

      const req = mockRequest({}, { raceId: 10, userId: 2 }, {}, { id: 99, type: 'admin' });
      const res = mockResponse();

      await add(req, res);

      expect(raceUserService.addRaceUser).toHaveBeenCalledWith(
        { userId: 2, raceId: 10 },
        99,
        true
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Race user created',
        data: expect.objectContaining({ user: { id: 2 } }),
      });
    });

    it('debe devolver HTTP 400 ante errores de validación de negocio', async () => {
      vi.mocked(raceUserService.addRaceUser).mockResolvedValue({
        success: false,
        error: 'User not found',
      });

      const req = mockRequest({}, { raceId: 10, userId: 1 }, {}, { id: 1, type: 'common' });
      const res = mockResponse();

      await add(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User not found',
      });
    });

    it('debe responder 500 si ocurre una excepción inesperada', async () => {
      vi.mocked(raceUserService.addRaceUser).mockRejectedValue(new Error('DB connection failure'));

      const req = mockRequest({}, { raceId: 10, userId: 1 }, {}, { id: 1, type: 'common' });
      const res = mockResponse();

      await add(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error interno del servidor',
      });
    });
  });

  describe('getAll', () => {
    it('debe responder 200 con la lista de inscripciones', async () => {
      vi.mocked(raceUserService.getAllRaceUsers).mockResolvedValue([fakeRaceUser as any]);

      const req = mockRequest();
      const res = mockResponse();

      await getAll(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Find all race users',
        data: [fakeRaceUser],
      });
    });
  });

  describe('getOne', () => {
    it('debe responder 200 con la inscripción si existe', async () => {
      vi.mocked(raceUserService.getOneRaceUser).mockResolvedValue(fakeRaceUser as any);

      const req = mockRequest({ id: '100' });
      const res = mockResponse();

      await getOne(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Race user found',
        data: fakeRaceUser,
      });
    });

    it('debe responder 404 si la inscripción no existe', async () => {
      vi.mocked(raceUserService.getOneRaceUser).mockResolvedValue(null);

      const req = mockRequest({ id: '999' });
      const res = mockResponse();

      await getOne(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Race user not found',
      });
    });
  });

  describe('update', () => {
    it('debe responder 200 al actualizar exitosamente', async () => {
      vi.mocked(raceUserService.updateRaceUser).mockResolvedValue({ success: true });

      const req = mockRequest({ id: '100' }, { finishPosition: 2 });
      const res = mockResponse();

      await update(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Race user updated',
      });
    });

    it('debe responder 404 si la inscripción a actualizar no existe', async () => {
      vi.mocked(raceUserService.updateRaceUser).mockResolvedValue({
        success: false,
        error: 'RaceUser not found',
      });

      const req = mockRequest({ id: '999' }, { finishPosition: 2 });
      const res = mockResponse();

      await update(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'RaceUser not found',
      });
    });
  });

  describe('remove', () => {
    it('debe responder 200 al eliminar exitosamente', async () => {
      vi.mocked(raceUserService.removeRaceUser).mockResolvedValue({ success: true });

      const req = mockRequest({ id: '100' }, {}, {}, { id: 1, type: 'common' });
      const res = mockResponse();

      await remove(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Race user deleted',
      });
    });

    it('debe responder 403 si el usuario no tiene autorización para eliminar la inscripción', async () => {
      vi.mocked(raceUserService.removeRaceUser).mockResolvedValue({
        success: false,
        error: 'Unauthorized to delete this race user',
      });

      const req = mockRequest({ id: '100' }, {}, {}, { id: 2, type: 'common' });
      const res = mockResponse();

      await remove(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Unauthorized to delete this race user',
      });
    });

    it('debe responder 404 si la inscripción a eliminar no existe', async () => {
      vi.mocked(raceUserService.removeRaceUser).mockResolvedValue({
        success: false,
        error: 'RaceUser not found',
      });

      const req = mockRequest({ id: '999' }, {}, {}, { id: 1, type: 'admin' });
      const res = mockResponse();

      await remove(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'RaceUser not found',
      });
    });
  });

  describe('getByUser y getMyRaces', () => {
    it('getByUser debe responder 200 con las carreras del usuario', async () => {
      vi.mocked(raceUserService.getRaceUsersByUser).mockResolvedValue([fakeRaceUser as any]);

      const req = mockRequest({}, {}, { userId: '1' });
      const res = mockResponse();

      await getByUser(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Race users found',
        data: [fakeRaceUser],
      });
    });

    it('getMyRaces debe responder 200 con las carreras del usuario logueado', async () => {
      vi.mocked(raceUserService.getRaceUsersByUser).mockResolvedValue([fakeRaceUser as any]);

      const req = mockRequest({}, {}, {}, { id: 1, type: 'common' });
      const res = mockResponse();

      await getMyRaces(req, res);

      expect(raceUserService.getRaceUsersByUser).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'My races found',
        data: [fakeRaceUser],
      });
    });
  });

  describe('removeSelf', () => {
    it('debe permitir que el usuario logueado se desanote de su carrera (HTTP 200)', async () => {
      vi.mocked(raceUserService.getRaceUsersByUser).mockResolvedValue([fakeRaceUser as any]);
      vi.mocked(raceUserService.removeRaceUser).mockResolvedValue({ success: true });

      const req = mockRequest({ raceId: '10' }, {}, {}, { id: 1, type: 'common' });
      const res = mockResponse();

      await removeSelf(req, res);

      expect(raceUserService.removeRaceUser).toHaveBeenCalledWith(100, 1, false);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Unregistered successfully',
      });
    });

    it('debe responder 404 si el usuario no estaba inscripto en esa carrera', async () => {
      vi.mocked(raceUserService.getRaceUsersByUser).mockResolvedValue([]);

      const req = mockRequest({ raceId: '10' }, {}, {}, { id: 1, type: 'common' });
      const res = mockResponse();

      await removeSelf(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Not registered for this race',
      });
    });
  });
});
