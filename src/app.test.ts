import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './app.js';

describe('app', () => {
  it('exporta la app de Express y responde sin levantar puerto real', async () => {
    expect(app).toBeDefined();
    const res = await request(app).get('/ruta-que-no-existe');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Not Found' });
  });

  it('no expone el header X-Powered-By (BE-26)', async () => {
    expect(app.disabled('x-powered-by')).toBe(true);
    const res = await request(app).get('/ruta-que-no-existe');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
