// BE-21: patrón service replicado de src/circuit (BE-20). Conserva el
// comportamiento previo: create/update re-leen poblando category/simulator.
import { orm } from '../shared/orm.js';
import type { Rel } from '@mikro-orm/mysql';
import { CategoryVersion } from './category-version.entity.js';
import { Category } from '../category/category.entity.js';
import { Simulator } from '../simulator/simulator.entity.js';

export interface CategoryVersionInput {
  status: string;
  category: Rel<Category> | number;
  simulator: Rel<Simulator> | number;
}

const POPULATE = ['category', 'simulator'] as const;

async function findOnePopulated(id: number): Promise<CategoryVersion> {
  const em = orm.em;
  return em.findOneOrFail(CategoryVersion, { id }, { populate: POPULATE });
}

export const CategoryVersionService = {
  async findAll(): Promise<CategoryVersion[]> {
    const em = orm.em;
    return em.find(CategoryVersion, {}, { populate: POPULATE });
  },

  findOne: findOnePopulated,

  async create(data: CategoryVersionInput): Promise<CategoryVersion> {
    const em = orm.em;
    const categoryVersion = em.create(CategoryVersion, data);
    await em.flush();
    return findOnePopulated(categoryVersion.id!);
  },

  async update(
    id: number,
    data: Partial<CategoryVersionInput>,
  ): Promise<CategoryVersion> {
    const em = orm.em;
    const categoryVersion = await em.findOneOrFail(CategoryVersion, { id });
    em.assign(categoryVersion, data);
    await em.flush();
    return findOnePopulated(id);
  },

  async remove(id: number): Promise<CategoryVersion> {
    const em = orm.em;
    const categoryVersion = await em.findOneOrFail(CategoryVersion, { id });
    await em.removeAndFlush(categoryVersion);
    return categoryVersion;
  },
};
