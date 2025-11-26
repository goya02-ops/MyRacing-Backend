import { Request, Response } from 'express';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { orm } from '../shared/orm.js';
import { User, UserType } from '../user/user.entity.js';
import { MERCADOPAGO_API_KEY } from '../shared/config.js';

const client = new MercadoPagoConfig({ accessToken: MERCADOPAGO_API_KEY! });
const paymentClient = new Payment(client);

async function receiveWebhookHandler(req: Request, res: Response) {
  res.sendStatus(200);

  const { id, topic } = req.query;

  if (!id || topic !== 'payment') {
    return;
  }

  try {
    const payment = await paymentClient.get({ id: Number(id) });

    const userId = payment.external_reference;
    if (!userId) return;

    const em = orm.em;
    const user = await em.findOne(User, { id: Number(userId) });

    if (!user) {
      console.error(
        `Webhook Error: User ${userId} not found for payment ${id}.`
      );
      return;
    }

    if (payment.status === 'approved' && user.type === UserType.COMMON) {
      user.type = UserType.PREMIUM;
      await em.flush();
      console.log(
        `✅ Webhook: Usuario ${user.userName} actualizado a premium.`
      );
    } else if (payment.status === 'rejected') {
      console.log(
        `❌ Webhook: Pago ${id} fue rechazado. No se requiere acción.`
      );
    }
  } catch (error) {
    console.error('Error procesando webhook de MP:', error);
  }
}

export const WebhookController = { receiveWebhookHandler };
