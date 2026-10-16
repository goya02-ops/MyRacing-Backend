import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { orm } from '../shared/orm.js';
import { Combination } from '../combination/combination.entity.js';
import { Race } from '../race/race.entity.js';
import { RaceUser } from './race-user.entity.js';
import { User } from '../user/user.entity.js';
import {
  adminToken,
  seedCatalog,
  cleanupCatalog,
  seedCombination,
  seedRace,
  seedUser,
  type CatalogIds,
} from '../test/fixtures.js';

// BE-18: el POST respondia 201 con `data: undefined`. Debe devolver el recurso
// creado (id, user.id y race.id).
describe('race-user.routes: POST /api/race-users (BE-18)', () => {
  let catalog: CatalogIds;
  let combinationId: number;
  let raceId: number;
  let userId: number;

  beforeAll(async () => {
    catalog = await seedCatalog('be18');
    const combination = await seedCombination(catalog);
    combinationId = combination.id!;
    const race = await seedRace(
      combination.id!,
      new Date('2026-01-01T02:00:00.000Z'),
      new Date('2026-01-01T01:45:00.000Z'),
    );
    raceId = race.id!;
    const user = await seedUser('be18');
    userId = user.id!;
  });

  afterAll(async () => {
    const em = orm.em.fork();
    await em.nativeDelete(RaceUser, { race: raceId });
    await em.nativeDelete(Race, { id: raceId });
    await em.nativeDelete(Combination, { id: combinationId });
    await em.nativeDelete(User, { id: userId });
    await cleanupCatalog(catalog);
  });

  it('1. 201 responde data con el race-user creado (id, user.id y race.id)', async () => {
    const res = await request(app)
      .post('/api/race-users')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ userId, raceId });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBeTypeOf('number');
    expect(res.body.data.user.id).toBe(userId);
    expect(res.body.data.race.id).toBe(raceId);
  });

  it('2. 409 al registrar dos veces el mismo usuario en la misma carrera', async () => {
    const res = await request(app)
      .post('/api/race-users')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ userId, raceId });

    expect(res.status).toBe(409);
  });
});
