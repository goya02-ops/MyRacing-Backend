import { Request, Response } from 'express';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { orm } from '../shared/orm.js';
import { User, UserType } from '../user/user.entity.js';
import { currentMembership } from '../utils/currentMembership.js';
import {
  MERCADOPAGO_API_KEY,
  URL_BACKEND,
  URL_FRONTEND,
  URL_WEBHOOK_MP,
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
    9;
    const user = await em.findOneOrFail(User, { id: userPayload.id });

    const FRONTEND = (URL_FRONTEND || 'http://localhost:5173').trim();
    const BACKEND = (URL_BACKEND || 'http://localhost:3000').trim();

    const isLocalhost =
      FRONTEND.includes('localhost') || FRONTEND.includes('127.0.0.1');

    console.log('CREANDO PREFERENCIA 🖨️');

    if (isLocalhost) {
      console.warn(
        '⚠️ Entorno Local detectado: auto_return desactivado por seguridad de MP.'
      );
    }

    const preferenceBody: any = {
      items: [
        {
          id: 'myracing-premium',
          title: 'Membresía Premium MyRacing',
          description: 'Acceso a todas las carreras y torneos premium.',
          quantity: 1,
          unit_price: cm.price,
          currency_id: 'ARS',
        },
      ],
      payer: {
        email: user.email,
        name: user.realName,
      },
      back_urls: {
        success: `${FRONTEND}/payment-status`,
        failure: `${FRONTEND}/payment-status`,
        pending: `${FRONTEND}/payment-status`,
      },

      ...(!isLocalhost && { auto_return: 'approved' }),

      external_reference: user.id!.toString(),
      notification_url: `${URL_WEBHOOK_MP}`,

      payment_methods: {
        excluded_payment_methods: [{ id: 'ticket' }],
        installments: 1,
      },
    };

    const result = await preferenceClient.create({ body: preferenceBody });

    console.log(`✅ Preferencia creada con ID: ${result.id}`);
    res.status(201).json({ preferenceId: result.id });
  } catch (error: any) {
    console.error('❌ Error al crear la preferencia:', error);
    res.status(500).json({ message: error.message || 'Error interno.' });
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
  } = req.body;

  const em = orm.em;
  const userPayload = req.user!;

  if (!token || !payment_method_id) {
    const faltante = !token ? 'token' : 'payment_method_id';
    return res.status(400).json({
      message: `⚠️❌ Faltan datos obligatorios para procesar el pago. Dato faltante: ${faltante}`,
    });
  }

  try {
    const user = await em.findOneOrFail(User, { id: userPayload.id });
    const cm = await currentMembership();

    if (!cm || !cm.price) {
      return res
        .status(500)
        .json({ message: '❌ No se pudo obtener el precio para el cobro.' });
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
        message: '🎊 Pago APROBADO. Membresía activada. 🎉',
        status: payment.status,
        paymentId: payment.id,
      });
    } else if (payment.status === 'rejected') {
      return res.status(400).json({
        message:
          '❌❌❌ Pago RECHAZADO. Por favor, verifique los datos de su tarjeta.',
        paymentId: payment.id,
        status: payment.status,
        reason: payment.status_detail,
      });
    } else {
      return res.status(202).json({
        message:
          '😒😒😒 Pago en proceso. Recibirás un email de Mercado Pago con el resultado.',
        status: payment.status,
        paymentId: payment.id,
      });
    }
  } catch (error: any) {
    console.error('😡😡😡 Error fatal al procesar el pago final:', error);
    return res.status(400).json({
      message:
        'No se pudo completar el pago, intente con otra tarjeta o método.',
    });
  }
}

async function checkPaymentStatusHandler(req: Request, res: Response) {
  const { id } = req.params;
  const userPayload = req.user!;

  if (!id) {
    return res.status(400).json({ message: 'Se requiere el ID del pago.' });
  }

  try {
    const payment = await paymentClient.get({ id: Number(id) });

    if (payment.external_reference !== userPayload.id.toString()) {
      return res
        .status(403)
        .json({ message: 'Este pago no corresponde a tu usuario.' });
    }

    if (payment.status === 'approved') {
      const em = orm.em;
      const user = await em.findOneOrFail(User, { id: userPayload.id });

      if (user.type !== UserType.PREMIUM) {
        user.type = UserType.PREMIUM;
        await em.flush();
        console.log(
          `😮‍💨👌 Verificación Manual: Usuario ${user.userName} actualizado a PREMIUM.`
        );
      } else {
        console.log();
        `✅ Verificación Manual: El usuario ya era Premium.`;
      }

      return res.json({
        status: 'approved',
        message: 'Pago verificado y membresía activada.',
        user: user,
      });
    }

    return res.json({
      status: payment.status,
      message: 'El pago aún no está aprobado.',
    });
  } catch (error: any) {
    console.error('😡😡 Error verificando pago manualmente:', error);
    return res
      .status(500)
      .json({ message: 'No se pudo verificar el pago en Mercado Pago.' });
  }
}

async function receiveWebhookHandler(req: Request, res: Response) {
  res.sendStatus(200);

  const body = req.body;

  console.log('🔔 WEBHOOK RECIBIDO');

  const type = body.type;

  const paymentId = body.data.id;

  console.log(`🔎 Evento: ${type} | ID: ${paymentId}`);

  if (type === 'merchant_order') {
    console.log(
      'ℹ️ Webhook: Es una Orden Comercial. Ignoramos y esperamos el aviso de "payment".'
    );
    return;
  }

  if (!paymentId || type !== 'payment') {
    console.log('⚠️ Webhook ignorado: No es un pago o falta ID.');
    return;
  }

  try {
    const payment = await paymentClient.get({ id: Number(paymentId) });

    console.log(
      `💳 Estado Pago: ${payment.status} | Ref: ${payment.external_reference}`
    );

    const userId = payment.external_reference;
    if (!userId) return;

    const em = orm.em;
    const user = await em.findOne(User, { id: Number(userId) });

    if (!user) {
      console.error(`❌ Usuario ID ${userId} no encontrado.`);
      return;
    }

    if (payment.status === 'approved') {
      if (user.type !== UserType.PREMIUM) {
        user.type = UserType.PREMIUM;
        await em.flush();
        console.log(
          `✅ ¡ÉXITO! Usuario ${user.realName} (ID ${user.id}) actualizado a PREMIUM.`
        );
      } else {
        console.log(`ℹ️ El usuario ya era Premium.`);
      }
    }
  } catch (error: any) {
    console.error('❌ Error procesando pago:', error.message);
  }
}

export const paymentController = {
  createPreferenceHandler,
  processPaymentHandler,
  checkPaymentStatusHandler,
  receiveWebhookHandler,
};
