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
vi.mock('mercadopago', async (importOriginal) => {
  const actual = await importOriginal<typeof import('mercadopago')>();
  const MercadoPagoConfig = vi.fn();
  const Preference = vi.fn();
  Preference.prototype.create = vi.fn();
  const Payment = vi.fn();
  Payment.prototype.create = vi.fn();
  Payment.prototype.get = vi.fn();
  // El barrel se suplanta para aislar Preference/Payment, pero el
  // validador de firma debe seguir siendo el real (mismo patrón que
  // payment.utils.js abajo con importOriginal).
  return {
    ...actual,
    MercadoPagoConfig,
    Preference,
    Payment,
    WebhookSignatureValidator: actual.WebhookSignatureValidator,
  };
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
//con el secret, en formato de header `ts=...,v1=...`. El validador exige una
//ventana temporal de 300s, así que el ts debe ser vigente (ver `freshTs()`);
//el ts fijo viejo solo sirve para el test de rechazo por ventana expirada.
const WEBHOOK_TEST_REQUEST_ID = 'req-test-123';
const STALE_WEBHOOK_TS = '1750000000';

//ts vigente en segundos para firmar webhooks que deben pasar la ventana.
function freshTs(): string {
  return String(Math.floor(Date.now() / 1000));
}

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
  now?: () => number,
): Promise<boolean> {
  const utils = (await import('./payment.utils.js')) as unknown as {
    validateWebhookSignature: (
      input: WebhookSignatureInput,
      now?: () => number,
    ) => boolean;
  };
  return utils.validateWebhookSignature(input, now);
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

  // Limpiar mocks antes de cada test.
  beforeEach(() => {
    vi.clearAllMocks();
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
    const lockKey = `payment:${user.id}`;
    lockPayment(lockKey);
    try {
      const res = await request(app)
        .post('/api/payment/process-payment')
        .set('Authorization', `Bearer ${signJwt(user, 'common')}`)
        .send({ token: 'tok_test', payment_method_id: 'visa' });
      expect(res.status).toBe(409);
      expect(res.body).toEqual({ message: 'Payment already in progress' });
      expect(paymentCreate).not.toHaveBeenCalled();
    } finally {
      unlockPayment(lockKey);
    }
  });

  it('5b. doble submit concurrente → un solo cargo a MP y un 409', async () => {
    const user = await createCommonUser('dbl');
    const token = signJwt(user, 'common');
    let releaseMp!: (value: unknown) => void;
    const mpGate = new Promise((resolve) => {
      releaseMp = resolve;
    });
    paymentCreate.mockImplementation(
      () =>
        mpGate.then(() => ({
          status: 'approved',
          id: 777,
          external_reference: String(user.id),
        })) as never,
    );
    const payload = { token: 'tok_test', payment_method_id: 'visa' };
    const first = request(app)
      .post('/api/payment/process-payment')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    // Dar tiempo a que el primer request tome el lock y quede en vuelo en MP.
    await new Promise((resolve) => setTimeout(resolve, 100));
    const second = request(app)
      .post('/api/payment/process-payment')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    // Liberar MP después de que el segundo ya fue rechazado por el lock.
    await new Promise((resolve) => setTimeout(resolve, 100));
    releaseMp(null);
    const [res1, res2] = await Promise.all([first, second]);
    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([200, 409]);
    expect(paymentCreate).toHaveBeenCalledTimes(1);
  });

  it('6. webhook payment con firma oficial → 200 y usuario activado', async () => {
    const user = await createCommonUser('wh');
    const dataId = '12345';
    paymentGet.mockResolvedValue({
      status: 'approved',
      id: 12345,
      external_reference: String(user.id),
    } as never);
    const ts = freshTs();
    const res = await request(app)
      .post('/api/payment/wh-mp')
      .query({ 'data.id': dataId, type: 'payment' })
      .set(
        'x-signature',
        mpOfficialSignature(
          dataId,
          WEBHOOK_TEST_REQUEST_ID,
          ts,
          MERCADOPAGO_ACCESS_TOKEN as string,
        ),
      )
      .set('x-request-id', WEBHOOK_TEST_REQUEST_ID)
      .send({ type: 'payment', data: { id: dataId } });
    expect(res.status).toBe(200);
    expect(paymentGet).toHaveBeenCalledWith({ id: 12345 });
    expect((await freshUser(user.id!)).type).toBe(UserType.PREMIUM);
  });

  it('7. webhook con firma oficial corrupta → 200 sin activación', async () => {
    const user = await createCommonUser('whbad');
    const dataId = '67890';
    const ts = freshTs();
    // Firma bien formada pero con el hash alterado: el ts/requestId/dataId
    // son los reales, solo el `v1` está corrompido. El rechazo es por
    // mismatch criptográfico, no por headers ausentes.
    const valid = mpOfficialSignature(
      dataId,
      WEBHOOK_TEST_REQUEST_ID,
      ts,
      MERCADOPAGO_ACCESS_TOKEN as string,
    );
    const last = valid.slice(-1);
    const corrupted = `${valid.slice(0, -1)}${last === '0' ? '1' : '0'}`;
    const res = await request(app)
      .post('/api/payment/wh-mp')
      .query({ 'data.id': dataId, type: 'payment' })
      .set('x-signature', corrupted)
      .set('x-request-id', WEBHOOK_TEST_REQUEST_ID)
      .send({ type: 'payment', data: { id: dataId } });
    expect(res.status).toBe(200);
    expect(paymentGet).not.toHaveBeenCalled();
    expect((await freshUser(user.id!)).type).toBe(UserType.COMMON);
  });

  it('8. check-payment-status aprobado → 200 sin exponer objeto crudo de MP', async () => {
    const user = await createCommonUser('st');
    paymentGet.mockResolvedValue({
      status: 'approved',
      id: 555,
      external_reference: String(user.id),
      status_detail: 'accredited',
      transaction_details: { secret: 'interno' },
    } as never);
    const res = await request(app)
      .get('/api/payment/check-payment-status/555')
      .set('Authorization', `Bearer ${signJwt(user, 'common')}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
    expect(res.body.paymentId).toBe(555);
    expect(res.body.data).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('accredited');
    expect(JSON.stringify(res.body)).not.toContain('interno');
  });

  it('9. process-payment rechazado → 400 sin reason con status_detail', async () => {
    const user = await createCommonUser('rej');
    paymentCreate.mockResolvedValue({
      status: 'rejected',
      id: 222,
      external_reference: String(user.id),
      status_detail: 'cc_rejected_insufficient_amount',
    } as never);
    const res = await request(app)
      .post('/api/payment/process-payment')
      .set('Authorization', `Bearer ${signJwt(user, 'common')}`)
      .send({ token: 'tok_test', payment_method_id: 'visa' });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('rejected');
    expect(res.body.reason).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain(
      'cc_rejected_insufficient_amount',
    );
  });

  it('10. process-payment cuando MP falla → 400 genérico sin mensaje del SDK', async () => {
    const user = await createCommonUser('fail');
    paymentCreate.mockRejectedValue(
      new Error('MP interno: card_cc_rejected_xyz'),
    );
    const res = await request(app)
      .post('/api/payment/process-payment')
      .set('Authorization', `Bearer ${signJwt(user, 'common')}`)
      .send({ token: 'tok_test', payment_method_id: 'visa' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('No se pudo procesar el pago');
    expect(JSON.stringify(res.body)).not.toContain('MP interno');
  });

  it('11. create-preference cuando MP falla → 500 genérico sin mensaje del SDK', async () => {
    const user = await createCommonUser('prefail');
    preferenceCreate.mockRejectedValue(new Error('MP interno: timeout_xyz'));
    const res = await request(app)
      .post('/api/payment/create-preference')
      .set('Authorization', `Bearer ${signJwt(user, 'common')}`)
      .send({});
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('No se pudo crear la preferencia');
    expect(JSON.stringify(res.body)).not.toContain('MP interno');
  });

  it('12. check-payment-status cuando MP falla → 400 genérico sin mensaje del SDK', async () => {
    const user = await createCommonUser('stfail');
    paymentGet.mockRejectedValue(new Error('MP interno: not_found_xyz'));
    const res = await request(app)
      .get('/api/payment/check-payment-status/999')
      .set('Authorization', `Bearer ${signJwt(user, 'common')}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('No se pudo consultar el pago');
    expect(JSON.stringify(res.body)).not.toContain('MP interno');
  });

  describe('utils puros (sin DB ni MP)', () => {
    it('8a. validador oficial: firma válida con secret correcto → true', async () => {
      const dataId = '12345';
      const ts = freshTs();
      const xSignature = mpOfficialSignature(
        dataId,
        WEBHOOK_TEST_REQUEST_ID,
        ts,
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
      const ts = freshTs();
      const xSignature = mpOfficialSignature(
        dataId,
        WEBHOOK_TEST_REQUEST_ID,
        ts,
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

    it('8d. validador oficial: firma vieja fuera de ventana → false', async () => {
      // HMAC correcto pero con ts muy anterior: el rechazo es por ventana
      // temporal expirada, no por mismatch.
      const dataId = '12345';
      const xSignature = mpOfficialSignature(
        dataId,
        WEBHOOK_TEST_REQUEST_ID,
        STALE_WEBHOOK_TS,
        MERCADOPAGO_ACCESS_TOKEN as string,
      );
      await expect(
        validateWebhookSignature(
          {
            xSignature,
            xRequestId: WEBHOOK_TEST_REQUEST_ID,
            dataId,
          },
          () => (Number(STALE_WEBHOOK_TS) + 301) * 1000,
        ),
      ).resolves.toBe(false);
    });

    it('8e. sanitizePaymentInput: completo → objeto, incompleto → null', () => {
      expect(
        sanitizePaymentInput({ token: 't', payment_method_id: 'visa' }),
      ).toMatchObject({ token: 't', payment_method_id: 'visa' });
      expect(sanitizePaymentInput({})).toBeNull();
      expect(sanitizePaymentInput({ token: 't' })).toBeNull();
      expect(sanitizePaymentInput({ payment_method_id: 'visa' })).toBeNull();
    });

    it('8f. lockPayment/unlockPayment: bloquea, rechaza duplicado, libera', () => {
      const key = `unit-${Date.now()}`;
      expect(lockPayment(key)).toBe(true);
      expect(lockPayment(key)).toBe(false);
      unlockPayment(key);
      expect(lockPayment(key)).toBe(true);
      unlockPayment(key);
    });
  });
});
