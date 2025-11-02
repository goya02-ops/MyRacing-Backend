import { Router } from 'express';
import { AuthController } from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/register', AuthController.register);
authRouter.post('/login', AuthController.login);
authRouter.post('/refresh', AuthController.refreshAccessToken);
authRouter.post('/logout', AuthController.logout);