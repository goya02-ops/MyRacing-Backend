import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const { mockEm } = vi.hoisted(() => ({
  mockEm: {
    findOne: vi.fn(),
    create: vi.fn(),
    flush: vi.fn(),
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

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
    decode: vi.fn(),
  },
}));

vi.mock('../shared/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { AuthService } from './auth.service.js';
import { TokenService } from './token.service.js';
import { User, UserType } from '../user/user.entity.js';

describe('AuthService Unit Tests', () => {
  const fakeUser: Partial<User> = {
    id: 1,
    userName: 'johndoe',
    realName: 'John Doe',
    email: 'john@example.com',
    password: 'hashed_password_123',
    type: UserType.COMMON,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockEm.findOne.mockReset();
    mockEm.create.mockReset();
    mockEm.flush.mockReset();
    vi.mocked(bcrypt.hash).mockReset();
    vi.mocked(bcrypt.compare).mockReset();
    vi.mocked(jwt.sign).mockReset();
    vi.mocked(jwt.verify).mockReset();
  });

  describe('register', () => {
    it('debe registrar un usuario exitosamente, encriptar la contraseña y retornar tokens', async () => {
      mockEm.findOne.mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed_password_123' as never);
      mockEm.create.mockReturnValue({ ...fakeUser } as User);
      mockEm.flush.mockResolvedValue(undefined as never);
      vi.mocked(jwt.sign).mockReturnValue('mock_jwt_token' as never);

      const result = await AuthService.register({
        userName: 'johndoe',
        realName: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Usuario registrado exitosamente');
      expect(result.accessToken).toBe('mock_jwt_token');
      expect(result.refreshToken).toBe('mock_jwt_token');
      expect(result.user).toBeDefined();
      expect((result.user as any)?.password).toBeUndefined();
      expect(result.user?.userName).toBe('johndoe');

      // Verifica que se llamó a bcrypt.hash para encriptar la password
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);

      // Verifica que se guardó el usuario en la base de datos
      expect(mockEm.create).toHaveBeenCalledWith(
        User,
        expect.objectContaining({
          userName: 'johndoe',
          realName: 'John Doe',
          email: 'john@example.com',
          password: 'hashed_password_123',
        })
      );
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it('debe fallar si el email o nombre de usuario ya está registrado', async () => {
      mockEm.findOne.mockResolvedValue({ id: 2, email: 'john@example.com' });

      const result = await AuthService.register({
        userName: 'johndoe',
        realName: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('El email o nombre de usuario ya está registrado');
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockEm.create).not.toHaveBeenCalled();
      expect(mockEm.flush).not.toHaveBeenCalled();
    });

    it('debe fallar si faltan campos obligatorios', async () => {
      const result = await AuthService.register({
        userName: '',
        realName: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Campo requerido: userName');
    });

    it('debe fallar si el formato del email es inválido', async () => {
      const result = await AuthService.register({
        userName: 'johndoe',
        realName: 'John Doe',
        email: 'email-invalido',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('El formato del email es inválido');
    });

    it('debe fallar si la contraseña tiene menos de 8 caracteres', async () => {
      const result = await AuthService.register({
        userName: 'johndoe',
        realName: 'John Doe',
        email: 'john@example.com',
        password: 'short',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('La contraseña debe tener al menos 8 caracteres');
    });
  });

  describe('login', () => {
    it('debe loguear un usuario exitosamente cuando las credenciales son válidas', async () => {
      mockEm.findOne.mockResolvedValue({ ...fakeUser });
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(jwt.sign).mockReturnValue('mock_jwt_token' as never);

      const result = await AuthService.login({
        emailOrUsername: 'john@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Login exitoso');
      expect(result.accessToken).toBe('mock_jwt_token');
      expect(result.refreshToken).toBe('mock_jwt_token');
      expect(result.user).toBeDefined();
      expect((result.user as any)?.password).toBeUndefined();

      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed_password_123');
    });

    it('debe fallar el login si el usuario no existe', async () => {
      mockEm.findOne.mockResolvedValue(null);

      const result = await AuthService.login({
        emailOrUsername: 'desconocido@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Credenciales inválidas');
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('debe fallar el login si la contraseña no coincide', async () => {
      mockEm.findOne.mockResolvedValue({ ...fakeUser });
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      const result = await AuthService.login({
        emailOrUsername: 'john@example.com',
        password: 'wrong_password',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Credenciales inválidas');
      expect(bcrypt.compare).toHaveBeenCalledWith('wrong_password', 'hashed_password_123');
      expect(result.accessToken).toBeUndefined();
      expect(result.refreshToken).toBeUndefined();
    });
  });

  describe('refreshAccessToken', () => {
    it('debe validar un refresh token existente y devolver un nuevo access token', async () => {
      const refreshToken = 'valid_stored_refresh_token';
      TokenService.addRefreshToken(refreshToken);

      vi.mocked(jwt.verify).mockReturnValue({
        id: 1,
        userName: 'johndoe',
        type: 'common',
      } as any);

      mockEm.findOne.mockResolvedValue({ ...fakeUser });
      vi.mocked(jwt.sign).mockReturnValue('new_access_token' as never);

      const result = await AuthService.refreshAccessToken(refreshToken);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Token renovado exitosamente');
      expect(result.accessToken).toBe('new_access_token');
    });

    it('debe fallar si el refresh token no existe en el store (revocado o nunca emitido)', async () => {
      const result = await AuthService.refreshAccessToken('unregistered_token');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Refresh token inválido o revocado');
    });

    it('debe fallar e invalidar el token si el token expiró o la firma es inválida', async () => {
      const expiredToken = 'expired_token_123';
      TokenService.addRefreshToken(expiredToken);

      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('jwt expired');
      });

      const result = await AuthService.refreshAccessToken(expiredToken);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Refresh token inválido o expirado');
      expect(TokenService.hasRefreshToken(expiredToken)).toBe(false);
    });

    it('debe fallar si no se proporciona el refresh token', async () => {
      const result = await AuthService.refreshAccessToken('');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Refresh token no proporcionado');
    });
  });

  describe('logout', () => {
    it('debe invalidar el refresh token eliminándolo del store', async () => {
      const activeToken = 'token_to_logout';
      TokenService.addRefreshToken(activeToken);
      expect(TokenService.hasRefreshToken(activeToken)).toBe(true);

      const result = await AuthService.logout(activeToken);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Sesión cerrada exitosamente');
      expect(TokenService.hasRefreshToken(activeToken)).toBe(false);

      // Si se intenta hacer refresh con el token invalidado, debe ser rechazado
      const refreshResult = await AuthService.refreshAccessToken(activeToken);
      expect(refreshResult.success).toBe(false);
      expect(refreshResult.message).toBe('Refresh token inválido o revocado');
    });

    it('debe fallar si no se proporciona el refresh token', async () => {
      const result = await AuthService.logout('');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Refresh token no proporcionado');
    });
  });
});
