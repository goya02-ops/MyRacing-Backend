import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from './app.js';
import { orm } from './shared/orm.js';
import { Combination } from './combination/combination.entity.js';
import { Race } from './race/race.entity.js';
import { RaceUser } from './race-user/race-user.entity.js';
import { User } from './user/user.entity.js';
import {
  adminToken,
  seedCatalog,
  cleanupCatalog,
  seedCombination,
  seedRace,
  seedUser,
  type CatalogIds,
} from './test/fixtures.js';

// BE-13: estandar de paginacion de listados admin. Cada `getAll` responde
// `{ message, data, total, limit, offset }` con limit default 20 (max 50) y
// offset default 0. `by-combination` clampea sus limites a max 50 (default 5)
// y los acepta por query param ademas de por path (compat con el frontend).
describe('paginacion de listados (BE-13)', () => {
  let catalog: CatalogIds;
  let combinationId: number;
  const raceIds: number[] = [];
  const raceUserIds: number[] = [];
  const userIds: number[] = [];

  const get = (path: string) =>
    request(app).get(path).set('Authorization', `Bearer ${adminToken()}`);

  beforeAll(async () => {
    catalog = await seedCatalog('be13');
    const combination = await seedCombination(catalog);
    combinationId = combination.id!;

    const now = Date.now();
    const before = await seedRace(
      combinationId,
      new Date(now - 60 * 60 * 1000),
      new Date(now - 75 * 60 * 1000),
    );
    const after = await seedRace(
      combinationId,
      new Date(now + 60 * 60 * 1000),
      new Date(now + 45 * 60 * 1000),
    );
    raceIds.push(before.id!, after.id!);

    const em = orm.em.fork();
    for (let i = 0; i < 3; i += 1) {
      const user = await seedUser('be13');
      userIds.push(user.id!);
      const raceUser = em.create(RaceUser, {
        user: em.getReference(User, user.id!),
        race: em.getReference(Race, before.id!),
        registrationDateTime: new Date(),
      });
      await em.persistAndFlush(raceUser);
      raceUserIds.push(raceUser.id!);
    }
  });

  afterAll(async () => {
    const em = orm.em.fork();
    await em.nativeDelete(RaceUser, { id: { $in: raceUserIds } });
    await em.nativeDelete(Race, { id: { $in: raceIds } });
    await em.nativeDelete(Combination, { id: combinationId });
    await em.nativeDelete(User, { id: { $in: userIds } });
    await cleanupCatalog(catalog);
  });

  it('1. GET /api/users usa el envelope con defaults limit 20 / offset 0', async () => {
    const res = await get('/api/users');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.total).toBeTypeOf('number');
    expect(res.body.total).toBeGreaterThanOrEqual(3);
    expect(res.body.limit).toBe(20);
    expect(res.body.offset).toBe(0);
  });

  it('2. GET /api/users respeta limit y offset (ventana estable por id ASC)', async () => {
    const first = await get('/api/users?limit=1&offset=0');
    const second = await get('/api/users?limit=1&offset=1');

    expect(first.body.limit).toBe(1);
    expect(second.body.offset).toBe(1);
    expect(first.body.data).toHaveLength(1);
    expect(second.body.data).toHaveLength(1);
    expect(first.body.data[0].id).not.toBe(second.body.data[0].id);
  });

  it('3. GET /api/users clampea limit a 50 y normaliza valores invalidos', async () => {
    const big = await get('/api/users?limit=999');
    const bad = await get('/api/users?limit=abc&offset=-5');

    expect(big.body.limit).toBe(50);
    expect(bad.body.limit).toBe(20);
    expect(bad.body.offset).toBe(0);
  });

  it('4. GET /api/combinations pagina con el mismo envelope', async () => {
    const res = await get('/api/combinations?limit=1&offset=0');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeLessThanOrEqual(1);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(res.body.limit).toBe(1);
    expect(res.body.offset).toBe(0);
  });

  it('5. GET /api/race-users pagina con el mismo envelope', async () => {
    const res = await get('/api/race-users?limit=2&offset=0');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.total).toBeGreaterThanOrEqual(2);
    expect(res.body.limit).toBe(2);
    expect(res.body.offset).toBe(0);
  });

  it('6. by-combination clampea los limites de path a 50', async () => {
    const res = await get(
      `/api/races/by-combination/${combinationId}/9999/9999`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.limitPrev).toBe(50);
    expect(res.body.data.limitNext).toBe(50);
  });

  it('7. by-combination acepta los limites por query param', async () => {
    const res = await get(
      `/api/races/by-combination/${combinationId}?previousLimit=2&nextLimit=3`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.limitPrev).toBe(2);
    expect(res.body.data.limitNext).toBe(3);
  });

  it('8. by-combination sin limites usa el default 5', async () => {
    const res = await get(`/api/races/by-combination/${combinationId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.limitPrev).toBe(5);
    expect(res.body.data.limitNext).toBe(5);
    expect(res.body.data.previousRaces.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.nextRaces.length).toBeGreaterThanOrEqual(1);
  });
});
