export const JWT_SECRET =
  process.env.JWT_SECRET || "fallback_secret_no_usar_en_produccion";
export const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "refresh_secret_diferente";
export const JWT_EXPIRES_IN = "15m";
export const JWT_REFRESH_EXPIRES_IN = "7d";
export const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
export const URL_FRONTEND = process.env.URL_FRONTEND;
export const URL_BACKEND = process.env.URL_BACKEND;
export const URL_WEBHOOK_MP = process.env.URL_WEBHOOK_MP;
export const BREVO_API_KEY = process.env.BREVO_API_KEY || "";
export const FROM_EMAIL = process.env.FROM_EMAIL || "";
export const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
