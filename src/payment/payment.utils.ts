import crypto from 'crypto';
// Import directo del submódulo real del SDK: el barrel `mercadopago` se
// suplanta en tests, esta ruta siempre resuelve a la implementación genuina.
import { WebhookSignatureValidator } from 'mercadopago/dist/utils/webhook/index.js';
import {
  MERCADOPAGO_ACCESS_TOKEN,
  MP_WEBHOOK_SECRET,
} from '../shared/config.js';
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
 * Valida la firma oficial del webhook de MercadoPago con el validador del SDK.
 *
 * El secret se lee de `MP_WEBHOOK_SECRET` con fallback a
 * `MERCADOPAGO_ACCESS_TOKEN`: la firma se configura aparte cuando exista un
 * secret dedicado, mientras tanto rige el de las credenciales. Sin ninguno
 * se rechaza (fail-closed).
 *
 * Nunca lanza: ante cualquier fallo (headers ausentes, firma malformada,
 * mismatch, error del SDK) retorna `false`.
 *
 * @param input - Valores crudos de `x-signature`, `x-request-id` y `data.id`
 * @returns true si la firma oficial es válida
 */
export function validateWebhookSignature(input: {
  xSignature: string | undefined;
  xRequestId: string | undefined;
  dataId: string | undefined;
}): boolean {
  const secret = MP_WEBHOOK_SECRET || MERCADOPAGO_ACCESS_TOKEN;

  if (!secret) {
    return false;
  }

  try {
    WebhookSignatureValidator.validate({
      xSignature: input.xSignature,
      xRequestId: input.xRequestId,
      dataId: input.dataId,
      secret,
    });
    return true;
  } catch {
    return false;
  }
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
