import { Repository } from "../shared/repository.js";
import { Category } from "./categoryEntity.js";

const categories: Category[] = [
  new Category("GT3", "Gran Tourer 3", "GT3", "active", "45b306bf-7d5f-4199-9706-b5776d691279"),
  new Category("GT4", "Gran Tourer 4", "GT4", "active", "b1c8f3d2-4e5a-4c9b-8f0d-6c7e1f2e3a4b"),
  new Category("Formula 1", "Formula 1", "F1", "active", "d2f3e4b5-6c7d-8e9f-0a1b-2c3d4e5f6a7b"),
  new Category("Rally", "Rally", "Rally", "active", "e1f2d3c4-5b6a-7d8e-9f0a-1b2c3d4e5f6a"),
  new Category("Group C", "Group C", "Gr C", "active", "f1e2d3c4-5b6a-7d8e-9f0a-1b2c3d4e5f6a"),
  new Category("F2", "Formula 2", "F2", "active", "a1b2c3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d"),
  new Category("F3", "Formula 3", "F3", "active", "b2c3d4e5-6f7a-8b9c-0d1e-2f3a4b5c6d7"),
  new Category("F4", "Formula 4", "F4", "active", "c3d4e5f6-7a8b-9c0d-1e2f-3a4b5c6d7e8f"),
  new Category("Touring Car", "Touring Car", "TC", "active", "e4f5d6c7-8b9a-0d1e-2f3a-4b5c6d7e8f9a"),
  new Category("Supercar", "Supercar", "SC", "active", "f5d6c7b8-9a0d-1e2f-3a4b-5c6d7e8f9a0b"),
  new Category("Hypercar", "Hypercar", "HC", "active", "d6c7b8a9-0d1e-2f3a-4b5c-6d7e8f9a0b1c"),
  new Category("Prototype", "Prototype", "P", "active", "c7b8a9d0-1e2f-3a4b-5c6d-7e8f9a0b1c2d"),
  new Category("Electric", "Electric", "E", "active", "a8b9c0d1-2e3f-4a5b-6c7d-8e9f0a1b2c3d"),
  new Category("Karting", "Karting", "K", "active", "a9b0c1d2-3e4f-5a6b-7c8d-9e0f1a2b3c4d"),
  new Category("Drift", "Drift", "D", "active", "b0c1d2e3-4f5a-6b7c-8d9e-0f1a2b3c4d5e"),
  new Category("Offroad", "Offroad", "OR", "active", "c1d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f"),
];

export class CategoryRepository implements Repository<Category> {
  findAll(): Category[] | undefined {
    return categories;
  }

  findOne(item: { id: string }): Category | undefined {
    return categories.find((category) => category.id === item.id);
  }

  add(item: Category): Category {
    categories.push(item);
    return item;
  }

  update(item: Category): Category | undefined {
    const index = categories.findIndex(category => category.id === item.id);
    if (index !== -1) {
      categories[index] = {...categories[index],...item};
    }
    return categories[index];
  }

  delete(item: { id: string }): Category | undefined {
    const index = categories.findIndex((category) => category.id === item.id);
    if (index !== -1) {
      const deletedCategory = categories[index];
      categories.splice(index, 1)[0];
      return deletedCategory;
    }
    return undefined;
  }
}
