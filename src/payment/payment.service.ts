import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { orm } from '../shared/orm.js';
import { User, UserType } from '../user/user.entity.js';
import { currentMembership } from '../utils/currentMembership.js';
import { logger } from '../shared/logger.js';
import {
  MERCADOPAGO_ACCESS_TOKEN,
  URL_FRONTEND,
  URL_WEBHOOK_MP,
} from '../shared/config.js';
import type {
  PaymentRequest,
  CreatePreferenceResponse,
  MpPayment,
  MpPreference,
} from './payment.types.js';
import {
  generateIdempotencyKey,
  lockPayment,
  unlockPayment,
  sanitizePaymentInput,
  validateMpSignature,
} from './payment.utils.js';

/**
 * Inicializa el cliente de MercadoPago.
 * Se lanza error si no hay access token configurado.
 */
if (!MERCADOPAGO_ACCESS_TOKEN) {
  throw new Error('MERCADOPAGO_ACCESS_TOKEN is required');
}

const mpClient = new MercadoPagoConfig({
  accessToken: MERCADOPAGO_ACCESS_TOKEN,
});

const preferenceClient = new Preference(mpClient);
const paymentClient = new Payment(mpClient);

/**
 * Crea una preferencia de pago en MercadoPago.
 * La preferencia es usada por el frontend para mostrar el checkout de MP.
 *
 * @param userId - ID del usuario que compra
 * @param userEmail - Email del usuario (para MP)
 * @param userName - Nombre real del usuario (para MP)
 * @returns Objeto con success + data o error
 */
