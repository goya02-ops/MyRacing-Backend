import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  addRaceUser,
  getAllRaceUsers,
  getOneRaceUser,
  updateRaceUser,
  removeRaceUser,
  getRaceUsersByUser,
} from './race-user.service.js';
import { RaceUser } from './race-user.entity.js';
import { User } from '../user/user.entity.js';
import { Race } from '../race/race.entity.js';

const { mockEm } = vi.hoisted(() => ({
  mockEm: {
    find: vi.fn(),
    findOne: vi.fn(),
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

describe('RaceUserService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const fakeUser = {
    id: 1,
    userName: 'jdoe',
    realName: 'John Doe',
    email: 'jdoe@example.com',
    password: 'secret_hash',
    type: 'common',
  };

  const fakeRace = {
    id: 10,
    raceDateTime: new Date('2026-06-01T10:00:00Z'),
    registrationDeadline: new Date('2026-06-01T09:45:00Z'),
    combination: { id: 5 },
  };

  const fakeRaceUser = {
    id: 100,
    startPosition: 1,
    finishPosition: 1,
    registrationDateTime: new Date('2026-05-30T10:00:00Z'),
    user: fakeUser,
    race: fakeRace,
  };

  describe('addRaceUser (auto-inscripción, 409 y 403)', () => {
    it('debe permitir auto-inscripción (un usuario logueado se anota a sí mismo)', async () => {
      mockEm.findOne.mockImplementation((entity: any, filter: any) => {
        if (entity === User) return Promise.resolve(fakeUser);
        if (entity === Race) return Promise.resolve(fakeRace);
        if (entity === RaceUser) return Promise.resolve(null); // No está inscripto previamente
        return Promise.resolve(null);
      });

      mockEm.create.mockReturnValue(fakeRaceUser);
      mockEm.flush.mockResolvedValue(undefined);

      const result = await addRaceUser({ userId: 1, raceId: 10 }, 1, false);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe(100);
      expect(result.data?.user.id).toBe(1);
      expect(result.data?.race.id).toBe(10);
      expect(mockEm.create).toHaveBeenCalledWith(RaceUser, {
        user: fakeUser,
        race: fakeRace,
        registrationDateTime: expect.any(Date),
      });
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it('debe arrojar error 409 si el usuario ya está inscripto en esa carrera', async () => {
      mockEm.findOne.mockImplementation((entity: any, filter: any) => {
        if (entity === User) return Promise.resolve(fakeUser);
        if (entity === Race) return Promise.resolve(fakeRace);
        if (entity === RaceUser) return Promise.resolve(fakeRaceUser); // Ya está inscripto
        return Promise.resolve(null);
      });

      const result = await addRaceUser({ userId: 1, raceId: 10 }, 1, false);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User already registered for this race');
      expect(mockEm.create).not.toHaveBeenCalled();
      expect(mockEm.flush).not.toHaveBeenCalled();
    });

    it('debe bloquear la acción (403) si un usuario común intenta inscribir a otro ID de usuario', async () => {
      // requestingUserId = 1, pero intenta inscribir a targetUserId = 2 siendo común (isAdmin = false)
      const result = await addRaceUser({ userId: 2, raceId: 10 }, 1, false);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized to enroll another user');
      expect(mockEm.findOne).not.toHaveBeenCalled();
      expect(mockEm.create).not.toHaveBeenCalled();
      expect(mockEm.flush).not.toHaveBeenCalled();
    });

    it('debe permitir que un administrador inscriba a otro ID de usuario', async () => {
      const otherUser = { ...fakeUser, id: 2, userName: 'other' };
      mockEm.findOne.mockImplementation((entity: any, filter: any) => {
        if (entity === User) return Promise.resolve(otherUser);
        if (entity === Race) return Promise.resolve(fakeRace);
        if (entity === RaceUser) return Promise.resolve(null);
        return Promise.resolve(null);
      });

      const createdRaceUser = { ...fakeRaceUser, user: otherUser };
      mockEm.create.mockReturnValue(createdRaceUser);
      mockEm.flush.mockResolvedValue(undefined);

      // requestingUserId = 99 (admin), targetUserId = 2, isAdmin = true
      const result = await addRaceUser({ userId: 2, raceId: 10 }, 99, true);

      expect(result.success).toBe(true);
      expect(result.data?.user.id).toBe(2);
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it('debe fallar si userId o raceId son inválidos o faltan', async () => {
      const result = await addRaceUser({ userId: NaN as any, raceId: 10 });
      expect(result.success).toBe(false);
      expect(result.error).toBe('User ID and Race ID are required');
    });

    it('debe fallar si el usuario no existe', async () => {
      mockEm.findOne.mockResolvedValue(null);

      const result = await addRaceUser({ userId: 999, raceId: 10 }, 999, false);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('debe fallar si la carrera no existe', async () => {
      mockEm.findOne.mockImplementation((entity: any) => {
        if (entity === User) return Promise.resolve(fakeUser);
        return Promise.resolve(null);
      });

      const result = await addRaceUser({ userId: 1, raceId: 999 }, 1, false);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Race not found');
    });
  });

  describe('getAllRaceUsers', () => {
    it('debe listar todas las inscripciones pobladas', async () => {
      mockEm.find.mockResolvedValue([fakeRaceUser]);

      const result = await getAllRaceUsers();

      expect(mockEm.find).toHaveBeenCalledWith(RaceUser, {}, { populate: ['race', 'user'] });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(100);
    });
  });

  describe('getOneRaceUser', () => {
    it('debe obtener una inscripción por ID', async () => {
      mockEm.findOne.mockResolvedValue(fakeRaceUser);

      const result = await getOneRaceUser(100);

      expect(mockEm.findOne).toHaveBeenCalledWith(RaceUser, { id: 100 }, { populate: ['race', 'user'] });
      expect(result?.id).toBe(100);
    });

    it('debe retornar null si la inscripción no existe', async () => {
      mockEm.findOne.mockResolvedValue(null);

      const result = await getOneRaceUser(999);

      expect(result).toBeNull();
    });
  });

  describe('getRaceUsersByUser', () => {
    it('debe retornar las inscripciones de un usuario específico', async () => {
      mockEm.find.mockResolvedValue([fakeRaceUser]);

      const result = await getRaceUsersByUser(1);

      expect(mockEm.find).toHaveBeenCalledWith(RaceUser, { user: 1 }, { populate: ['race', 'user'] });
      expect(result).toHaveLength(1);
    });
  });

  describe('updateRaceUser', () => {
    it('debe actualizar los datos de la inscripción', async () => {
      mockEm.findOne.mockResolvedValue(fakeRaceUser);
      mockEm.assign.mockImplementation((ent: any, data: any) => Object.assign(ent, data));
      mockEm.flush.mockResolvedValue(undefined);

      const result = await updateRaceUser(100, { finishPosition: 2 });

      expect(result.success).toBe(true);
      expect(mockEm.assign).toHaveBeenCalledWith(fakeRaceUser, { finishPosition: 2 });
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it('debe retornar error si la inscripción a actualizar no existe', async () => {
      mockEm.findOne.mockResolvedValue(null);

      const result = await updateRaceUser(999, { finishPosition: 2 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('RaceUser not found');
    });
  });

  describe('removeRaceUser', () => {
    it('debe permitir que un usuario común elimine su propia inscripción', async () => {
      mockEm.findOne.mockResolvedValue(fakeRaceUser);
      mockEm.removeAndFlush.mockResolvedValue(undefined);

      const result = await removeRaceUser(100, 1, false);

      expect(result.success).toBe(true);
      expect(mockEm.removeAndFlush).toHaveBeenCalledWith(fakeRaceUser);
    });

    it('debe denegar (error de autorización) si un usuario común intenta eliminar la inscripción de otro', async () => {
      mockEm.findOne.mockResolvedValue(fakeRaceUser); // user.id es 1

      // requestingUserId = 2, isAdmin = false
      const result = await removeRaceUser(100, 2, false);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized to delete this race user');
      expect(mockEm.removeAndFlush).not.toHaveBeenCalled();
    });

    it('debe permitir que un admin elimine cualquier inscripción', async () => {
      mockEm.findOne.mockResolvedValue(fakeRaceUser);
      mockEm.removeAndFlush.mockResolvedValue(undefined);

      const result = await removeRaceUser(100, 999, true);

      expect(result.success).toBe(true);
      expect(mockEm.removeAndFlush).toHaveBeenCalledWith(fakeRaceUser);
    });

    it('debe fallar si la inscripción a eliminar no existe', async () => {
      mockEm.findOne.mockResolvedValue(null);

      const result = await removeRaceUser(999, 1, false);

      expect(result.success).toBe(false);
      expect(result.error).toBe('RaceUser not found');
      expect(mockEm.removeAndFlush).not.toHaveBeenCalled();
    });
  });
});
