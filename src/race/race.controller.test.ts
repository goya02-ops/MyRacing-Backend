import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '@mikro-orm/mysql';
import { RaceController } from './race.controller.js';
import { RaceService } from './race.service.js';
import { ValidationError } from '../shared/validation-error.js';

vi.mock('./race.service.js', () => ({
  RaceService: {
    findCurrentByCombination: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

function mockRequest(params = {}, body = {}): Request {
  return {
    params,
    body,
  } as unknown as Request;
}

function mockResponse(): Response {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe('RaceController Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const fakeRace = {
    id: 10,
    raceDateTime: new Date('2026-06-01T15:00:00Z'),
    registrationDeadline: new Date('2026-06-01T14:45:00Z'),
    combination: { id: 5 },
  };

  describe('sanitizeRaceInput middleware', () => {
    it('debe estructurar req.body.sanitizeInput y descartar campos undefined', () => {
      const req = mockRequest({}, {
        raceDateTime: '2026-06-01T15:00:00Z',
        registrationDeadline: '2026-06-01T14:45:00Z',
        combination: 5,
        unexpected: 'ignored',
        description: undefined,
      });
      const res = mockResponse();
      const next: NextFunction = vi.fn();

      RaceController.sanitizeRaceInput(req, res, next);

      expect(req.body.sanitizeInput).toEqual({
        raceDateTime: '2026-06-01T15:00:00Z',
        registrationDeadline: '2026-06-01T14:45:00Z',
        combination: 5,
      });
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('add (POST /)', () => {
    it('debe responder 201 con la carrera creada cuando los datos son válidos', async () => {
      vi.mocked(RaceService.create).mockResolvedValue(fakeRace as any);

      const req = mockRequest({}, { sanitizeInput: fakeRace });
      const res = mockResponse();

      await RaceController.add(req, res);

      expect(RaceService.create).toHaveBeenCalledWith(fakeRace);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Race created',
        data: fakeRace,
      });
    });

    it('debe responder 400 ante ValidationError (fechas inválidas o datos faltantes)', async () => {
      vi.mocked(RaceService.create).mockRejectedValue(
        new ValidationError('registrationDeadline debe ser anterior a raceDateTime')
      );

      const req = mockRequest({}, { sanitizeInput: {} });
      const res = mockResponse();

      await RaceController.add(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'registrationDeadline debe ser anterior a raceDateTime',
      });
    });

    it('debe responder 500 ante un error inesperado', async () => {
      vi.mocked(RaceService.create).mockRejectedValue(new Error('DB failure'));

      const req = mockRequest({}, { sanitizeInput: {} });
      const res = mockResponse();

      await RaceController.add(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error interno del servidor',
      });
    });
  });

  describe('update (PUT / PATCH /:id)', () => {
    it('debe responder 200 con la carrera actualizada', async () => {
      const updateData = { registrationDeadline: '2026-06-01T14:50:00Z' };
      const updatedRace = { ...fakeRace, registrationDeadline: new Date('2026-06-01T14:50:00Z') };
      vi.mocked(RaceService.update).mockResolvedValue(updatedRace as any);

      const req = mockRequest({ id: '10' }, { sanitizeInput: updateData });
      const res = mockResponse();

      await RaceController.update(req, res);

      expect(RaceService.update).toHaveBeenCalledWith(10, updateData);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Race updated',
        data: updatedRace,
      });
    });

    it('debe responder 400 ante ValidationError en update (fechas invertidas)', async () => {
      vi.mocked(RaceService.update).mockRejectedValue(
        new ValidationError('registrationDeadline debe ser anterior a raceDateTime')
      );

      const req = mockRequest({ id: '10' }, { sanitizeInput: { registrationDeadline: '2026-06-01T16:00:00Z' } });
      const res = mockResponse();

      await RaceController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'registrationDeadline debe ser anterior a raceDateTime',
      });
    });

    it('debe responder 404 si la carrera a actualizar no existe', async () => {
      vi.mocked(RaceService.update).mockRejectedValue(new NotFoundError('Race not found'));

      const req = mockRequest({ id: '999' }, { sanitizeInput: { description: 'New' } });
      const res = mockResponse();

      await RaceController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Recurso no encontrado',
      });
    });
  });

  describe('getOne (GET /:id)', () => {
    it('debe responder 200 con la carrera encontrada', async () => {
      vi.mocked(RaceService.findOne).mockResolvedValue(fakeRace as any);

      const req = mockRequest({ id: '10' });
      const res = mockResponse();

      await RaceController.getOne(req, res);

      expect(RaceService.findOne).toHaveBeenCalledWith(10);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Race found',
        data: fakeRace,
      });
    });

    it('debe responder 404 si la carrera no existe', async () => {
      vi.mocked(RaceService.findOne).mockRejectedValue(new NotFoundError('Race not found'));

      const req = mockRequest({ id: '999' });
      const res = mockResponse();

      await RaceController.getOne(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Recurso no encontrado',
      });
    });
  });

  describe('getCurrentByCombination (GET /current/:previousLimit/:nextLimit/:combination)', () => {
    it('debe responder 200 con las carreras encontradas', async () => {
      const resultData = { limitNext: 5, limitPrev: 5, previousRaces: [], nextRaces: [] };
      vi.mocked(RaceService.findCurrentByCombination).mockResolvedValue(resultData as any);

      const req = mockRequest({ previousLimit: '5', nextLimit: '5', combination: '5' });
      const res = mockResponse();

      await RaceController.getCurrentByCombination(req, res);

      expect(RaceService.findCurrentByCombination).toHaveBeenCalledWith('5', '5', '5');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Races found',
        data: resultData,
      });
    });

    it('debe responder 400 si el parámetro combinación es inválido', async () => {
      vi.mocked(RaceService.findCurrentByCombination).mockRejectedValue(
        new ValidationError('ID de combinación inválido')
      );

      const req = mockRequest({ previousLimit: '5', nextLimit: '5', combination: 'abc' });
      const res = mockResponse();

      await RaceController.getCurrentByCombination(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'ID de combinación inválido',
      });
    });
  });

  describe('remove (DELETE /:id)', () => {
    it('debe responder 200 con la carrera eliminada', async () => {
      vi.mocked(RaceService.remove).mockResolvedValue(fakeRace as any);

      const req = mockRequest({ id: '10' });
      const res = mockResponse();

      await RaceController.remove(req, res);

      expect(RaceService.remove).toHaveBeenCalledWith(10);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Race deleted',
        data: fakeRace,
      });
    });

    it('debe responder 404 si la carrera a eliminar no existe', async () => {
      vi.mocked(RaceService.remove).mockRejectedValue(new NotFoundError('Race not found'));

      const req = mockRequest({ id: '999' });
      const res = mockResponse();

      await RaceController.remove(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Recurso no encontrado',
      });
    });
  });
});
