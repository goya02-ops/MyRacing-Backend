// BE-21: patrón service replicado de src/circuit (BE-20). El acceso a datos y
// los throws tipados (NotFoundError de findOneOrFail) viven aquí; el
// controller solo delega.
import { orm } from '../shared/orm.js';
import { Category } from './category.entity.js';

export interface CategoryInput {
  denomination: string;
  description: string;
  abbreviation: string;
}

export const CategoryService = {
  async findAll(): Promise<Category[]> {
    const em = orm.em;
    return em.find(Category, {});
  },

  async findOne(id: number): Promise<Category> {
    const em = orm.em;
    return em.findOneOrFail(Category, { id });
  },

  async create(data: CategoryInput): Promise<Category> {
    const em = orm.em;
    const category = em.create(Category, data);
    await em.flush();
    return category;
  },

  async update(id: number, data: Partial<CategoryInput>): Promise<Category> {
    const em = orm.em;
    const category = await em.findOneOrFail(Category, { id });
    em.assign(category, data);
    await em.flush();
    return category;
  },

  async remove(id: number): Promise<Category> {
    const em = orm.em;
    const category = await em.findOneOrFail(Category, { id });
    await em.removeAndFlush(category);
    return category;
  },
};
