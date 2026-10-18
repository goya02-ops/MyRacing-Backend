import { describe, it, expect } from 'vitest';
import express from 'express';
import cors from 'cors';
import request from 'supertest';
import { app } from './app.js';
import { CORS_ALLOWED_ORIGINS } from './shared/config.js';
import {
  allowedOriginsFrom,
  corsOriginOption,
  isOriginAllowed,
} from './shared/cors.js';

// BE-25: `cors()` estaba abierto a cualquier origen. Ahora la allowlist sale de
// CORS_ALLOWED_ORIGINS y los origenes no listados no reciben
// Access-Control-Allow-Origin (los navegadores bloquean la lectura aunque el
// request llegue al server).
const disallowed = 'https://evil.example.com';

// Allowlist propia de CORS: acepta patrones con `*` para los previews de
// Vercel, que cambian de host por rama/deployment. URL_FRONTEND no se toca
// porque sigue siendo la URL canonica de redirect (pagos y mails).
const LOCAL_ORIGIN = 'http://localhost:5173';
const PREVIEW_BRANCH = 'feature-x-thethirdagile';
const PREVIEW_PATTERN = 'https://my-racing-frontend-git-*.vercel.app';
const PREVIEW_ORIGIN = PREVIEW_PATTERN.replace('*', PREVIEW_BRANCH);

