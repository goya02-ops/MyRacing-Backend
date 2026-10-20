import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundError } from '@mikro-orm/mysql';
import { RaceService, RaceInput } from './race.service.js';
import { Race } from './race.entity.js';
import { Combination } from '../combination/combination.entity.js';
import { ValidationError } from '../shared/validation-error.js';

const { mockEm } = vi.hoisted(() => ({
  mockEm: {
    find: vi.fn(),
    findOne: vi.fn(),
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

describe('RaceService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validCombination = {
    id: 5,
    dateFrom: new Date('2026-06-01T00:00:00.000Z'),
    dateTo: new Date('2026-06-01T23:59:59.000Z'),
  };

  const validPayload: RaceInput = {
    raceDateTime: '2026-06-01T15:00:00.000Z',
    registrationDeadline: '2026-06-01T14:45:00.000Z',
    combination: 5,
    description: 'Sprint Race',
  };

  describe('create (validación de fechas y await)', () => {
    it('debe crear exitosamente una carrera cuando las fechas son válidas', async () => {
      mockEm.findOneOrFail.mockImplementation((entity: any, filter: any) => {
        if (entity === Combination) return Promise.resolve(validCombination);
        if (entity === Race) return Promise.resolve({ id: 10, ...validPayload });
        return Promise.resolve(null);
      });

      const createdRace = { id: 10, ...validPayload };
      mockEm.create.mockReturnValue(createdRace);
      mockEm.flush.mockResolvedValue(undefined);

      const result = await RaceService.create(validPayload);

      expect(mockEm.create).toHaveBeenCalledWith(Race, validPayload);
      expect(mockEm.flush).toHaveBeenCalled();
      expect(result).toEqual(createdRace);
    });

    it('debe arrojar ValidationError si faltan campos obligatorios', async () => {
      const incomplete = { ...validPayload, raceDateTime: '' };
      await expect(RaceService.create(incomplete)).rejects.toThrow(ValidationError);
      await expect(RaceService.create(incomplete)).rejects.toThrow('Campo requerido: raceDateTime');
      expect(mockEm.create).not.toHaveBeenCalled();
    });

    it('debe arrojar ValidationError si combination no es un ID válido', async () => {
      const invalidComb = { ...validPayload, combination: 'invalid-id' };
      await expect(RaceService.create(invalidComb)).rejects.toThrow(ValidationError);
      await expect(RaceService.create(invalidComb)).rejects.toThrow('ID de combinación inválido');
      expect(mockEm.create).not.toHaveBeenCalled();
    });

    it('debe arrojar ValidationError si registrationDeadline es posterior o igual a raceDateTime', async () => {
      mockEm.findOneOrFail.mockImplementation((entity: any) => {
        if (entity === Combination) return Promise.resolve(validCombination);
        return Promise.resolve(null);
      });

      const invalidDates = {
        ...validPayload,
        raceDateTime: '2026-06-01T14:00:00.000Z',
        registrationDeadline: '2026-06-01T14:30:00.000Z', // posterior
      };

      await expect(RaceService.create(invalidDates)).rejects.toThrow(ValidationError);
      await expect(RaceService.create(invalidDates)).rejects.toThrow(
        'registrationDeadline debe ser anterior a raceDateTime'
      );
      expect(mockEm.create).not.toHaveBeenCalled();
    });

    it('debe arrojar ValidationError si las fechas quedan fuera del rango de la combinación', async () => {
      mockEm.findOneOrFail.mockImplementation((entity: any) => {
        if (entity === Combination) return Promise.resolve(validCombination);
        return Promise.resolve(null);
      });

      const outOfRange = {
        ...validPayload,
        raceDateTime: '2026-06-02T10:00:00.000Z', // fuera del dateTo (06-01)
        registrationDeadline: '2026-06-02T09:45:00.000Z',
      };

      await expect(RaceService.create(outOfRange)).rejects.toThrow(ValidationError);
      await expect(RaceService.create(outOfRange)).rejects.toThrow(
        'registrationDeadline debe ser anterior a raceDateTime'
      );
    });
  });

  describe('update (validación de entidad fusionada y await)', () => {
    it('debe actualizar exitosamente la carrera', async () => {
      const existing = {
        id: 10,
        raceDateTime: new Date('2026-06-01T15:00:00.000Z'),
        registrationDeadline: new Date('2026-06-01T14:45:00.000Z'),
        combination: validCombination,
      };

      mockEm.findOneOrFail.mockImplementation((entity: any, filter: any) => {
        if (entity === Race && filter.id === 10) return Promise.resolve(existing);
        if (entity === Combination) return Promise.resolve(validCombination);
        return Promise.resolve(existing);
      });

      mockEm.assign.mockImplementation((ent: any, data: any) => Object.assign(ent, data));
      mockEm.flush.mockResolvedValue(undefined);

      const result = await RaceService.update(10, { description: 'Updated Sprint' });

      expect(mockEm.assign).toHaveBeenCalledWith(existing, { description: 'Updated Sprint' });
      expect(mockEm.flush).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('debe validar la entidad fusionada cuando se envía solo registrationDeadline invertida (expone await faltante)', async () => {
      const existing = {
        id: 10,
        raceDateTime: new Date('2026-06-01T15:00:00.000Z'),
        registrationDeadline: new Date('2026-06-01T14:45:00.000Z'),
        combination: validCombination,
      };

      mockEm.findOneOrFail.mockImplementation((entity: any) => {
        if (entity === Race) return Promise.resolve(existing);
        if (entity === Combination) return Promise.resolve(validCombination);
        return Promise.resolve(null);
      });

      // Solo enviamos registrationDeadline: 16:00, que es posterior al raceDateTime existente (15:00)
      const patchData = { registrationDeadline: '2026-06-01T16:00:00.000Z' };

      await expect(RaceService.update(10, patchData)).rejects.toThrow(ValidationError);
      await expect(RaceService.update(10, patchData)).rejects.toThrow(
        'registrationDeadline debe ser anterior a raceDateTime'
      );
      expect(mockEm.flush).not.toHaveBeenCalled();
    });

    it('debe arrojar ValidationError si id es inválido', async () => {
      await expect(RaceService.update(-1, {})).rejects.toThrow(ValidationError);
      await expect(RaceService.update(-1, {})).rejects.toThrow('ID inválido');
    });

    it('debe arrojar NotFoundError si la carrera a actualizar no existe', async () => {
      mockEm.findOneOrFail.mockRejectedValue(new NotFoundError('Race not found'));

      await expect(RaceService.update(999, { description: 'Test' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('findOne', () => {
    it('debe retornar la carrera con combination y raceUsers poblados', async () => {
      const mockRace = { id: 10, ...validPayload, raceUsers: [] };
      mockEm.findOneOrFail.mockResolvedValue(mockRace);

      const result = await RaceService.findOne(10);

      expect(mockEm.findOneOrFail).toHaveBeenCalledWith(
        Race,
        { id: 10 },
        { populate: ['combination', 'raceUsers'] }
      );
      expect(result).toEqual(mockRace);
    });

    it('debe arrojar NotFoundError si la carrera no existe', async () => {
      mockEm.findOneOrFail.mockRejectedValue(new NotFoundError('Race not found'));

      await expect(RaceService.findOne(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('findCurrentByCombination', () => {
    it('debe retornar previousRaces y nextRaces para la combinación', async () => {
      const prev = [{ id: 1 }];
      const next = [{ id: 2 }];
      mockEm.find
        .mockResolvedValueOnce(prev)
        .mockResolvedValueOnce(next);

      const result = await RaceService.findCurrentByCombination('5', '5', '5');

      expect(result.limitPrev).toBe(5);
      expect(result.limitNext).toBe(5);
      expect(result.previousRaces).toEqual(prev);
      expect(result.nextRaces).toEqual(next);
    });

    it('debe arrojar ValidationError si el ID de combinación es inválido', async () => {
      await expect(RaceService.findCurrentByCombination(5, 5, 'abc')).rejects.toThrow(
        'ID de combinación inválido'
      );
    });
  });

  describe('remove', () => {
    it('debe eliminar la carrera y hacer flush', async () => {
      const mockRace = { id: 10 };
      mockEm.findOneOrFail.mockResolvedValue(mockRace);
      mockEm.removeAndFlush.mockResolvedValue(undefined);

      const result = await RaceService.remove(10);

      expect(mockEm.findOneOrFail).toHaveBeenCalledWith(Race, { id: 10 });
      expect(mockEm.removeAndFlush).toHaveBeenCalledWith(mockRace);
      expect(result).toEqual(mockRace);
    });

    it('debe arrojar NotFoundError si la carrera a eliminar no existe', async () => {
      mockEm.findOneOrFail.mockRejectedValue(new NotFoundError('Race not found'));

      await expect(RaceService.remove(999)).rejects.toThrow(NotFoundError);
    });
  });
});
