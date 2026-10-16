// BE-21: patrón service replicado de src/circuit (BE-20).
import { orm } from '../shared/orm.js';
import { Simulator } from './simulator.entity.js';

export interface SimulatorInput {
  name: string;
  // nullable:false en la entidad: MikroORM exige el valor en runtime.
  status: string;
}

export const SimulatorService = {
  async findAll(): Promise<Simulator[]> {
    const em = orm.em;
    return em.find(Simulator, {});
  },

  async findOne(id: number): Promise<Simulator> {
    const em = orm.em;
    return em.findOneOrFail(
      Simulator,
      { id },
      { populate: ['circuits.circuit', 'categories.category'] },
    );
  },

  async create(data: SimulatorInput): Promise<Simulator> {
    const em = orm.em;
    const simulator = em.create(Simulator, data);
    await em.flush();
    return simulator;
  },

  async update(id: number, data: Partial<SimulatorInput>): Promise<Simulator> {
    const em = orm.em;
    const simulator = await em.findOneOrFail(Simulator, { id });
    em.assign(simulator, data);
    await em.flush();
    return simulator;
  },

  async remove(id: number): Promise<Simulator> {
    const em = orm.em;
    const simulator = await em.findOneOrFail(Simulator, { id });
    await em.removeAndFlush(simulator);
    return simulator;
  },
};
