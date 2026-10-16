import 'reflect-metadata';
import express from 'express';
import { orm } from './shared/orm.js';
import { RequestContext } from '@mikro-orm/mysql';

import { categoryRouter } from './category/category.routes.js';
import { circuitRouter } from './circuit/circuit.routes.js';
import { userRouter } from './user/user.routes.js';
import { simulatorRouter } from './simulator/simulator.routes.js';
import { categoryVersionRouter } from './category-version/category-version.routes.js';
import { circuitVersionRouter } from './circuit-version/circuit-version.routes.js';
import { combinationRouter } from './combination/combination.routes.js';
import { membershipRouter } from './membership/membership.routes.js';
import { raceRouter } from './race/race.routes.js';
import { raceUserRouter } from './race-user/race-user.routes.js';
import { authRouter } from './auth/auth.routes.js';
import paymentRouter from './payment/payment.routes.js';
import { errorHandler, notFoundHandler } from './shared/error-handler.middleware.js';
import { URL_FRONTEND } from './shared/config.js';
import { allowedOriginsFrom } from './shared/cors.js';
import cors from 'cors';

export const app = express();
// BE-26: no exponer que el server usa Express (fingerprinting -> menos info al atacante).
app.disable('x-powered-by');
app.use(express.json());
// BE-25: whitelist de origenes (URL_FRONTEND). Sin Origin (webhooks de MP,
// server-to-server) el request sigue pasando; los navegadores de origenes no
// listados no reciben Access-Control-Allow-Origin.
app.use(cors({ origin: allowedOriginsFrom(URL_FRONTEND) }));

app.use((req, res, next) => {
  RequestContext.create(orm.em, next);
});

app.use('/api/categories', categoryRouter);
app.use('/api/circuits', circuitRouter);
app.use('/api/simulators', simulatorRouter);
app.use('/api/users', userRouter);
app.use('/api/circuits-version', circuitVersionRouter);
app.use('/api/categories-version', categoryVersionRouter);
app.use('/api/combinations', combinationRouter);
app.use('/api/membership', membershipRouter);
app.use('/api/races', raceRouter);
app.use('/api/race-users', raceUserRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/auth', authRouter);

app.use(notFoundHandler);

app.use(errorHandler);
