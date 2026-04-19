import { Router } from 'express';
import {
  createPreferenceHandler,
  processPaymentHandler,
  checkPaymentStatusHandler,
  receiveWebhookHandler,
} from './payment.controller.js';
import { authenticateToken } from '../auth/auth.middleware.js';

const paymentRouter = Router();

paymentRouter.post(
  '/create-preference',
  authenticateToken,
  createPreferenceHandler
);
paymentRouter.post(
  '/process-payment',
  authenticateToken,
  processPaymentHandler
);

paymentRouter.get(
  '/check-payment-status/:id',
  authenticateToken,
  checkPaymentStatusHandler
);

paymentRouter.post('/wh-mp', receiveWebhookHandler);

export default paymentRouter;