export async function createPreference(
  userId: number,
  userEmail: string,
  userName: string,
): Promise<{
  success: boolean;
  data?: CreatePreferenceResponse;
  error?: string;
}> {
  try {
    // Obtener precio actual de la membresía
    const membership = await currentMembership();

    if (!membership || !membership.price) {
      return { success: false, error: 'Membership price not found' };
    }

    // Detectar entorno local para deshabilitar auto_return
    const frontendUrl = (URL_FRONTEND || 'http://localhost:5173').trim();
    const isLocalhost =
      frontendUrl.includes('localhost') || frontendUrl.includes('127.0.0.1');

    // Construir cuerpo de la preferencia
    const preferenceBody = {
      items: [
        {
          id: 'myracing-premium',
          title: 'Membresía Premium MyRacing',
          description: 'Acceso a todas las carreras y torneos premium.',
          quantity: 1,
          unit_price: membership.price,
          currency_id: 'ARS',
        },
      ],
      payer: {
        email: userEmail,
        name: userName,
      },
      back_urls: {
        success: `${frontendUrl}/payment-status`,
        failure: `${frontendUrl}/payment-status`,
        pending: `${frontendUrl}/payment-status`,
      },
      // Solo en producción para que MP redireccione automáticamente
      ...(!isLocalhost && { auto_return: 'approved' }),
      external_reference: userId.toString(),
      notification_url: `${URL_WEBHOOK_MP}`,
      payment_methods: {
        excluded_payment_method: [{ id: 'ticket' }],
        installments: 1,
      },
    };

    // Crear preferencia en MP
    const result: MpPreference = await preferenceClient.create({
      body: preferenceBody,
    });

    logger.info('Preference created', { preferenceId: result.id });

    if (!result.id) {
      return { success: false, error: 'Failed to create preference' };
    }

    return {
      success: true,
      data: { preferenceId: result.id },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to create preference', { error: message });
    return { success: false, error: message };
  }
}

/**
 * Procesa un pago con tarjeta de crédito.
 * Utiliza idempotency key para evitar cobros duplicates.
 *
 * @param userId - ID del usuario que paga
 * @param userEmail - Email del usuario
 * @param input - Datos de la tarjeta tokenizados
 * @returns Objeto con success + payment data o error
 */
export async function processPayment(
  userId: number,
  userEmail: string,
  input: PaymentRequest,
): Promise<{ success: boolean; data?: MpPayment; error?: string }> {
  const idempotencyKey = generateIdempotencyKey(userId);

  // Intentar bloquear para evitar pagos duplicados desde el cliente
  if (!lockPayment(idempotencyKey)) {
    return { success: false, error: 'Payment already in progress' };
  }

  try {
    // Obtener precio de la membresía
    const membership = await currentMembership();

    if (!membership || !membership.price) {
      return { success: false, error: 'Membership price not found' };
    }

    // Construir datos del pago
    const paymentData: Record<string, unknown> = {
      transaction_amount: membership.price,
      token: input.token,
      payment_method_id: input.payment_method_id,
      installments: input.installments || 1,
      description: 'Membresía Premium MyRacing',
      external_reference: userId.toString(),
      payer: {
        email: userEmail,
        identification: {
          type: input.identification_type,
          number: input.identification_number,
        },
      },
    };

    // MP acepta issuer_id como número o string
    if (input.issuer_id) {
      paymentData.issuer_id = input.issuer_id;
    }

    // Enviar pago a MP con idempotency key
    const payment: MpPayment = await paymentClient.create({
      body: paymentData,
      requestOptions: { idempotencyKey },
    });

    // Si fue aprobado, activar usuario premium
    if (payment.status === 'approved') {
      await activatePremiumUser(userId);
    }

    return {
      success: true,
      data: payment,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Payment processing failed', { error: message });
    return { success: false, error: message };
  } finally {
    // SIEMPRE desbloquear, sin importar el resultado
    unlockPayment(idempotencyKey);
  }
}

/**
 * Consulta el estado de un pago específico.
 * También activa al usuario si el pago está aprobado.
 *
 * @param userId - ID del usuario (para validar ownership)
 * @param paymentId - ID del pago en MP
 * @returns Objeto con success + payment data o error
 */
export async function checkPaymentStatus(
  userId: number,
  paymentId: number,
): Promise<{ success: boolean; data?: MpPayment; error?: string }> {
  try {
    const payment: MpPayment = await paymentClient.get({ id: paymentId });

    // Validar que el pago pertenece al usuario
    if (payment.external_reference !== userId.toString()) {
      return { success: false, error: 'Payment does not belong to user' };
    }

    // Activar premium si está aprovado
    if (payment.status === 'approved') {
      await activatePremiumUser(userId);
    }

    return {
      success: true,
      data: payment,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Payment status check failed', { error: message });
    return { success: false, error: message };
  }
}

/**
 * Procesa el webhook recibido de MercadoPago.
 * Valida la firma HMAC antes de procesar.
 *
 * @param body - Body del request del webhook
 * @returns Objeto indicando si se procesó correctamente
 */
export async function handleWebhook(
  body: unknown,
): Promise<{ processed: boolean }> {
  const rawBody = body as Record<string, unknown>;

  // Extraer firma del header
  const signature = rawBody['x-mp-signature'] as string | undefined;

  // Validar que existe firma
  if (!signature) {
    logger.warn('Webhook rejected', { reason: 'no_signature' });
    return { processed: false };
  }

  // Validar firma HMAC
  if (!validateMpSignature(rawBody, signature)) {
    logger.warn('Webhook rejected', { reason: 'invalid_signature' });
    return { processed: false };
  }

  // Extraer datos del webhook
  const webhookBody = rawBody as { type?: string; data?: { id?: string } };
  const eventType = webhookBody.type;
  const paymentId = webhookBody.data?.id;

  // Ignorar tipos de evento que no son pagos
  if (eventType === 'merchant_order' || !paymentId || eventType !== 'payment') {
    logger.info('Ignored webhook', { eventType, paymentId });
    return { processed: false };
  }

  try {
    // Obtener datos del pago desde MP
    const payment: MpPayment = await paymentClient.get({
      id: Number(paymentId),
    });
    const userId = Number(payment.external_reference);

    if (!userId) {
      logger.warn('No user reference', { paymentId });
      return { processed: false };
    }

    // Activar premium si el pago foi aprovado
    if (payment.status === 'approved') {
      await activatePremiumUser(userId);
      logger.info('User activated via webhook', { userId, paymentId });
    }

    return { processed: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Webhook processing failed', { error: message, paymentId });
    return { processed: false };
  }
}

/**
 * Activa al usuario como miembro PREMIUM.
 * Solo actualiza si no lo era anteriormente.
 *
 * @param userId - ID del usuario a activar
 */
async function activatePremiumUser(userId: number): Promise<void> {
  const em = orm.em;
  const user = await em.findOne(User, { id: userId });

  if (!user) {
    logger.warn('User not found for activation', { userId });
    return;
  }

  // Solo actualizar si no es premium
  if (user.type !== UserType.PREMIUM) {
    user.type = UserType.PREMIUM;
    await em.flush();
    logger.info('User upgraded to PREMIUM', { userId });
  }
}
