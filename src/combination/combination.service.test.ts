import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundError } from '@mikro-orm/mysql';
import { CombinationService, CombinationInput } from './combination.service.js';
import { Combination } from './combination.entity.js';
import { Race } from '../race/race.entity.js';
import { CategoryVersion } from '../category-version/category-version.entity.js';
import { CircuitVersion } from '../circuit-version/circuit-version.entity.js';
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

describe('CombinationService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validPayload: CombinationInput = {
    dateFrom: '2026-06-01T10:00:00.000Z',
    dateTo: '2026-06-01T12:00:00.000Z',
    lapsNumber: 15,
    obligatoryStopsQuantity: 1,
    userType: 'common',
    raceIntervalMinutes: 60,
    categoryVersion: 1,
    circuitVersion: 2,
  };

  function mockMatchingSimulators(simulatorId = 10) {
    mockEm.findOne.mockImplementation((entity: any, filter: any) => {
      if (entity === CategoryVersion) {
        return Promise.resolve({ id: filter.id, simulator: { id: simulatorId } });
      }
      if (entity === CircuitVersion) {
        return Promise.resolve({ id: filter.id, simulator: { id: simulatorId } });
      }
      return Promise.resolve(null);
    });
  }

  describe('create (validaciones + generación de races)', () => {
    it('debe arrojar error claro si el payload viene incompleto (falta dateFrom)', async () => {
      const incomplete = { ...validPayload, dateFrom: '' };
      await expect(CombinationService.create(incomplete)).rejects.toThrow(ValidationError);
      await expect(CombinationService.create(incomplete)).rejects.toThrow('Campo requerido: dateFrom');
      expect(mockEm.create).not.toHaveBeenCalled();
    });

    it('debe arrojar error claro si falta categoryVersion o circuitVersion', async () => {
      const noCategory = { ...validPayload, categoryVersion: undefined as any };
      await expect(CombinationService.create(noCategory)).rejects.toThrow(ValidationError);
      await expect(CombinationService.create(noCategory)).rejects.toThrow('Campo requerido: categoryVersion');

      const noCircuit = { ...validPayload, circuitVersion: undefined as any };
      await expect(CombinationService.create(noCircuit)).rejects.toThrow(ValidationError);
      await expect(CombinationService.create(noCircuit)).rejects.toThrow('Campo requerido: circuitVersion');
      expect(mockEm.create).not.toHaveBeenCalled();
    });

    it('debe arrojar ValidationError si dateFrom >= dateTo', async () => {
      const invalidDates = {
        ...validPayload,
        dateFrom: '2026-06-01T12:00:00.000Z',
        dateTo: '2026-06-01T10:00:00.000Z',
      };

      await expect(CombinationService.create(invalidDates)).rejects.toThrow(ValidationError);
      await expect(CombinationService.create(invalidDates)).rejects.toThrow(
        'dateFrom must be earlier than dateTo.'
      );
      expect(mockEm.create).not.toHaveBeenCalled();
    });

    it('debe arrojar ValidationError si raceIntervalMinutes <= 0', async () => {
      const invalidInterval = {
        ...validPayload,
        raceIntervalMinutes: 0,
      };

      await expect(CombinationService.create(invalidInterval)).rejects.toThrow(ValidationError);
      await expect(CombinationService.create(invalidInterval)).rejects.toThrow(
        'raceIntervalMinutes must be greater than 0.'
      );
      expect(mockEm.create).not.toHaveBeenCalled();
    });

    it('debe arrojar ValidationError si CategoryVersion y CircuitVersion no pertenecen al mismo simulador', async () => {
      mockEm.findOne.mockImplementation((entity: any, filter: any) => {
        if (entity === CategoryVersion) {
          return Promise.resolve({ id: filter.id, simulator: { id: 1 } });
        }
        if (entity === CircuitVersion) {
          return Promise.resolve({ id: filter.id, simulator: { id: 2 } });
        }
        return Promise.resolve(null);
      });

      await expect(CombinationService.create(validPayload)).rejects.toThrow(ValidationError);
      await expect(CombinationService.create(validPayload)).rejects.toThrow(
        'CategoryVersion and CircuitVersion must belong to the same Simulator.'
      );
      expect(mockEm.create).not.toHaveBeenCalled();
    });

    it('debe crear exitosamente la combinación, vincular entidades asociadas y generar las carreras correspondientes', async () => {
      mockMatchingSimulators(5);

      const createdComb = { id: 100, ...validPayload };
      const populatedComb = {
        id: 100,
        ...validPayload,
        categoryVersion: { id: 1, category: { denomination: 'GT3' }, simulator: { id: 5 } },
        circuitVersion: { id: 2, circuit: { denomination: 'Monza' }, simulator: { id: 5 } },
      };

      mockEm.create.mockImplementation((entity: any, data: any) => {
        if (entity === Combination) return createdComb;
        if (entity === Race) return { id: Math.random(), ...data };
        return data;
      });
      mockEm.flush.mockResolvedValue(undefined);
      mockEm.findOneOrFail.mockResolvedValue(populatedComb);

      const result = await CombinationService.create(validPayload);

      // Verificamos que se creó la combinación
      expect(mockEm.create).toHaveBeenCalledWith(Combination, validPayload);

      // Verificamos que se generaron 3 carreras (10:00, 11:00, 12:00)
      const raceCalls = mockEm.create.mock.calls.filter((call) => call[0] === Race);
      expect(raceCalls).toHaveLength(3);

      // Verificamos vinculación y deadline de cada carrera generada
      const firstRace = raceCalls[0][1];
      expect(firstRace.combination).toBe(createdComb);
      expect(new Date(firstRace.raceDateTime).toISOString()).toBe('2026-06-01T10:00:00.000Z');
      expect(new Date(firstRace.registrationDeadline).toISOString()).toBe('2026-06-01T09:45:00.000Z');

      const secondRace = raceCalls[1][1];
      expect(new Date(secondRace.raceDateTime).toISOString()).toBe('2026-06-01T11:00:00.000Z');
      expect(new Date(secondRace.registrationDeadline).toISOString()).toBe('2026-06-01T10:45:00.000Z');

      const thirdRace = raceCalls[2][1];
      expect(new Date(thirdRace.raceDateTime).toISOString()).toBe('2026-06-01T12:00:00.000Z');
      expect(new Date(thirdRace.registrationDeadline).toISOString()).toBe('2026-06-01T11:45:00.000Z');

      // Se realizó flush (primero para la combinación, luego para las carreras)
      expect(mockEm.flush).toHaveBeenCalledTimes(2);

      // Re-obtiene con populate
      expect(mockEm.findOneOrFail).toHaveBeenCalledWith(
        Combination,
        { id: 100 },
        {
          populate: [
            'categoryVersion.category',
            'categoryVersion.simulator',
            'circuitVersion.circuit',
            'circuitVersion.simulator',
          ],
        }
      );

      expect(result).toEqual(populatedComb);
    });
  });

  describe('findAll', () => {
    it('debe listar todas las combinaciones con relaciones pobladas', async () => {
      const mockList = [{ id: 1 }, { id: 2 }];
      mockEm.find.mockResolvedValue(mockList);

      const result = await CombinationService.findAll();

      expect(mockEm.find).toHaveBeenCalledWith(
        Combination,
        {},
        {
          populate: [
            'categoryVersion.category',
            'categoryVersion.simulator',
            'circuitVersion.circuit',
            'circuitVersion.simulator',
          ],
        }
      );
      expect(result).toEqual(mockList);
    });
  });

  describe('findCurrent', () => {
    it('debe listar las combinaciones activas para la fecha actual', async () => {
      const now = new Date('2026-06-01T11:00:00.000Z');
      const mockList = [{ id: 1 }];
      mockEm.find.mockResolvedValue(mockList);

      const result = await CombinationService.findCurrent(now);

      expect(mockEm.find).toHaveBeenCalledWith(
        Combination,
        {
          dateFrom: { $lte: now },
          dateTo: { $gte: now },
        },
        expect.any(Object)
      );
      expect(result).toEqual(mockList);
    });
  });

  describe('findOne', () => {
    it('debe retornar la combinación encontrada con sus races pobladas', async () => {
      const mockComb = { id: 1, races: [{ id: 10 }] };
      mockEm.findOneOrFail.mockResolvedValue(mockComb);

      const result = await CombinationService.findOne(1);

      expect(mockEm.findOneOrFail).toHaveBeenCalledWith(
        Combination,
        { id: 1 },
        {
          populate: [
            'categoryVersion.category',
            'categoryVersion.simulator',
            'circuitVersion.circuit',
            'circuitVersion.simulator',
            'races',
          ],
        }
      );
      expect(result).toEqual(mockComb);
    });

    it('debe lanzar NotFoundError si la combinación no existe', async () => {
      mockEm.findOneOrFail.mockRejectedValue(new NotFoundError('Combination not found'));

      await expect(CombinationService.findOne(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('debe actualizar una combinación existente', async () => {
      const existing = {
        id: 1,
        dateFrom: new Date('2026-06-01T10:00:00.000Z'),
        dateTo: new Date('2026-06-01T12:00:00.000Z'),
        lapsNumber: 15,
        raceIntervalMinutes: 60,
      };
      mockEm.findOneOrFail
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ ...existing, lapsNumber: 20 });
      mockEm.assign.mockImplementation((ent: any, data: any) => Object.assign(ent, data));
      mockEm.flush.mockResolvedValue(undefined);

      const result = await CombinationService.update(1, { lapsNumber: 20 });

      expect(mockEm.assign).toHaveBeenCalledWith(existing, { lapsNumber: 20 });
      expect(result.lapsNumber).toBe(20);
    });

    it('debe arrojar ValidationError si se intenta modificar dateFrom', async () => {
      const existing = {
        id: 1,
        dateFrom: new Date('2026-06-01T10:00:00.000Z'),
        dateTo: new Date('2026-06-01T12:00:00.000Z'),
      };
      mockEm.findOneOrFail.mockResolvedValue(existing);

      await expect(
        CombinationService.update(1, { dateFrom: '2026-06-01T08:00:00.000Z' })
      ).rejects.toThrow('No se puede modificar la fecha de inicio (dateFrom) de una combinación existente.');
    });

    it('debe generar carreras adicionales si se extiende dateTo', async () => {
      const existing = {
        id: 1,
        dateFrom: new Date('2026-06-01T10:00:00.000Z'),
        dateTo: new Date('2026-06-01T12:00:00.000Z'),
        raceIntervalMinutes: 60,
      };
      mockEm.findOneOrFail
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ ...existing, dateTo: new Date('2026-06-01T14:00:00.000Z') });
      mockEm.assign.mockImplementation((ent: any, data: any) => Object.assign(ent, data));
      mockEm.create.mockReturnValue({ id: 10 });
      mockEm.flush.mockResolvedValue(undefined);

      await CombinationService.update(1, { dateTo: '2026-06-01T14:00:00.000Z' });

      // Se generan 2 carreras nuevas (13:00 y 14:00)
      const raceCalls = mockEm.create.mock.calls.filter((c) => c[0] === Race);
      expect(raceCalls).toHaveLength(2);
    });

    it('debe arrojar NotFoundError si el id a actualizar no existe', async () => {
      mockEm.findOneOrFail.mockRejectedValue(new NotFoundError('Combination not found'));

      await expect(CombinationService.update(999, { lapsNumber: 10 })).rejects.toThrow(NotFoundError);
    });
  });

  describe('remove', () => {
    it('debe eliminar la combinación y hacer flush', async () => {
      const existing = { id: 1 };
      mockEm.findOneOrFail.mockResolvedValue(existing);
      mockEm.removeAndFlush.mockResolvedValue(undefined);

      const result = await CombinationService.remove(1);

      expect(mockEm.findOneOrFail).toHaveBeenCalledWith(Combination, { id: 1 });
      expect(mockEm.removeAndFlush).toHaveBeenCalledWith(existing);
      expect(result).toEqual(existing);
    });

    it('debe arrojar NotFoundError si la combinación a eliminar no existe', async () => {
      mockEm.findOneOrFail.mockRejectedValue(new NotFoundError('Combination not found'));

      await expect(CombinationService.remove(999)).rejects.toThrow(NotFoundError);
      expect(mockEm.removeAndFlush).not.toHaveBeenCalled();
    });
  });
});
