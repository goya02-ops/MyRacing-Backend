import {
  Entity,
  OneToMany,
  Property,
  Cascade,
  Collection,
} from '@mikro-orm/mysql';
import { BaseEntity } from '../shared/baseEntity.js';
import { CategoryVersion } from '../category-version/category-version.entity.js';
import { CircuitVersion } from '../circuit-version/circuit-version.entity.js';

@Entity()
export class Simulator extends BaseEntity {
  @Property({ type: 'string', nullable: false })
  name!: string;

  @Property({ type: 'string', nullable: false })
  status?: string;

  @OneToMany(
    () => CircuitVersion,
    (circuitVersion) => circuitVersion.simulator,
    {
      cascade: [Cascade.ALL],
    }
  )
  circuits = new Collection<CircuitVersion>(this);

  @OneToMany(
    () => CategoryVersion,
    (categoryVersion) => categoryVersion.simulator,
    {
      cascade: [Cascade.ALL],
    }
  )
  categories = new Collection<CategoryVersion>(this);
}
