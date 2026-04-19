import {
  Entity,
  Property,
  ManyToOne,
  Rel,
  OneToMany,
  Cascade,
  Collection,
} from '@mikro-orm/mysql';
import { BaseEntity } from '../shared/baseEntity.js';
import { CategoryVersion } from '../category-version/category-version.entity.js';
import { CircuitVersion } from '../circuit-version/circuit-version.entity.js';
import { Race } from '../race/race.entity.js';

@Entity()
export class Combination extends BaseEntity {
  @Property({ type: 'datetime', nullable: false })
  dateFrom!: Date;

  @Property({ type: 'datetime', nullable: false })
  dateTo!: Date;

  @Property({ type: 'number', nullable: false })
  lapsNumber!: number;

  @Property({ type: 'number', nullable: false })
  raceIntervalMinutes!: number;

  @Property({ type: 'number', nullable: false })
  obligatoryStopsQuantity!: number;

  @Property({ type: 'string', nullable: false })
  userType!: string;

  @ManyToOne(() => CategoryVersion, { nullable: false })
  categoryVersion!: Rel<CategoryVersion>;

  @ManyToOne(() => CircuitVersion, { nullable: false })
  circuitVersion!: Rel<CircuitVersion>;

  @OneToMany(() => Race, (race) => race.combination, {
    cascade: [Cascade.ALL],
  })
  races = new Collection<Race>(this);
}
