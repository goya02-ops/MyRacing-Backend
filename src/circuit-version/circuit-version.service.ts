// BE-21: patrón service replicado de src/circuit (BE-20). Conserva los
// comportamientos previos: create/update re-leen poblando circuit/simulator,
// y remove trabaja por referencia (sin lookup, por lo que no lanza
// NotFoundError).
import { orm } from '../shared/orm.js';
import type { Rel } from '@mikro-orm/mysql';
import { CircuitVersion } from './circuit-version.entity.js';
import { Circuit } from '../circuit/circuit.entity.js';
import { Simulator } from '../simulator/simulator.entity.js';

export interface CircuitVersionInput {
  status: string;
  circuit: Rel<Circuit> | number;
  simulator: Rel<Simulator> | number;
}

const POPULATE = ['circuit', 'simulator'] as const;

async function findOnePopulated(id: number): Promise<CircuitVersion> {
  const em = orm.em;
  return em.findOneOrFail(CircuitVersion, { id }, { populate: POPULATE });
}

export const CircuitVersionService = {
  async findAll(): Promise<CircuitVersion[]> {
    const em = orm.em;
    return em.find(CircuitVersion, {}, { populate: POPULATE });
  },

  findOne: findOnePopulated,

  async create(data: CircuitVersionInput): Promise<CircuitVersion> {
    const em = orm.em;
    const circuitVersion = em.create(CircuitVersion, data);
    await em.flush();
    return findOnePopulated(circuitVersion.id!);
  },

  async update(
    id: number,
    data: Partial<CircuitVersionInput>,
  ): Promise<CircuitVersion> {
    const em = orm.em;
    const circuitVersion = await em.findOneOrFail(CircuitVersion, { id });
    em.assign(circuitVersion, data);
    await em.flush();
    return findOnePopulated(id);
  },

  async remove(id: number): Promise<CircuitVersion> {
    const em = orm.em;
    const circuitVersion = em.getReference(CircuitVersion, id);
    await em.removeAndFlush(circuitVersion);
    return circuitVersion;
  },
};
