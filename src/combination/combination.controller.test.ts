import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '@mikro-orm/mysql';
import { CombinationController } from './combination.controller.js';
import { CombinationService } from './combination.service.js';
import { ValidationError } from '../shared/validation-error.js';

vi.mock('./combination.service.js', () => ({
  CombinationService: {
    findAll: vi.fn(),
    findCurrent: vi.fn(),
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

describe('CombinationController Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sanitizeCombinationInput middleware', () => {
    it('debe estructurar req.body.sanitizeInput y descartar campos undefined o no permitidos', () => {
      const req = mockRequest({}, {
        dateFrom: '2026-06-01T10:00:00.000Z',
        dateTo: '2026-06-01T12:00:00.000Z',
        lapsNumber: 15,
        userType: 'common',
        unexpectedField: 'discarded',
        obligatoryStopsQuantity: undefined,
      });
      const res = mockResponse();
      const next: NextFunction = vi.fn();

      CombinationController.sanitizeCombinationInput(req, res, next);

      expect(req.body.sanitizeInput).toEqual({
        dateFrom: '2026-06-01T10:00:00.000Z',
        dateTo: '2026-06-01T12:00:00.000Z',
        lapsNumber: 15,
        userType: 'common',
      });
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAll (GET /)', () => {
    it('debe responder 200 con el listado de combinaciones', async () => {
      const mockList = [{ id: 1 }, { id: 2 }];
      vi.mocked(CombinationService.findAll).mockResolvedValue(mockList as any);

      const req = mockRequest();
      const res = mockResponse();

      await CombinationController.getAll(req, res);

      expect(CombinationService.findAll).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Find all combinations',
        data: mockList,
      });
    });

    it('debe responder 500 ante un error inesperado', async () => {
      vi.mocked(CombinationService.findAll).mockRejectedValue(new Error('DB failure'));

      const req = mockRequest();
      const res = mockResponse();

      await CombinationController.getAll(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error interno del servidor',
      });
    });
  });

  describe('getCurrentRaces (GET /races)', () => {
    it('debe responder 200 con las carreras/combinaciones activas', async () => {
      const mockCurrent = [{ id: 1, dateFrom: new Date() }];
      vi.mocked(CombinationService.findCurrent).mockResolvedValue(mockCurrent as any);

      const req = mockRequest();
      const res = mockResponse();

      await CombinationController.getCurrentRaces(req, res);

      expect(CombinationService.findCurrent).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Find current combinations',
        data: mockCurrent,
      });
    });
  });

  describe('getOne (GET /:id)', () => {
    it('debe responder 200 con la combinación encontrada', async () => {
      const mockComb = { id: 1, denomination: 'Comb 1' };
      vi.mocked(CombinationService.findOne).mockResolvedValue(mockComb as any);

      const req = mockRequest({ id: '1' });
      const res = mockResponse();

      await CombinationController.getOne(req, res);

      expect(CombinationService.findOne).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Combination found',
        data: mockComb,
      });
    });

    it('debe responder 404 si la combinación no existe', async () => {
      vi.mocked(CombinationService.findOne).mockRejectedValue(new NotFoundError('Combination not found'));

      const req = mockRequest({ id: '999' });
      const res = mockResponse();

      await CombinationController.getOne(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Recurso no encontrado',
      });
    });
  });

  describe('add (POST /)', () => {
    it('debe responder 201 con la combinación creada cuando el payload es válido', async () => {
      const payload = {
        dateFrom: '2026-06-01T10:00:00.000Z',
        dateTo: '2026-06-01T12:00:00.000Z',
        lapsNumber: 15,
        userType: 'common',
      };
      const createdComb = { id: 10, ...payload };
      vi.mocked(CombinationService.create).mockResolvedValue(createdComb as any);

      const req = mockRequest({}, { sanitizeInput: payload });
      const res = mockResponse();

      await CombinationController.add(req, res);

      expect(CombinationService.create).toHaveBeenCalledWith(payload);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Combination created',
        data: createdComb,
      });
    });

    it('debe responder 400 ante ValidationError (payload incompleto o validación fallida)', async () => {
      vi.mocked(CombinationService.create).mockRejectedValue(
        new ValidationError('Campo requerido: categoryVersion')
      );

      const req = mockRequest({}, { sanitizeInput: { dateFrom: '2026-06-01' } });
      const res = mockResponse();

      await CombinationController.add(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Campo requerido: categoryVersion',
      });
    });

    it('debe responder 500 ante un error no controlado', async () => {
      vi.mocked(CombinationService.create).mockRejectedValue(new Error('Unexpected DB Error'));

      const req = mockRequest({}, { sanitizeInput: {} });
      const res = mockResponse();

      await CombinationController.add(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error interno del servidor',
      });
    });
  });

  describe('update (PUT / PATCH /:id)', () => {
    it('debe responder 200 con la combinación actualizada', async () => {
      const updateData = { lapsNumber: 20 };
      const updated = { id: 1, lapsNumber: 20 };
      vi.mocked(CombinationService.update).mockResolvedValue(updated as any);

      const req = mockRequest({ id: '1' }, { sanitizeInput: updateData });
      const res = mockResponse();

      await CombinationController.update(req, res);

      expect(CombinationService.update).toHaveBeenCalledWith(1, updateData);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Combination updated',
        data: updated,
      });
    });

    it('debe responder 400 ante ValidationError en update', async () => {
      vi.mocked(CombinationService.update).mockRejectedValue(
        new ValidationError('No se puede modificar la fecha de inicio (dateFrom) de una combinación existente.')
      );

      const req = mockRequest({ id: '1' }, { sanitizeInput: { dateFrom: '2026-01-01' } });
      const res = mockResponse();

      await CombinationController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'No se puede modificar la fecha de inicio (dateFrom) de una combinación existente.',
      });
    });

    it('debe responder 404 si la combinación a actualizar no existe', async () => {
      vi.mocked(CombinationService.update).mockRejectedValue(new NotFoundError('Combination not found'));

      const req = mockRequest({ id: '999' }, { sanitizeInput: { lapsNumber: 5 } });
      const res = mockResponse();

      await CombinationController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Recurso no encontrado',
      });
    });
  });

  describe('remove (DELETE /:id)', () => {
    it('debe responder 200 con la combinación eliminada', async () => {
      const removed = { id: 1 };
      vi.mocked(CombinationService.remove).mockResolvedValue(removed as any);

      const req = mockRequest({ id: '1' });
      const res = mockResponse();

      await CombinationController.remove(req, res);

      expect(CombinationService.remove).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Combination deleted',
        data: removed,
      });
    });

    it('debe responder 404 si la combinación a eliminar no existe', async () => {
      vi.mocked(CombinationService.remove).mockRejectedValue(new NotFoundError('Combination not found'));

      const req = mockRequest({ id: '999' });
      const res = mockResponse();

      await CombinationController.remove(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Recurso no encontrado',
      });
    });
  });
});
