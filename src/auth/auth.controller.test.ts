import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('./auth.service.js', () => ({
  AuthService: {
    register: vi.fn(),
    login: vi.fn(),
    refreshAccessToken: vi.fn(),
    logout: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

vi.mock('../shared/error.util.js', () => ({
  handleControllerError: vi.fn((err: any, res: Response) => {
    res.status(500).json({ message: 'Error interno del servidor' });
  }),
}));

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

function createMockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe('AuthController Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('debe responder 201 y los datos cuando el registro es exitoso', async () => {
      const req = {
        body: {
          userName: 'johndoe',
          realName: 'John Doe',
          email: 'john@example.com',
          password: 'password123',
        },
      } as Request;
      const res = createMockResponse();

      vi.mocked(AuthService.register).mockResolvedValue({
        success: true,
        message: 'Usuario registrado exitosamente',
        user: { id: 1, userName: 'johndoe', realName: 'John Doe', email: 'john@example.com' } as any,
        accessToken: 'access_123',
        refreshToken: 'refresh_123',
      });

      await AuthController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Usuario registrado exitosamente',
        user: { id: 1, userName: 'johndoe', realName: 'John Doe', email: 'john@example.com' },
        accessToken: 'access_123',
        refreshToken: 'refresh_123',
      });
    });

    it('debe responder 400 cuando el registro falla', async () => {
      const req = {
        body: {
          userName: '',
          password: '123',
        },
      } as Request;
      const res = createMockResponse();

      vi.mocked(AuthService.register).mockResolvedValue({
        success: false,
        message: 'Campo requerido: userName',
      });

      await AuthController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Campo requerido: userName',
      });
    });
  });

  describe('login', () => {
    it('debe responder 200 con access y refresh tokens cuando el login es exitoso', async () => {
      const req = {
        body: {
          emailOrUsername: 'john@example.com',
          password: 'password123',
        },
      } as Request;
      const res = createMockResponse();

      vi.mocked(AuthService.login).mockResolvedValue({
        success: true,
        message: 'Login exitoso',
        user: { id: 1, userName: 'johndoe', realName: 'John Doe', email: 'john@example.com' } as any,
        accessToken: 'access_token_abc',
        refreshToken: 'refresh_token_xyz',
      });

      await AuthController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login exitoso',
        user: { id: 1, userName: 'johndoe', realName: 'John Doe', email: 'john@example.com' },
        accessToken: 'access_token_abc',
        refreshToken: 'refresh_token_xyz',
      });
    });

    it('debe responder 401 cuando las credenciales son inválidas', async () => {
      const req = {
        body: {
          emailOrUsername: 'john@example.com',
          password: 'wrongpassword',
        },
      } as Request;
      const res = createMockResponse();

      vi.mocked(AuthService.login).mockResolvedValue({
        success: false,
        message: 'Credenciales inválidas',
      });

      await AuthController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Credenciales inválidas',
      });
    });
  });

  describe('refreshAccessToken', () => {
    it('debe responder 200 y el nuevo access token cuando el refresh token es válido', async () => {
      const req = {
        body: {
          refreshToken: 'valid_refresh_token',
        },
      } as Request;
      const res = createMockResponse();

      vi.mocked(AuthService.refreshAccessToken).mockResolvedValue({
        success: true,
        message: 'Token renovado exitosamente',
        accessToken: 'brand_new_access_token',
      });

      await AuthController.refreshAccessToken(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Token renovado exitosamente',
        accessToken: 'brand_new_access_token',
      });
    });

    it('debe responder 403 cuando el refresh token es inválido o fue revocado', async () => {
      const req = {
        body: {
          refreshToken: 'revoked_token',
        },
      } as Request;
      const res = createMockResponse();

      vi.mocked(AuthService.refreshAccessToken).mockResolvedValue({
        success: false,
        message: 'Refresh token inválido o revocado',
      });

      await AuthController.refreshAccessToken(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Refresh token inválido o revocado',
      });
    });
  });

  describe('logout', () => {
    it('debe responder 200 cuando el logout invalida el token exitosamente', async () => {
      const req = {
        body: {
          refreshToken: 'token_to_revoke',
        },
      } as Request;
      const res = createMockResponse();

      vi.mocked(AuthService.logout).mockResolvedValue({
        success: true,
        message: 'Sesión cerrada exitosamente',
      });

      await AuthController.logout(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Sesión cerrada exitosamente',
      });
    });

    it('debe responder 400 cuando falla el logout (ej. token faltante)', async () => {
      const req = {
        body: {},
      } as Request;
      const res = createMockResponse();

      vi.mocked(AuthService.logout).mockResolvedValue({
        success: false,
        message: 'Refresh token no proporcionado',
      });

      await AuthController.logout(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Refresh token no proporcionado',
      });
    });
  });
});
