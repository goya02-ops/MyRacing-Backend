import dotenv from 'dotenv';
dotenv.config();

export const JWT_SECRET =
  process.env.JWT_SECRET || 'fallback_secret_no_usar_en_produccion';
export const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'refresh_secret_diferente';
export const JWT_EXPIRES_IN = '15m';
export const JWT_REFRESH_EXPIRES_IN = '7d';

export const MERCADOPAGO_API_KEY = process.env.MERCADOPAGO_API_KEY;
export const URL_FRONTEND = process.env.URL_FRONTEND;
export const URL_BACKEND = process.env.URL_BACKEND;
export const URL_WEBHOOK_MP = process.env.URL_WEBHOOK_MP;
