/**
 * Tipos e interfaces para el módulo de pagos.
 * Define las estructuras de datos usadas en MercadoPago y las requests/responses.
 */

/**
 * Request enviado desde el frontend para procesar un pago con tarjeta.
 */
export interface PaymentRequest {
  token: string;
  payment_method_id: string;
  issuer_id?: string;
  installments?: number;
  identification_type?: string;
  identification_number?: string;
}

/**
 * Respuesta de la API de pagos.
 */
export interface PaymentResponse {
  status: string;
  message: string;
  paymentId?: number;
  reason?: string;
  data?: unknown;
}

/**
 * Respuesta al crear una preferencia de pago.
 */
export interface CreatePreferenceResponse {
  preferenceId: string;
}

/**
 * Body del webhook enviado por MercadoPago.
 */
export interface WebhookBody {
  type: string;
  data?: {
    id: string;
  };
}

/**
 * Payment devuelto por la API de MercadoPago.
 */
export interface MpPayment {
  id?: number;
  status?: string;
  external_reference?: string;
  status_detail?: string;
}

/**
 * Preference devuelta por la API de MercadoPago.
 */
export interface MpPreference {
  id?: string;
  init_point?: string;
}

/**
 * Payload del usuario extraído del token JWT.
 */
export interface UserPayload {
  id: number;
  type: string;
  email?: string;
}