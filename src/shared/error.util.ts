import { Response } from 'express';
import { NotFoundError } from '@mikro-orm/mysql';
import { logger } from './logger.js';

export function handleControllerError(error: Error | unknown, res: Response): void {
  logger.error('Controller error', error);

  if (error instanceof NotFoundError) {
    res.status(404).json({ message: 'Recurso no encontrado' });
    return;
  }

  res.status(500).json({ message: 'Error interno del servidor' });
}
