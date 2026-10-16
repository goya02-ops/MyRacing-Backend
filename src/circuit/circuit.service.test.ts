import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NotFoundError, RequestContext } from '@mikro-orm/mysql';
import { orm } from '../shared/orm.js';
import { Circuit } from './circuit.entity.js';
import { CircuitService } from './circuit.service.js';

// BE-20: CircuitService con throws tipados (NotFoundError). Molde para la
// "Familia B": el service concentra el acceso a datos y el controller queda
// delgado. Los servicios usan `orm.em` (contextual por request), por eso el
// test abre un RequestContext en cada llamada directa.
function inContext<T>(fn: () => Promise<T>): Promise<T> {
  return RequestContext.create(orm.em, fn);
}

describe('circuit.service: CRUD con throws tipados (BE-20)', () => {
  let circuitId: number;

  beforeAll(async () => {
    const circuit = await inContext(() =>
      CircuitService.create({
        denomination: `be20_${Date.now()}`,
        description: 'BE-20 circuit',
        abbreviation: 'B20C',
      }),
    );
    circuitId = circuit.id!;
  });

  afterAll(async () => {
    await orm.em.fork().nativeDelete(Circuit, { id: circuitId });
  });

  it('1. create persiste y devuelve el circuito con id', async () => {
    const circuit = await inContext(() =>
      CircuitService.create({
        denomination: `be20_extra_${Date.now()}`,
        description: 'BE-20 extra',
        abbreviation: 'B20D',
      }),
    );
    expect(circuit.id).toBeTypeOf('number');
    expect(circuit.abbreviation).toBe('B20D');
    await orm.em.fork().nativeDelete(Circuit, { id: circuit.id! });
  });

  it('2. findOne devuelve el circuito creado', async () => {
    const found = await inContext(() => CircuitService.findOne(circuitId));
    expect(found.id).toBe(circuitId);
    expect(found.abbreviation).toBe('B20C');
    expect(found.circuitVersions).toBeDefined();
  });

  it('3. findAll devuelve un array que incluye el circuito creado', async () => {
    const all = await inContext(() => CircuitService.findAll());
    expect(Array.isArray(all)).toBe(true);
    expect(all.map((c) => c.id)).toContain(circuitId);
  });

  it('4. update modifica y persiste', async () => {
    const updated = await inContext(() =>
      CircuitService.update(circuitId, { description: 'actualizado' }),
    );
    expect(updated.description).toBe('actualizado');
    const refetched = await inContext(() => CircuitService.findOne(circuitId));
    expect(refetched.description).toBe('actualizado');
  });

  it('5. findOne con id inexistente lanza NotFoundError', async () => {
    await expect(
      inContext(() => CircuitService.findOne(999999999)),
    ).rejects.toThrow(NotFoundError);
  });

  it('6. update con id inexistente lanza NotFoundError', async () => {
    await expect(
      inContext(() => CircuitService.update(999999999, { description: 'x' })),
    ).rejects.toThrow(NotFoundError);
  });

  it('7. remove borra el circuito y luego findOne lanza NotFoundError', async () => {
    const temp = await inContext(() =>
      CircuitService.create({
        denomination: `be20_rm_${Date.now()}`,
        description: 'a borrar',
        abbreviation: 'B20R',
      }),
    );
    const removed = await inContext(() => CircuitService.remove(temp.id!));
    expect(removed.id).toBe(temp.id!);
    await expect(
      inContext(() => CircuitService.findOne(temp.id!)),
    ).rejects.toThrow(NotFoundError);
  });
});
