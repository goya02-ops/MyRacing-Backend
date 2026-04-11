import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`La variable de entorno ${key} es requerida en producción`);
  }
  return value;
}

export const JWT_SECRET = isProduction
  ? getRequiredEnv('JWT_SECRET')
  : process.env.JWT_SECRET || 'dev_fallback_secret';

export const JWT_REFRESH_SECRET = isProduction
  ? getRequiredEnv('JWT_REFRESH_SECRET')
  : process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret';

export const JWT_EXPIRES_IN = '15m';
export const JWT_REFRESH_EXPIRES_IN = '7d';

export const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
export const URL_FRONTEND = process.env.URL_FRONTEND;
export const URL_BACKEND = process.env.URL_BACKEND;
export const URL_WEBHOOK_MP = process.env.URL_WEBHOOK_MP;
export const NODE_ENV = process.env.NODE_ENV || 'development';