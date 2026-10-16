import crypto from 'crypto';
import { WebhookSignatureValidator } from 'mercadopago';
import { MERCADOPAGO_ACCESS_TOKEN } from '../shared/config.js';
import type { PaymentRequest } from './payment.types.js';

/**
 * Set en memoria para rastrear pagos en proceso.
 * La clave es estable por usuario (`payment:<userId>`): evita que el mismo
 * usuario envíe múltiples requests de pago simultáneamente.
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
 * Ventana máxima aceptada entre el `ts` de la firma y el reloj local.
 * Mitiga replays: una firma válida pero vieja se rechaza.
 */
export const WEBHOOK_TOLERANCE_SECONDS = 300;

/**
 * Valida la firma oficial del webhook de MercadoPago con el validador del SDK.
 *
 * La key del HMAC es `MERCADOPAGO_ACCESS_TOKEN` (el de las credenciales).
 * Sin token se rechaza (fail-closed). Se lee `process.env` en cada llamada
 * para aplicar sin reiniciar; el import de config queda como fallback.
 *
 * Se exige una ventana temporal de `WEBHOOK_TOLERANCE_SECONDS`: el SDK
 * compara el `ts` del header contra `now` y rechaza lo que caiga fuera
 * (replay o clock drift excesivo). `now` por defecto es `Date.now` y solo
 * existe como parámetro para volver determinísticos los tests.
 *
 * Nunca lanza: ante cualquier fallo (headers ausentes, firma malformada,
 * mismatch, ts fuera de ventana, error del SDK) retorna `false`.
 *
 * @param input - Valores crudos de `x-signature`, `x-request-id` y `data.id`
 * @param now - Reloj en ms para la ventana temporal (default `Date.now`)
 * @returns true si la firma oficial es válida y vigente
 */
export function validateWebhookSignature(
  input: {
    xSignature: string | undefined;
    xRequestId: string | undefined;
    dataId: string | undefined;
  },
  now: () => number = Date.now,
): boolean {
  const secret =
    process.env.MERCADOPAGO_ACCESS_TOKEN || MERCADOPAGO_ACCESS_TOKEN;

  if (!secret) {
    return false;
  }

  try {
    WebhookSignatureValidator.validate({
      xSignature: input.xSignature,
      xRequestId: input.xRequestId,
      dataId: input.dataId,
      secret,
      toleranceSeconds: WEBHOOK_TOLERANCE_SECONDS,
      now,
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
