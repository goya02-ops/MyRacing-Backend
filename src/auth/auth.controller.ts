import { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { handleControllerError } from '../shared/error.util.js';

export const AuthController = {
  async register(req: Request, res: Response) {
    try {
      const { userName, realName, email, password, type } = req.body;

      const result = await AuthService.register({
        userName,
        realName,
        email,
        password,
        type,
      });

      const status = result.success ? 201 : 400;
      res.status(status).json({
        message: result.message,
        ...(result.data && { data: result.data }),
      });
    } catch (error) {
      handleControllerError(error, res);
    }
  },

  async login(req: Request, res: Response) {
    try {
      const { emailOrUsername, password } = req.body;

      const result = await AuthService.login({ emailOrUsername, password });

      const status = result.success ? 200 : 401;
      res.status(status).json({
        message: result.message,
        ...(result.data && { data: result.data }),
      });
    } catch (error) {
      handleControllerError(error, res);
    }
  },

  async refreshAccessToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      const result = await AuthService.refreshAccessToken(refreshToken);

      const status = result.success ? 200 : 403;
      res.status(status).json({
        message: result.message,
        ...(result.accessToken && { accessToken: result.accessToken }),
      });
    } catch (error) {
      handleControllerError(error, res);
    }
  },

  async logout(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      const result = await AuthService.logout(refreshToken);

      const status = result.success ? 200 : 400;
      res.status(status).json({ message: result.message });
    } catch (error) {
      handleControllerError(error, res);
    }
  },

  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;

      const result = await AuthService.forgotPassword(email);

      const status = result.success ? 200 : 400;
      res.status(status).json({ message: result.message });
    } catch (error) {
      handleControllerError(error, res);
    }
  },

  async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = req.body;

      const result = await AuthService.resetPassword(token, newPassword);

      const status = result.success ? 200 : 400;
      res.status(status).json({ message: result.message });
    } catch (error) {
      handleControllerError(error, res);
    }
  },
};