import dotenv from 'dotenv';
dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_no_usar_en_produccion';
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret_diferente';
export const JWT_EXPIRES_IN = '15m'; 
export const JWT_REFRESH_EXPIRES_IN = '7d'; 
