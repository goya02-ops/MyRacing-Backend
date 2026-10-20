import { orm } from '../shared/orm.js';
import { Circuit } from './circuit.entity.js';

export interface CircuitInput {
  denomination: string;
  description: string;
  abbreviation: string;
}

export const CircuitService = {
  async findAll(): Promise<Circuit[]> {
    const em = orm.em;
    return em.find(Circuit, {}, { populate: ['circuitVersions'] });
  },

  async findOne(id: number): Promise<Circuit> {
    const em = orm.em;
    return em.findOneOrFail(Circuit, { id }, { populate: ['circuitVersions'] });
  },

  async create(data: CircuitInput): Promise<Circuit> {
    const em = orm.em;
    const circuit = em.create(Circuit, data);
    await em.flush();
    return circuit;
  },

  async update(id: number, data: Partial<CircuitInput>): Promise<Circuit> {
    const em = orm.em;
    const circuit = await em.findOneOrFail(Circuit, { id });
    em.assign(circuit, data);
    await em.flush();
    return circuit;
  },

  async remove(id: number): Promise<Circuit> {
    const em = orm.em;
    const circuit = await em.findOneOrFail(Circuit, { id });
    await em.removeAndFlush(circuit);
    return circuit;
  },
};
