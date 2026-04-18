import { Request, Response, NextFunction } from 'express';
import { logger } from './logger.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('Unhandled error', err, {
    url: _req.originalUrl,
    method: _req.method,
  });

  res.status(500).json({ message: 'Error interno del servidor' });
}
