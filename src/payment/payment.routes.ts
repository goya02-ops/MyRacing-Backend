import { Router } from 'express';
import { paymentController as controller } from './payment.controller.js';
import { authenticateToken } from '../auth/auth.middleware.js';

const paymentRouter = Router();

paymentRouter.post(
  '/create-preference',
  authenticateToken,
  controller.createPreferenceHandler
);
paymentRouter.post(
  '/process-payment',
  authenticateToken,
  controller.processPaymentHandler
);

export default paymentRouter;
