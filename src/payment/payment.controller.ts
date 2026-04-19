import { Request, Response } from 'express';
import { orm } from '../shared/orm.js';
import { User } from '../user/user.entity.js';
import { handleControllerError } from '../shared/error.util.js';
import {
  createPreference as createPreferenceService,
  processPayment as processPaymentService,
  checkPaymentStatus as checkPaymentStatusService,
  handleWebhook as handleWebhookService,
} from './payment.service.js';
import { sanitizePaymentInput } from './payment.utils.js';

/**
 * Handler para crear una preferencia de pago.
 * El frontend usa esta preferencia para mostrar el checkout de MP.
 *
 * Request: JWT token obligatorio
 * Response: preferenceId para el checkout
 */
export async function createPreferenceHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const userPayload = req.user!;

    // Verificar que el usuario no sea ya premium o admin
    if (
      userPayload.type === 'premium' ||
      userPayload.type === 'admin' ||
      userPayload.type === 'Admin'
    ) {
      res.status(400).json({
        message: 'User is already premium or admin',
      });
      return;
    }

    // Obtener datos del usuario desde la DB
    const em = orm.em;
    const user = await em.findOneOrFail(User, { id: userPayload.id });

    // Llamar al service
    const result = await createPreferenceService(
      user.id!,
      user.email,
      user.realName,
    );

    if (!result.success) {
      res
        .status(500)
        .json({ message: result.error || 'Failed to create preference' });
      return;
    }

    // Devolver preferenceId al frontend
    res.status(201).json({ preferenceId: result.data?.preferenceId });
  } catch (error) {
    handleControllerError(error, res);
  }
}

/**
 * Handler para procesar un pago con tarjeta.
 * Recibe el token de la tarjeta desde el frontend.
 *
 * Request: JWT token + token de tarjeta + payment_method_id
 * Response: Estado del pago (approved/rejected/pending)
 */
export async function processPaymentHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const userPayload = req.user!;

    // Sanitizar y validar input
    const input = sanitizePaymentInput(req.body);

    if (!input) {
      res.status(400).json({
        message: 'Missing token or payment_method_id',
      });
      return;
    }

    // Obtener usuario desde DB
    const em = orm.em;
    const user = await em.findOneOrFail(User, { id: userPayload.id });

    // Llamar al service
    const result = await processPaymentService(user.id!, user.email, input);

    if (!result.success) {
      // Manejar errores específicos
      if (result.error === 'Payment already in progress') {
        res.status(409).json({ message: result.error });
        return;
      }
      if (result.error === 'Membership price not found') {
        res.status(500).json({ message: result.error });
        return;
      }
      res.status(400).json({ message: result.error });
      return;
    }

    const payment = result.data!;

    // Responder según el estado del pago
    if (payment.status === 'approved') {
      res.status(200).json({
        status: 'approved',
        message: 'Payment approved, membership activated',
        paymentId: payment.id,
      });
      return;
    }

    if (payment.status === 'rejected') {
      res.status(400).json({
        status: 'rejected',
        message: 'Payment rejected',
        paymentId: payment.id,
        reason: payment.status_detail,
      });
      return;
    }

    // Pago pendiente (en proceso)
    res.status(202).json({
      status: 'pending',
      message: 'Payment in progress',
      paymentId: payment.id,
    });
  } catch (error) {
    handleControllerError(error, res);
  }
}

/**
 * Handler para consultar el estado de un pago.
 * Útil para hacer polling desde el frontend.
 *
 * Request: JWT token + paymentId en params
 * Response: Estado actual del pago
 */
export async function checkPaymentStatusHandler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { id } = req.params;
    const userPayload = req.user!;

    if (!id) {
      res.status(400).json({ message: 'Payment ID is required' });
      return;
    }

    // Llamar al service
    const result = await checkPaymentStatusService(userPayload.id, Number(id));

    if (!result.success) {
      res.status(400).json({ message: result.error });
      return;
    }

    const payment = result.data!;

    res.status(200).json({
      status: payment.status,
      message: 'Payment status',
      data: payment,
    });
  } catch (error) {
    handleControllerError(error, res);
  }
}

/**
 * Handler para el webhook de MercadoPago.
 * MP llama a este endpoint cuando cambia el estado de un pago.
 *
 * Request: Body con type + data.id
 * Response: 200 (ACK)
 */
export async function receiveWebhookHandler(
  req: Request,
  res: Response,
): Promise<void> {
  // Procesar webhook (validación de firma dentro del service)
  await handleWebhookService(req.body);

  // Siempre responder 200 a MP
  res.sendStatus(200);
}

export const paymentController = {
  createPreferenceHandler,
  processPaymentHandler,
  checkPaymentStatusHandler,
  receiveWebhookHandler,
};
