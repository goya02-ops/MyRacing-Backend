import crypto from 'crypto';
import { MERCADOPAGO_ACCESS_TOKEN } from '../shared/config.js';
import type { PaymentRequest } from './payment.types.js';

/**
 * Set en memoria para rastrear pagos en proceso.
 * Evita que el usuario envíe múltiples requests de pago simultáneamente.
 */
const processingPayments = new Set<string>();

/**
 * Genera una idempotency key única para cada intento de pago.
 * Formato: userId-timestamp-randomHex
 *
 * @param userId - ID del usuario que intenta pagar
 * @returns String único que identifica este intento de pago
 */
export function generateIdempotencyKey(userId: number | string): string {
  return `${userId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Intenta bloquear un pago para evitar pagos duplicados.
 *
 * @param key - Idempotency key del pago
 * @returns true si se pudo bloquear, false si ya está en proceso
 */
export function lockPayment(key: string): boolean {
  if (processingPayments.has(key)) {
    return false;
  }
  processingPayments.add(key);
  return true;
}

/**
 * Libera el bloqueo de un pago.
 * Debe llamarse siempre, tanto en éxito como en error.
 *
 * @param key - Idempotency key del pago
 */
export function unlockPayment(key: string): void {
  processingPayments.delete(key);
}

/**
 * Valida la firma HMAC del webhook de MercadoPago.
 * Utiliza el access token como clave secreta.
 *
 * @param body - Body raw del request
 * @param signature - Firma enviada en el header x-mp-signature
 * @returns true si la firma es válida
 */
export function validateMpSignature(body: unknown, signature: string): boolean {
  if (!MERCADOPAGO_ACCESS_TOKEN) {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', MERCADOPAGO_ACCESS_TOKEN)
    .update(JSON.stringify(body))
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/**
 * Sanitiza y valida los datos del request de pago.
 * Extrae solo los campos necesarios y valida que existan los obligatorios.
 *
 * @param body - Body del request de Express
 * @returns PaymentRequest validado o null si falta algún campo obligatorio
 */
export function sanitizePaymentInput(body: unknown): PaymentRequest | null {
  const data = body as Record<string, unknown>;

  const token = data.token as string | undefined;
  const payment_method_id = data.payment_method_id as string | undefined;

  // Validar campos obligatorios
  if (!token || !payment_method_id) {
    return null;
  }

  return {
    token,
    payment_method_id,
    issuer_id: data.issuer_id as string | undefined,
    installments: data.installments as number | undefined,
    identification_type: data.identification_type as string | undefined,
    identification_number: data.identification_number as string | undefined,
  };
}
