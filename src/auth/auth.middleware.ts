import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../shared/config.js';

// Payload que TokenService firma en el JWT (ver token.service.ts)
export interface AuthTokenPayload {
  id: number;
  userName: string;
  type: string;
}

// Request con el usuario autenticado (lo setea authenticateToken)
export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ message: 'Token no proporcionado' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(403).json({ message: 'Token inválido o expirado' });
  }
}


export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  
  if (req.user?.type?.toLowerCase() !== 'admin') {
    res.status(403).json({ message: 'Acceso denegado: se requiere permisos de administrador' });
    return;
  }
  next();
}