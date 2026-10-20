import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundError } from '@mikro-orm/mysql';
import { CircuitService } from './circuit.service.js';
import { Circuit } from './circuit.entity.js';

const { mockEm } = vi.hoisted(() => ({
  mockEm: {
    find: vi.fn(),
    findOneOrFail: vi.fn(),
    create: vi.fn(),
    flush: vi.fn(),
    assign: vi.fn(),
    removeAndFlush: vi.fn(),
  },
}));

vi.mock('../shared/orm.js', () => ({
  orm: {
    em: mockEm,
  },
}));

describe('CircuitService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findAll', () => {
    it('debe devolver todos los circuitos con sus versiones pobladas', async () => {
      const mockCircuits = [
        { id: 1, denomination: 'Monza', description: 'Autodromo Nazionale Monza', abbreviation: 'MNZ' },
        { id: 2, denomination: 'Spa', description: 'Circuit de Spa-Francorchamps', abbreviation: 'SPA' },
      ];
      mockEm.find.mockResolvedValue(mockCircuits);

      const result = await CircuitService.findAll();

      expect(mockEm.find).toHaveBeenCalledWith(Circuit, {}, { populate: ['circuitVersions'] });
      expect(result).toEqual(mockCircuits);
    });
  });

  describe('findOne', () => {
    it('debe devolver un circuito por ID', async () => {
      const mockCircuit = { id: 1, denomination: 'Monza', description: 'Autodromo', abbreviation: 'MNZ' };
      mockEm.findOneOrFail.mockResolvedValue(mockCircuit);

      const result = await CircuitService.findOne(1);

      expect(mockEm.findOneOrFail).toHaveBeenCalledWith(Circuit, { id: 1 }, { populate: ['circuitVersions'] });
      expect(result).toEqual(mockCircuit);
    });

    it('debe lanzar NotFoundError cuando el circuito no existe', async () => {
      mockEm.findOneOrFail.mockRejectedValue(new NotFoundError('Circuit not found'));

      await expect(CircuitService.findOne(999)).rejects.toThrow(NotFoundError);
      expect(mockEm.findOneOrFail).toHaveBeenCalledWith(Circuit, { id: 999 }, { populate: ['circuitVersions'] });
    });
  });

  describe('create', () => {
    it('debe crear y persistir un nuevo circuito', async () => {
      const input = {
        denomination: 'Silverstone',
        description: 'Silverstone Circuit',
        abbreviation: 'SIL',
      };
      const createdCircuit = { id: 3, ...input };
      mockEm.create.mockReturnValue(createdCircuit);
      mockEm.flush.mockResolvedValue(undefined);

      const result = await CircuitService.create(input);

      expect(mockEm.create).toHaveBeenCalledWith(Circuit, input);
      expect(mockEm.flush).toHaveBeenCalled();
      expect(result).toEqual(createdCircuit);
    });
  });

  describe('update', () => {
    it('debe actualizar y persistir los cambios de un circuito existente', async () => {
      const existingCircuit = { id: 1, denomination: 'Monza Old', description: 'Autodromo', abbreviation: 'MNZ' };
      const updateData = { denomination: 'Monza Updated' };

      mockEm.findOneOrFail.mockResolvedValue(existingCircuit);
      mockEm.assign.mockImplementation((entity: any, data: any) => Object.assign(entity, data));
      mockEm.flush.mockResolvedValue(undefined);

      const result = await CircuitService.update(1, updateData);

      expect(mockEm.findOneOrFail).toHaveBeenCalledWith(Circuit, { id: 1 });
      expect(mockEm.assign).toHaveBeenCalledWith(existingCircuit, updateData);
      expect(mockEm.flush).toHaveBeenCalled();
      expect(result.denomination).toBe('Monza Updated');
    });

    it('debe lanzar NotFoundError si el circuito a actualizar no existe', async () => {
      mockEm.findOneOrFail.mockRejectedValue(new NotFoundError('Circuit not found'));

      await expect(CircuitService.update(999, { denomination: 'Test' })).rejects.toThrow(NotFoundError);
      expect(mockEm.flush).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('debe eliminar y hacer flush de un circuito existente', async () => {
      const existingCircuit = { id: 1, denomination: 'Monza', description: 'Autodromo', abbreviation: 'MNZ' };
      mockEm.findOneOrFail.mockResolvedValue(existingCircuit);
      mockEm.removeAndFlush.mockResolvedValue(undefined);

      const result = await CircuitService.remove(1);

      expect(mockEm.findOneOrFail).toHaveBeenCalledWith(Circuit, { id: 1 });
      expect(mockEm.removeAndFlush).toHaveBeenCalledWith(existingCircuit);
      expect(result).toEqual(existingCircuit);
    });

    it('debe lanzar NotFoundError si el circuito a eliminar no existe', async () => {
      mockEm.findOneOrFail.mockRejectedValue(new NotFoundError('Circuit not found'));

      await expect(CircuitService.remove(999)).rejects.toThrow(NotFoundError);
      expect(mockEm.removeAndFlush).not.toHaveBeenCalled();
    });
  });
});
