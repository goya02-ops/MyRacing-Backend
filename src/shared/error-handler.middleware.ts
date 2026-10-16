import { Request, Response, NextFunction } from 'express';
import { logger } from './logger.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Express detecta los middlewares de error por su firma de 4 parámetros;
  // la respuesta es terminal y no se delega al siguiente middleware.
  void _next;
  logger.error('Unhandled error', err, {
    url: _req.originalUrl,
    method: _req.method,
  });

  res.status(500).json({ message: 'Error interno del servidor' });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ message: 'Not Found' });
}
