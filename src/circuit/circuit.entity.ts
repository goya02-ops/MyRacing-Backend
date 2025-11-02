import {
  Entity,
  Property,
  Cascade,
  Collection,
  OneToMany,
} from '@mikro-orm/mysql';
import { BaseEntity } from '../shared/baseEntity.js';
import { CircuitVersion } from '../circuit-version/circuit-version.entity.js';

@Entity()
export class Circuit extends BaseEntity {
  @Property({ nullable: false })
  denomination!: string;

  @Property({ nullable: false })
  description!: string;

  @Property({ nullable: false })
  abbreviation!: string;

  @OneToMany(() => CircuitVersion, (circuitVersion) => circuitVersion.circuit, {
    cascade: [Cascade.ALL],
  })
  circuitVersions = new Collection<CircuitVersion>(this);
}
