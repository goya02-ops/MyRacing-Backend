import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { orm } from '../shared/orm.js';
import { Combination } from '../combination/combination.entity.js';
import { Race } from './race.entity.js';
import {
  adminToken,
  seedCatalog,
  cleanupCatalog,
  seedCombination,
  seedRace,
  type CatalogIds,
} from '../test/fixtures.js';

// BE-17: en `update` faltaba `await` sobre `validateDates` (Promise siempre
// truthy => la validacion nunca se aplicaba) y solo se validaba cuando el body
// traia AMBAS fechas. Ampliacion de auditoria: validar SIEMPRE la entidad
// fusionada (patch sobre la existente), asi un patch de un solo campo con
// fechas invertidas queda rechazado.
const DATE_FROM = '2026-01-01T00:00:00.000Z';
const DATE_TO = '2026-01-01T04:00:00.000Z';
const RACE_AT = '2026-01-01T02:00:00.000Z';
const DEADLINE = '2026-01-01T01:45:00.000Z';

describe('race.controller: update valida la entidad fusionada con await (BE-17)', () => {
  let catalog: CatalogIds;
  let combinationId: number;
  let raceId: number;

  beforeAll(async () => {
    catalog = await seedCatalog('be17');
    const combination = await seedCombination(catalog, {
      dateFrom: new Date(DATE_FROM),
      dateTo: new Date(DATE_TO),
    });
    combinationId = combination.id!;
    const race = await seedRace(
      combination.id!,
      new Date(RACE_AT),
      new Date(DEADLINE),
    );
    raceId = race.id!;
  });

  afterAll(async () => {
    const em = orm.em.fork();
    await em.nativeDelete(Race, { id: raceId });
    await em.nativeDelete(Combination, { id: combinationId });
    await cleanupCatalog(catalog);
  });

  function patch(body: Record<string, unknown>) {
    return request(app)
      .patch(`/api/races/${raceId}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(body);
  }

  it('1. PATCH solo registrationDeadline posterior a raceDateTime → 400', async () => {
    const res = await patch({ registrationDeadline: '2026-01-01T03:00:00.000Z' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(
      'registrationDeadline debe ser anterior a raceDateTime',
    );
  });

  it('2. PATCH con ambas fechas invertidas → 400 (aqui faltaba el await)', async () => {
    const res = await patch({
      raceDateTime: '2026-01-01T01:00:00.000Z',
      registrationDeadline: '2026-01-01T02:00:00.000Z',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(
      'registrationDeadline debe ser anterior a raceDateTime',
    );
  });

  it('3. PATCH con combination inexistente → 400 (no 500 por FK)', async () => {
    const res = await patch({
      registrationDeadline: '2026-01-01T01:50:00.000Z',
      combination: 999999999,
    });
    expect(res.status).toBe(400);
  });

  it('4. PATCH con registrationDeadline valido y un solo campo → 200 y se persiste', async () => {
    const res = await patch({ registrationDeadline: '2026-01-01T01:55:00.000Z' });
    expect(res.status).toBe(200);
    expect(
      new Date(res.body.data.registrationDeadline).toISOString(),
    ).toBe('2026-01-01T01:55:00.000Z');
    // raceDateTime no se toco.
    expect(new Date(res.body.data.raceDateTime).toISOString()).toBe(RACE_AT);
  });

  it('5. PUT con ambas fechas validas → 200 y las persiste', async () => {
    const res = await request(app)
      .put(`/api/races/${raceId}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        raceDateTime: '2026-01-01T03:00:00.000Z',
        registrationDeadline: '2026-01-01T02:45:00.000Z',
        combination: combinationId,
      });
    expect(res.status).toBe(200);
    expect(new Date(res.body.data.raceDateTime).toISOString()).toBe(
      '2026-01-01T03:00:00.000Z',
    );
    expect(new Date(res.body.data.registrationDeadline).toISOString()).toBe(
      '2026-01-01T02:45:00.000Z',
    );
  });

  it('6. GET /api/races/:id inexistente → 404', async () => {
    const res = await request(app)
      .get('/api/races/999999999')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
  });
});
