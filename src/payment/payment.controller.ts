import { Request, Response } from 'express';
import { MercadoPagoConfig, Preference } from 'mercadopago';

import {
  MERCADOPAGO_API_KEY,
  URL_BACKEND,
  URL_FRONTEND,
} from '../shared/config.js';
import { User } from '../user/user.entity.js';
import { currentMembership } from '../utils/currentMembership.js';

if (!MERCADOPAGO_API_KEY) {
  throw new Error('Falta la variable de entorno MP_ACCESS_TOKEN');
}
const client = new MercadoPagoConfig({
  accessToken: MERCADOPAGO_API_KEY,
});
const preferenceClient = new Preference(client);

const createPreferenceHandler = async (req: Request, res: Response) => {
  try {
    const user = req.user as User;

    if (user.type === 'premium' || user.type === 'admin') {
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

    const FRONTEND_URL = URL_FRONTEND || 'http://localhost:5173';
    const BACKEND_URL = URL_BACKEND || 'http://localhost:3000';

    if (!BACKEND_URL) {
      throw new Error(
        'Falta la variable de entorno BACKEND_URL para el webhook'
      );
    }

    const preferenceData = {
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
    if (error.cause) {
      return res.status(error.status || 500).json({
        message: error.message,
        cause: error.cause,
      });
    }
    res.status(500).json({
      message: error.message || 'Error interno al crear la preferencia.',
    });
  }
};

export const paymentController = { createPreferenceHandler };
