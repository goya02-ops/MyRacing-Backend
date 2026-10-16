import jwt from 'jsonwebtoken';
import { orm } from '../shared/orm.js';
import { JWT_SECRET } from '../shared/config.js';
import { Simulator } from '../simulator/simulator.entity.js';
import { Category } from '../category/category.entity.js';
import { Circuit } from '../circuit/circuit.entity.js';
import { CategoryVersion } from '../category-version/category-version.entity.js';
import { CircuitVersion } from '../circuit-version/circuit-version.entity.js';
import { Combination } from '../combination/combination.entity.js';
import { Race } from '../race/race.entity.js';

// Helpers compartidos por los tests de integracion: evitan duplicar el armado
// del catalogo (Simulator/Category/Circuit + versiones) y el seed de
// combinaciones/carreras entre archivos de test.

// `authenticateToken` solo verifica la firma; `requireAdmin` exige type admin.
export function adminToken(): string {
  return jwt.sign({ id: 1, userName: 'test-admin', type: 'admin' }, JWT_SECRET);
}

export interface CatalogIds {
  simulatorId: number;
  categoryId: number;
  circuitId: number;
  categoryVersionId: number;
  circuitVersionId: number;
}

// Contador en vez de Math.random para evitar S2245 y asegurar unicidad.
let seedSequence = 0;

function uniqueSuffix(tag: string): string {
  seedSequence += 1;
  return `${tag}_${Date.now()}_${seedSequence}`;
}

// Crea Simulator + Category + Circuit + sus versiones (mismo simulador para
// ambas versiones, como exige el POST de combinaciones).
export async function seedCatalog(tag: string): Promise<CatalogIds> {
  const em = orm.em.fork();
  const suffix = uniqueSuffix(tag);

  const simulator = em.create(Simulator, {
    name: `sim_${suffix}`,
    status: 'active',
  });
  const category = em.create(Category, {
    denomination: `cat_${suffix}`,
    description: `${tag} category`,
    abbreviation: 'TSTC',
  });
  const circuit = em.create(Circuit, {
    denomination: `cir_${suffix}`,
    description: `${tag} circuit`,
    abbreviation: 'TSTR',
  });
  await em.persistAndFlush([simulator, category, circuit]);

  const categoryVersion = em.create(CategoryVersion, {
    status: 'active',
    category,
    simulator,
  });
  const circuitVersion = em.create(CircuitVersion, {
    status: 'active',
    circuit,
    simulator,
  });
  await em.persistAndFlush([categoryVersion, circuitVersion]);

  return {
    simulatorId: simulator.id!,
    categoryId: category.id!,
    circuitId: circuit.id!,
    categoryVersionId: categoryVersion.id!,
    circuitVersionId: circuitVersion.id!,
  };
}

// nativeDelete en orden de dependencias (las carreras/combinaciones se borran
// en cada test, aca solo el catalogo).
export async function cleanupCatalog(ids: CatalogIds): Promise<void> {
  const em = orm.em.fork();
  await em.nativeDelete(CategoryVersion, { id: ids.categoryVersionId });
  await em.nativeDelete(CircuitVersion, { id: ids.circuitVersionId });
  await em.nativeDelete(Category, { id: ids.categoryId });
  await em.nativeDelete(Circuit, { id: ids.circuitId });
  await em.nativeDelete(Simulator, { id: ids.simulatorId });
}

export interface CombinationSeed {
  dateFrom?: Date;
  dateTo?: Date;
}

export async function seedCombination(
  ids: CatalogIds,
  seed: CombinationSeed = {},
): Promise<Combination> {
  const em = orm.em.fork();
  const combination = em.create(Combination, {
    dateFrom: seed.dateFrom ?? new Date('2026-01-01T00:00:00.000Z'),
    dateTo: seed.dateTo ?? new Date('2026-01-01T04:00:00.000Z'),
    lapsNumber: 3,
    raceIntervalMinutes: 60,
    obligatoryStopsQuantity: 1,
    userType: 'common',
    categoryVersion: em.getReference(CategoryVersion, ids.categoryVersionId),
    circuitVersion: em.getReference(CircuitVersion, ids.circuitVersionId),
  });
  await em.persistAndFlush(combination);
  return combination;
}

export async function seedRace(
  combinationId: number,
  raceDateTime: Date,
  registrationDeadline: Date,
): Promise<Race> {
  const em = orm.em.fork();
  const race = em.create(Race, {
    raceDateTime,
    registrationDeadline,
    combination: em.getReference(Combination, combinationId),
  });
  await em.persistAndFlush(race);
  return race;
}
