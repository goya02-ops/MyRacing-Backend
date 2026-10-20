import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '@mikro-orm/mysql';
import { CircuitController } from './circuit.controller.js';
import { CircuitService } from './circuit.service.js';

vi.mock('./circuit.service.js', () => ({
  CircuitService: {
    findAll: vi.fn(),
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

describe('CircuitController Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sanitizeCircuitInput middleware', () => {
    it('debe estructurar req.body.sanitizeInput y eliminar propiedades undefined', () => {
      const req = mockRequest({}, {
        denomination: 'Monza',
        description: undefined,
        abbreviation: 'MNZ',
        extraField: 'should be ignored',
      });
      const res = mockResponse();
      const next: NextFunction = vi.fn();

      CircuitController.sanitizeCircuitInput(req, res, next);

      expect(req.body.sanitizeInput).toEqual({
        denomination: 'Monza',
        abbreviation: 'MNZ',
      });
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('debe responder 200 con la lista de circuitos', async () => {
      const mockCircuits = [
        { id: 1, denomination: 'Monza', description: 'Autodromo', abbreviation: 'MNZ' },
        { id: 2, denomination: 'Spa', description: 'Francorchamps', abbreviation: 'SPA' },
      ];
      vi.mocked(CircuitService.findAll).mockResolvedValue(mockCircuits as any);

      const req = mockRequest();
      const res = mockResponse();

      await CircuitController.findAll(req, res);

      expect(CircuitService.findAll).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Find all circuits classes',
        data: mockCircuits,
      });
    });

    it('debe responder 500 ante un error inesperado', async () => {
      vi.mocked(CircuitService.findAll).mockRejectedValue(new Error('DB Error'));

      const req = mockRequest();
      const res = mockResponse();

      await CircuitController.findAll(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error interno del servidor',
      });
    });
  });

  describe('findOne (GET /:id)', () => {
    it('debe responder 200 con el circuito encontrado', async () => {
      const mockCircuit = { id: 1, denomination: 'Monza', description: 'Autodromo', abbreviation: 'MNZ' };
      vi.mocked(CircuitService.findOne).mockResolvedValue(mockCircuit as any);

      const req = mockRequest({ id: '1' });
      const res = mockResponse();

      await CircuitController.findOne(req, res);

      expect(CircuitService.findOne).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Circuit found: ',
        data: mockCircuit,
      });
    });

    it('debe responder 404 cuando el circuito no existe (resuelve el bug GET /:id)', async () => {
      vi.mocked(CircuitService.findOne).mockRejectedValue(new NotFoundError('Circuit not found'));

      const req = mockRequest({ id: '999' });
      const res = mockResponse();

      await CircuitController.findOne(req, res);

      expect(CircuitService.findOne).toHaveBeenCalledWith(999);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Recurso no encontrado',
      });
    });

    it('debe responder 500 ante un error inesperado del servidor', async () => {
      vi.mocked(CircuitService.findOne).mockRejectedValue(new Error('Connection lost'));

      const req = mockRequest({ id: '1' });
      const res = mockResponse();

      await CircuitController.findOne(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error interno del servidor',
      });
    });
  });

  describe('add (POST /)', () => {
    it('debe responder 201 con el circuito creado', async () => {
      const input = { denomination: 'Interlagos', description: 'Autodromo Jose Carlos Pace', abbreviation: 'INT' };
      const createdCircuit = { id: 5, ...input };
      vi.mocked(CircuitService.create).mockResolvedValue(createdCircuit as any);

      const req = mockRequest({}, input);
      const res = mockResponse();

      await CircuitController.add(req, res);

      expect(CircuitService.create).toHaveBeenCalledWith(input);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Circuit class created',
        data: createdCircuit,
      });
    });

    it('debe responder 500 ante un fallo al crear circuito', async () => {
      vi.mocked(CircuitService.create).mockRejectedValue(new Error('DB write failed'));

      const req = mockRequest({}, { denomination: 'Test' });
      const res = mockResponse();

      await CircuitController.add(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error interno del servidor',
      });
    });
  });

  describe('update (PUT / PATCH /:id)', () => {
    it('debe responder 200 con el circuito modificado', async () => {
      const updateData = { denomination: 'Monza New' };
      const updatedCircuit = { id: 1, denomination: 'Monza New', description: 'Desc', abbreviation: 'MNZ' };
      vi.mocked(CircuitService.update).mockResolvedValue(updatedCircuit as any);

      const req = mockRequest({ id: '1' }, { sanitizeInput: updateData });
      const res = mockResponse();

      await CircuitController.update(req, res);

      expect(CircuitService.update).toHaveBeenCalledWith(1, updateData);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Circuit class updated',
        data: updatedCircuit,
      });
    });

    it('debe responder 404 si el circuito a actualizar no existe', async () => {
      vi.mocked(CircuitService.update).mockRejectedValue(new NotFoundError('Circuit not found'));

      const req = mockRequest({ id: '999' }, { sanitizeInput: { denomination: 'Test' } });
      const res = mockResponse();

      await CircuitController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Recurso no encontrado',
      });
    });
  });

  describe('remove (DELETE /:id)', () => {
    it('debe responder 200 con el circuito eliminado', async () => {
      const removedCircuit = { id: 1, denomination: 'Monza', description: 'Desc', abbreviation: 'MNZ' };
      vi.mocked(CircuitService.remove).mockResolvedValue(removedCircuit as any);

      const req = mockRequest({ id: '1' });
      const res = mockResponse();

      await CircuitController.remove(req, res);

      expect(CircuitService.remove).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Circuit class deleted',
        data: removedCircuit,
      });
    });

    it('debe responder 404 si el circuito a eliminar no existe', async () => {
      vi.mocked(CircuitService.remove).mockRejectedValue(new NotFoundError('Circuit not found'));

      const req = mockRequest({ id: '999' });
      const res = mockResponse();

      await CircuitController.remove(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Recurso no encontrado',
      });
    });
  });
});
