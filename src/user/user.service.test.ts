import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import { NotFoundError } from '@mikro-orm/mysql';
import { UserService, UserInput } from './user.service.js';
import { User, UserType } from './user.entity.js';
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

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

describe('UserService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validPayload: UserInput = {
    userName: 'johndoe',
    realName: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    type: UserType.COMMON,
  };

  describe('create (validaciones, duplicados y bcrypt)', () => {
    it('debe crear exitosamente un usuario encriptando la contraseña con bcrypt', async () => {
      mockEm.findOne.mockResolvedValue(null); // Sin duplicados
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed_pw' as never);

      const createdUser = { id: 1, ...validPayload, password: 'hashed_pw' };
      mockEm.create.mockReturnValue(createdUser);
      mockEm.flush.mockResolvedValue(undefined);

      const result = await UserService.create(validPayload);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockEm.create).toHaveBeenCalledWith(User, {
        ...validPayload,
        password: 'hashed_pw',
      });
      expect(mockEm.flush).toHaveBeenCalled();
      expect(result).toEqual(createdUser);
    });

    it('debe arrojar ValidationError si falta un dato obligatorio', async () => {
      const incomplete = { ...validPayload, userName: '' };
      await expect(UserService.create(incomplete)).rejects.toThrow(ValidationError);
      await expect(UserService.create(incomplete)).rejects.toThrow('Campo requerido: userName');
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockEm.create).not.toHaveBeenCalled();
    });

    it('debe arrojar ValidationError si el email tiene formato inválido', async () => {
      const invalidEmail = { ...validPayload, email: 'email-invalido' };
      await expect(UserService.create(invalidEmail)).rejects.toThrow(ValidationError);
      await expect(UserService.create(invalidEmail)).rejects.toThrow('El formato del email es inválido');
      expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    it('debe arrojar ValidationError si el userName tiene menos de 3 caracteres', async () => {
      const shortUser = { ...validPayload, userName: 'ab' };
      await expect(UserService.create(shortUser)).rejects.toThrow(ValidationError);
      await expect(UserService.create(shortUser)).rejects.toThrow('userName debe tener al menos 3 caracteres');
      expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    it('debe arrojar ValidationError si la contraseña es demasiado corta (< 6 caracteres)', async () => {
      const shortPw = { ...validPayload, password: '123' };
      await expect(UserService.create(shortPw)).rejects.toThrow(ValidationError);
      await expect(UserService.create(shortPw)).rejects.toThrow('La contraseña debe tener al menos 6 caracteres');
      expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    it('debe arrojar ValidationError si el email o username ya está registrado (duplicado)', async () => {
      mockEm.findOne.mockResolvedValue({ id: 99, email: validPayload.email }); // Ya existe

      await expect(UserService.create(validPayload)).rejects.toThrow(ValidationError);
      await expect(UserService.create(validPayload)).rejects.toThrow(
        'El email o nombre de usuario ya está registrado'
      );
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockEm.create).not.toHaveBeenCalled();
      expect(mockEm.flush).not.toHaveBeenCalled();
    });
  });

  describe('update (validaciones en actualización)', () => {
    it('debe actualizar los datos exitosamente', async () => {
      const existingUser = { id: 1, ...validPayload };
      mockEm.findOneOrFail.mockResolvedValue(existingUser);
      mockEm.findOne.mockResolvedValue(null);
      mockEm.assign.mockImplementation((ent: any, data: any) => Object.assign(ent, data));
      mockEm.flush.mockResolvedValue(undefined);

      const result = await UserService.update(1, { realName: 'John Updated' });

      expect(mockEm.assign).toHaveBeenCalledWith(existingUser, { realName: 'John Updated' });
      expect(mockEm.flush).toHaveBeenCalled();
      expect(result.realName).toBe('John Updated');
    });

    it('debe arrojar ValidationError si se actualiza con un email duplicado', async () => {
      const existingUser = { id: 1, ...validPayload };
      mockEm.findOneOrFail.mockResolvedValue(existingUser);
      mockEm.findOne.mockResolvedValue({ id: 2, email: 'other@example.com' }); // Pertenece a otro usuario

      await expect(
        UserService.update(1, { email: 'other@example.com' })
      ).rejects.toThrow('El email o nombre de usuario ya está registrado');
      expect(mockEm.flush).not.toHaveBeenCalled();
    });

    it('debe arrojar ValidationError si se actualiza con una contraseña menor a 6 caracteres', async () => {
      const existingUser = { id: 1, ...validPayload };
      mockEm.findOneOrFail.mockResolvedValue(existingUser);

      await expect(
        UserService.update(1, { password: '123' })
      ).rejects.toThrow('La contraseña debe tener al menos 6 caracteres');
    });

    it('debe hashear la contraseña con bcrypt si se actualiza con una válida', async () => {
      const existingUser = { id: 1, ...validPayload };
      mockEm.findOneOrFail.mockResolvedValue(existingUser);
      vi.mocked(bcrypt.hash).mockResolvedValue('new_hashed_pw' as never);
      mockEm.assign.mockImplementation((ent: any, data: any) => Object.assign(ent, data));
      mockEm.flush.mockResolvedValue(undefined);

      await UserService.update(1, { password: 'newpassword123' });

      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
      expect(mockEm.assign).toHaveBeenCalledWith(existingUser, {
        password: 'new_hashed_pw',
      });
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it('debe arrojar NotFoundError si el usuario a actualizar no existe', async () => {
      mockEm.findOneOrFail.mockRejectedValue(new NotFoundError('User not found'));

      await expect(UserService.update(999, { realName: 'X' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('findAll', () => {
    it('debe retornar todos los usuarios', async () => {
      const users = [{ id: 1 }, { id: 2 }];
      mockEm.find.mockResolvedValue(users);

      const result = await UserService.findAll();

      expect(mockEm.find).toHaveBeenCalledWith(User, {});
      expect(result).toEqual(users);
    });
  });

  describe('findOne', () => {
    it('debe retornar un usuario por ID', async () => {
      const user = { id: 1, userName: 'jdoe' };
      mockEm.findOneOrFail.mockResolvedValue(user);

      const result = await UserService.findOne(1);

      expect(mockEm.findOneOrFail).toHaveBeenCalledWith(User, { id: 1 });
      expect(result).toEqual(user);
    });

    it('debe arrojar NotFoundError si el usuario no existe', async () => {
      mockEm.findOneOrFail.mockRejectedValue(new NotFoundError('User not found'));

      await expect(UserService.findOne(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('remove', () => {
    it('debe eliminar el usuario y hacer flush', async () => {
      const user = { id: 1, userName: 'jdoe' };
      mockEm.findOneOrFail.mockResolvedValue(user);
      mockEm.removeAndFlush.mockResolvedValue(undefined);

      const result = await UserService.remove(1);

      expect(mockEm.findOneOrFail).toHaveBeenCalledWith(User, { id: 1 });
      expect(mockEm.removeAndFlush).toHaveBeenCalledWith(user);
      expect(result).toEqual(user);
    });

    it('debe arrojar NotFoundError si el usuario a eliminar no existe', async () => {
      mockEm.findOneOrFail.mockRejectedValue(new NotFoundError('User not found'));

      await expect(UserService.remove(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('findProfile y updateProfile', () => {
    it('updateProfile no debe permitir modificar el type (rol)', async () => {
      const user = { id: 1, type: UserType.COMMON, realName: 'Old' };
      mockEm.findOneOrFail.mockResolvedValue(user);
      mockEm.assign.mockImplementation((ent: any, data: any) => Object.assign(ent, data));
      mockEm.flush.mockResolvedValue(undefined);

      await UserService.updateProfile(1, {
        realName: 'New Name',
        type: UserType.ADMIN,
      } as any);

      // Verificamos que type no se pasó a assign
      expect(mockEm.assign).toHaveBeenCalledWith(user, { realName: 'New Name' });
    });
  });
});
