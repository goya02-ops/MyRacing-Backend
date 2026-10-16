import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../app.js';
import { orm } from '../shared/orm.js';
import { JWT_SECRET } from '../shared/config.js';
import { Circuit } from './circuit.entity.js';

// BE-16: `GET /api/circuits/:id` estaba mapeado a `findAll` en las rutas, así
// que devolvía TODOS los circuitos en vez del solicitado (y nunca hacía 404).
function adminToken(): string {
  return jwt.sign({ id: 1, userName: 'test-admin', type: 'admin' }, JWT_SECRET);
}

describe('circuit.routes: GET /:id delega en findOne (BE-16)', () => {
  let circuitId: number;

  beforeAll(async () => {
    const em = orm.em.fork();
    const suffix = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const circuit = em.create(Circuit, {
      denomination: `be16_${suffix}`,
      description: 'BE-16 circuit',
      abbreviation: 'B16C',
    });
    await em.persistAndFlush(circuit);
    circuitId = circuit.id!;
  });

  afterAll(async () => {
    await orm.em.fork().nativeDelete(Circuit, { id: circuitId });
  });

  it('1. GET /api/circuits/:id existente → 200 con SOLO ese circuito', async () => {
    const res = await request(app)
      .get(`/api/circuits/${circuitId}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(false);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBe(circuitId);
    expect(res.body.data.abbreviation).toBe('B16C');
  });

  it('2. GET /api/circuits (listado) → 200 con array que incluye el circuito', async () => {
    const res = await request(app)
      .get('/api/circuits')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const ids = res.body.data.map((c: { id: number }) => c.id);
    expect(ids).toContain(circuitId);
  });

  it('3. GET /api/circuits/:id inexistente → 404 sin filtrar errores', async () => {
    const res = await request(app)
      .get('/api/circuits/999999')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Recurso no encontrado' });
  });

  it('4. GET /api/circuits/:id sin token → 401', async () => {
    const res = await request(app).get(`/api/circuits/${circuitId}`);
    expect(res.status).toBe(401);
  });
});
