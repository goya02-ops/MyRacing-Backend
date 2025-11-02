import {
  Entity,
  Property,
  ManyToOne,
  Rel,
  DateTimeType,
} from '@mikro-orm/mysql';
import { BaseEntity } from '../shared/baseEntity.js';
import { Race } from '../race/race.entity.js';
import { User } from '../user/user.entity.js';

@Entity()
export class RaceUser extends BaseEntity {
  @Property({ type: DateTimeType, nullable: false })
  registrationDateTime!: Date;

  @Property({ nullable: true })
  startPosition?: number;

  @Property({ nullable: true })
  finishPosition?: number;

  @ManyToOne(() => Race, { nullable: false })
  race!: Rel<Race>;

  @ManyToOne(() => User, { nullable: false })
  user!: Rel<User>;
}
