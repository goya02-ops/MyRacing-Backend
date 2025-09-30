//Definimos la clase version categoria

import {
  Entity,
  Property,
  ManyToOne,
  Rel,
  OneToMany,
  Collection,
  Cascade,
} from '@mikro-orm/mysql';
import { BaseEntity } from '../shared/baseEntity.js';
import { Category } from '../category/category.entity.js';
import { Simulator } from '../simulator/simulator.entity.js';
import { Combination } from '../combination/combination.entity.js';

@Entity()
export class CategoryVersion extends BaseEntity {
  @Property({ nullable: false })
  status!: string;

  @ManyToOne(() => Category, { nullable: false })
  category!: Rel<Category>;
  @ManyToOne(() => Simulator, { nullable: false })
  simulator!: Rel<Simulator>;
  @OneToMany(() => Combination, (combination) => combination.categoryVersion, {
    cascade: [Cascade.ALL],
  })
  combinations = new Collection<Combination>(this);
}
