import { Router } from 'express';
import { WebhookController } from './webhook.controller.js';

export const webhookRouter = Router();

webhookRouter.post('/mercadopago', WebhookController.receiveWebhookHandler);
