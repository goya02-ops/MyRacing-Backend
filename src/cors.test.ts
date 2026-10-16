import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from './app.js';
import { URL_FRONTEND } from './shared/config.js';
import { allowedOriginsFrom } from './shared/cors.js';

// BE-25: `cors()` estaba abierto a cualquier origen. Ahora la whitelist sale de
// URL_FRONTEND y los origenes no listados no reciben Access-Control-Allow-Origin
// (los navegadores bloquean la lectura aunque el request llegue al server).
const allowed = allowedOriginsFrom(URL_FRONTEND);
const disallowed = 'http://evil.example.com';

describe('CORS restringido (BE-25)', () => {
  describe('allowedOriginsFrom', () => {
    it('devuelve [] sin configuracion (fail-closed)', () => {
      expect(allowedOriginsFrom(undefined)).toEqual([]);
      expect(allowedOriginsFrom('')).toEqual([]);
      expect(allowedOriginsFrom('   ')).toEqual([]);
    });

    it('recorta y filtra una lista separada por comas', () => {
      expect(allowedOriginsFrom('http://a.test, http://b.test,')).toEqual([
        'http://a.test',
        'http://b.test',
      ]);
    });
  });

  describe('app', () => {
    it('no entrega el header a un origen no permitido', async () => {
      const res = await request(app).get('/api/users').set('Origin', disallowed);
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('nunca responde con el comodin *', async () => {
      const res = await request(app)
        .get('/ruta-que-no-existe')
        .set('Origin', disallowed);
      expect(res.headers['access-control-allow-origin']).not.toBe('*');
    });

    it('deja pasar requests sin Origin (server-to-server / webhooks MP)', async () => {
      const res = await request(app).get('/ruta-que-no-existe');
      expect(res.status).toBe(404);
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('no autoriza el preflight de un origen no permitido', async () => {
      const res = await request(app)
        .options('/api/users')
        .set('Origin', disallowed)
        .set('Access-Control-Request-Method', 'GET');
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it.runIf(allowed.length > 0)(
      'refleja el origen permitido (URL_FRONTEND)',
      async () => {
        const res = await request(app)
          .get('/api/users')
          .set('Origin', allowed[0]);
        expect(res.headers['access-control-allow-origin']).toBe(allowed[0]);
      },
    );

    it.runIf(allowed.length > 0)(
      'autoriza el preflight del origen permitido',
      async () => {
        const res = await request(app)
          .options('/api/users')
          .set('Origin', allowed[0])
          .set('Access-Control-Request-Method', 'GET');
        expect(res.status).toBe(204);
        expect(res.headers['access-control-allow-origin']).toBe(allowed[0]);
      },
    );
  });
});
