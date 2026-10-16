import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NotFoundError, RequestContext } from '@mikro-orm/mysql';
import { orm } from './shared/orm.js';
import { Category } from './category/category.entity.js';
import { CategoryService } from './category/category.service.js';
import { Simulator } from './simulator/simulator.entity.js';
import { SimulatorService } from './simulator/simulator.service.js';
import { CircuitVersion } from './circuit-version/circuit-version.entity.js';
import { CircuitVersionService } from './circuit-version/circuit-version.service.js';
import { CategoryVersion } from './category-version/category-version.entity.js';
import { CategoryVersionService } from './category-version/category-version.service.js';
import { Membership } from './membership/membership.entity.js';
import { MembershipService } from './membership/membership.service.js';
import { cleanupCatalog, seedCatalog, type CatalogIds } from './test/fixtures.js';

// BE-21: la Familia B (category, simulator, circuit-version, category-version,
// membership) migra al patrón service de BE-20. Los services usan `orm.em`
// (contextual por request), por eso cada llamada directa abre un
// RequestContext. Los tests preservan los quirks: versiones con re-fetch
// poblado, remove de circuit-version por referencia (sin NotFoundError) y
// getCurrent de membership.
function inContext<T>(fn: () => Promise<T>): Promise<T> {
  return RequestContext.create(orm.em, fn);
}

