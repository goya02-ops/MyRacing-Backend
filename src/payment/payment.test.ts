import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';

vi.mock('mercadopago', () => {
  const MercadoPagoConfig = vi.fn();
  const Preference = vi.fn();
  Preference.prototype.create = vi.fn();
  const Payment = vi.fn();
  Payment.prototype.create = vi.fn();
  Payment.prototype.get = vi.fn();
  return { MercadoPagoConfig, Preference, Payment };
});

// generateIdempotencyKey real genera claves únicas (timestamp+random), por lo
// que el lock de pagos duplicados es inalcanzable por HTTP de forma
// determinística. Se fija a una constante para poder pre-bloquearla en el
// caso 5; el resto de utils se conserva real (importOriginal).
vi.mock('./payment.utils.js', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('./payment.utils.js')>();
  return { ...actual, generateIdempotencyKey: () => 'be11-fixed-key' };
});

import { Preference, Payment } from 'mercadopago';
import { app } from '../app.js';
import { orm } from '../shared/orm.js';
import {
  MERCADOPAGO_ACCESS_TOKEN,
  JWT_SECRET,
} from '../shared/config.js';
import { User, UserType } from '../user/user.entity.js';
import { Membership } from '../membership/membership.entity.js';
import {
  validateMpSignature,
  sanitizePaymentInput,
  lockPayment,
  unlockPayment,
} from './payment.utils.js';

const preferenceCreate = vi.mocked(Preference.prototype.create);
const paymentCreate = vi.mocked(Payment.prototype.create);
const paymentGet = vi.mocked(Payment.prototype.get);

function signJwt(user: User, type: string): string {
  return jwt.sign(
    { id: user.id, userName: user.userName, type },
    JWT_SECRET,
  );
}

function mpSignature(body: unknown): string {
  return crypto
    .createHmac('sha256', MERCADOPAGO_ACCESS_TOKEN as string)
    .update(JSON.stringify(body))
    .digest('hex');
}

