import { Response } from 'express';
import { NotFoundError } from '@mikro-orm/mysql';
import { logger } from './logger.js';
import { ValidationError } from './validation-error.js';

export function handleControllerError(error: Error | unknown, res: Response): void {
  if (error instanceof ValidationError) {
    res.status(400).json({ message: error.message });
    return;
  }

  logger.error('Controller error', error);

  if (error instanceof NotFoundError || (error as any)?.name === 'NotFoundError') {
    res.status(404).json({ message: 'Recurso no encontrado' });
    return;
  }

  res.status(500).json({ message: 'Error interno del servidor' });
}
