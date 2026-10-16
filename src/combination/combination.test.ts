import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { orm } from '../shared/orm.js';
import { Combination } from './combination.entity.js';
import { Race } from '../race/race.entity.js';
import {
  adminToken,
  seedCatalog,
  cleanupCatalog,
  type CatalogIds,
} from '../test/fixtures.js';
// BE-19: guards del generador de carreras. En ROJO contra el código actual:
// con raceIntervalMinutes <= 0 el `while` de generateRaces no avanza (loop
// infinito en memoria antes del flush) y no hay tope de filas ni batcheo.
import {
  validateRaceInterval,
  countRaces,
  raceDates,
  chunk,
  MAX_RACES_PER_COMBINATION,
} from './combination.logic.js';

describe('combination: guards del generador de carreras (BE-19)', () => {
  let catalog: CatalogIds;
  const combinationIds: number[] = [];

  beforeAll(async () => {
    catalog = await seedCatalog('be19');
  });

  afterAll(async () => {
    // nativeDelete en orden de dependencias: el cascade no dispara al borrar
    // combinaciones sin la colección `races` cargada (FK race.combination_id).
    const em = orm.em.fork();
    if (combinationIds.length > 0) {
      await em.nativeDelete(Race, { combination: { $in: combinationIds } });
      await em.nativeDelete(Combination, { id: { $in: combinationIds } });
    }
    await cleanupCatalog(catalog);
  });

  function payload(overrides: Record<string, unknown> = {}) {
    return {
      dateFrom: '2026-01-01T00:00:00.000Z',
      dateTo: '2026-01-01T04:00:00.000Z',
      lapsNumber: 3,
      obligatoryStopsQuantity: 1,
      userType: 'common',
      raceIntervalMinutes: 60,
      categoryVersion: catalog.categoryVersionId,
      circuitVersion: catalog.circuitVersionId,
      ...overrides,
    };
  }

  async function countCombinations(): Promise<number> {
    // Acotado al catalog de este test: contar todas las combinaciones era flaky
    // con otros archivos corriendo en paralelo (crean las suyas en beforeAll).
    return orm.em.fork().count(Combination, {
      categoryVersion: catalog.categoryVersionId,
    });
  }

  async function countRacesFor(combinationId: number): Promise<number> {
    return orm.em.fork().count(Race, { combination: combinationId });
  }

  describe('utils puros (sin DB)', () => {
    it('validateRaceInterval: >0 válido; 0, negativo, NaN y undefined inválidos', () => {
      expect(validateRaceInterval(60)).toBe(true);
      expect(validateRaceInterval(1)).toBe(true);
      expect(validateRaceInterval(0)).toBe(false);
      expect(validateRaceInterval(-5)).toBe(false);
      expect(validateRaceInterval(Number.NaN)).toBe(false);
      expect(validateRaceInterval(undefined)).toBe(false);
      expect(validateRaceInterval('60')).toBe(true);
      expect(validateRaceInterval('0')).toBe(false);
    });

    it('countRaces: cuenta inclusive extremos y devuelve Infinity con intervalo inválido', () => {
      const from = new Date('2026-01-01T00:00:00.000Z');
      const to = new Date('2026-01-01T04:00:00.000Z');
      expect(countRaces(from, to, 60)).toBe(5); // 00,01,02,03,04
      expect(countRaces(from, from, 60)).toBe(1);
      expect(countRaces(to, from, 60)).toBe(0); // rango invertido
      expect(countRaces(from, to, 0)).toBe(Number.POSITIVE_INFINITY);
      // Intervalo de 1 minuto en un año: cientos de miles (caso auditoría).
      expect(countRaces(new Date('2026-01-01T00:00:00Z'), new Date('2027-01-01T00:00:00Z'), 1)).toBeGreaterThan(500000);
    });

    it('raceDates: genera fechas inclusivas hasta endDate, sin materializar todo', () => {
      const from = new Date('2026-01-01T00:00:00.000Z');
      const to = new Date('2026-01-01T02:00:00.000Z');
      const dates = [...raceDates(from, to, 60)].map((d) => d.toISOString());
      expect(dates).toEqual([
        '2026-01-01T00:00:00.000Z',
        '2026-01-01T01:00:00.000Z',
        '2026-01-01T02:00:00.000Z',
      ]);
      // Es un generador: no avanza si no se itera (no explota con rangos enormes).
      const iter = raceDates(from, new Date('2027-01-01T00:00:00Z'), 1);
      expect(iter.next().done).toBe(false);
    });

    it('chunk: agrupa en lotes del tamaño pedido (último lote parcial)', () => {
      expect([...chunk([1, 2, 3, 4, 5], 2)]).toEqual([[1, 2], [3, 4], [5]]);
      expect([...chunk([1, 2, 3, 4], 2)]).toEqual([[1, 2], [3, 4]]);
      expect([...chunk([], 2)]).toEqual([]);
    });
  });

  describe('POST /api/combinations', () => {
    it('1. raceIntervalMinutes=0 → 400 y NO persiste combinación (evita loop infinito)', async () => {
      const before = await countCombinations();
      const res = await request(app)
        .post('/api/combinations')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send(payload({ raceIntervalMinutes: 0 }));
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/raceIntervalMinutes/i);
      expect(await countCombinations()).toBe(before);
    });

    it('2. raceIntervalMinutes negativo → 400', async () => {
      const res = await request(app)
        .post('/api/combinations')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send(payload({ raceIntervalMinutes: -10 }));
      expect(res.status).toBe(400);
    });

    it('3. rango anual con intervalo 1 (cientos de miles) → 400 por row cap', async () => {
      const before = await countCombinations();
      const res = await request(app)
        .post('/api/combinations')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send(
          payload({
            dateFrom: '2026-01-01T00:00:00.000Z',
            dateTo: '2027-01-01T00:00:00.000Z',
            raceIntervalMinutes: 1,
          }),
        );
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(new RegExp(String(MAX_RACES_PER_COMBINATION)));
      expect(await countCombinations()).toBe(before);
    });

    it('4. rango válido y chico → 201 y crea exactamente las carreras esperadas', async () => {
      const res = await request(app)
        .post('/api/combinations')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send(payload());
      expect(res.status).toBe(201);
      const id = res.body.data.id as number;
      combinationIds.push(id);
      expect(await countRacesFor(id)).toBe(5); // 00,01,02,03,04
    });
  });

  describe('PUT /api/combinations/:id', () => {
    it('5. extender dateTo → agrega solo las carreras nuevas', async () => {
      const created = await request(app)
        .post('/api/combinations')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send(payload({ dateTo: '2026-01-01T01:00:00.000Z' })); // 00,01 => 2 carreras
      expect(created.status).toBe(201);
      const id = created.body.data.id as number;
      combinationIds.push(id);
      expect(await countRacesFor(id)).toBe(2);

      const updated = await request(app)
        .put(`/api/combinations/${id}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send(payload({ dateTo: '2026-01-01T03:00:00.000Z' })); // +02,03 => 4
      expect(updated.status).toBe(200);
      expect(await countRacesFor(id)).toBe(4);
    });

    it('6. PUT con raceIntervalMinutes=0 → 400 y no extiende', async () => {
      const created = await request(app)
        .post('/api/combinations')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send(payload({ dateTo: '2026-01-01T01:00:00.000Z' }));
      expect(created.status).toBe(201);
      const id = created.body.data.id as number;
      combinationIds.push(id);

      const res = await request(app)
        .put(`/api/combinations/${id}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send(payload({ dateTo: '2026-01-01T03:00:00.000Z', raceIntervalMinutes: 0 }));
      expect(res.status).toBe(400);
      expect(await countRacesFor(id)).toBe(2);
    });
  });
});
