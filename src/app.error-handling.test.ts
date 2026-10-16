import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { NotFoundError } from '@mikro-orm/mysql';
import type { Response } from 'express';
import { app } from './app.js';
import { orm } from './shared/orm.js';
import { JWT_SECRET } from './shared/config.js';
import { logger } from './shared/logger.js';
import { handleControllerError } from './shared/error.util.js';

// BE-12: caracterización del manejo centralizado de errores. En ROJO contra
// el código actual (7 controllers devuelven `error.message` crudo, el 404 de
// `findOneOrFail` responde 500, y el orden de middlewares está invertido).
// `NotFoundError` se importa desde `@mikro-orm/mysql` (re-exporta
// `@mikro-orm/core`): es la MISMA clase que lanza `findOneOrFail` y la única
// resoluble en el node_modules aislado de pnpm.
function adminToken(): string {
  // `authenticateToken` solo verifica la firma (no consulta la DB) y
  // `requireAdmin` exige `type` admin. Los IDs consultados no existen.
  return jwt.sign({ id: 1, userName: 'test-admin', type: 'admin' }, JWT_SECRET);
}

// Res mínimo con status()/json() encadenables para testear el helper sin HTTP.
type MockResponse = {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
};

function createMockRes(): MockResponse {
  const res: MockResponse = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

describe('manejo de errores (BE-12)', () => {
  beforeAll(async () => {
    // El MySQL de CI es efímero y vacío: sincronizar de forma NO destructiva
    // como payment.test.ts. Si otro archivo ya sincronizó el esquema, es no-op.
    try {
      const generator = orm.getSchemaGenerator();
      await generator.ensureDatabase();
      await generator.updateSchema();
    } catch {
      // Las tablas ya pueden existir (las crea payment.test.ts en CI); no bloquea.
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. GET /api/users/:id inexistente con JWT admin → 404 Recurso no encontrado', async () => {
    const res = await request(app)
      .get('/api/users/999999')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Recurso no encontrado' });
  });

  it('2. GET /api/categories/:id inexistente con JWT admin → 404 sin filtrar MikroORM', async () => {
    const res = await request(app)
      .get('/api/categories/999999')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Recurso no encontrado' });
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('Unable to find');
    expect(raw).not.toContain('NotFoundException');
  });

  describe('handleControllerError (src/shared/error.util.ts)', () => {
    it('3a. NotFoundError → 404 Recurso no encontrado', () => {
      const errorSpy = vi
        .spyOn(logger, 'error')
        .mockImplementation(() => undefined);
      const res = createMockRes();
      handleControllerError(
        new NotFoundError('No encontrado'),
        res as unknown as Response,
      );
      expect(errorSpy).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Recurso no encontrado' });
    });

    it('3b. error crudo de DB → 500 genérico sin filtrar detalle (caracterización)', () => {
      const errorSpy = vi
        .spyOn(logger, 'error')
        .mockImplementation(() => undefined);
      const res = createMockRes();
      handleControllerError(
        new Error('ER_DUP_ENTRY: Duplicate entry x'),
        res as unknown as Response,
      );
      expect(errorSpy).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error interno del servidor',
      });
      const body = res.json.mock.calls[0]?.[0];
      expect(JSON.stringify(body)).not.toContain('ER_DUP_ENTRY');
    });
  });

  it('4. middlewares: notFoundHandler antes de errorHandler, y errorHandler último', () => {
    const stack = (
      app as unknown as { router: { stack: Array<{ name?: string }> } }
    ).router.stack;
    const names = stack.map((layer) => layer.name ?? '');
    expect(names).toContain('notFoundHandler');
    expect(names).toContain('errorHandler');
    expect(names.indexOf('notFoundHandler')).toBeLessThan(
      names.indexOf('errorHandler'),
    );
    expect(names[names.length - 1]).toBe('errorHandler');
  });

  it('5. source-scan: ningún *.controller.ts expone `error.message`', () => {
    const srcDir = fileURLToPath(new URL('.', import.meta.url));
    const controllerFiles = readdirSync(srcDir, {
      recursive: true,
      withFileTypes: true,
    })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.controller.ts'))
      .map((entry) => join(entry.parentPath, entry.name));

    expect(controllerFiles.length).toBeGreaterThan(0);

    const offenders = controllerFiles.filter((file) =>
      readFileSync(file, 'utf-8').includes('error.message'),
    );
    expect(
      offenders,
      `controllers que exponen error.message: ${offenders.join(', ')}`,
    ).toEqual([]);
  });
});
