import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
//***********************************************************
//SUPLANTACIÓN DE FUNCIONES DE MERCADOPAGO Y UTILS PARA TESTS
//***********************************************************
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
  const actual = await importOriginal<typeof import('./payment.utils.js')>();
  return { ...actual, generateIdempotencyKey: () => 'fixed-key' };
});

import { Preference, Payment } from 'mercadopago';
import { app } from '../app.js';
import { orm } from '../shared/orm.js';
import { MERCADOPAGO_ACCESS_TOKEN, JWT_SECRET } from '../shared/config.js';
import { User, UserType } from '../user/user.entity.js';
import { Membership } from '../membership/membership.entity.js';
import {
  sanitizePaymentInput,
  lockPayment,
  unlockPayment,
} from './payment.utils.js';

//*************
//HERRAMIENTAS
//*************
// Estos son mocks que sirven para reemplazar los métodos de creación de preferencias y pagos de MercadoPago, así como la obtención de pagos. Se usan para simular respuestas de la API de MercadoPago sin hacer llamadas reales.
const preferenceCreate = vi.mocked(Preference.prototype.create);
const paymentCreate = vi.mocked(Payment.prototype.create);
const paymentGet = vi.mocked(Payment.prototype.get);

//Simular usuario y generar JWT para autenticación en tests
function signJwt(user: User, type: string): string {
  return jwt.sign({ id: user.id, userName: user.userName, type }, JWT_SECRET);
}

//Construye la firma OFICIAL de MercadoPago para los tests de webhook:
//HMAC-SHA256 hex del manifest `id:{dataId};request-id:{xRequestId};ts:{ts};`
//con el secret, en formato de header `ts=...,v1=...`. Sin tolerancia
//temporal (el validador no la exige), el ts puede ser fijo y determinístico.
const WEBHOOK_TEST_TS = '1750000000';
const WEBHOOK_TEST_REQUEST_ID = 'req-test-123';

function mpOfficialSignature(
  dataId: string,
  requestId: string,
  ts: string,
  secret: string,
): string {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const v1 = crypto
    .createHmac('sha256', secret)
    .update(manifest)
    .digest('hex');
  return `ts=${ts},v1=${v1}`;
}

//Contrato del nuevo validador (a implementar en payment.utils.ts): recibe
//los valores crudos de headers/query y el secret lo toma de la config.
//Retorna true si la firma oficial es válida, false en cualquier otro caso.
type WebhookSignatureInput = {
  xSignature: string | undefined;
  xRequestId: string | undefined;
  dataId: string | undefined;
};

async function validateWebhookSignature(
  input: WebhookSignatureInput,
): Promise<boolean> {
  const utils = (await import('./payment.utils.js')) as unknown as {
    validateWebhookSignature: (input: WebhookSignatureInput) => boolean;
  };
  return utils.validateWebhookSignature(input);
}

describe('payment', () => {
  let membershipId: number;
  const userIds: number[] = [];

  // Crear usuario común para tests y persistirlo en DB. Se guarda su ID para borrarlo al final.
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

  // Crear membresía temporal para tests y persistirla en DB. Se guarda su ID para borrarla al final.
  beforeAll(async () => {
    // El MySQL de CI es efímero y vacío; syncSchema() solo corre al arrancar
    // el servidor y los tests importan `app` sin arrancarlo. Sincronizar de
    // forma NO destructiva (crea lo que falta sin borrar datos): funciona
    // tanto en CI virgen como en DB local con tablas existentes.
    const generator = orm.getSchemaGenerator();
    await generator.ensureDatabase();
    await generator.updateSchema();

    const em = orm.em.fork();
    const membership = em.create(Membership, {
      dateFrom: new Date(),
      price: 1500,
    });
    await em.persistAndFlush(membership);
    membershipId = membership.id!;
  });

  // Borrar usuarios y membresía de prueba al final de todos los tests
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

  // Limpiar mocks y desbloquear pago duplicado antes de cada test. El lock de pago se usa en el caso 5 para simular un pago duplicado.
  beforeEach(() => {
    vi.clearAllMocks();
    unlockPayment('fixed-key');
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
    //Pago con tarjeta
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
    lockPayment('fixed-key');
    try {
      const res = await request(app)
        .post('/api/payment/process-payment')
        .set('Authorization', `Bearer ${signJwt(user, 'common')}`)
        .send({ token: 'tok_test', payment_method_id: 'visa' });
      expect(res.status).toBe(409);
      expect(res.body).toEqual({ message: 'Payment already in progress' });
      expect(paymentCreate).not.toHaveBeenCalled();
    } finally {
      unlockPayment('fixed-key');
    }
  });

  it('6. webhook payment con firma oficial → 200 y usuario activado', async () => {
    const user = await createCommonUser('wh');
    const dataId = '12345';
    paymentGet.mockResolvedValue({
      status: 'approved',
      id: 12345,
      external_reference: String(user.id),
    } as never);
    const res = await request(app)
      .post('/api/payment/wh-mp')
      .query({ 'data.id': dataId, type: 'payment' })
      .set(
        'x-signature',
        mpOfficialSignature(
          dataId,
          WEBHOOK_TEST_REQUEST_ID,
          WEBHOOK_TEST_TS,
          MERCADOPAGO_ACCESS_TOKEN as string,
        ),
      )
      .set('x-request-id', WEBHOOK_TEST_REQUEST_ID)
      .send({ type: 'payment', data: { id: dataId } });
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
    it('8a. validador oficial: firma válida con secret correcto → true', async () => {
      const dataId = '12345';
      const xSignature = mpOfficialSignature(
        dataId,
        WEBHOOK_TEST_REQUEST_ID,
        WEBHOOK_TEST_TS,
        MERCADOPAGO_ACCESS_TOKEN as string,
      );
      await expect(
        validateWebhookSignature({
          xSignature,
          xRequestId: WEBHOOK_TEST_REQUEST_ID,
          dataId,
        }),
      ).resolves.toBe(true);
    });

    it('8b. validador oficial: secret incorrecto → false', async () => {
      const dataId = '12345';
      const xSignature = mpOfficialSignature(
        dataId,
        WEBHOOK_TEST_REQUEST_ID,
        WEBHOOK_TEST_TS,
        'secret-equivocado',
      );
      await expect(
        validateWebhookSignature({
          xSignature,
          xRequestId: WEBHOOK_TEST_REQUEST_ID,
          dataId,
        }),
      ).resolves.toBe(false);
    });

    it('8c. validador oficial: headers ausentes → false', async () => {
      await expect(
        validateWebhookSignature({
          xSignature: undefined,
          xRequestId: undefined,
          dataId: undefined,
        }),
      ).resolves.toBe(false);
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
