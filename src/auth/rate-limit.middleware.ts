import rateLimit from 'express-rate-limit';

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return (req.ip || req.headers['x-forwarded-for'] as string || 'unknown')?.replace(/::ffff:/, '');
  },
});

export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { message: 'Demasiados registros. Intenta de nuevo en una hora.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return (req.ip || req.headers['x-forwarded-for'] as string || 'unknown')?.replace(/::ffff:/, '');
  },
});

export const refreshRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { message: 'Demasiadas solicitudes de refresh. Intenta de nuevo en un minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return (req.ip || req.headers['x-forwarded-for'] as string || 'unknown')?.replace(/::ffff:/, '');
  },
});