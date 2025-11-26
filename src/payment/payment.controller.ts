import { Request, Response } from 'express';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { orm } from '../shared/orm.js';
import { User, UserType } from '../user/user.entity.js';
import { currentMembership } from '../utils/currentMembership.js';
import {
  MERCADOPAGO_API_KEY,
  URL_BACKEND,
  URL_FRONTEND,
} from '../shared/config.js';

if (!MERCADOPAGO_API_KEY) {
  throw new Error('Falta la variable de entorno MP_ACCESS_TOKEN');
}
const client = new MercadoPagoConfig({
  accessToken: MERCADOPAGO_API_KEY,
});
const preferenceClient = new Preference(client);
const paymentClient = new Payment(client);

async function createPreferenceHandler(req: Request, res: Response) {
  try {
    const userPayload = req.user!;
    const em = orm.em;

    if (
      userPayload.type === 'premium' ||
      userPayload.type === 'admin' ||
      userPayload.type === 'Admin'
    ) {
      return res
        .status(400)
        .json({ message: 'El usuario ya es premium o admin.' });
    }

    const cm = await currentMembership();

    if (!cm || !cm.price) {
      return res
        .status(500)
        .json({ message: 'No se pudo determinar el precio de la membresía.' });
    }
    const membershipPrice = cm.price;

    const user = await em.findOneOrFail(User, { id: userPayload.id });

    const FRONTEND_URL = URL_FRONTEND || 'http://localhost:5173';
    const BACKEND_URL = URL_BACKEND || 'http://localhost:3000';

    if (!BACKEND_URL) {
      throw new Error(
        'Falta la variable de entorno BACKEND_URL para el webhook'
      );
    }

    const preferenceData: any = {
      back_urls: {
        success: `${FRONTEND_URL}/payment-success`,
        failure: `${FRONTEND_URL}/subscribe`,
        pending: `${FRONTEND_URL}/subscribe`,
      },
      auto_return: 'approved' as const,
      external_reference: user.id!.toString(),
      notification_url: `${BACKEND_URL}/api/webhooks/mercadopago`,

      body: {
        items: [
          {
            id: 'myracing-premium',
            title: 'Membresía Premium MyRacing',
            description: 'Acceso a todas las carreras y torneos premium.',
            quantity: 1,
            unit_price: membershipPrice,
            currency_id: 'ARS',
          },
        ],
        payer: {
          email: user.email,
          name: user.realName,
        },
      },
    };

    const result = await preferenceClient.create(preferenceData);

    res.status(201).json({ preferenceId: result.id });
  } catch (error: any) {
    console.error('Error al crear la preferencia de pago:', error);

    if (error.status) {
      return res.status(error.status).json({
        message: 'Error de la pasarela de pago (MP).',
        cause: error.cause,
      });
    }

    res.status(500).json({
      message: error.message || 'Error interno al crear la preferencia.',
    });
  }
}

async function processPaymentHandler(req: Request, res: Response) {
  const {
    token,
    payment_method_id,
    issuer_id,
    installments,
    identification_type,
    identification_number,
    preference_id,
  } = req.body;

  const em = orm.em;
  const userPayload = req.user!;

  if (!token || !payment_method_id) {
    const faltante = !token ? 'token' : 'payment_method_id';
    return res.status(400).json({
      message: `Faltan datos obligatorios para procesar el pago. Dato faltante: ${faltante}`,
    });
  }

  try {
    const user = await em.findOneOrFail(User, { id: userPayload.id });
    const cm = await currentMembership();

    if (!cm || !cm.price) {
      return res
        .status(500)
        .json({ message: 'No se pudo obtener el precio para el cobro.' });
    }

    const paymentData: any = {
      transaction_amount: cm.price,
      token: token,
      payment_method_id: payment_method_id,
      installments: installments || 1,
      issuer_id: issuer_id,

      description: 'Membresía Premium MyRacing',
      external_reference: user.id!.toString(),
      payer: {
        email: user.email,
        identification: {
          type: identification_type,
          number: identification_number,
        },
      },
    };

    const payment = await paymentClient.create({ body: paymentData });

    if (payment.status === 'approved') {
      user.type = UserType.PREMIUM;
      em.assign(user, { type: UserType.PREMIUM });
      await em.flush();

      return res.status(200).json({
        message: 'Pago APROBADO. Membresía activada.',
        status: payment.status,
        paymentId: payment.id,
      });
    } else if (payment.status === 'rejected') {
      return res.status(400).json({
        message:
          'Pago RECHAZADO. Por favor, verifique los datos de su tarjeta.',
        status: payment.status,
        reason: payment.status_detail,
      });
    } else {
      return res.status(202).json({
        message:
          'Pago en proceso. Recibirás un email de Mercado Pago con el resultado.',
        status: payment.status,
        paymentId: payment.id,
      });
    }
  } catch (error: any) {
    console.error('Error fatal al procesar el pago final:', error);

    return res.status(400).json({
      message:
        'No se pudo completar el pago, intente con otra tarjeta o método.',
    });
  }
}

export const paymentController = {
  createPreferenceHandler,
  processPaymentHandler,
};
