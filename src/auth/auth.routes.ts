import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { loginRateLimiter, registerRateLimiter, refreshRateLimiter } from './rate-limit.middleware.js';

export const authRouter = Router();

authRouter.post('/register', registerRateLimiter, AuthController.register);
authRouter.post('/login', loginRateLimiter, AuthController.login);
authRouter.post('/refresh', refreshRateLimiter, AuthController.refreshAccessToken);
authRouter.post('/logout', AuthController.logout);