describe('payment (BE-11)', () => {
  let membershipId: number;
  const userIds: number[] = [];

  async function createCommonUser(tag: string): Promise<User> {
    const em = orm.em.fork();
    const suffix = `${tag}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const user = em.create(User, {
      userName: `be11_${suffix}`,
      realName: 'BE11 Test User',
      email: `be11_${suffix}@test.local`,
      password: 'test_password',
      type: UserType.COMMON,
    });
    await em.persistAndFlush(user);
    userIds.push(user.id!);
    return user;
  }

  async function freshUser(id: number): Promise<User> {
    // Fork nuevo (identity map vacío) para no leer estado stale.
    return await orm.em.fork().findOneOrFail(User, { id });
  }

  beforeAll(async () => {
    const em = orm.em.fork();
    const membership = em.create(Membership, {
      dateFrom: new Date(),
      price: 1500,
    });
    await em.persistAndFlush(membership);
    membershipId = membership.id!;
  });

  afterAll(async () => {
    const em = orm.em.fork();
    if (userIds.length > 0) {
      const users = await em.find(User, { id: { $in: userIds } });
      await em.removeAndFlush(users);
    }
    const membership = await em.findOne(Membership, { id: membershipId });
    if (membership) {
      await em.removeAndFlush(membership);
    }
  });

  beforeEach(() => {
    vi.clearAllMocks();
    unlockPayment('be11-fixed-key');
  });

  it('1. POST /api/payment/wh-mp con {} → 200 sin auth, sin DB, sin MP', async () => {
    const res = await request(app).post('/api/payment/wh-mp').send({});
    expect(res.status).toBe(200);
    expect(paymentGet).not.toHaveBeenCalled();
  });

  it('2. create-preference con JWT premium → 400 sin llamar a MP', async () => {
    const token = signJwt({ id: 999999, userName: 'ghost' } as User, 'premium');
    const res = await request(app)
      .post('/api/payment/create-preference')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'User is already premium or admin' });
    // Sin mock de MP configurado: si el código llamara a MP fallaría.
    // Esta aserción fija que ni siquiera lo intenta.
    expect(preferenceCreate).not.toHaveBeenCalled();
  });

  it('3. create-preference feliz (usuario común) → 201 + preferenceId', async () => {
    const user = await createCommonUser('pref');
    preferenceCreate.mockResolvedValue({ id: 'pref_test_123' } as never);
    const res = await request(app)
      .post('/api/payment/create-preference')
      .set('Authorization', `Bearer ${signJwt(user, 'common')}`)
      .send({});
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ preferenceId: 'pref_test_123' });
    expect(preferenceCreate).toHaveBeenCalledTimes(1);
  });

  it('4. process-payment aprobado → 200 y usuario pasa a premium', async () => {
    const user = await createCommonUser('pay');
    paymentCreate.mockResolvedValue({
      status: 'approved',
      id: 111,
      external_reference: String(user.id),
    } as never);
    const res = await request(app)
      .post('/api/payment/process-payment')
      .set('Authorization', `Bearer ${signJwt(user, 'common')}`)
      .send({
        token: 'tok_test',
        payment_method_id: 'visa',
        installments: 1,
        identification_type: 'DNI',
        identification_number: '12345678',
      });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
    expect(res.body.paymentId).toBe(111);
    expect((await freshUser(user.id!)).type).toBe(UserType.PREMIUM);
  });

  it('5. process-payment duplicado (lock) → 409 Payment already in progress', async () => {
    const user = await createCommonUser('dup');
    lockPayment('be11-fixed-key');
    try {
      const res = await request(app)
        .post('/api/payment/process-payment')
        .set('Authorization', `Bearer ${signJwt(user, 'common')}`)
        .send({ token: 'tok_test', payment_method_id: 'visa' });
      expect(res.status).toBe(409);
      expect(res.body).toEqual({ message: 'Payment already in progress' });
      expect(paymentCreate).not.toHaveBeenCalled();
    } finally {
      unlockPayment('be11-fixed-key');
    }
  });

  it('6. webhook payment con firma HMAC real → 200 y usuario activado', async () => {
    const user = await createCommonUser('wh');
    const body = { type: 'payment', data: { id: '12345' } };
    paymentGet.mockResolvedValue({
      status: 'approved',
      id: 12345,
      external_reference: String(user.id),
    } as never);
    const res = await request(app)
      .post('/api/payment/wh-mp')
      .send({ ...body, 'x-mp-signature': mpSignature(body) });
    expect(res.status).toBe(200);
    expect(paymentGet).toHaveBeenCalledWith({ id: 12345 });
    expect((await freshUser(user.id!)).type).toBe(UserType.PREMIUM);
  });

  it('7. webhook con firma inválida → 200 sin activación', async () => {
    const user = await createCommonUser('whbad');
    const body = { type: 'payment', data: { id: '67890' } };
    const res = await request(app)
      .post('/api/payment/wh-mp')
      // Misma longitud que un HMAC hex (64): timingSafeEqual no lanza.
      .send({ ...body, 'x-mp-signature': '0'.repeat(64) });
    expect(res.status).toBe(200);
    expect(paymentGet).not.toHaveBeenCalled();
    expect((await freshUser(user.id!)).type).toBe(UserType.COMMON);
  });

  describe('utils puros (sin DB ni MP)', () => {
    it('8a. validateMpSignature: válida → true', () => {
      const body = { type: 'payment', data: { id: '1' } };
      expect(validateMpSignature(body, mpSignature(body))).toBe(true);
    });

    it('8b. validateMpSignature: inválida (misma longitud) → false', () => {
      expect(
        validateMpSignature({ type: 'payment' }, '0'.repeat(64)),
      ).toBe(false);
    });

    it('8c. validateMpSignature: sin token → false', async () => {
      // Vaciar (no borrar): config re-ejecuta dotenv.config() al reimportar
      // y dotenv restaura vars borradas desde .env, pero no pisa las que
      // ya existen (ni siquiera vacías). '' es falsy → rama sin token.
      const saved = process.env.MERCADOPAGO_ACCESS_TOKEN;
      process.env.MERCADOPAGO_ACCESS_TOKEN = '';
      // doUnmock: el import dinámico debe saltear la factoría del mock
      // parcial (su importOriginal devuelve los utils originales con el
      // config viejo cacheado) y re-ejecutar utils+config de verdad.
      vi.doUnmock('./payment.utils.js');
      vi.resetModules();
      try {
        const fresh = await import('./payment.utils.js');
        expect(fresh.validateMpSignature({ a: 1 }, 'cualquier-firma')).toBe(
          false,
        );
      } finally {
        process.env.MERCADOPAGO_ACCESS_TOKEN = saved;
      }
    });

    it('8d. sanitizePaymentInput: completo → objeto, incompleto → null', () => {
      expect(
        sanitizePaymentInput({ token: 't', payment_method_id: 'visa' }),
      ).toMatchObject({ token: 't', payment_method_id: 'visa' });
      expect(sanitizePaymentInput({})).toBeNull();
      expect(sanitizePaymentInput({ token: 't' })).toBeNull();
      expect(sanitizePaymentInput({ payment_method_id: 'visa' })).toBeNull();
    });

    it('8e. lockPayment/unlockPayment: bloquea, rechaza duplicado, libera', () => {
      const key = `unit-${Date.now()}`;
      expect(lockPayment(key)).toBe(true);
      expect(lockPayment(key)).toBe(false);
      unlockPayment(key);
      expect(lockPayment(key)).toBe(true);
      unlockPayment(key);
    });
  });
});
