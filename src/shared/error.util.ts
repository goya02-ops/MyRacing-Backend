import { Response } from 'express';
import { logger } from './logger.js';

export function handleControllerError(error: Error | unknown, res: Response): void {
  logger.error('Controller error', error);
  res.status(500).json({ message: 'Error interno del servidor' });
}