describe('Familia B: CategoryService (BE-21)', () => {
  let categoryId: number;

  beforeAll(async () => {
    const category = await inContext(() =>
      CategoryService.create({
        denomination: `be21_cat_${Date.now()}`,
        description: 'BE-21 category',
        abbreviation: 'B21C',
      }),
    );
    categoryId = category.id!;
  });

  afterAll(async () => {
    await orm.em.fork().nativeDelete(Category, { id: categoryId });
  });

  it('1. create persiste y devuelve la categoria con id', async () => {
    const created = await inContext(() =>
      CategoryService.create({
        denomination: `be21_cat_x_${Date.now()}`,
        description: 'BE-21 extra',
        abbreviation: 'B21X',
      }),
    );
    expect(created.id).toBeTypeOf('number');
    expect(created.abbreviation).toBe('B21X');
    await orm.em.fork().nativeDelete(Category, { id: created.id! });
  });

  it('2. findOne devuelve la categoria creada', async () => {
    const found = await inContext(() => CategoryService.findOne(categoryId));
    expect(found.id).toBe(categoryId);
    expect(found.description).toBe('BE-21 category');
  });

  it('3. findAll devuelve un array que incluye la categoria', async () => {
    const all = await inContext(() => CategoryService.findAll());
    expect(Array.isArray(all)).toBe(true);
    expect(all.map((c) => c.id)).toContain(categoryId);
  });

  it('4. update modifica y persiste', async () => {
    const updated = await inContext(() =>
      CategoryService.update(categoryId, { description: 'actualizado' }),
    );
    expect(updated.description).toBe('actualizado');
    const refetched = await inContext(() => CategoryService.findOne(categoryId));
    expect(refetched.description).toBe('actualizado');
  });

  it('5. findOne/update/remove con id inexistente lanzan NotFoundError', async () => {
    await expect(
      inContext(() => CategoryService.findOne(999999999)),
    ).rejects.toThrow(NotFoundError);
    await expect(
      inContext(() => CategoryService.update(999999999, { description: 'x' })),
    ).rejects.toThrow(NotFoundError);
    await expect(
      inContext(() => CategoryService.remove(999999999)),
    ).rejects.toThrow(NotFoundError);
  });

  it('6. remove borra la categoria y luego findOne lanza NotFoundError', async () => {
    const temp = await inContext(() =>
      CategoryService.create({
        denomination: `be21_cat_rm_${Date.now()}`,
        description: 'a borrar',
        abbreviation: 'B21R',
      }),
    );
    await inContext(() => CategoryService.remove(temp.id!));
    await expect(
      inContext(() => CategoryService.findOne(temp.id!)),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('Familia B: SimulatorService (BE-21)', () => {
  let simulatorId: number;

  beforeAll(async () => {
    const simulator = await inContext(() =>
      SimulatorService.create({
        name: `be21_sim_${Date.now()}`,
        status: 'active',
      }),
    );
    simulatorId = simulator.id!;
  });

  afterAll(async () => {
    await orm.em.fork().nativeDelete(Simulator, { id: simulatorId });
  });

  it('1. create persiste y devuelve el simulador con id', async () => {
    const created = await inContext(() =>
      SimulatorService.create({
        name: `be21_sim_x_${Date.now()}`,
        status: 'active',
      }),
    );
    expect(created.id).toBeTypeOf('number');
    expect(created.name).toContain('be21_sim_x_');
    await orm.em.fork().nativeDelete(Simulator, { id: created.id! });
  });

  it('2. findOne devuelve el simulador creado', async () => {
    const found = await inContext(() => SimulatorService.findOne(simulatorId));
    expect(found.id).toBe(simulatorId);
    expect(found.name).toContain('be21_sim_');
  });

  it('3. findAll devuelve un array que incluye el simulador', async () => {
    const all = await inContext(() => SimulatorService.findAll());
    expect(Array.isArray(all)).toBe(true);
    expect(all.map((s) => s.id)).toContain(simulatorId);
  });

  it('4. findOne trae las colecciones circuits y categories inicializadas', async () => {
    const found = await inContext(() => SimulatorService.findOne(simulatorId));
    expect(found.circuits.isInitialized()).toBe(true);
    expect(found.categories.isInitialized()).toBe(true);
  });

  it('5. update modifica y persiste', async () => {
    const updated = await inContext(() =>
      SimulatorService.update(simulatorId, { status: 'inactive' }),
    );
    expect(updated.status).toBe('inactive');
    const refetched = await inContext(() =>
      SimulatorService.findOne(simulatorId),
    );
    expect(refetched.status).toBe('inactive');
  });

  it('6. findOne/update/remove con id inexistente lanzan NotFoundError', async () => {
    await expect(
      inContext(() => SimulatorService.findOne(999999999)),
    ).rejects.toThrow(NotFoundError);
    await expect(
      inContext(() => SimulatorService.update(999999999, { status: 'x' })),
    ).rejects.toThrow(NotFoundError);
    await expect(
      inContext(() => SimulatorService.remove(999999999)),
    ).rejects.toThrow(NotFoundError);
  });

  it('7. remove borra el simulador y luego findOne lanza NotFoundError', async () => {
    const temp = await inContext(() =>
      SimulatorService.create({
        name: `be21_sim_rm_${Date.now()}`,
        status: 'active',
      }),
    );
    await inContext(() => SimulatorService.remove(temp.id!));
    await expect(
      inContext(() => SimulatorService.findOne(temp.id!)),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('Familia B: CircuitVersionService (BE-21)', () => {
  let ids: CatalogIds;
  let versionId: number;

  beforeAll(async () => {
    ids = await seedCatalog('be21cv');
    const version = await inContext(() =>
      CircuitVersionService.create({
        status: 'active',
        circuit: ids.circuitId,
        simulator: ids.simulatorId,
      }),
    );
    versionId = version.id!;
  });

  afterAll(async () => {
    await orm.em.fork().nativeDelete(CircuitVersion, { id: versionId });
    await cleanupCatalog(ids);
  });

  it('1. create devuelve la version poblada con circuit y simulator', async () => {
    const created = await inContext(() =>
      CircuitVersionService.create({
        status: 'active',
        circuit: ids.circuitId,
        simulator: ids.simulatorId,
      }),
    );
    expect(created.id).toBeTypeOf('number');
    expect(created.circuit.id).toBe(ids.circuitId);
    expect(created.simulator.id).toBe(ids.simulatorId);
    await orm.em.fork().nativeDelete(CircuitVersion, { id: created.id! });
  });

  it('2. findOne devuelve la version poblada', async () => {
    const found = await inContext(() => CircuitVersionService.findOne(versionId));
    expect(found.id).toBe(versionId);
    expect(found.circuit.id).toBe(ids.circuitId);
    expect(found.simulator.id).toBe(ids.simulatorId);
  });

  it('3. findAll trae las versiones con circuit y simulator poblados', async () => {
    const all = await inContext(() => CircuitVersionService.findAll());
    const mine = all.find((v) => v.id === versionId);
    expect(mine).toBeDefined();
    expect(mine!.simulator.id).toBe(ids.simulatorId);
  });

  it('4. update re-leé la version con populate aplicado', async () => {
    const updated = await inContext(() =>
      CircuitVersionService.update(versionId, { status: 'inactive' }),
    );
    expect(updated.status).toBe('inactive');
    expect(updated.circuit.id).toBe(ids.circuitId);
    const refetched = await inContext(() =>
      CircuitVersionService.findOne(versionId),
    );
    expect(refetched.status).toBe('inactive');
  });

  it('5. findOne/update con id inexistente lanzan NotFoundError', async () => {
    await expect(
      inContext(() => CircuitVersionService.findOne(999999999)),
    ).rejects.toThrow(NotFoundError);
    await expect(
      inContext(() => CircuitVersionService.update(999999999, { status: 'x' })),
    ).rejects.toThrow(NotFoundError);
  });

  it('6. remove borra la version y luego findOne lanza NotFoundError', async () => {
    const temp = await inContext(() =>
      CircuitVersionService.create({
        status: 'active',
        circuit: ids.circuitId,
        simulator: ids.simulatorId,
      }),
    );
    await inContext(() => CircuitVersionService.remove(temp.id!));
    await expect(
      inContext(() => CircuitVersionService.findOne(temp.id!)),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('Familia B: CategoryVersionService (BE-21)', () => {
  let ids: CatalogIds;
  let versionId: number;

  beforeAll(async () => {
    ids = await seedCatalog('be21tv');
    const version = await inContext(() =>
      CategoryVersionService.create({
        status: 'active',
        category: ids.categoryId,
        simulator: ids.simulatorId,
      }),
    );
    versionId = version.id!;
  });

  afterAll(async () => {
    await orm.em.fork().nativeDelete(CategoryVersion, { id: versionId });
    await cleanupCatalog(ids);
  });

  it('1. create devuelve la version poblada con category y simulator', async () => {
    const created = await inContext(() =>
      CategoryVersionService.create({
        status: 'active',
        category: ids.categoryId,
        simulator: ids.simulatorId,
      }),
    );
    expect(created.id).toBeTypeOf('number');
    expect(created.category.id).toBe(ids.categoryId);
    expect(created.simulator.id).toBe(ids.simulatorId);
    await orm.em.fork().nativeDelete(CategoryVersion, { id: created.id! });
  });

  it('2. findOne devuelve la version poblada', async () => {
    const found = await inContext(() =>
      CategoryVersionService.findOne(versionId),
    );
    expect(found.id).toBe(versionId);
    expect(found.category.id).toBe(ids.categoryId);
    expect(found.simulator.id).toBe(ids.simulatorId);
  });

  it('3. findAll trae las versiones con category y simulator poblados', async () => {
    const all = await inContext(() => CategoryVersionService.findAll());
    const mine = all.find((v) => v.id === versionId);
    expect(mine).toBeDefined();
    expect(mine!.category.id).toBe(ids.categoryId);
  });

  it('4. update re-leé la version con populate aplicado', async () => {
    const updated = await inContext(() =>
      CategoryVersionService.update(versionId, { status: 'inactive' }),
    );
    expect(updated.status).toBe('inactive');
    expect(updated.simulator.id).toBe(ids.simulatorId);
    const refetched = await inContext(() =>
      CategoryVersionService.findOne(versionId),
    );
    expect(refetched.status).toBe('inactive');
  });

  it('5. findOne/update con id inexistente lanzan NotFoundError', async () => {
    await expect(
      inContext(() => CategoryVersionService.findOne(999999999)),
    ).rejects.toThrow(NotFoundError);
    await expect(
      inContext(() => CategoryVersionService.update(999999999, { status: 'x' })),
    ).rejects.toThrow(NotFoundError);
  });

  it('6. remove borra la version y luego findOne lanza NotFoundError', async () => {
    const temp = await inContext(() =>
      CategoryVersionService.create({
        status: 'active',
        category: ids.categoryId,
        simulator: ids.simulatorId,
      }),
    );
    await inContext(() => CategoryVersionService.remove(temp.id!));
    await expect(
      inContext(() => CategoryVersionService.findOne(temp.id!)),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('Familia B: MembershipService (BE-21)', () => {
  let membershipId: number;

  beforeAll(async () => {
    const membership = await inContext(() =>
      MembershipService.create({
        dateFrom: new Date('2030-01-01T00:00:00.000Z'),
        price: 1200,
      }),
    );
    membershipId = membership.id!;
  });

  afterAll(async () => {
    await orm.em.fork().nativeDelete(Membership, { id: membershipId });
  });

  it('1. create persiste y devuelve la membresia con id', async () => {
    const created = await inContext(() =>
      MembershipService.create({
        dateFrom: new Date('2031-01-01T00:00:00.000Z'),
        price: 900,
      }),
    );
    expect(created.id).toBeTypeOf('number');
    expect(created.price).toBe(900);
    await orm.em.fork().nativeDelete(Membership, { id: created.id! });
  });

  it('2. findOne devuelve la membresia creada', async () => {
    const found = await inContext(() => MembershipService.findOne(membershipId));
    expect(found.id).toBe(membershipId);
    expect(found.price).toBe(1200);
  });

  it('3. findAll devuelve un array que incluye la membresia', async () => {
    const all = await inContext(() => MembershipService.findAll());
    expect(Array.isArray(all)).toBe(true);
    expect(all.map((m) => m.id)).toContain(membershipId);
  });

  it('4. update modifica y persiste', async () => {
    const updated = await inContext(() =>
      MembershipService.update(membershipId, { price: 1500 }),
    );
    expect(updated.price).toBe(1500);
    const refetched = await inContext(() =>
      MembershipService.findOne(membershipId),
    );
    expect(refetched.price).toBe(1500);
  });

  it('5. getCurrent devuelve la membresia vigente', async () => {
    const current = await inContext(() => MembershipService.getCurrent());
    expect(current).toBeDefined();
    expect(current!.id).toBeTypeOf('number');
    expect(current!.price).toBeTypeOf('number');
  });

  it('6. findOne/update/remove con id inexistente lanzan NotFoundError', async () => {
    await expect(
      inContext(() => MembershipService.findOne(999999999)),
    ).rejects.toThrow(NotFoundError);
    await expect(
      inContext(() => MembershipService.update(999999999, { price: 1 })),
    ).rejects.toThrow(NotFoundError);
    await expect(
      inContext(() => MembershipService.remove(999999999)),
    ).rejects.toThrow(NotFoundError);
  });

  it('7. remove borra la membresia y luego findOne lanza NotFoundError', async () => {
    const temp = await inContext(() =>
      MembershipService.create({
        dateFrom: new Date('2032-01-01T00:00:00.000Z'),
        price: 700,
      }),
    );
    await inContext(() => MembershipService.remove(temp.id!));
    await expect(
      inContext(() => MembershipService.findOne(temp.id!)),
    ).rejects.toThrow(NotFoundError);
  });
});