const previewPatterns = [LOCAL_ORIGIN, PREVIEW_PATTERN];
const corsPatterns = allowedOriginsFrom(CORS_ALLOWED_ORIGINS);
const configuredOrigin = corsPatterns.find((origin) => !origin.includes('*')) ?? '';
const configuredPreviewPattern = corsPatterns.find((origin) => origin.includes('*'));
const configuredPreviewOrigin =
  configuredPreviewPattern?.replace('*', PREVIEW_BRANCH) ?? '';

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

  describe('isOriginAllowed', () => {
    it('acepta un origen exacto de la lista', () => {
      expect(isOriginAllowed(LOCAL_ORIGIN, previewPatterns)).toBe(true);
    });

    it('rechaza un origen que no esta en la lista', () => {
      expect(isOriginAllowed('http://localhost:4000', previewPatterns)).toBe(false);
    });

    it('acepta un preview de Vercel que matchea el patron con comodin', () => {
      expect(isOriginAllowed(PREVIEW_ORIGIN, previewPatterns)).toBe(true);
    });

    it('rechaza un origen ajeno', () => {
      expect(isOriginAllowed(disallowed, previewPatterns)).toBe(false);
    });

    it('es fail-closed sin patrones configurados', () => {
      expect(isOriginAllowed(LOCAL_ORIGIN, [])).toBe(false);
    });

    it('deja pasar los requests sin Origin (webhooks de MP / server-to-server)', () => {
      expect(isOriginAllowed(undefined, previewPatterns)).toBe(true);
    });

    it('deja pasar los requests sin Origin aunque no haya patrones', () => {
      expect(isOriginAllowed(undefined, [])).toBe(true);
    });

    it('trata los caracteres especiales del patron como literales', () => {
      expect(
        isOriginAllowed('https://appXexample.com', ['https://app.example.com']),
      ).toBe(false);
      expect(
        isOriginAllowed('https://app.example.com', ['https://app.example.com']),
      ).toBe(true);
    });

    it('ignora los patrones compuestos solo por comodines', () => {
      expect(isOriginAllowed(disallowed, ['*'])).toBe(false);
      expect(isOriginAllowed(disallowed, ['**'])).toBe(false);
      expect(isOriginAllowed(LOCAL_ORIGIN, ['*'])).toBe(false);
      expect(isOriginAllowed(LOCAL_ORIGIN, ['*', LOCAL_ORIGIN])).toBe(true);
    });
  });

  describe('corsOriginOption', () => {
    const buildTestApp = (patterns: string[]) => {
      const testApp = express();
      testApp.use(cors({ origin: corsOriginOption(patterns) }));
      testApp.get('/ping', (_req, res) => {
        res.json({ ok: true });
      });
      return testApp;
    };

    it('llama al callback con allow=true para un origen permitido', () => {
      const calls: Array<[Error | null, boolean | undefined]> = [];
      corsOriginOption(previewPatterns)(PREVIEW_ORIGIN, (err, allow) => {
        calls.push([err, allow]);
      });
      expect(calls).toEqual([[null, true]]);
    });

    it('llama al callback con allow=false para un origen no permitido', () => {
      const calls: Array<[Error | null, boolean | undefined]> = [];
      corsOriginOption(previewPatterns)(disallowed, (err, allow) => {
        calls.push([err, allow]);
      });
      expect(calls).toEqual([[null, false]]);
    });

    it('refleja el origen de preview permitido', async () => {
      const testApp = buildTestApp(previewPatterns);
      const res = await request(testApp).get('/ping').set('Origin', PREVIEW_ORIGIN);
      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe(PREVIEW_ORIGIN);
    });

    it('refleja el origen exacto permitido', async () => {
      const testApp = buildTestApp(previewPatterns);
      const origin = previewPatterns[0];
      const res = await request(testApp).get('/ping').set('Origin', origin);
      expect(res.headers['access-control-allow-origin']).toBe(origin);
    });

    it('no entrega el header a un origen ajeno', async () => {
      const testApp = buildTestApp(previewPatterns);
      const res = await request(testApp).get('/ping').set('Origin', disallowed);
      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('nunca responde con el comodin *', async () => {
      const testApp = buildTestApp(previewPatterns);
      const allowedRes = await request(testApp)
        .get('/ping')
        .set('Origin', PREVIEW_ORIGIN);
      const foreignRes = await request(testApp).get('/ping').set('Origin', disallowed);
      expect(allowedRes.headers['access-control-allow-origin']).not.toBe('*');
      expect(foreignRes.headers['access-control-allow-origin']).not.toBe('*');
    });

    it('deja pasar requests sin Origin y sin header ACAO', async () => {
      const testApp = buildTestApp(previewPatterns);
      const res = await request(testApp).get('/ping');
      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
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

    it.runIf(configuredOrigin !== '')(
      'autoriza el preflight del origen exacto configurado',
      async () => {
        const res = await request(app)
          .options('/api/users')
          .set('Origin', configuredOrigin)
          .set('Access-Control-Request-Method', 'GET');
        expect(res.status).toBe(204);
        expect(res.headers['access-control-allow-origin']).toBe(configuredOrigin);
      },
    );

    it.runIf(configuredPreviewOrigin !== '')(
      'autoriza el preflight del preview que matchea el patron configurado',
      async () => {
        const res = await request(app)
          .options('/api/users')
          .set('Origin', configuredPreviewOrigin)
          .set('Access-Control-Request-Method', 'GET');
        expect(res.status).toBe(204);
        expect(res.headers['access-control-allow-origin']).toBe(
          configuredPreviewOrigin,
        );
      },
    );

    it('configura la allowlist de CORS en el entorno de test', () => {
      expect(corsPatterns.length).toBeGreaterThan(0);
    });

    it.runIf(configuredOrigin !== '')(
      'refleja el origen permitido configurado en CORS_ALLOWED_ORIGINS',
      async () => {
        const res = await request(app)
          .get('/api/users')
          .set('Origin', configuredOrigin);
        expect(res.headers['access-control-allow-origin']).toBe(configuredOrigin);
      },
    );

    it.runIf(configuredPreviewOrigin !== '')(
      'refleja un preview de Vercel que matchea el patron configurado',
      async () => {
        const res = await request(app)
          .get('/api/users')
          .set('Origin', configuredPreviewOrigin);
        expect(res.headers['access-control-allow-origin']).toBe(
          configuredPreviewOrigin,
        );
      },
    );
  });
});
